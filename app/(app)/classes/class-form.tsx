"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClass } from "./actions";

const COLORS = ["slate", "indigo", "emerald", "amber", "rose", "sky", "violet"] as const;

export function ClassForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [teacher, setTeacher] = useState("");
  const [color, setColor] = useState<(typeof COLORS)[number]>("indigo");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Give the class a name.");
    startTransition(async () => {
      const result = await createClass({ name: name.trim(), teacher: teacher.trim() || null, color });
      if (result?.error) return setError(result.error);
      setName("");
      setTeacher("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">
          <span>Class name</span>
          <input
            placeholder="English 9"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="nexus-input"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          <span>Teacher</span>
          <input
            placeholder="Optional"
            value={teacher}
            onChange={(e) => setTeacher(e.target.value)}
            className="nexus-input"
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-black uppercase tracking-[0.18em] text-muted">Lane color</span>
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={c}
            onClick={() => setColor(c)}
            className={`size-7 bg-${c}-500 transition ${
              color === c ? "ring-2 ring-fg ring-offset-2 ring-offset-surface" : ""
            }`}
          />
        ))}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="nexus-button nexus-button-primary px-4 py-2 text-sm disabled:opacity-50"
        >
          {pending ? "Adding..." : "Add class"}
        </button>
      </div>
    </form>
  );
}
