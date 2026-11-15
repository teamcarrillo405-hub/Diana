"use client";

import { Plus, Play, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { saveAssignmentArtifactBlock } from "@/app/(app)/assignments/[id]/hm-actions";
import { SpecialistCodeEditor } from "@/components/specialist-code-editor";
import { SpecialistDataChart } from "@/components/specialist-data-chart";
import type { AssignmentArtifactBlockInput } from "@/lib/assignment-artifact";
import type { AssignmentWorkProfile } from "@/lib/assignment-profile";
import { runJavaScript } from "@/lib/computer-science/javascript-runner";
import { runPython } from "@/lib/computer-science/pyodide-runner";
import {
  graphPoints,
  ledgerBalance,
  spreadsheetDisplayValue,
  type LedgerRow,
  type SpreadsheetCells,
} from "@/lib/native-tools/deterministic";
import {
  MAX_DELIMITED_BYTES,
  datasetToSpreadsheetCells,
  normalizeDataChartConfig,
  parseDelimitedDataset,
  restoreImportedDataset,
  type DataChartConfig,
} from "@/lib/native-tools/data-runtime";
import { activeRuntimeState } from "@/lib/specialist-artifacts/active-state";
import type { SpecialistActiveRuntimeState } from "@/lib/specialist-artifacts/contracts";
import {
  mergeSpecialistEditorContent,
  restoreSpecialistCodeExecution,
  specialistEditorRuntimeState,
} from "@/lib/specialist-artifacts/editor-state";

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
  const [status, setStatus] = useState("");
  const mounted = useRef(false);
  const blockRef = useRef(block);
  blockRef.current = block;
  const serialized = JSON.stringify(block);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    setStatus("Saving...");
    const timer = setTimeout(async () => {
      const currentBlock = blockRef.current;
      const result = await saveAssignmentArtifactBlock({
        assignmentId,
        artifactType,
        block: {
          key: currentBlock.key ?? currentBlock.id ?? "work-item",
          type: currentBlock.type,
          capability: currentBlock.capability,
          label: currentBlock.label,
          position: currentBlock.position ?? 100,
          content: currentBlock.content,
          plainText: currentBlock.plainText ?? "",
          sourceAnchors: currentBlock.sourceAnchors ?? [],
        },
      });
      setStatus(result.ok ? "Saved" : result.error);
    }, 600);
    return () => clearTimeout(timer);
  }, [artifactType, assignmentId, serialized]);
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
      {capabilities.has("graphing") ? <GraphTool assignmentId={assignmentId} artifactType={profile.artifactType} initial={initial("graph")} /> : null}
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

function GraphTool({ assignmentId, artifactType, initial }: ToolProps) {
  const persistedContent = initial?.content;
  const [expression, setExpression] = useState(() => textValue(initial?.content.expression) || "x");
  const points = useMemo(() => graphPoints(expression), [expression]);
  const path = points.filter((point) => Math.abs(point.y) <= 10).map((point, index) => {
    const px = ((point.x + 10) / 20) * 600;
    const py = 200 - ((point.y + 10) / 20) * 200;
    return `${index === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`;
  }).join(" ");
  const block = useMemo<AssignmentArtifactBlockInput>(() => ({
    key: "graph",
    type: "graph",
    capability: "graphing",
    label: "Graph",
    position: 110,
    content: mergeSpecialistEditorContent(persistedContent, { expression, points }),
    plainText: expression ? `y = ${expression}` : "",
  }), [expression, persistedContent, points]);
  const status = useBlockAutosave(assignmentId, artifactType, block);
  return (
    <ToolFrame title="Graph" description="Graph a function from x = -10 to x = 10." status={status}>
      <label className="block text-sm font-bold">y =
        <input value={expression} onChange={(event) => setExpression(event.target.value)} className="ml-2 min-h-11 w-[min(32rem,85%)] border border-slate-400 bg-white px-3 font-mono" />
      </label>
      <svg viewBox="0 0 600 200" className="mt-3 w-full border border-slate-300 bg-white" role="img" aria-label={`Graph of y equals ${expression}`}>
        <line x1="0" y1="100" x2="600" y2="100" stroke="#94a3b8" /><line x1="300" y1="0" x2="300" y2="200" stroke="#94a3b8" />
        {path ? <path d={path} fill="none" stroke="#db2777" strokeWidth="3" /> : null}
      </svg>
      {!path ? <p className="mb-0 mt-2 text-sm font-bold text-amber-800">Use x, numbers, arithmetic, or sin, cos, tan, sqrt, abs, log, and exp.</p> : null}
    </ToolFrame>
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
