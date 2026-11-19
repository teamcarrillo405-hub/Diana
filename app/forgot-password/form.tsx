"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { requestPasswordReset } from "@/app/(auth)/password-actions";
export function ForgotPasswordForm({
  next
}: {
  next: string;
}) {
  const [email, setEmail] = useState(""),
    [pending, setPending] = useState(false),
    [sent, setSent] = useState(false),
    [cooldown, setCooldown] = useState(0),
    [message, setMessage] = useState<string | null>(null);
  const submitting = useRef(false);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(v => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting.current || cooldown > 0) return;
    submitting.current = true;
    setPending(true);
    setMessage(null);
    try {
      const result = await requestPasswordReset(email, next);
      setMessage(result.message);
      if (result.ok) {
        setSent(true);
        setCooldown(60);
      }
    } catch {
      setMessage("The connection paused. Try requesting the link again.");
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }
  return <div><header className="entry-card-header"><h1>{sent ? "Check your email" : "Reset password"}</h1><p>{sent ? "If there is an account for this email, use the link to choose a new password." : "Enter your account email. We will send you a reset link."}</p></header>
    <form method="post" className="entry-form" onSubmit={submit} aria-busy={pending}><div className="sd-field"><label htmlFor="recovery-email">Email</label><input id="recovery-email" type="email" autoComplete="email" required maxLength={320} value={email} disabled={sent || pending} onChange={e => setEmail(e.target.value)} /></div>{message ? <p className={sent ? "entry-notice" : "entry-error"} role={sent ? "status" : "alert"}>{message}</p> : null}<button type="submit" className="entry-submit" disabled={pending || cooldown > 0}>{pending ? "Requesting…" : cooldown > 0 ? "Send again in " + cooldown + "s" : sent ? "Send another link" : "Send reset link"}</button></form>
    {sent ? <button type="button" className="entry-inline-link entry-secondary" disabled={pending} onClick={() => {
      setSent(false);
      setMessage(null);
      setCooldown(0);
    }}>Use another email</button> : null}<p className="entry-link-row"><Link href={"/login?next=" + encodeURIComponent(next)}>Back to sign in</Link></p></div>;
}
