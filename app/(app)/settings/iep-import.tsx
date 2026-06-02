"use client";

import { useState, useTransition } from "react";
import { FileText, Upload } from "lucide-react";
import { importIepText } from "./lms-actions";

type ImportSummary = {
  extraTimePct: number | null;
  accommodations: string[];
  ttsEnabled: boolean;
  dyslexiaFont: boolean;
  fontSize: string;
  lineSpacing: string;
};

export function IepImport() {
  const [text, setText] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [banner, setBanner] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleFile(file: File | null) {
    if (!file) return;
    setSourceName(file.name);
    try {
      setText(await file.text());
    } catch {
      setBanner("Could not read that file. Paste the text instead.");
    }
  }

  function submit() {
    const formData = new FormData();
    formData.set("text", text);
    formData.set("source_name", sourceName);
    startTransition(async () => {
      const res = await importIepText(formData);
      setBanner(res.message);
      if (res.ok && res.summary) setSummary(res.summary as ImportSummary);
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted">IEP / 504 import</h2>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-muted hover:bg-border/30">
          <Upload size={13} />
          Upload
          <input
            type="file"
            accept=".txt,.md,.pdf,text/*,application/pdf"
            className="sr-only"
            onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <input
        value={sourceName}
        onChange={(event) => setSourceName(event.target.value)}
        placeholder="Document name"
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={7}
        placeholder="Paste IEP or 504 accommodation text."
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />

      <button
        type="button"
        onClick={submit}
        disabled={pending || text.trim().length < 20}
        className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        <FileText size={14} />
        Apply accommodations
      </button>

      {banner && <p className="text-sm text-muted">{banner}</p>}
      {summary && (
        <div className="grid gap-2 text-sm md:grid-cols-2">
          <p className="rounded-md border border-border bg-background px-3 py-2">
            Extra time: {summary.extraTimePct ?? 0}%
          </p>
          <p className="rounded-md border border-border bg-background px-3 py-2">
            TTS: {summary.ttsEnabled ? "on" : "unchanged"}
          </p>
          <p className="rounded-md border border-border bg-background px-3 py-2">
            Reading font: {summary.dyslexiaFont ? "dyslexia-friendly" : "unchanged"}
          </p>
          <p className="rounded-md border border-border bg-background px-3 py-2">
            Accommodations: {summary.accommodations.join(", ") || "none detected"}
          </p>
        </div>
      )}
    </section>
  );
}
