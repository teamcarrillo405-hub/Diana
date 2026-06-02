"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
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
    <div className="w-full min-w-0 space-y-6 rounded-3xl border border-border bg-surface-raised p-5 shadow-sm sm:p-6">
      <header className="space-y-2">
        <Link href="/" className="inline-flex text-sm font-bold text-brand">
          Diana
        </Link>
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-sm text-muted">Open your focus command center.</p>
      </header>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="email" className="block text-sm font-medium">Email</label>
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
        <div className="space-y-1">
          <label htmlFor="password" className="block text-sm font-medium">Password</label>
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
          <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="touch-target w-full rounded-xl bg-brand px-4 py-3 font-medium text-white transition hover:bg-brand-strong disabled:opacity-50"
        >
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="text-accent underline-offset-2 hover:underline">
          Create an account
        </Link>
      </p>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid rgb(var(--border));
          background: rgb(var(--surface-raised));
          color: rgb(var(--fg));
          border-radius: 0.75rem;
          min-height: 44px;
          padding: 0.7rem 0.8rem;
          font-size: 1rem;
        }
      `}</style>
    </div>
  );
}
