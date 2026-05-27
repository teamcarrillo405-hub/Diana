"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ageBracket, yearsBetween } from "@/lib/age";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [dob, setDob] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!dob) return setError("Please enter your date of birth.");
    const dobDate = new Date(dob + "T00:00:00");
    if (Number.isNaN(dobDate.getTime())) return setError("That date of birth doesn't look right.");

    const years = yearsBetween(dobDate);
    if (years < 0 || years > 120) return setError("That date of birth doesn't look right.");

    const bracket = ageBracket(dobDate);
    if (bracket === "under_13") {
      return setError("Diana isn't available for users under 13 yet. Ask a parent or guardian to reach out.");
    }

    setPending(true);
    const supabase = createClient();
    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || null,
          date_of_birth: dob,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setPending(false);

    if (signupError) return setError(signupError.message);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="mt-1 text-sm text-muted">It only takes a minute.</p>
      </header>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email" htmlFor="email">
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Password" htmlFor="password" hint="At least 8 characters.">
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Name" htmlFor="display_name" hint="What should we call you?">
          <input
            id="display_name"
            type="text"
            autoComplete="given-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="input"
          />
        </Field>
        <Field
          label="Date of birth"
          htmlFor="dob"
          hint="Required. We use this to set age-appropriate defaults."
        >
          <input
            id="dob"
            type="date"
            required
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="input"
          />
        </Field>

        {error && (
          <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-accent px-4 py-3 font-medium text-white disabled:opacity-50"
        >
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-accent underline-offset-2 hover:underline">
          Log in
        </Link>
      </p>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          border: 1px solid rgb(var(--border));
          background: rgb(var(--card));
          color: rgb(var(--fg));
          border-radius: 0.5rem;
          padding: 0.625rem 0.75rem;
          font-size: 1rem;
        }
        :global(.input:focus) {
          outline: 2px solid rgb(var(--accent));
          outline-offset: -1px;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
