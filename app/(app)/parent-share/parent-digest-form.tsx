"use client";

import { useState, useTransition } from "react";

import { saveParentDigest } from "./digest-actions";

/** Weekly parent digest opt-in, fully student-controlled. */
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

  function save() {
    setStatus(null);
    startTransition(async () => {
      const result = await saveParentDigest({ email: email.trim(), enabled });
      if (result.ok) {
        setStatus(enabled ? "One short email will be sent each Sunday." : "Weekly digest is off.");
        return;
      }

      setStatus(result.error ?? "The digest did not save yet.");
    });
  }

  return (
    <section className="sd-sharing-digest" aria-labelledby="weekly-parent-digest-title">
      <h2 id="weekly-parent-digest-title">Weekly parent digest</h2>
      <p>
        Diana sends a weekly summary only to the email you add.
      </p>
      <label className="sd-sharing-digest-email">
        <span>Parent or guardian email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="parent@email.com"
          aria-label="Parent email address"
        />
      </label>
      <div className="sd-sharing-digest-toggle-row">
        <div>
          <strong>Send weekly digest</strong>
          <small>A calm summary, no grades or AI chat contents.</small>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Send weekly digest"
          disabled={pending}
          onClick={() => {
            setStatus(null);
            setEnabled((current) => !current);
          }}
          className="sd-sharing-digest-toggle"
        >
          <span>{enabled ? "On" : "Off"}</span>
        </button>
      </div>
      <button
        type="button"
        disabled={pending || (enabled && email.trim().length === 0)}
        onClick={save}
        className="sd-sharing-digest-save"
      >
        {pending ? "Saving" : "Save digest"}
      </button>
      {status ? <p className="sd-sharing-digest-status" role="status">{status}</p> : null}
    </section>
  );
}
