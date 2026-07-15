"use client";

import { useState, useTransition } from "react";
import { Mail } from "lucide-react";
import { saveParentDigest } from "./digest-actions";

/** Weekly parent digest opt-in — fully student-controlled. */
export function ParentDigestForm({
  initialEmail,
  initialEnabled,
}: {
  initialEmail: string;
  initialEnabled: boolean;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(nextEnabled: boolean) {
    setStatus(null);
    startTransition(async () => {
      const result = await saveParentDigest({ email: email.trim(), enabled: nextEnabled });
      if (result.ok) {
        setEnabled(nextEnabled && email.trim().length > 0);
        setStatus(nextEnabled && email.trim() ? "On: one short email each Sunday." : "Saved.");
      } else {
        setStatus(result.error ?? "Couldn't save.");
      }
    });
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Mail size={15} className="text-brand" /> Weekly email for a parent
      </h2>
      <p className="text-sm text-muted">
        One short Sunday email with the growth story above: never grades, assignment names, or AI
        conversations. You control it: add the address, turn it off any time.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="parent@email.com"
          className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm"
          aria-label="Parent email address"
        />
        <button
          type="button"
          disabled={pending || (!enabled && email.trim().length === 0)}
          onClick={() => save(!enabled)}
          className={`touch-target rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50 ${
            enabled
              ? "border border-border text-muted hover:bg-surface-soft"
              : "bg-brand text-white hover:bg-brand-strong"
          }`}
        >
          {pending ? "Saving…" : enabled ? "Turn off" : "Turn on"}
        </button>
      </div>
      {status && <p className="text-xs text-muted" role="status">{status}</p>}
    </section>
  );
}
