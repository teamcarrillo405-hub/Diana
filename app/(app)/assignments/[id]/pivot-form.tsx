"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { pivotAssignment } from "./actions";

/**
 * GAP-07: inline pivot form. Toggles open from a "Pause and revisit" button.
 * Submits drafting→todo with a one-line "what changed?" note.
 * Uses "Pause and revisit" copy instead of "Pivot" per Pitfall 6 — semantically
 * we land in `todo` and the student should feel pause, not failure.
 */
export function PivotForm({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await pivotAssignment({ id: assignmentId, note });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setNote("");
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-muted underline hover:text-fg"
      >
        Pause and revisit
      </button>
    );
  }

  return (
    <section className="space-y-2 rounded-2xl border border-border bg-card p-5">
      <p className="text-sm font-medium">What changed?</p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="One sentence is plenty. (e.g. 'Stuck on outline — moving to history reading first.')"
        rows={3}
        maxLength={500}
        className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
      />
      {error && (
        <p className="text-xs text-danger">{error}</p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Pause this"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setNote("");
            setError(null);
          }}
          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:bg-border/30"
        >
          Cancel
        </button>
      </div>
    </section>
  );
}
