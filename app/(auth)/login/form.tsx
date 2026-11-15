"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
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
    const destination = search.get("next");
    const safe = destination?.startsWith("/") && !destination.startsWith("//") && !destination.includes("\\") && !/[\u0000-\u001f]/u.test(destination);
    router.push(safe && destination ? destination : "/dashboard");
    router.refresh();
  }

  return (
    <div>
      <header className="entry-card-header">
        <h1>Sign in</h1>
      </header>

      <form onSubmit={onSubmit} className="entry-form">
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
          <div className="entry-error" role="status">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="entry-submit"
        >
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="entry-account">
        <span>New to Diana?</span>
        <Link href="/signup">Create an account</Link>
      </div>

      <p className="entry-assurance">Your work stays private.</p>
    </div>
  );
}
