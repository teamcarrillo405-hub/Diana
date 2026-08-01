"use client";

import { Plus, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { saveAssignmentArtifactBlock } from "@/app/(app)/assignments/[id]/hm-actions";
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
  const serialized = JSON.stringify(block);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    setStatus("Saving...");
    const timer = setTimeout(async () => {
      const result = await saveAssignmentArtifactBlock({
        assignmentId,
        artifactType,
        block: {
          key: block.key ?? block.id ?? "work-item",
          type: block.type,
          capability: block.capability,
          label: block.label,
          position: block.position ?? 100,
          content: block.content,
          plainText: block.plainText ?? "",
          sourceAnchors: block.sourceAnchors ?? [],
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
  const [latex, setLatex] = useState(() => textValue(initial?.content.latex));
  const [explanation, setExplanation] = useState(() => textValue(initial?.content.explanation));
  const block = useMemo<AssignmentArtifactBlockInput>(() => ({
    key: "equations",
    type: "equation",
    capability: "equation_editor",
    label: "Equations",
    position: 100,
    content: { latex, explanation, studentAuthoredText: [latex, explanation].filter(Boolean).join("\n") },
    plainText: [latex ? `Equation: ${latex}` : "", explanation].filter(Boolean).join("\n"),
  }), [explanation, latex]);
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
    content: { expression, points },
    plainText: expression ? `y = ${expression}` : "",
  }), [expression, points]);
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
  const [cells, setCells] = useState<SpreadsheetCells>(() => recordValue(initial?.content.cells) as SpreadsheetCells);
  const plainText = SHEET_ROWS.map((row) => SHEET_COLUMNS.map((column) => `${column}${row}: ${spreadsheetDisplayValue(`${column}${row}`, cells)}`).join(" | ")).join("\n");
  const block = useMemo<AssignmentArtifactBlockInput>(() => ({
    key: "spreadsheet",
    type: "spreadsheet",
    capability: "spreadsheet",
    label: "Spreadsheet",
    position: 120,
    content: { cells },
    plainText,
  }), [cells, plainText]);
  const status = useBlockAutosave(assignmentId, artifactType, block);
  return (
    <ToolFrame title="Spreadsheet" description="Use values, cell references, arithmetic, or SUM ranges." status={status}>
      <div className="overflow-x-auto"><table className="w-full min-w-[520px] border-collapse text-sm"><thead><tr><th aria-label="Row" />{SHEET_COLUMNS.map((column) => <th key={column} className="border border-slate-300 bg-slate-100 p-2">{column}</th>)}</tr></thead><tbody>
        {SHEET_ROWS.map((row) => <tr key={row}><th className="border border-slate-300 bg-slate-100 p-2">{row}</th>{SHEET_COLUMNS.map((column) => {
          const key = `${column}${row}`;
          const display = spreadsheetDisplayValue(key, cells);
          return <td key={key} className="border border-slate-300 bg-white p-1"><input aria-label={`Cell ${key}`} value={cells[key] ?? ""} onChange={(event) => setCells((current) => ({ ...current, [key]: event.target.value }))} className="min-h-9 w-full px-2 font-mono" />{(cells[key] ?? "").startsWith("=") ? <small className="block px-2 text-slate-600">= {display}</small> : null}</td>;
        })}</tr>)}
      </tbody></table></div>
    </ToolFrame>
  );
}

function LedgerTool({ assignmentId, artifactType, initial }: ToolProps) {
  const initialRows = Array.isArray(initial?.content.rows) ? initial.content.rows : [];
  const [rows, setRows] = useState<LedgerRow[]>(() => initialRows.length > 0 ? initialRows.map((row) => {
    const value = recordValue(row);
    return { account: textValue(value.account), debit: Number(value.debit) || 0, credit: Number(value.credit) || 0 };
  }) : [{ account: "", debit: 0, credit: 0 }]);
  const balance = ledgerBalance(rows);
  const plainText = [...rows.map((row) => `${row.account}: debit ${row.debit || 0}, credit ${row.credit || 0}`), `Totals: debit ${balance.debitTotal}, credit ${balance.creditTotal}`].join("\n");
  const block = useMemo<AssignmentArtifactBlockInput>(() => ({
    key: "ledger", type: "ledger", capability: "accounting_ledger", label: "Accounting ledger", position: 130,
    content: { rows, balance }, plainText,
  }), [balance, plainText, rows]);
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
  const initialLanguage = initial?.content.language === "javascript"
    || /\bjavascript\b/iu.test(assignmentTitle)
    ? "javascript"
    : "python";
  const [language, setLanguage] = useState<"python" | "javascript">(initialLanguage);
  const [code, setCode] = useState(() => textValue(initial?.content.code)
    || (initialLanguage === "javascript" ? "console.log('Hello');\n" : "print('Hello')\n"));
  const [output, setOutput] = useState<string[]>(() => Array.isArray(initial?.content.output) ? initial!.content.output.filter((line): line is string => typeof line === "string") : []);
  const [runStatus, setRunStatus] = useState("");
  const block = useMemo<AssignmentArtifactBlockInput>(() => ({
    key: "code-runner", type: "code", capability: "code_runner", label: `${language === "python" ? "Python" : "JavaScript"} code`, position: 140,
    content: { language, code, output }, plainText: `${code}\n\nOutput:\n${output.join("\n")}`.trim(),
  }), [code, language, output]);
  const status = useBlockAutosave(assignmentId, artifactType, block);
  const run = async () => {
    setRunStatus("Running...");
    const result = language === "python"
      ? await runPython(code)
      : await runJavaScript(code);
    setOutput(result.output);
    setRunStatus(result.ok ? "Run complete" : result.error ?? "Run stopped");
  };
  return (
    <ToolFrame title="Code runner" description="Run student-owned Python or JavaScript in an isolated worker with source, time, output, file, and network limits." status={status}>
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
      <textarea aria-label={`${language === "python" ? "Python" : "JavaScript"} code`} value={code} onChange={(event) => setCode(event.target.value)} rows={10} spellCheck={false} className="w-full border border-slate-400 bg-slate-950 p-3 font-mono text-sm text-white" />
      <button type="button" onClick={() => void run()} className="mt-3 inline-flex min-h-10 items-center gap-2 bg-[#db2777] px-3 font-bold text-white"><Play size={16} /> Run</button>
      <span className="ml-3 text-sm font-bold" aria-live="polite">{runStatus}</span>
      <pre className="mt-3 min-h-16 overflow-auto border border-slate-300 bg-white p-3 text-sm">{output.join("\n") || "Output appears here."}</pre>
    </ToolFrame>
  );
}
