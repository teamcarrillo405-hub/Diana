"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { safeAuthDestination } from "@/lib/auth/entry";
export function LoginForm() {
  const router = useRouter(),
    search = useSearchParams(),
    submitting = useRef(false);
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false),
    [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next = safeAuthDestination(search.get("next"));
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setError(null);
    setPending(true);
    try {
      const {
        error: signinError
      } = await createClient().auth.signInWithPassword({
        email: email.trim(),
        password
      });
      if (signinError) {
        setError("Your email and password could not be confirmed. Try again or reset your password.");
        return;
      }
      setPassword("");
      router.push(next);
      router.refresh();
    } catch {
      setError("The connection paused. Your details are still here. Try signing in again.");
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }
  return <div>
    <header className="entry-card-header"><h1>Welcome back</h1><p>Sign in to your campus.</p></header>
    <form method="post" onSubmit={onSubmit} className="entry-form" aria-busy={pending}>
      <div className="sd-field"><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" required maxLength={320} value={email} onChange={e => setEmail(e.target.value)} /></div>
      <div className="sd-field"><label htmlFor="password">Password</label><div className="entry-password"><input id="password" type={visible ? "text" : "password"} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /><button type="button" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} onClick={() => setVisible(v => !v)}>{visible ? "Hide" : "Show"}</button></div></div>
      <Link className="entry-inline-link" href={"/forgot-password?next=" + encodeURIComponent(next)}>Forgot password?</Link>
      {error ? <div className="entry-error" role="alert">{error}</div> : null}
      <button type="submit" disabled={pending} className="entry-submit">{pending ? "Signing in…" : "Sign in"}</button>
    </form>
    <div className="entry-account"><span>New to Diana?</span><Link href="/signup">Create an account</Link></div>
    <p className="entry-assurance">Your work stays private.</p>
  </div>;
}
