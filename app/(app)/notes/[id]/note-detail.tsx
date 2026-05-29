"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Trash2 } from "lucide-react";
import { TtsHighlightButton } from "@/components/tts-highlight-button";
import type { OutlineNode } from "@/lib/notes/types";
import { deleteNote, triggerTranscript } from "./actions";

export function NoteDetail({
  id,
  bodyText,
  transcriptText,
  outline,
}: {
  id: string;
  bodyText: string;
  transcriptText: string | null;
  outline: OutlineNode[] | null;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [transcribing, setTranscribing] = useState(false);
  const [askingDelete, setAskingDelete] = useState(false);

  function handleTranscribe() {
    setTranscribing(true);
    startTransition(async () => {
      await triggerTranscript({ id });
      // Fire-and-forget: refresh in 3 s, then again at 8 s if still null.
      setTimeout(() => router.refresh(), 3000);
      setTimeout(() => router.refresh(), 8000);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteNote({ id });
      if (res.ok) router.push("/notes");
    });
  }

  return (
    <div className="space-y-6">
      {/* Body — what the student wrote/dictated */}
      <section className="space-y-2">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
          Your notes
        </h2>
        <p className="reading-view whitespace-pre-wrap rounded-lg border border-border bg-card p-4 text-sm">
          {bodyText || "(empty)"}
        </p>
      </section>

      {/* Transcript — AI-cleaned version, if generated */}
      {transcriptText ? (
        <section className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
            Cleaned transcript
          </h2>
          <div className="reading-view rounded-lg border border-border bg-card p-4">
            <TtsHighlightButton text={transcriptText} />
            <p className="mt-3 whitespace-pre-wrap text-sm">{transcriptText}</p>
          </div>
        </section>
      ) : (
        <section className="space-y-2">
          <button
            type="button"
            onClick={handleTranscribe}
            disabled={transcribing || !bodyText.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-border/30 disabled:opacity-50"
          >
            <Sparkles size={14} />
            {transcribing ? "Thinking\u2026" : "Generate transcript + outline"}
          </button>
        </section>
      )}

      {/* Outline — AI structure, if generated */}
      {outline && outline.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
            Outline
          </h2>
          <div className="space-y-3 rounded-lg border border-border bg-card p-4">
            {outline.map((node, i) => (
              <div key={i}>
                <p className="text-sm font-medium">{node.heading}</p>
                <ul className="ml-4 list-disc space-y-1 text-sm text-muted">
                  {node.bullets.map((b, j) => <li key={j}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Delete — single confirmation, calm copy */}
      <section className="border-t border-border pt-4">
        {!askingDelete ? (
          <button
            type="button"
            onClick={() => setAskingDelete(true)}
            className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg"
          >
            <Trash2 size={13} />
            Delete this note
          </button>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted">Delete this note?</span>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-md bg-accent px-3 py-1 text-sm font-medium text-white"
            >
              Yes, delete
            </button>
            <button
              type="button"
              onClick={() => setAskingDelete(false)}
              className="rounded-md border border-border bg-card px-3 py-1 text-sm hover:bg-border/30"
            >
              Keep
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
