"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { saveBreadcrumb } from "./actions";

/**
 * GAP-07: the "where were you?" affordance. Two enhancements over slice 1:
 *   (1) When the URL has ?focus=breadcrumb, auto-scroll to + focus the
 *       textarea. Used after a todo→drafting transition.
 *   (2) When a previous last_thought exists, show it as a callout above
 *       the textarea: "You left off here: ..." with an Update link that
 *       focuses the textarea so the student can refresh the note.
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("focus") === "breadcrumb" && textareaRef.current) {
      textareaRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      textareaRef.current.focus();
    }
  }, [searchParams]);

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
      {initial && (
        <div className="rounded-md border border-accent/30 bg-accent/5 p-2 text-xs text-accent">
          <p>You left off here: {initial}</p>
          <button
            type="button"
            onClick={() => textareaRef.current?.focus()}
            className="mt-1 text-[10px] underline hover:no-underline"
          >
            Still accurate? Update
          </button>
        </div>
      )}
      <textarea
        ref={textareaRef}
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
