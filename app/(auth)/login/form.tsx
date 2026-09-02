"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
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
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div>
      <header className="sd-auth-card-header">
        <h2>Welcome back</h2>
        <p>Your classes, notes, and next step are ready.</p>
      </header>

      <form onSubmit={onSubmit} className="sd-auth-form">
        <div className="sd-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
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
            placeholder="Enter your password"
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

      <div className="sd-auth-account">
        <span>New to Diana?</span>
        <Link href="/signup">Create an account</Link>
      </div>

      <p className="sd-auth-assurance">Private by default. Your work, AI history, and authorship record stay under your account.</p>
    </div>
  );
}
