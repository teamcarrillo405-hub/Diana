"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addRubric } from "./actions";

export function RubricForm({ classId }: { classId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) return setError("Give the rubric a name.");
    if (!text.trim()) return setError("Paste the rubric text.");
    startTransition(async () => {
      const result = await addRubric({
        classId,
        title: title.trim(),
        rawText: text.trim(),
      });
      if (result?.error) return setError(result.error);
      setTitle("");
      setText("");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-xl border border-border bg-card p-4"
    >
      <input
        placeholder="Rubric title (e.g. Lab report rubric)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-md border border-border bg-transparent px-3 py-2"
      />
      <textarea
        placeholder="Paste the rubric or grading criteria…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        className="w-full rounded-md border border-border bg-transparent px-3 py-2 font-mono text-sm"
      />
      <p className="text-xs text-muted">
        For now we save the rubric as text. When the AI features are turned on, Diana will
        parse it into a structured checklist you can use at submission time.
      </p>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save rubric"}
        </button>
      </div>
    </form>
  );
}
