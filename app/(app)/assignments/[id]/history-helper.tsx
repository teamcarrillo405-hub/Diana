"use client";

import { useState } from "react";
import { Columns3, FileText, GitBranch, Landmark, Map, Newspaper, ScrollText, Upload } from "lucide-react";
import { AiTooltip } from "@/components/ai-tooltip";
import { SubjectToolShell } from "@/components/subject-tool-shell";
import {
  requestHistoryMapAnnotation,
  requestHistoryScaffold,
  uploadHistoryMapImage,
} from "./ai-tools-actions";
import type {
  HistoryScaffoldMode,
  HistoryScaffoldResult,
  MapAnnotationResult,
} from "@/lib/history/scaffold";

const MODES: Array<{ mode: HistoryScaffoldMode; label: string; icon: typeof Landmark }> = [
  { mode: "primary_source", label: "Source", icon: FileText },
  { mode: "cause_effect", label: "Cause", icon: GitBranch },
  { mode: "happ", label: "HAPP", icon: Landmark },
  { mode: "dbq", label: "DBQ", icon: ScrollText },
  { mode: "compare", label: "Compare", icon: Columns3 },
  { mode: "current_events", label: "Today", icon: Newspaper },
];

export function HistoryHelper({
  assignmentId,
  classAiMode,
  initialPrompt,
}: {
  assignmentId: string;
  classAiMode: "red" | "yellow" | "green";
  initialPrompt: string;
}) {
  const [open, setOpen] = useState(false);
  const [sourceText, setSourceText] = useState(initialPrompt);
  const [activeMode, setActiveMode] = useState<HistoryScaffoldMode>("primary_source");
  const [result, setResult] = useState<HistoryScaffoldResult | null>(null);
  const [mapResult, setMapResult] = useState<MapAnnotationResult | null>(null);
  const [mapPreview, setMapPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  if (classAiMode === "red" || classAiMode === "yellow") return null;

  async function runMode(mode: HistoryScaffoldMode) {
    if (!sourceText.trim()) return;
    setActiveMode(mode);
    setLoading(true);
    setStatus(null);
    const res = await requestHistoryScaffold({
      assignmentId,
      aiMode: classAiMode,
      mode,
      sourceText,
    });
    if (res.ok) setResult(res.result);
    else setStatus(res.error);
    setLoading(false);
  }

  async function handleSourceFile(file: File | null) {
    if (!file) return;
    setStatus(null);
    try {
      const text = await file.text();
      setSourceText(text.slice(0, 10000));
    } catch {
      setStatus("We couldn't read that source. Paste the text instead.");
    }
  }

  async function handleMapFile(file: File | null) {
    if (!file) return;
    setMapResult(null);
    setStatus(null);
    setLoading(true);
    setMapPreview(URL.createObjectURL(file));
    const formData = new FormData();
    formData.append("historyMap", file);
    const upload = await uploadHistoryMapImage(formData);
    if (!upload.ok) {
      setStatus(upload.error);
      setLoading(false);
      return;
    }
    const annotated = await requestHistoryMapAnnotation({
      assignmentId,
      aiMode: classAiMode,
      storageKey: upload.storageKey,
    });
    if (annotated.ok) setMapResult(annotated.result);
    else setStatus(annotated.error);
    setLoading(false);
  }

  return (
    <SubjectToolShell
      theme="history"
      eyebrow="History desk"
      title={open ? "Source analysis cards" : "Open source desk"}
      subtitle={open ? "Source, cause, context, and map work in one place." : "Break sources into usable evidence."}
      icon={Landmark}
    >
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="touch-target inline-flex w-full items-center justify-center gap-2 rounded-xl border border-subject-history/25 bg-surface-raised px-4 py-2 text-sm font-medium text-amber-700 hover:bg-subject-history/10 dark:text-amber-300"
        >
          <Landmark size={13} />
          Open source desk
        </button>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">History scaffold</p>
              {(result || mapResult) && <AiTooltip feature="history_scaffold" />}
            </div>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-muted hover:bg-border/30">
              <Upload size={13} />
              Source
              <input
                type="file"
                accept=".txt,.md,.csv,text/*"
                className="sr-only"
                onChange={(event) => handleSourceFile(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <textarea
            value={sourceText}
            onChange={(event) => setSourceText(event.target.value)}
            placeholder="Paste the source, DBQ prompt, event, or comparison set."
            rows={6}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />

          <div className="flex flex-wrap gap-2">
            {MODES.map(({ mode, label, icon: Icon }) => (
              <button
                key={mode}
                type="button"
                onClick={() => runMode(mode)}
                aria-pressed={activeMode === mode}
                disabled={loading || !sourceText.trim()}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${
                  activeMode === mode
                    ? "border-subject-history bg-subject-history/10 text-amber-700 dark:text-amber-300"
                    : "border-border text-muted hover:bg-border/30"
                } disabled:opacity-50`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {result && <HistoryResult result={result} />}

          <div className="rounded-lg border border-border bg-background p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Map size={14} className="text-muted" />
                <p className="text-xs font-medium uppercase tracking-wider text-muted">Map annotation</p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-muted hover:bg-border/30">
                <Upload size={13} />
                Map
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.gif,image/*"
                  className="sr-only"
                  onChange={(event) => handleMapFile(event.target.files?.[0] ?? null)}
                  disabled={loading}
                />
              </label>
            </div>
            {mapPreview && (
              <div className="relative mt-3 overflow-hidden rounded-md border border-border bg-card">
                <img src={mapPreview} alt="Map preview" className="max-h-96 w-full object-contain" />
                {mapResult?.annotations.map((annotation) => (
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
            {mapResult && (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-medium">{mapResult.title}</p>
                <ul className="grid gap-1 text-sm text-muted md:grid-cols-2">
                  {mapResult.annotations.map((annotation) => (
                    <li key={`${annotation.label}-${annotation.prompt}`}>
                      <span className="font-medium text-foreground">{annotation.label}:</span> {annotation.prompt}
                    </li>
                  ))}
                </ul>
                <p className="rounded-md border border-border bg-card px-3 py-2 text-sm">
                  {mapResult.quizPrompt}
                </p>
              </div>
            )}
          </div>

          {loading && <p className="text-sm text-muted">Thinking...</p>}
          {status && <p className="text-sm text-muted">{status}</p>}
        </>
      )}
    </SubjectToolShell>
  );
}

function HistoryResult({ result }: { result: HistoryScaffoldResult }) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card/60 p-4">
      <p className="text-sm font-medium">{result.title}</p>

      <div className="grid gap-2 md:grid-cols-2">
        {result.cards.map((card) => (
          <div key={`${card.label}-${card.prompt}`} className="rounded-md border border-border bg-background p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">{card.label}</p>
            <p className="mt-1 text-sm">{card.prompt}</p>
            {card.sentenceFrame && <p className="mt-2 text-xs text-muted">{card.sentenceFrame}</p>}
            {card.evidenceHint && <p className="mt-1 text-xs text-muted">{card.evidenceHint}</p>}
          </div>
        ))}
      </div>

      {result.happ.length > 0 && (
        <div className="grid gap-2 md:grid-cols-2">
          {result.happ.map((field) => (
            <div key={field.key} className="rounded-md border border-border bg-background p-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">{happLabel(field.key)}</p>
              <p className="mt-1 text-sm">{field.prompt}</p>
              {field.evidenceHint && <p className="mt-2 text-xs text-muted">{field.evidenceHint}</p>}
            </div>
          ))}
        </div>
      )}

      {result.causeEffect.length > 0 && (
        <ol className="space-y-2 text-sm">
          {result.causeEffect.map((link, index) => (
            <li key={`${link.cause}-${link.effect}`} className="rounded-md border border-border bg-background p-3">
              <span className="text-xs font-medium text-muted">Chain {index + 1}</span>
              <p className="mt-1">
                <span className="font-medium">{link.cause}</span>
                {` ${link.connector ?? "led to"} `}
                <span className="font-medium">{link.effect}</span>
              </p>
            </li>
          ))}
        </ol>
      )}

      {result.dbqOutline.length > 0 && (
        <div className="grid gap-2 md:grid-cols-2">
          {result.dbqOutline.map((paragraph) => (
            <div key={`${paragraph.label}-${paragraph.goal}`} className="rounded-md border border-border bg-background p-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">{paragraph.label}</p>
              <p className="mt-1 text-sm">{paragraph.goal}</p>
              {paragraph.evidenceSlots.length > 0 && (
                <p className="mt-2 text-xs text-muted">{paragraph.evidenceSlots.join(" / ")}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {result.comparison.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-border bg-background px-3 py-2 text-left text-xs text-muted">Lens</th>
                <th className="border border-border bg-background px-3 py-2 text-left text-xs text-muted">First</th>
                <th className="border border-border bg-background px-3 py-2 text-left text-xs text-muted">Second</th>
                <th className="border border-border bg-background px-3 py-2 text-left text-xs text-muted">Bridge</th>
              </tr>
            </thead>
            <tbody>
              {result.comparison.map((row) => (
                <tr key={`${row.lens}-${row.first}-${row.second}`}>
                  <td className="border border-border px-3 py-2 font-medium">{row.lens}</td>
                  <td className="border border-border px-3 py-2 text-muted">{row.first}</td>
                  <td className="border border-border px-3 py-2 text-muted">{row.second}</td>
                  <td className="border border-border px-3 py-2 text-muted">{row.bridge ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.currentConnections.length > 0 && (
        <div className="grid gap-2 md:grid-cols-2">
          {result.currentConnections.map((connection) => (
            <div key={`${connection.then}-${connection.now}`} className="rounded-md border border-border bg-background p-3">
              <p className="text-sm">
                <span className="font-medium">Then:</span> {connection.then}
              </p>
              <p className="mt-1 text-sm">
                <span className="font-medium">Now:</span> {connection.now}
              </p>
              <p className="mt-2 text-xs text-muted">{connection.bridgeQuestion}</p>
            </div>
          ))}
        </div>
      )}

      <p className="rounded-md border border-border bg-background px-3 py-2 text-sm">{result.checkPrompt}</p>
    </div>
  );
}

function happLabel(key: string): string {
  return key === "historical_context"
    ? "Historical context"
    : key === "point_of_view"
    ? "Point of view"
    : key.charAt(0).toUpperCase() + key.slice(1);
}
