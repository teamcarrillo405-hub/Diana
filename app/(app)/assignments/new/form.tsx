"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAssignment } from "./actions";

type ClassOption = { id: string; name: string; color: string };

export function NewAssignmentForm({ classes }: { classes: ClassOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [dueAt, setDueAt] = useState("");
  const [estimate, setEstimate] = useState("");
  const [difficulty, setDifficulty] = useState<number>(3);
  const [description, setDescription] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) return setError("Give the assignment a title.");
    if (!classId) return setError("Pick a class.");

    startTransition(async () => {
      const result = await createAssignment({
        title: title.trim(),
        classId,
        dueAt: dueAt || null,
        estimate: estimate ? Number(estimate) : null,
        difficulty,
        description: description.trim() || null,
      });
      if (result.error) return setError(result.error);
      router.push(`/assignments/${result.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-4">
      <Field label="Title">
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input"
          placeholder="e.g. Photosynthesis lab report"
        />
      </Field>

      <Field label="Class">
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className="input"
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Due">
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Estimate (min)">
          <input
            type="number"
            min={1}
            max={600}
            inputMode="numeric"
            value={estimate}
            onChange={(e) => setEstimate(e.target.value)}
            className="input"
            placeholder="e.g. 45"
          />
        </Field>
      </div>

      <Field label={`Difficulty: ${difficulty}/5`}>
        <input
          type="range"
          min={1}
          max={5}
          value={difficulty}
          onChange={(e) => setDifficulty(Number(e.target.value))}
          className="w-full"
        />
      </Field>

      <Field label="Notes">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="input"
          placeholder="What does the teacher want? Anything to remember?"
        />
      </Field>

      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add task"}
        </button>
      </div>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          border: 1px solid rgb(var(--border));
          background: rgb(var(--card));
          color: rgb(var(--fg));
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
        }
      `}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}
