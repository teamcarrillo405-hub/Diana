"use client";

import { useState, useTransition } from "react";
import { saveBreadcrumb } from "./actions";

/**
 * The "where were you?" affordance. ADHD interrupt-recovery costs 10-25 min
 * per context switch — this captures a single sentence the student can come
 * back to.
 */
export function Breadcrumb({
  assignmentId,
  initial,
}: {
  assignmentId: string;
  initial: string;
}) {
  const [text, setText] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function save() {
    if (text === initial) return;
    startTransition(async () => {
      await saveBreadcrumb({ id: assignmentId, text });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  }

  return (
    <section className="space-y-2 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          Where were you?
        </p>
        {pending && <span className="text-xs text-muted">Saving…</span>}
        {saved && !pending && <span className="text-xs text-ok">Saved.</span>}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={save}
        placeholder="One line so you can pick up where you left off. (e.g. 'About to write the second body paragraph about WW1 alliances.')"
        rows={2}
        className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
      />
      <p className="text-xs text-muted">
        Saved when you click out of the box. Diana will show this back to you next time.
      </p>
    </section>
  );
}
