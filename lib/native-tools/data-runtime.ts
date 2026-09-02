import Papa from "papaparse";

import type { DataLabRow } from "@/lib/native-tools/technical";
import type { SpreadsheetCells } from "@/lib/native-tools/deterministic";

export const MAX_DELIMITED_BYTES = 1_000_000;
export const MAX_DATA_ROWS = 200;
export const MAX_DATA_COLUMNS = 24;
export const MAX_DATA_CELLS = 4_800;
export const MAX_DATA_CELL_BYTES = 4_096;

export const DATA_CHART_TYPES = ["bar", "line", "scatter"] as const;
export type DataChartType = (typeof DATA_CHART_TYPES)[number];

export type ImportedDataset = {
  fileName: string;
  columns: string[];
  rows: string[][];
};

export type DataChartConfig = {
  type: DataChartType;
  xColumn: number;
  yColumn: number;
};

export type DataChartSeries = {
  type: DataChartType;
  xLabel: string;
  yLabel: string;
  categories: string[];
  values: number[];
};

export type DatasetImportResult =
  | { ok: true; value: ImportedDataset }
  | { ok: false; error: string };

export function restoreImportedDataset(value: unknown): ImportedDataset | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  if (!Array.isArray(source.columns) || !Array.isArray(source.rows)) return null;
  if (source.columns.length === 0 || source.columns.length > MAX_DATA_COLUMNS ||
    source.rows.length === 0 || source.rows.length > MAX_DATA_ROWS ||
    source.columns.length * source.rows.length > MAX_DATA_CELLS) return null;
  const columns = uniqueColumns(source.columns.map((column) => cleanCell(column)));
  const rows: string[][] = [];
  for (const rawRow of source.rows) {
    if (!Array.isArray(rawRow) || rawRow.length > columns.length) return null;
    const row = Array.from({ length: columns.length }, (_, index) =>
      cleanCell(rawRow[index] ?? "")
    );
    if (row.some((cell) => bytes(cell) > MAX_DATA_CELL_BYTES)) return null;
    rows.push(row);
  }
  const dataset = {
    fileName: cleanFileName(typeof source.fileName === "string" ? source.fileName : "student-data.csv"),
    columns,
    rows,
  };
  return bytes(JSON.stringify(dataset)) <= MAX_DELIMITED_BYTES ? dataset : null;
}

function bytes(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function cleanCell(value: unknown): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/gu, "").trim()
    : "";
}

function cleanFileName(value: string): string {
  return value.split(/[\\/]/u).at(-1)?.slice(0, 160) || "student-data.csv";
}

function uniqueColumns(values: readonly string[]): string[] {
  const used = new Map<string, number>();
  return values.map((value, index) => {
    const base = cleanCell(value).slice(0, 80) || `Column ${index + 1}`;
    const count = (used.get(base.toLocaleLowerCase("en-US")) ?? 0) + 1;
    used.set(base.toLocaleLowerCase("en-US"), count);
    return count === 1 ? base : `${base} ${count}`;
  });
}

export function parseDelimitedDataset(
  sourceText: string,
  fileName = "student-data.csv",
): DatasetImportResult {
  if (!/\.(?:csv|tsv|txt)$/iu.test(fileName)) {
    return { ok: false, error: "Choose a CSV or TSV file." };
  }
  if (bytes(sourceText) > MAX_DELIMITED_BYTES) {
    return { ok: false, error: "Keep data imports under 1 MB for this beta workspace." };
  }
  if (sourceText.includes("\u0000")) {
    return { ok: false, error: "This data file contains unsupported control data." };
  }
  const parsed = Papa.parse<string[]>(sourceText.replace(/^\ufeff/u, ""), {
    delimiter: /\.tsv$/iu.test(fileName) ? "\t" : "",
    dynamicTyping: false,
    skipEmptyLines: "greedy",
  });
  const blockingError = parsed.errors.find((error) =>
    error.type === "Quotes" || error.code === "UndetectableDelimiter"
  );
  if (blockingError) {
    return { ok: false, error: "This delimited file could not be parsed consistently." };
  }
  if (parsed.data.length < 2) {
    return { ok: false, error: "Add a header row and at least one data row." };
  }
  if (parsed.data.length - 1 > MAX_DATA_ROWS) {
    return { ok: false, error: `Keep imports under ${MAX_DATA_ROWS} data rows.` };
  }
  const width = Math.max(...parsed.data.map((row) => row.length));
  if (width === 0 || width > MAX_DATA_COLUMNS) {
    return { ok: false, error: `Keep imports between 1 and ${MAX_DATA_COLUMNS} columns.` };
  }
  if ((parsed.data.length - 1) * width > MAX_DATA_CELLS) {
    return { ok: false, error: `Keep imports under ${MAX_DATA_CELLS.toLocaleString()} data cells.` };
  }
  for (const row of parsed.data) {
    for (const cell of row) {
      if (bytes(String(cell)) > MAX_DATA_CELL_BYTES) {
        return { ok: false, error: "Keep each imported cell under 4 KB." };
      }
    }
  }
  const columns = uniqueColumns(parsed.data[0]!.slice(0, width));
  const rows = parsed.data.slice(1).map((row) =>
    Array.from({ length: width }, (_, index) => cleanCell(row[index] ?? ""))
  );
  return {
    ok: true,
    value: {
      fileName: cleanFileName(fileName),
      columns,
      rows,
    },
  };
}

function spreadsheetColumn(index: number): string {
  let value = index + 1;
  let label = "";
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
}

function literalSpreadsheetValue(value: string): string {
  return /^[=+@]/u.test(value) || /^-(?!\d+(?:\.\d+)?$)/u.test(value)
    ? `'${value}`
    : value;
}

export function datasetToSpreadsheetCells(dataset: ImportedDataset): SpreadsheetCells {
  const cells: SpreadsheetCells = {};
  dataset.columns.forEach((column, columnIndex) => {
    cells[`${spreadsheetColumn(columnIndex)}1`] = literalSpreadsheetValue(column);
  });
  dataset.rows.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      cells[`${spreadsheetColumn(columnIndex)}${rowIndex + 2}`] = literalSpreadsheetValue(value);
    });
  });
  return cells;
}

export function normalizeDataChartConfig(
  value: unknown,
  dataset: ImportedDataset,
): DataChartConfig {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const type = typeof source.type === "string" && DATA_CHART_TYPES.includes(source.type as DataChartType)
    ? source.type as DataChartType
    : "bar";
  const boundedColumn = (candidate: unknown, fallback: number) => {
    const number = typeof candidate === "number" ? Math.trunc(candidate) : fallback;
    return Math.min(Math.max(0, number), Math.max(0, dataset.columns.length - 1));
  };
  return {
    type,
    xColumn: boundedColumn(source.xColumn, 0),
    yColumn: boundedColumn(source.yColumn, Math.min(1, dataset.columns.length - 1)),
  };
}

export function chartSeriesForDataset(
  dataset: ImportedDataset,
  config: DataChartConfig,
): DataChartSeries | null {
  if (!dataset.columns[config.xColumn] || !dataset.columns[config.yColumn]) return null;
  const categories: string[] = [];
  const values: number[] = [];
  for (const row of dataset.rows) {
    const rawValue = row[config.yColumn]?.replaceAll(",", "").trim() ?? "";
    if (!rawValue) continue;
    const value = Number(rawValue);
    if (!Number.isFinite(value)) continue;
    categories.push((row[config.xColumn] ?? "").slice(0, 160));
    values.push(value);
  }
  if (values.length === 0) return null;
  return {
    type: config.type,
    xLabel: dataset.columns[config.xColumn]!,
    yLabel: dataset.columns[config.yColumn]!,
    categories,
    values,
  };
}

function findColumn(columns: readonly string[], candidates: readonly string[]): number {
  return columns.findIndex((column) => candidates.includes(column.toLocaleLowerCase("en-US")));
}

export function datasetToLabRows(dataset: ImportedDataset): DataLabRow[] {
  const label = findColumn(dataset.columns, ["measurement", "label", "name"]);
  const value = findColumn(dataset.columns, ["value", "result"]);
  const unit = findColumn(dataset.columns, ["unit", "units"]);
  const uncertainty = findColumn(dataset.columns, ["uncertainty", "error", "+/-"]);
  const observation = findColumn(dataset.columns, ["observation", "notes", "note"]);
  const at = (row: string[], index: number) => index >= 0 ? row[index] ?? "" : "";
  return dataset.rows.map((row, index) => ({
    id: `import-${index + 1}`,
    label: at(row, label >= 0 ? label : 0),
    value: at(row, value >= 0 ? value : Math.min(1, row.length - 1)),
    unit: at(row, unit),
    uncertainty: at(row, uncertainty),
    observation: at(row, observation),
  }));
}
