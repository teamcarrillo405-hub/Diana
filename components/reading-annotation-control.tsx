"use client";

import { useState, useTransition } from "react";
import { Highlighter } from "lucide-react";
import { saveReadingAnnotation } from "./reading-support-actions";

export function ReadingAnnotationControl({
  selectedText,
  sourceType,
  sourceId,
}: {
  selectedText: string;
  sourceType: "note" | "assignment";
  sourceId: string;
}) {
  const [noteText, setNoteText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    if (!selectedText || !noteText.trim()) return;
    setStatus("Saving annotation...");
    startTransition(async () => {
      const result = await saveReadingAnnotation({
        sourceType,
        sourceId,
        selectedText,
        noteText,
        color: "amber",
      });
      if (result.ok) {
        setNoteText("");
        setStatus("Annotation saved.");
      } else {
        setStatus(result.error);
      }
    });
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-card/60 p-3">
      <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted">
        <Highlighter size={13} />
        Annotation
      </p>
      {selectedText ? (
        <>
          <p className="line-clamp-2 text-xs text-muted">{selectedText}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              className="min-w-0 flex-1 rounded-md border border-border bg-bg px-3 py-2 text-sm"
              placeholder="Add a note"
            />
            <button
              type="button"
              onClick={save}
              disabled={pending || !noteText.trim()}
              className="rounded-md border border-border px-3 py-2 text-sm hover:bg-border/30 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </>
      ) : (
        <p className="text-xs text-muted">Select text to add a note.</p>
      )}
      {status && <p className="text-xs text-muted">{status}</p>}
    </div>
  );
}
