"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createFlashcard } from "../actions";

export function CardForm({ sourceNoteId }: { sourceNoteId: string | null }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (!front.trim() || !back.trim()) {
      setErrorMsg("Front and back both need text.");
      return;
    }
    setSaving(true);
    startTransition(async () => {
      const res = await createFlashcard({
        front:        front.trim(),
        back:         back.trim(),
        sourceNoteId,
      });
      if (res.ok) {
        router.push("/flashcards");
      } else {
        setErrorMsg(res.error);
        setSaving(false);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-xs font-medium uppercase tracking-wider text-muted">
          Front (prompt)
        </span>
        <textarea
          value={front}
          onChange={(e) => setFront(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          placeholder="What's the cue?"
          autoFocus
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium uppercase tracking-wider text-muted">
          Back (answer)
        </span>
        <textarea
          value={back}
          onChange={(e) => setBack(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          placeholder="What's the response?"
        />
      </label>

      {errorMsg && (
        <p className="rounded-lg bg-border/50 px-3 py-2 text-sm">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save card"}
      </button>
    </form>
  );
}
