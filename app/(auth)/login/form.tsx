"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
    <div>
      <header className="sd-auth-card-header">
        <p className="sd-kicker">Welcome back</p>
        <h2>Welcome back</h2>
        <p>Sign in to open today’s plan.</p>
      </header>

      <form onSubmit={onSubmit} className="sd-auth-form">
        <div className="sd-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="sd-input"
          />
        </div>
        <div className="sd-field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="sd-input"
          />
        </div>

        {error && (
          <div className="sd-auth-error" role="status">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="sd-button sd-button-primary sd-auth-submit"
        >
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="sd-auth-link-row">
        New here?{" "}
        <Link href="/signup">
          Create an account
        </Link>
      </p>

      <p className="sd-auth-assurance">Private by default. Your AI history and authorship record stay under your account.</p>
    </div>
  );
}
