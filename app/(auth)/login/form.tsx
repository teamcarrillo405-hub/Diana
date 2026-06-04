"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AudioLines, BookOpenCheck, LockKeyhole } from "lucide-react";
import { FutureModeToggle } from "@/components/future-mode-toggle";
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
    <div className="future-card mobile-safe-width min-w-0 overflow-hidden rounded-3xl border border-border bg-surface-raised/95 p-5 shadow-sm backdrop-blur sm:p-6">
      <header className="space-y-2">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <Link href="/" className="inline-flex text-sm font-bold text-brand">
            Diana
          </Link>
          <FutureModeToggle compact className="px-2.5 py-1.5 text-xs" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-strong dark:text-brand">
            Focus command center
          </p>
          <h1 className="mt-1 text-2xl font-bold">Welcome back</h1>
          <p className="safe-copy mt-2 max-w-full text-sm text-muted">Open the place that remembers your next school move.</p>
        </div>
      </header>

      <div className="grid gap-2 text-xs text-muted sm:grid-cols-3">
        <AuthCue icon={AudioLines} label="Voice notes" />
        <AuthCue icon={BookOpenCheck} label="Source anchors" />
        <AuthCue icon={LockKeyhole} label="Private proof" />
      </div>

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

function AuthCue({ icon: Icon, label }: { icon: typeof AudioLines; label: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-2">
      <Icon size={14} className="shrink-0 text-brand" />
      <span className="min-w-0 truncate">{label}</span>
    </div>
  );
}
