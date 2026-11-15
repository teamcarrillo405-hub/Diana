import { describe, expect, it } from "vitest";

import {
  MAX_DATA_ROWS,
  chartSeriesForDataset,
  datasetToLabRows,
  datasetToSpreadsheetCells,
  parseDelimitedDataset,
  restoreImportedDataset,
} from "./data-runtime";

describe("bounded delimited-data runtime", () => {
  it("parses quoted CSV, normalizes columns, and builds controlled artifacts", () => {
    const result = parseDelimitedDataset(
      "Label,Value,Value,Notes\nA,12,13,\"steady, then warm\"\nB,nope,18,ok\n",
      "experiment.csv",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.columns).toEqual(["Label", "Value", "Value 2", "Notes"]);
    expect(result.value.rows[0]).toEqual(["A", "12", "13", "steady, then warm"]);
    expect(restoreImportedDataset(result.value)).toEqual(result.value);
    expect(datasetToSpreadsheetCells(result.value)).toMatchObject({
      A1: "Label",
      B2: "12",
      D2: "steady, then warm",
    });
    expect(chartSeriesForDataset(result.value, {
      type: "bar",
      xColumn: 0,
      yColumn: 1,
    })).toMatchObject({ categories: ["A"], values: [12] });
    expect(datasetToLabRows({
      fileName: "lab.csv",
      columns: ["Measurement", "Value", "Unit", "Uncertainty", "Observation"],
      rows: [["Mass", "5", "g", "0.1", "stable"]],
    })[0]).toMatchObject({ label: "Mass", value: "5", unit: "g", uncertainty: "0.1" });
  });

  it("neutralizes formula-like imports and enforces row and file limits", () => {
    const formula = parseDelimitedDataset("Name,Value\nA,=2+2\n", "data.csv");
    expect(formula.ok).toBe(true);
    if (formula.ok) expect(datasetToSpreadsheetCells(formula.value).B2).toBe("'=2+2");

    const tooManyRows = ["A,B", ...Array.from({ length: MAX_DATA_ROWS + 1 }, () => "1,2")].join("\n");
    expect(parseDelimitedDataset(tooManyRows, "data.csv")).toMatchObject({ ok: false });
    expect(parseDelimitedDataset("A,B\n1,2", "workbook.xlsx")).toMatchObject({ ok: false });
  });
});
