"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { completePasswordReset } from "@/app/(auth)/password-actions";
import { passwordValidation, safeAuthDestination } from "@/lib/auth/entry";
export function ResetPasswordForm({ available = true }: { available?: boolean }) {
  const [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [visible, setVisible] = useState(false),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState<string | null>(null),
    [next, setNext] = useState<string | null>(null);
  const submitting = useRef(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting.current) return;
    const validation = passwordValidation(password, confirmation);
    if (validation) {
      setMessage(validation);
      return;
    }
    submitting.current = true;
    setPending(true);
    setMessage(null);
    try {
      const result = await completePasswordReset(password, confirmation);
      setMessage(result.message);
      if (result.ok) {
        setPassword("");
        setConfirmation("");
        setNext(safeAuthDestination(result.next));
      }
    } catch {
      setMessage("The connection paused. Your password change could not be confirmed. Try again.");
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }
  if (next) return <div className="entry-sent"><h1>Password saved</h1><p className="entry-notice" role="status">{message}</p><Link className="entry-submit" href={next}>Continue to campus</Link></div>;
  if (!available && !pending) {
    return <div className="entry-sent">
      <h1>Request a fresh link</h1>
      <p className="entry-description">This reset link is no longer available. It may have expired or been opened in another browser.</p>
      <Link className="entry-submit" href="/forgot-password">Get a new link</Link>
      <Link className="entry-inline-link" href="/login">Back to sign in</Link>
    </div>;
  }
  return <div><header className="entry-card-header"><h1>A fresh start</h1><p>Choose a new password for your account.</p></header><form method="post" className="entry-form" onSubmit={submit} aria-busy={pending}>{[{
        id: "new-password",
        label: "New password",
        value: password,
        set: setPassword
      }, {
        id: "confirm-password",
        label: "Confirm new password",
        value: confirmation,
        set: setConfirmation
      }].map(field => <div className="sd-field" key={field.id}><label htmlFor={field.id}>{field.label}</label><input id={field.id} type={visible ? "text" : "password"} autoComplete="new-password" minLength={12} maxLength={128} required value={field.value} onChange={e => field.set(e.target.value)} /></div>)}<p className="entry-description">Use 12 or more characters. A phrase works well.</p><button className="entry-secondary" type="button" aria-pressed={visible} onClick={() => setVisible(v => !v)}>{visible ? "Hide passwords" : "Show passwords"}</button>{message ? <p className="entry-error" role="alert">{message}</p> : null}<button className="entry-submit" type="submit" disabled={pending}>{pending ? "Saving…" : "Save password"}</button></form><p className="entry-link-row"><Link href="/forgot-password">Request another reset link</Link></p></div>;
}
