"use client";

import { useMemo, useRef, useState } from "react";
import { Grid3x3 } from "lucide-react";
import { buildGrid, type GridOperation } from "@/lib/math/grid-workspace";

const OPERATIONS: Array<{ op: GridOperation; label: string }> = [
  { op: "add", label: "Add" },
  { op: "subtract", label: "Subtract" },
  { op: "multiply", label: "Multiply" },
  { op: "divide", label: "Divide" },
];

/**
 * Grid paper for multi-digit work — dysgraphia-first. One digit per cell,
 * place-value columns fixed by layout, carry/borrow row provided, focus
 * auto-advances so handwriting mechanics never cost a right answer.
 * The grid never grades and never fills answers: it is better paper.
 */
export function MathGridWorkspace() {
  const [op, setOp] = useState<GridOperation>("divide");
  const [aText, setAText] = useState("936");
  const [bText, setBText] = useState("4");
  const [values, setValues] = useState<Record<string, string>>({});
  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const grid = useMemo(() => {
    const a = Number(aText);
    const b = Number(bText);
    if (!Number.isFinite(a) || !Number.isFinite(b) || aText.trim() === "" || bText.trim() === "") return null;
    return buildGrid(op, a, b);
  }, [op, aText, bText]);

  const editableKeys = useMemo(() => {
    if (!grid) return [] as string[];
    return grid.cells
      .filter((c) => c.editable)
      .sort((x, y) => x.row - y.row || x.col - y.col)
      .map((c) => `${c.row}:${c.col}`);
  }, [grid]);

  function focusKey(key: string | undefined) {
    if (key) cellRefs.current.get(key)?.focus();
  }

  function onCellInput(key: string, raw: string) {
    const digit = raw.replace(/[^0-9]/g, "").slice(-1);
    setValues((v) => ({ ...v, [key]: digit }));
    if (digit) {
      const idx = editableKeys.indexOf(key);
      focusKey(editableKeys[idx + 1]);
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>, row: number, col: number) {
    const moves: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    // walk in the direction until an editable cell is found
    let r = row + move[0];
    let c = col + move[1];
    for (let i = 0; i < 16; i += 1) {
      if (cellRefs.current.has(`${r}:${c}`)) {
        focusKey(`${r}:${c}`);
        return;
      }
      r += move[0];
      c += move[1];
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-2xl bg-subject-math/10 text-subject-math">
          <Grid3x3 size={16} />
        </span>
        <div>
          <h3 className="text-sm font-semibold">Grid paper</h3>
          <p className="text-xs text-muted">
            One digit per box — the columns stay lined up for you. Your work, better paper.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {OPERATIONS.map(({ op: candidate, label }) => (
          <button
            key={candidate}
            type="button"
            onClick={() => {
              setOp(candidate);
              setValues({});
            }}
            aria-pressed={op === candidate}
            className={`touch-target rounded-xl border px-3 py-1.5 text-sm ${
              op === candidate
                ? "border-subject-math bg-subject-math/10 font-semibold"
                : "border-border text-muted hover:bg-surface-soft"
            }`}
          >
            {label}
          </button>
        ))}
        <input
          inputMode="numeric"
          value={aText}
          onChange={(e) => {
            setAText(e.target.value.replace(/[^0-9]/g, "").slice(0, 8));
            setValues({});
          }}
          aria-label="First number"
          className="w-24 rounded-xl border border-border bg-surface px-3 py-1.5 text-sm"
        />
        <span className="text-sm text-muted">{op === "add" ? "+" : op === "subtract" ? "−" : op === "multiply" ? "×" : "÷"}</span>
        <input
          inputMode="numeric"
          value={bText}
          onChange={(e) => {
            setBText(e.target.value.replace(/[^0-9]/g, "").slice(0, 8));
            setValues({});
          }}
          aria-label="Second number"
          className="w-24 rounded-xl border border-border bg-surface px-3 py-1.5 text-sm"
        />
      </div>

      {grid && (
        <div className="overflow-x-auto">
          <div
            className="inline-grid gap-px rounded-xl border border-border bg-border p-px"
            style={{ gridTemplateColumns: `repeat(${grid.cols}, 2.4rem)` }}
            role="group"
            aria-label="Math grid workspace"
          >
            {Array.from({ length: grid.rows }, (_, r) =>
              Array.from({ length: grid.cols }, (_, c) => {
                const cell = grid.cells.find((x) => x.row === r && x.col === c);
                const key = `${r}:${c}`;
                if (cell?.kind === "line") {
                  return <div key={key} className="h-1 bg-fg/60" style={{ gridColumn: c + 1, gridRow: r + 1 }} />;
                }
                if (cell?.editable) {
                  return (
                    <input
                      key={key}
                      ref={(el) => {
                        if (el) cellRefs.current.set(key, el);
                        else cellRefs.current.delete(key);
                      }}
                      value={values[key] ?? ""}
                      onChange={(e) => onCellInput(key, e.target.value)}
                      onKeyDown={(e) => onKeyDown(e, r, c)}
                      inputMode="numeric"
                      maxLength={1}
                      aria-label={`Row ${r + 1}, column ${c + 1}`}
                      className={`h-10 w-full bg-surface text-center font-mono text-lg outline-none focus:bg-brand/10 ${
                        cell.kind === "carry" ? "text-sm text-muted" : ""
                      }`}
                      style={{ gridColumn: c + 1, gridRow: r + 1 }}
                    />
                  );
                }
                return (
                  <div
                    key={key}
                    className={`flex h-10 items-center justify-center bg-card font-mono text-lg ${
                      cell?.kind === "operator" ? "text-muted" : ""
                    }`}
                    style={{ gridColumn: c + 1, gridRow: r + 1 }}
                  >
                    {cell?.value ?? ""}
                  </div>
                );
              }),
            )}
          </div>
        </div>
      )}

      {grid && (
        <ol className="list-inside list-decimal space-y-1 text-xs text-muted">
          {grid.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      )}
    </section>
  );
}
