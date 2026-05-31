"use client";
import { useState } from "react";
import { Pencil } from "lucide-react";
import { requestWritingAid } from "./ai-tools-actions";
import { AiTooltip } from "@/components/ai-tooltip";

interface WritingAidProps {
  assignmentId: string;
  classAiMode: "red" | "yellow" | "green";
}

export function WritingAid({ assignmentId, classAiMode }: WritingAidProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Writing aid is hidden on red (AI fully off) and yellow (citations only)
  if (classAiMode === "red" || classAiMode === "yellow") return null;

  async function send() {
    if (!text.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    const res = await requestWritingAid({
      assignmentId,
      aiMode: classAiMode,
      prompt: text,
    });
    if ("error" in res) setErrorMsg(res.error);
    else setResult(res.content);
    setLoading(false);
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground"
        >
          <Pencil size={13} />
          Check a sentence
        </button>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">
                Writing aid
              </p>
              {result && <AiTooltip feature="writing_aid" />}
            </div>
            <p className="text-xs text-muted">Diana explains, you rewrite.</p>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste a sentence or short paragraph you want feedback on."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            rows={4}
          />
          {errorMsg && (
            <p className="rounded border border-amber-500/40 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
              {errorMsg}
            </p>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={send}
              disabled={loading || !text.trim()}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? "Thinking…" : "Explain the rule"}
            </button>
          </div>
          {result && (
            <div className="rounded-xl border border-border bg-card/60 p-4 text-sm leading-relaxed whitespace-pre-wrap">
              {result}
            </div>
          )}
        </>
      )}
    </section>
  );
}
