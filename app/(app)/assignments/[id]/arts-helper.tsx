"use client";

import { useMemo, useState, useTransition } from "react";
import { requestArtsScaffold } from "./ai-tools-actions";
import { buildScale, buildTriad, intervalName, type ScaleMode } from "@/lib/arts/music";
import { fallbackArtsScaffold, type ArtsMode, type ArtsScaffoldResult } from "@/lib/arts/scaffold";

const MODES: Array<{ value: ArtsMode; label: string }> = [
  { value: "art_reflection", label: "Art reflection" },
  { value: "music_theory", label: "Music theory" },
  { value: "drama_speech", label: "Drama / speech" },
  { value: "art_history", label: "AP Art History" },
  { value: "storyboard", label: "Photo / film" },
];

export function ArtsHelper({
  assignmentId,
  classAiMode,
  initialPrompt,
}: {
  assignmentId: string;
  classAiMode: "red" | "yellow" | "green";
  initialPrompt: string;
}) {
  const [mode, setMode] = useState<ArtsMode>("art_reflection");
  const [prompt, setPrompt] = useState(initialPrompt);
  const [result, setResult] = useState<ArtsScaffoldResult>(fallbackArtsScaffold("art_reflection"));
  const [root, setRoot] = useState("C");
  const [scaleMode, setScaleMode] = useState<ScaleMode>("major");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const music = useMemo(() => {
    const scale = buildScale(root, scaleMode);
    return {
      scale,
      triad: buildTriad(root, scaleMode),
      fifth: intervalName(7),
    };
  }, [root, scaleMode]);

  function changeMode(nextMode: ArtsMode) {
    setMode(nextMode);
    setResult(fallbackArtsScaffold(nextMode));
  }

  function run() {
    setStatus(null);
    startTransition(async () => {
      const res = await requestArtsScaffold({
        assignmentId,
        aiMode: classAiMode,
        mode,
        prompt,
      });
      if (!res.ok) {
        setStatus(res.error);
        return;
      }
      setResult(res.result);
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="space-y-1">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted">Arts & electives helper</h2>
        <p className="text-sm text-muted">Start with your process, then ask Diana for a scaffold.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {MODES.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => changeMode(item.value)}
            className={`rounded-md border px-3 py-2 text-sm ${
              mode === item.value ? "border-accent bg-accent/10 text-accent" : "border-border bg-background"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-background p-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">Answer these first</p>
        <ul className="mt-2 space-y-1 text-sm">
          {result.prompts.map((item) => (
            <li key={item}>- {item}</li>
          ))}
        </ul>
      </div>

      {mode === "music_theory" && (
        <div className="grid gap-3 rounded-xl border border-border bg-background p-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Root</span>
            <input
              value={root}
              onChange={(event) => setRoot(event.target.value)}
              maxLength={2}
              className="w-full rounded-md border border-border bg-card px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Mode</span>
            <select
              value={scaleMode}
              onChange={(event) => setScaleMode(event.target.value as ScaleMode)}
              className="w-full rounded-md border border-border bg-card px-3 py-2"
            >
              <option value="major">Major</option>
              <option value="minor">Natural minor</option>
            </select>
          </label>
          <p className="text-sm md:col-span-2">
            Scale: {music.scale.join(" - ") || "Pick a root note"} | Triad: {music.triad.join(" - ") || "Pick a root note"} | Fifth: {music.fifth}
          </p>
        </div>
      )}

      <textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        rows={5}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        placeholder="Paste the assignment, your draft reflection, lyrics, scene, or shot idea."
      />

      <button
        type="button"
        onClick={run}
        disabled={pending || classAiMode !== "green" || prompt.trim().length < 2}
        className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        Build scaffold
      </button>
      {classAiMode !== "green" && <p className="text-sm text-muted">AI help is off for this class.</p>}
      {status && <p className="text-sm text-muted">{status}</p>}

      <div className="grid gap-3 md:grid-cols-2">
        {result.cards.map((card) => (
          <article key={`${card.title}-${card.action}`} className="rounded-xl border border-border bg-background p-3">
            <h3 className="text-sm font-medium">{card.title}</h3>
            <p className="mt-1 text-sm text-muted">{card.body}</p>
            <p className="mt-2 text-xs text-accent">{card.action}</p>
          </article>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-background p-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">Checklist</p>
        <ul className="mt-2 space-y-1 text-sm">
          {result.checklist.map((item) => (
            <li key={item}>- {item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
