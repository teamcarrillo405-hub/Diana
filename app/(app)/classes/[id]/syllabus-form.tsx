"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addSyllabus } from "./actions";

export function SyllabusForm({ classId }: { classId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) return setError("Give the syllabus a name.");
    if (!text.trim()) return setError("Paste the syllabus text.");
    startTransition(async () => {
      const result = await addSyllabus({
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
    <form onSubmit={onSubmit} className="class-rubric-form">
      <input
        placeholder="Syllabus title (e.g. Biology 9: Fall syllabus)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="nexus-input"
      />
      <textarea
        placeholder="Paste the syllabus text: Diana pulls out key dates and policies..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        className="nexus-input font-mono text-sm"
      />
      <p>
        Diana scans for due dates, grading, late-work, and integrity policies so the important parts stay visible.
      </p>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="nexus-button nexus-button-primary disabled:opacity-50">
          {pending ? "Saving..." : "Save syllabus"}
        </button>
      </div>
    </form>
  );
}
