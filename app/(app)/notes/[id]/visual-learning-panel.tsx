"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarDays, GitBranch, ImageIcon, Network, Sparkles, Table2 } from "lucide-react";
import { AiTooltip } from "@/components/ai-tooltip";
import type {
  DiagramAnnotationResult,
  VisualNode,
  VisualToolMode,
  VisualToolResult,
} from "@/lib/visual-learning/tools";
import { buildColorOutline } from "@/lib/visual-learning/tools";
import type { OutlineNode } from "@/lib/notes/types";
import {
  annotateDiagram,
  generateVisualTool,
  uploadDiagramImage,
} from "./actions";

const MODES: Array<{ mode: VisualToolMode; label: string; icon: typeof Network }> = [
  { mode: "mind_map", label: "Mind map", icon: Network },
  { mode: "concept_graph", label: "Concept graph", icon: GitBranch },
  { mode: "timeline", label: "Timeline", icon: CalendarDays },
  { mode: "comparison_table", label: "Compare", icon: Table2 },
];

export function VisualLearningPanel({
  noteId,
  title,
  text,
  outline,
}: {
  noteId: string;
  title: string;
  text: string;
  outline: OutlineNode[] | null;
}) {
  const [activeMode, setActiveMode] = useState<VisualToolMode>("mind_map");
  const [result, setResult] = useState<VisualToolResult | null>(null);
  const [diagram, setDiagram] = useState<DiagramAnnotationResult | null>(null);
  const [diagramPreview, setDiagramPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const colorOutline = useMemo(() => buildColorOutline(outline), [outline]);

  function runVisualTool(mode: VisualToolMode) {
    setActiveMode(mode);
    setStatus(null);
    startTransition(async () => {
      const res = await generateVisualTool({ noteId, mode });
      if (res.ok) {
        setResult(res.result);
      } else {
        setStatus(res.error);
      }
    });
  }

  function handleDiagramFile(file: File | null) {
    if (!file) return;
    setDiagram(null);
    setStatus(null);
    const previewUrl = URL.createObjectURL(file);
    setDiagramPreview(previewUrl);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("diagram", file);
      const upload = await uploadDiagramImage(formData);
      if (!upload.ok) {
        setStatus(upload.error);
        return;
      }
      const annotated = await annotateDiagram({ noteId, storageKey: upload.storageKey });
      if (annotated.ok) {
        setDiagram(annotated.result);
      } else {
        setStatus(annotated.error);
      }
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
          Visual learning
        </h2>
        {(result || diagram) && <AiTooltip feature="visual_tool" />}
      </div>

      {colorOutline.length > 0 && (
        <div className="grid gap-2 md:grid-cols-2">
          {colorOutline.slice(0, 6).map((band) => (
            <div key={band.heading} className={`rounded-md border-l-4 border-y border-r border-border p-3 ${band.color}`}>
              <p className="text-sm font-medium">{band.heading}</p>
              <ul className="mt-1 space-y-1 text-xs text-muted">
                {band.bullets.slice(0, 3).map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap gap-2">
          {MODES.map(({ mode, label, icon: Icon }) => (
            <button
              key={mode}
              type="button"
              onClick={() => runVisualTool(mode)}
              aria-pressed={activeMode === mode}
              disabled={pending || text.trim().length < 20}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${
                activeMode === mode
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted hover:bg-border/30"
              } disabled:opacity-50`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        <div className="mt-3">
          {!result && (
            <p className="text-sm text-muted">
              Build a study visual from this note.
            </p>
          )}
          {result && <VisualResult result={result} />}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <ImageIcon size={14} className="text-muted" />
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Diagram annotation</p>
        </div>
        <label className="mt-3 block">
          <span className="sr-only">Pick a diagram image</span>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.gif,image/*"
            onChange={(event) => handleDiagramFile(event.target.files?.[0] ?? null)}
            disabled={pending}
            className="block w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-2 file:py-1 file:text-xs file:font-medium file:text-white disabled:opacity-50"
          />
        </label>
        {diagramPreview && (
          <div className="relative mt-3 overflow-hidden rounded-md border border-border bg-background">
            <img src={diagramPreview} alt="Diagram preview" className="max-h-96 w-full object-contain" />
            {diagram?.annotations.map((annotation) => (
              <span
                key={`${annotation.label}-${annotation.x}-${annotation.y}`}
                className="absolute rounded-md border border-accent bg-background/90 px-2 py-1 text-xs shadow-sm"
                style={{ left: `${annotation.x}%`, top: `${annotation.y}%`, transform: "translate(-50%, -50%)" }}
              >
                {annotation.label}
              </span>
            ))}
          </div>
        )}
        {diagram && (
          <div className="mt-3 space-y-2">
            <p className="text-sm font-medium">{diagram.title}</p>
            <ul className="space-y-1 text-sm text-muted">
              {diagram.annotations.map((annotation) => (
                <li key={`${annotation.label}-${annotation.prompt}`}>
                  <span className="font-medium text-foreground">{annotation.label}:</span> {annotation.prompt}
                </li>
              ))}
            </ul>
            <p className="rounded-md border border-border bg-background px-3 py-2 text-sm">
              {diagram.quizPrompt}
            </p>
          </div>
        )}
      </div>

      {pending && (
        <p className="inline-flex items-center gap-1.5 text-sm text-muted">
          <Sparkles size={14} />
          Building visual...
        </p>
      )}
      {status && <p className="text-sm text-muted">{status}</p>}
    </section>
  );
}

function VisualResult({ result }: { result: VisualToolResult }) {
  if (result.mode === "timeline") return <TimelineView result={result} />;
  if (result.mode === "comparison_table") return <ComparisonView result={result} />;
  return <NetworkView result={result} />;
}

function NetworkView({ result }: { result: VisualToolResult }) {
  const positioned = positionNodes(result.nodes);
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{result.title}</p>
      <div className="relative h-72 overflow-hidden rounded-md border border-border bg-background">
        <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
          {result.edges.map((edge, index) => {
            const from = positioned.get(edge.from);
            const to = positioned.get(edge.to);
            if (!from || !to) return null;
            return (
              <line
                key={`${edge.from}-${edge.to}-${index}`}
                x1={`${from.x}%`}
                y1={`${from.y}%`}
                x2={`${to.x}%`}
                y2={`${to.y}%`}
                stroke="currentColor"
                className="text-border"
              />
            );
          })}
        </svg>
        {result.nodes.map((node) => {
          const pos = positioned.get(node.id) ?? { x: 50, y: 50 };
          return (
            <div
              key={node.id}
              className="absolute max-w-32 rounded-md border border-border bg-card px-2 py-1 text-center text-xs shadow-sm"
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)" }}
            >
              {node.label}
            </div>
          );
        })}
      </div>
      {result.edges.length > 0 && (
        <ul className="grid gap-1 text-xs text-muted md:grid-cols-2">
          {result.edges.slice(0, 8).map((edge, index) => (
            <li key={`${edge.from}-${edge.to}-label-${index}`}>
              {labelFor(result.nodes, edge.from)} {"->"} {labelFor(result.nodes, edge.to)}
              {edge.label ? `: ${edge.label}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TimelineView({ result }: { result: VisualToolResult }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{result.title}</p>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {result.events.length > 0 ? result.events.map((event) => (
          <div key={`${event.date}-${event.label}`} className="min-w-56 rounded-md border border-border bg-background p-3">
            <p className="text-xs font-medium text-accent">{event.date}</p>
            <p className="mt-1 text-sm font-medium">{event.label}</p>
            <p className="mt-1 text-xs text-muted">{event.note}</p>
          </div>
        )) : (
          <p className="text-sm text-muted">No dated events found yet.</p>
        )}
      </div>
    </div>
  );
}

function ComparisonView({ result }: { result: VisualToolResult }) {
  return (
    <div className="space-y-3 overflow-x-auto">
      <p className="text-sm font-medium">{result.title}</p>
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border border-border bg-background px-3 py-2 text-left text-xs text-muted">Focus</th>
            {result.columns.map((column) => (
              <th key={column} className="border border-border bg-background px-3 py-2 text-left text-xs text-muted">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row) => (
            <tr key={row.label}>
              <td className="border border-border px-3 py-2 font-medium">{row.label}</td>
              {result.columns.map((column, index) => (
                <td key={`${row.label}-${column}`} className="border border-border px-3 py-2 text-muted">
                  {row.values[index] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function positionNodes(nodes: VisualNode[]): Map<string, { x: number; y: number }> {
  const positioned = new Map<string, { x: number; y: number }>();
  if (nodes.length === 0) return positioned;
  positioned.set(nodes[0].id, { x: 50, y: 50 });
  const rest = nodes.slice(1);
  rest.forEach((node, index) => {
    const angle = (index / Math.max(1, rest.length)) * Math.PI * 2 - Math.PI / 2;
    positioned.set(node.id, {
      x: 50 + Math.cos(angle) * 34,
      y: 50 + Math.sin(angle) * 34,
    });
  });
  return positioned;
}

function labelFor(nodes: VisualNode[], id: string): string {
  return nodes.find((node) => node.id === id)?.label ?? id;
}
