"use client";

import { useId, useState, useTransition } from "react";
import { FileText, Upload } from "lucide-react";
import { importIepText } from "./lms-actions";
import { IEP_TEXT_LIMIT, readIepFile } from "./iep-file-reader";

type ImportSummary = {
  extraTimePct: number | null;
  accommodations: string[];
  ttsEnabled: boolean;
  dyslexiaFont: boolean;
  fontSize: string;
  lineSpacing: string;
};

export function IepImport() {
  const id = useId();
  const [reading, setReading] = useState(false);
  const [text, setText] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [banner, setBanner] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [pending, startTransition] = useTransition();

  const busy = pending || reading;

  async function handleFile(file: File | null) {
    if (!file || busy) return;
    setReading(true);
    setBanner(null);
    setSummary(null);
    setSourceName(file.name);
    setText("");
    try {
      setText(await readIepFile(file));
      setBanner("Document text is ready. Review it before applying accommodations.");
    } catch (error) {
      setBanner(error instanceof Error ? error.message : "Could not read that file. Paste the text instead.");
    } finally { setReading(false); }
  }

  function submit() {
    if (busy) return;
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
            accept=".txt,.md,.pdf,text/plain,text/markdown,application/pdf"
            disabled={busy}
            aria-describedby={`${id}-help`}
            className="sr-only"
            onChange={(event) => { void handleFile(event.target.files?.[0] ?? null); event.currentTarget.value = ""; }}
          />
        </label>
      </div>

      <p id={`${id}-help`}>Choose a PDF, text, or Markdown document up to 10 MB. PDF text is read on this device. Scanned pages need pasted text.</p>
      <label htmlFor={`${id}-name`}>Document name</label>
      <input
        id={`${id}-name`}
        disabled={busy}
        value={sourceName}
        onChange={(event) => setSourceName(event.target.value)}
        placeholder="Document name"
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <label htmlFor={`${id}-text`}>Accommodation text</label>
      <textarea
        id={`${id}-text`}
        disabled={busy}
        maxLength={IEP_TEXT_LIMIT}
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={7}
        placeholder="Paste IEP or 504 accommodation text."
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />

      <button
        type="button"
        onClick={submit}
        disabled={busy || text.trim().length < 20}
        className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        <FileText size={14} />
        {reading ? "Reading document" : pending ? "Applying accommodations" : "Apply accommodations"}
      </button>

      {reading ? <p role="status">Reading document on this device…</p> : banner ? <p className="text-sm text-muted" role="status">{banner}</p> : null}
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
