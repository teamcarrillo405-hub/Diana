"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AudioLines, BookOpenCheck, LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params?.get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const supabase = createClient();
    const { error: signinError } = await supabase.auth.signInWithPassword({ email, password });
    setPending(false);
    if (signinError) return setError(signinError.message);
    router.push(next);
    router.refresh();
  }

  return (
    <div className="auth-command-card future-card mobile-safe-width min-w-0">
      <header className="auth-card-header">
        <p className="nexus-kicker">Private next moves</p>
        <h2>Welcome back</h2>
        <p>Open Diana at the next school move already waiting for you.</p>
      </header>

      <form onSubmit={onSubmit} className="auth-primary-form">
        <div className="auth-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </div>
        <div className="auth-field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
        </div>

        {error && (
          <div className="auth-error" role="status">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="nexus-button nexus-button-primary touch-target w-full px-4 py-3 font-medium transition disabled:opacity-50"
        >
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="auth-link-row">
        New here?{" "}
        <Link href="/signup" className="text-accent underline underline-offset-2 decoration-accent/50 hover:decoration-accent">
          Create an account
        </Link>
      </p>

      <div className="auth-cue-strip">
        <AuthCue icon={AudioLines} label="Voice notes" />
        <AuthCue icon={BookOpenCheck} label="Source anchors" />
        <AuthCue icon={LockKeyhole} label="Private proof" />
      </div>

      <div className="auth-preview-tile" data-visual="auth-after-login-preview">
        <div>
          <span>Opens to</span>
          <strong>One source-linked next move.</strong>
        </div>
        <small>Think / Work / Proof</small>
      </div>
    </div>
  );
}

function AuthCue({ icon: Icon, label }: { icon: typeof AudioLines; label: string }) {
  return (
    <div className="auth-cue">
      <Icon size={14} className="shrink-0 text-brand" />
      <span className="min-w-0 truncate">{label}</span>
    </div>
  );
}
