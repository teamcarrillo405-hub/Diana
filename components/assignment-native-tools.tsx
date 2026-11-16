"use client";

import { Plus, Play, Upload } from "lucide-react";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { saveAssignmentArtifactBlock } from "@/app/(app)/assignments/[id]/hm-actions";
import { SpecialistCodeEditor } from "@/components/specialist-code-editor";
import { SpecialistDataChart } from "@/components/specialist-data-chart";
import { AssignmentPlotPreview } from "@/components/assignment-plot-preview";
import { GraphPhotoReader } from "@/components/graph-photo-reader";
import { AssignmentArtifactSavesContext } from "@/components/assignment-artifact-saves";
import type { AssignmentArtifactBlockInput } from "@/lib/assignment-artifact";
import type { AssignmentWorkProfile } from "@/lib/assignment-profile";
import { runJavaScript } from "@/lib/computer-science/javascript-runner";
import { runPython } from "@/lib/computer-science/pyodide-runner";
import {
  analyzeGraph,
  evaluateGraphExpression,
  graphPoints,
  ledgerBalance,
  spreadsheetDisplayValue,
  type GraphCheckResult,
  type GraphSolutionPoint,
  type LedgerRow,
  type SpreadsheetCells,
} from "@/lib/native-tools/deterministic";
import { MAX_GRAPH_AXIS, MAX_GRAPH_CURVES, readGraphSettings, readGraphViewport } from "@/lib/native-tools/graph-work";
import {
  MAX_DELIMITED_BYTES,
  datasetToSpreadsheetCells,
  normalizeDataChartConfig,
  parseDelimitedDataset,
  restoreImportedDataset,
  type DataChartConfig,
} from "@/lib/native-tools/data-runtime";
import { activeRuntimeState } from "@/lib/specialist-artifacts/active-state";
import type { SpecialistActiveRuntimeState, SpecialistGraphPayload } from "@/lib/specialist-artifacts/contracts";
import { projectAssignmentGraph } from "@/lib/specialist-artifacts/assignment-plots";
import {
  mergeSpecialistEditorContent,
  restoreSpecialistCodeExecution,
  specialistEditorRuntimeState,
} from "@/lib/specialist-artifacts/editor-state";
import graphStyles from "./student-shell/graph-work.module.css";

type NativeToolsProps = {
  assignmentId: string;
  assignmentTitle: string;
  profile: AssignmentWorkProfile;
  initialBlocks: readonly AssignmentArtifactBlockInput[];
};

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function textValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function useBlockAutosave(
  assignmentId: string,
  artifactType: string,
  block: AssignmentArtifactBlockInput,
) {
  const registry = useContext(AssignmentArtifactSavesContext);
  const [status, setStatus] = useState("");
  const serialized = JSON.stringify(block);
  const savedSerialization = useRef(serialized);
  const latest = useRef({ block, serialized });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef<Promise<boolean> | null>(null);
  latest.current = { block, serialized };

  const flush = useCallback((): Promise<boolean> => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (inFlight.current) return inFlight.current;
    if (latest.current.serialized === savedSerialization.current) return Promise.resolve(true);
    setStatus("Saving...");
    const request = (async () => {
      while (latest.current.serialized !== savedSerialization.current) {
        const draft = latest.current;
        const current = draft.block;
        const result = await saveAssignmentArtifactBlock({
          assignmentId,
          artifactType,
          block: {
            key: current.key ?? current.id ?? "work-item",
            type: current.type,
            capability: current.capability,
            label: current.label,
            position: current.position ?? 100,
            content: current.content,
            plainText: current.plainText ?? "",
            sourceAnchors: current.sourceAnchors ?? [],
          },
        }).catch(() => ({ ok: false as const, error: "Diana could not save this work item. Try again." }));
        if (!result.ok) {
          setStatus(result.error);
          return false;
        }
        savedSerialization.current = draft.serialized;
      }
      setStatus("Saved");
      return true;
    })().finally(() => { inFlight.current = null; });
    inFlight.current = request;
    return request;
  }, [artifactType, assignmentId]);

  useEffect(() => registry?.register(flush), [flush, registry]);
  useEffect(() => {
    if (serialized === savedSerialization.current && !inFlight.current) {
      setStatus((current) => current ? "Saved" : current);
      return;
    }
    setStatus("Saving...");
    timer.current = setTimeout(() => { void flush(); }, 600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [flush, serialized]);
  return status;
}

export function AssignmentNativeTools({ assignmentId, assignmentTitle, profile, initialBlocks }: NativeToolsProps) {
  const initial = (key: string) => initialBlocks.find((block) => block.key === key);
  const capabilities = new Set(profile.capabilities);
  const hasNativeTool = (["equation_editor", "graphing", "spreadsheet", "accounting_ledger", "code_runner"] as const)
    .some((capability) => capabilities.has(capability));
  if (!hasNativeTool) return null;

  return (
    <section className="assignment-native-tools grid gap-5" aria-label="Assignment tools">
      {capabilities.has("equation_editor") ? <EquationTool assignmentId={assignmentId} artifactType={profile.artifactType} initial={initial("equations")} /> : null}
      {capabilities.has("graphing") ? <GraphTool assignmentId={assignmentId} artifactType={profile.artifactType} initial={initial("graph")} initialPhoto={initial("graph-photo")} /> : null}
      {capabilities.has("spreadsheet") ? <SpreadsheetTool assignmentId={assignmentId} artifactType={profile.artifactType} initial={initial("spreadsheet")} /> : null}
      {capabilities.has("accounting_ledger") ? <LedgerTool assignmentId={assignmentId} artifactType={profile.artifactType} initial={initial("ledger")} /> : null}
      {capabilities.has("code_runner") ? <CodeTool assignmentId={assignmentId} assignmentTitle={assignmentTitle} artifactType={profile.artifactType} initial={initial("code-runner")} /> : null}
    </section>
  );
}

export function ToolFrame({ title, description, status, children }: {
  title: string;
  description: string;
  status: string;
  children: React.ReactNode;
}) {
  return (
    <section className="assignment-tool-light border border-dashed border-white/35 bg-[#f4efe6] p-4 text-slate-950">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="m-0 text-lg font-black">{title}</h2><p className="mb-0 mt-1 text-sm text-slate-700">{description}</p></div>
        <span className="min-h-5 text-xs font-bold text-slate-600" aria-live="polite">{status}</span>
      </header>
      {children}
    </section>
  );
}

function EquationTool({ assignmentId, artifactType, initial }: ToolProps) {
  const persistedContent = initial?.content;
  const [latex, setLatex] = useState(() => textValue(initial?.content.latex));
  const [explanation, setExplanation] = useState(() => textValue(initial?.content.explanation));
  const block = useMemo<AssignmentArtifactBlockInput>(() => ({
    key: "equations",
    type: "equation",
    capability: "equation_editor",
    label: "Equations",
    position: 100,
    content: mergeSpecialistEditorContent(persistedContent, {
      latex,
      explanation,
      studentAuthoredText: [latex, explanation].filter(Boolean).join("\n"),
    }),
    plainText: [latex ? `Equation: ${latex}` : "", explanation].filter(Boolean).join("\n"),
  }), [explanation, latex, persistedContent]);
  const status = useBlockAutosave(assignmentId, artifactType, block);
  return (
    <ToolFrame title="Equation editor" description="Enter notation and explain the step in your own words." status={status}>
      <label className="block text-sm font-bold">Equation notation
        <input value={latex} onChange={(event) => setLatex(event.target.value)} aria-describedby="equation-preview" placeholder="Example: x^2 + 3x - 4 = 0" className="mt-2 min-h-11 w-full border border-slate-400 bg-white px-3 font-mono" />
      </label>
      <div id="equation-preview" className="mt-3 min-h-12 border border-slate-300 bg-white p-3 font-mono" aria-live="polite">{latex || "Equation preview"}</div>
      <label className="mt-3 block text-sm font-bold">What this step shows
        <textarea value={explanation} onChange={(event) => setExplanation(event.target.value)} rows={3} className="mt-2 w-full border border-slate-400 bg-white p-3 font-normal" />
      </label>
    </ToolFrame>
  );
}

type ToolProps = {
  assignmentId: string;
  artifactType: string;
  initial?: AssignmentArtifactBlockInput;
};

const AXIS_FIELDS = [["xMin", "X minimum"], ["xMax", "X maximum"], ["yMin", "Y minimum"], ["yMax", "Y maximum"]] as const;

function plotNumber(value: number) {
  return String(Number(value.toPrecision(6)));
}

function solutionText(point: GraphSolutionPoint) {
  return `${point.precision === "approximate" ? "about " : ""}(${point.exactX ?? plotNumber(point.x)}, ${point.exactY ?? plotNumber(point.y)})`;
}

function graphCheckText(result: GraphCheckResult, kind: "intercepts" | "intersections") {
  if (result.points.length) return result.points.map(solutionText).join(", ");
  if (result.status === "overlap") return kind === "intercepts" ? "The curve lies on the x-axis where defined." : "The curves overlap where both are defined.";
  if (result.status === "invalid") return "Check the equation and the x range.";
  if (result.status === "indeterminate") return "No reliable result in this range. Try a narrower range or check the domain.";
  return `No ${kind} found in this x range.`;
}

function GraphTool({ assignmentId, artifactType, initial, initialPhoto }: ToolProps & { initialPhoto?: AssignmentArtifactBlockInput }) {
  const [settings] = useState(() => readGraphSettings(initial?.content));
  const [series, setSeries] = useState(settings.series.length ? settings.series : [{ expression: "", label: "" }]);
  const [viewport, setViewport] = useState(settings.viewport);
  const [axisLabels, setAxisLabels] = useState({ xLabel: settings.xLabel, yLabel: settings.yLabel });
  const [axisError, setAxisError] = useState("");
  const [showChecks, setShowChecks] = useState(false);
  const graphRange = useMemo(() => ({ min: viewport.xMin, max: viewport.xMax }), [viewport]);
  const filledCurves = useMemo(() => series.filter((curve) => curve.expression.trim()), [series]);
  const graphContent = useMemo<SpecialistGraphPayload>(() => ({
    expression: filledCurves[0]?.expression.trim() ?? "", points: [], series: filledCurves,
    viewport, ...axisLabels,
  }), [axisLabels, filledCurves, viewport]);
  const projection = useMemo(() => projectAssignmentGraph(graphContent), [graphContent]);
  const points = useMemo(() => graphPoints(graphContent.expression, graphRange), [graphContent.expression, graphRange]);
  const block = useMemo<AssignmentArtifactBlockInput>(() => ({
    key: "graph",
    type: "graph",
    capability: "graphing",
    label: "Graph",
    position: 110,
    content: mergeSpecialistEditorContent(initial?.content, { ...graphContent, points }),
    plainText: filledCurves.map((curve) => `${curve.label.trim() ? `${curve.label.trim()}: ` : ""}${/^\s*(?:y|f\s*\(\s*x\s*\))\s*=/iu.test(curve.expression) ? "" : "y = "}${curve.expression.trim()}`).join("\n"),
  }), [filledCurves, graphContent, initial?.content, points]);
  const status = useBlockAutosave(assignmentId, artifactType, block);
  const curveName = (index: number) => filledCurves[index]?.label.trim() || `Curve ${index + 1}`;
  const checks = useMemo(() => showChecks ? filledCurves.map((curve, index) => ({
    single: analyzeGraph({ expression: curve.expression, range: graphRange }),
    comparisons: filledCurves.slice(index + 1).map((other) => analyzeGraph({ expression: curve.expression, comparison: other.expression, range: graphRange }).intersections),
  })) : [], [filledCurves, graphRange, showChecks]);
  return (
    <section className={graphStyles.root} aria-labelledby="assignment-graph-title">
      <header className={graphStyles.heading}><h2 id="assignment-graph-title">Graph</h2><span aria-live="polite">{status || (initial?.content.expression ? "Saved graph" : "")}</span></header>
      <div className={graphStyles.curves}>
        {series.map((curve, index) => (
          <div key={index} className={graphStyles.curveRow}>
            <label>Curve {index + 1}<input value={curve.expression} maxLength={160} placeholder={index === 0 ? "Example: 2x + 1" : "Example: 12 - x"} onChange={(event) => {
              setShowChecks(false);
              setSeries((current) => current.map((item, at) => at === index ? { ...item, expression: event.target.value } : item));
            }} /></label>
            {series.length > 1 || curve.label ? <label>Curve {index + 1} label<input value={curve.label} maxLength={48} placeholder="Optional" onChange={(event) => setSeries((current) => current.map((item, at) => at === index ? { ...item, label: event.target.value } : item))} /></label> : null}
            {index > 0 ? <button type="button" aria-label={`Remove curve ${index + 1}`} onClick={() => { setShowChecks(false); setSeries((current) => current.filter((_, at) => at !== index)); }}>Remove</button> : null}
          </div>
        ))}
      </div>
      <div className={graphStyles.markerActions}>
        {series.length < MAX_GRAPH_CURVES ? <button type="button" onClick={() => setSeries((current) => [...current, { expression: "", label: "" }])}>Add curve</button> : null}
        <button type="button" className={graphStyles.primary} disabled={!filledCurves.length} onClick={() => setShowChecks(true)}>Check graph</button>
      </div>
      <details className={graphStyles.axes}>
        <summary>Axes and units</summary>
        <form onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const limits = readGraphViewport(Object.fromEntries(AXIS_FIELDS.map(([key]) => [key, Number(data.get(key))])));
          if (!limits) { setAxisError("Enter a minimum smaller than the maximum on both axes."); return; }
          setViewport(limits);
          setAxisLabels({ xLabel: String(data.get("xLabel")).trim() || "x", yLabel: String(data.get("yLabel")).trim() || "y" });
          setShowChecks(false);
          setAxisError("");
        }}>
          <div className={graphStyles.axisFields}>
            {AXIS_FIELDS.map(([key, label]) => <label key={key}>{label}<input name={key} type="number" step="any" min={-MAX_GRAPH_AXIS} max={MAX_GRAPH_AXIS} defaultValue={viewport[key]} required /></label>)}
            <label>X label and units<input name="xLabel" maxLength={48} defaultValue={axisLabels.xLabel} /></label>
            <label>Y label and units<input name="yLabel" maxLength={48} defaultValue={axisLabels.yLabel} /></label>
          </div>
          <button type="submit">Apply axes</button>
          {axisError ? <p role="alert">{axisError}</p> : null}
        </form>
      </details>
      {projection?.plot ? <AssignmentPlotPreview plot={projection.plot} /> : filledCurves.length ? <p role="status">Check the equation or adjust the axes to show the curve.</p> : null}
      {showChecks ? <section className={graphStyles.results} aria-label="Graph checks" aria-live="polite">
        <h3>Graph checks</h3>
        <dl>{checks.map(({ single, comparisons }, index) => (
          <div key={index}>
            <dt>{curveName(index)} x-intercepts</dt><dd>{graphCheckText(single.xIntercepts, "intercepts")}</dd>
            <dt>{curveName(index)} y-intercept</dt><dd>{single.yIntercept ? solutionText(single.yIntercept) : "No defined value on the y-axis in this range."}</dd>
            {comparisons.map((other, step) => other ? <div key={step}><dt>{curveName(index)} and {curveName(index + step + 1)} intersections</dt><dd>{graphCheckText(other, "intersections")}</dd></div> : null)}
          </div>
        ))}</dl>
      </section> : null}
      {filledCurves.length > 0 ? <details className={graphStyles.axes}>
        <summary>Table of values</summary>
        <div className={graphStyles.tableScroll} tabIndex={0} role="region" aria-label="Graph value table">
          <table className={graphStyles.values}><caption>Sampled values across the x range</caption>
            <thead><tr><th scope="col">{axisLabels.xLabel}</th>{filledCurves.map((_, index) => <th key={index} scope="col">{curveName(index)}</th>)}</tr></thead>
            <tbody>{Array.from({ length: 9 }, (_, index) => viewport.xMin + (viewport.xMax - viewport.xMin) * index / 8).map((x) => <tr key={x}><th scope="row">{plotNumber(x)}</th>{filledCurves.map(({ expression }, index) => {
              const y = evaluateGraphExpression(expression, x);
              return <td key={index}>{y === null ? "Undefined" : plotNumber(y)}</td>;
            })}</tr>)}</tbody>
          </table>
        </div>
      </details> : null}
      <GraphPhotoReader assignmentId={assignmentId} artifactType={artifactType} initial={initialPhoto?.content} />
    </section>
  );
}

const SHEET_COLUMNS = ["A", "B", "C", "D"] as const;
const SHEET_ROWS = [1, 2, 3, 4] as const;

function SpreadsheetTool({ assignmentId, artifactType, initial }: ToolProps) {
  const persistedContent = initial?.content;
  const [cells, setCells] = useState<SpreadsheetCells>(() => recordValue(initial?.content.cells) as SpreadsheetCells);
  const [dataset, setDataset] = useState(() => restoreImportedDataset(initial?.content.dataset));
  const [chartConfig, setChartConfig] = useState<DataChartConfig>(() => dataset
    ? normalizeDataChartConfig(initial?.content.chartConfig, dataset)
    : { type: "bar", xColumn: 0, yColumn: 1 });
  const [runtimeState, setRuntimeState] = useState<SpecialistActiveRuntimeState>(() =>
    specialistEditorRuntimeState(
      persistedContent,
      activeRuntimeState(dataset ? "loading" : "idle", ["Papa Parse", "Apache ECharts"]),
    )
  );
  const [importMessage, setImportMessage] = useState("");
  const plainText = [
    dataset ? `Imported ${dataset.fileName}: ${dataset.rows.length} rows by ${dataset.columns.length} columns.` : "",
    SHEET_ROWS.map((row) => SHEET_COLUMNS.map((column) => `${column}${row}: ${spreadsheetDisplayValue(`${column}${row}`, cells)}`).join(" | ")).join("\n"),
  ].filter(Boolean).join("\n");
  const block = useMemo<AssignmentArtifactBlockInput>(() => ({
    key: "spreadsheet",
    type: "spreadsheet",
    capability: "spreadsheet",
    label: "Spreadsheet",
    position: 120,
    content: mergeSpecialistEditorContent(persistedContent, {
      cells,
      dataset,
      chartConfig,
      runtimeState,
    }),
    plainText,
  }), [cells, chartConfig, dataset, persistedContent, plainText, runtimeState]);
  const status = useBlockAutosave(assignmentId, artifactType, block);
  const importData = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_DELIMITED_BYTES) {
      setImportMessage("Keep data imports under 1 MB for this beta workspace.");
      return;
    }
    setImportMessage("Checking the data file...");
    try {
      const result = parseDelimitedDataset(await file.text(), file.name);
      if (!result.ok) {
        setImportMessage(result.error);
        return;
      }
      const nextConfig = normalizeDataChartConfig(undefined, result.value);
      setDataset(result.value);
      setCells(datasetToSpreadsheetCells(result.value));
      setChartConfig(nextConfig);
      setRuntimeState(activeRuntimeState("loading", ["Papa Parse", "Apache ECharts"]));
      setImportMessage(`${result.value.rows.length} rows imported locally.`);
    } catch {
      setImportMessage("This data file could not be read. Typed spreadsheet cells remain available.");
    }
  };
  return (
    <ToolFrame title="Spreadsheet" description="Edit core cells or import a bounded CSV or TSV file for a local chart. Workbook macros and external data links are not enabled." status={status}>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 bg-slate-950 px-3 font-bold text-white">
          <Upload size={16} /> Import CSV or TSV
          <input
            type="file"
            accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
            className="sr-only"
            onChange={(event) => {
              const input = event.currentTarget;
              void importData(input.files?.[0]).finally(() => { input.value = ""; });
            }}
          />
        </label>
        <span className="text-sm font-bold text-slate-700" aria-live="polite">{importMessage}</span>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[520px] border-collapse text-sm"><thead><tr><th aria-label="Row" />{SHEET_COLUMNS.map((column) => <th key={column} className="border border-slate-300 bg-slate-100 p-2">{column}</th>)}</tr></thead><tbody>
        {SHEET_ROWS.map((row) => <tr key={row}><th className="border border-slate-300 bg-slate-100 p-2">{row}</th>{SHEET_COLUMNS.map((column) => {
          const key = `${column}${row}`;
          const display = spreadsheetDisplayValue(key, cells);
          return <td key={key} className="border border-slate-300 bg-white p-1"><input aria-label={`Cell ${key}`} value={cells[key] ?? ""} onChange={(event) => setCells((current) => ({ ...current, [key]: event.target.value }))} className="min-h-9 w-full px-2 font-mono" />{(cells[key] ?? "").startsWith("=") ? <small className="block px-2 text-slate-600">= {display}</small> : null}</td>;
        })}</tr>)}
      </tbody></table></div>
      {dataset ? (
        <section className="mt-4 border-t border-slate-300 pt-4" aria-label="Imported data chart">
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-sm font-bold">Chart type
              <select value={chartConfig.type} onChange={(event) => setChartConfig((current) => ({ ...current, type: event.target.value === "line" || event.target.value === "scatter" ? event.target.value : "bar" }))} className="mt-1 min-h-10 w-full border border-slate-400 bg-white px-2">
                <option value="bar">Bar</option><option value="line">Line</option><option value="scatter">Scatter</option>
              </select>
            </label>
            <label className="text-sm font-bold">Category column
              <select value={chartConfig.xColumn} onChange={(event) => setChartConfig((current) => ({ ...current, xColumn: Number(event.target.value) }))} className="mt-1 min-h-10 w-full border border-slate-400 bg-white px-2">{dataset.columns.map((column, index) => <option key={`${column}-${index}`} value={index}>{column}</option>)}</select>
            </label>
            <label className="text-sm font-bold">Numeric column
              <select value={chartConfig.yColumn} onChange={(event) => setChartConfig((current) => ({ ...current, yColumn: Number(event.target.value) }))} className="mt-1 min-h-10 w-full border border-slate-400 bg-white px-2">{dataset.columns.map((column, index) => <option key={`${column}-${index}`} value={index}>{column}</option>)}</select>
            </label>
          </div>
          <SpecialistDataChart dataset={dataset} config={chartConfig} onRuntimeStateChange={setRuntimeState} />
          <div className="mt-3 max-h-64 overflow-auto"><table className="w-full min-w-[520px] border-collapse text-sm"><thead><tr>{dataset.columns.slice(0, 8).map((column) => <th key={column} className="border border-slate-300 bg-slate-100 p-2 text-left">{column}</th>)}</tr></thead><tbody>{dataset.rows.slice(0, 8).map((row, rowIndex) => <tr key={rowIndex}>{row.slice(0, 8).map((value, columnIndex) => <td key={columnIndex} className="border border-slate-300 bg-white p-2">{value}</td>)}</tr>)}</tbody></table></div>
          <p className="mb-0 mt-2 text-xs text-slate-600">Preview shows up to 8 rows and 8 columns. The bounded import remains in the specialist artifact context.</p>
        </section>
      ) : null}
    </ToolFrame>
  );
}

function LedgerTool({ assignmentId, artifactType, initial }: ToolProps) {
  const persistedContent = initial?.content;
  const initialRows = Array.isArray(initial?.content.rows) ? initial.content.rows : [];
  const [rows, setRows] = useState<LedgerRow[]>(() => initialRows.length > 0 ? initialRows.map((row) => {
    const value = recordValue(row);
    return { account: textValue(value.account), debit: Number(value.debit) || 0, credit: Number(value.credit) || 0 };
  }) : [{ account: "", debit: 0, credit: 0 }]);
  const balance = ledgerBalance(rows);
  const plainText = [...rows.map((row) => `${row.account}: debit ${row.debit || 0}, credit ${row.credit || 0}`), `Totals: debit ${balance.debitTotal}, credit ${balance.creditTotal}`].join("\n");
  const block = useMemo<AssignmentArtifactBlockInput>(() => ({
    key: "ledger", type: "ledger", capability: "accounting_ledger", label: "Accounting ledger", position: 130,
    content: mergeSpecialistEditorContent(persistedContent, { rows, balance }), plainText,
  }), [balance, persistedContent, plainText, rows]);
  const status = useBlockAutosave(assignmentId, artifactType, block);
  const updateRow = (index: number, patch: Partial<LedgerRow>) => setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  return (
    <ToolFrame title="Accounting ledger" description="Record the figures from the assignment, then check whether debits equal credits." status={status}>
      <div className="grid gap-2">{rows.map((row, index) => <div key={index} className="grid grid-cols-[minmax(0,2fr)_1fr_1fr] gap-2">
        <input aria-label={`Account ${index + 1}`} value={row.account} onChange={(event) => updateRow(index, { account: event.target.value })} placeholder="Account" className="min-h-10 border border-slate-400 bg-white px-2" />
        <input aria-label={`Debit ${index + 1}`} type="number" value={row.debit || ""} onChange={(event) => updateRow(index, { debit: Number(event.target.value) || 0 })} placeholder="Debit" className="min-h-10 border border-slate-400 bg-white px-2" />
        <input aria-label={`Credit ${index + 1}`} type="number" value={row.credit || ""} onChange={(event) => updateRow(index, { credit: Number(event.target.value) || 0 })} placeholder="Credit" className="min-h-10 border border-slate-400 bg-white px-2" />
      </div>)}</div>
      <button type="button" onClick={() => setRows((current) => [...current, { account: "", debit: 0, credit: 0 }])} className="mt-3 inline-flex min-h-10 items-center gap-2 bg-slate-950 px-3 font-bold text-white"><Plus size={16} /> Add row</button>
      <p className="mb-0 mt-3 font-bold">{balance.balanced ? "Debits and credits balance." : `Difference: ${Math.abs(balance.difference).toFixed(2)}`}</p>
    </ToolFrame>
  );
}

function CodeTool({ assignmentId, assignmentTitle, artifactType, initial }: ToolProps & { assignmentTitle: string }) {
  const persistedContent = initial?.content;
  const initialLanguage = initial?.content.language === "javascript"
    || /\bjavascript\b/iu.test(assignmentTitle)
    ? "javascript"
    : "python";
  const [language, setLanguage] = useState<"python" | "javascript">(initialLanguage);
  const [code, setCode] = useState(() => textValue(initial?.content.code)
    || (initialLanguage === "javascript" ? "console.log('Hello');\n" : "print('Hello')\n"));
  const [output, setOutput] = useState<string[]>(() => Array.isArray(initial?.content.output) ? initial!.content.output.filter((line): line is string => typeof line === "string") : []);
  const [runStatus, setRunStatus] = useState("");
  const [running, setRunning] = useState(false);
  const [runtimeState, setRuntimeState] = useState<SpecialistActiveRuntimeState>(() =>
    specialistEditorRuntimeState(
      persistedContent,
      activeRuntimeState("loading", ["CodeMirror 6"]),
    )
  );
  const [execution, setExecution] = useState<{ runtime: string; durationMs: number } | null>(() =>
    restoreSpecialistCodeExecution(persistedContent)
  );
  const block = useMemo<AssignmentArtifactBlockInput>(() => ({
    key: "code-runner", type: "code", capability: "code_runner", label: `${language === "python" ? "Python" : "JavaScript"} code`, position: 140,
    content: mergeSpecialistEditorContent(persistedContent, {
      language,
      code,
      output,
      execution,
      runtimeState,
    }),
    plainText: `${code}\n\nOutput:\n${output.join("\n")}`.trim(),
  }), [code, execution, language, output, persistedContent, runtimeState]);
  const status = useBlockAutosave(assignmentId, artifactType, block);
  const run = async () => {
    setRunStatus("Running...");
    setRunning(true);
    setRuntimeState(activeRuntimeState(
      "running",
      language === "python" ? ["CodeMirror 6", "Pyodide"] : ["CodeMirror 6", "JavaScript Worker"],
      "The bounded browser worker is running.",
    ));
    try {
      const result = language === "python"
        ? await runPython(code)
        : await runJavaScript(code);
      const engine = result.runtime === "pyodide"
        ? "Pyodide"
        : result.runtime === "python-lite"
          ? "Python Lite"
          : result.runtime === "javascript-worker"
            ? "JavaScript Worker"
            : "Browser Worker";
      setOutput(result.output);
      setExecution({ runtime: result.runtime, durationMs: result.durationMs });
      setRunStatus(result.ok ? "Run complete" : result.error ?? "Run stopped");
      setRuntimeState(activeRuntimeState(
        result.runtime === "unavailable"
          ? "unavailable"
          : result.runtime === "python-lite"
            ? "limited"
            : result.ok
              ? "complete"
              : "error",
        ["CodeMirror 6", engine],
        result.runtime === "python-lite"
          ? "Full local Python could not start, so this run used the limited arithmetic and loop fallback. Typed code remains saved."
          : result.ok
            ? `The browser-only run completed in ${result.durationMs} ms.`
            : result.error,
        result.outputTruncated,
      ));
    } finally {
      setRunning(false);
    }
  };
  return (
    <ToolFrame title="Code runner" description="Edit and run bounded Python or JavaScript in a fresh browser-only worker. Imports, network, files, processes, and server execution are not enabled." status={status}>
      <label className="mb-3 block text-sm font-bold">Language
        <select value={language} onChange={(event) => {
          const next = event.target.value === "javascript" ? "javascript" : "python";
          setLanguage(next);
          if (code === "print('Hello')\n" || code === "console.log('Hello');\n") {
            setCode(next === "javascript" ? "console.log('Hello');\n" : "print('Hello')\n");
          }
        }} className="mt-2 block min-h-10 border border-slate-400 bg-white px-3">
          <option value="python">Python</option>
          <option value="javascript">JavaScript</option>
        </select>
      </label>
      <SpecialistCodeEditor language={language} value={code} onChange={setCode} onRuntimeStateChange={setRuntimeState} />
      <button type="button" disabled={running} onClick={() => void run()} className="mt-3 inline-flex min-h-10 items-center gap-2 bg-[#db2777] px-3 font-bold text-white disabled:opacity-50"><Play size={16} /> Run</button>
      <span className="ml-3 text-sm font-bold" aria-live="polite">{runStatus}</span>
      <pre className="mt-3 min-h-16 overflow-auto border border-slate-300 bg-white p-3 text-sm">{output.join("\n") || "Output appears here."}</pre>
    </ToolFrame>
  );
}
