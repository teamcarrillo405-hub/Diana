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
    <div>
      <header className="sd-auth-card-header">
        <p className="sd-kicker">Get started</p>
        <h2>Create your account</h2>
        <p>Set up your private space for classes, study tools, and visible sources.</p>
      </header>

      <form onSubmit={onSubmit} className="sd-auth-form">
        <Field label="Email" htmlFor="email">
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="sd-input"
          />
        </Field>
        <Field label="Password" htmlFor="password" hint="8+ characters.">
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="sd-input"
          />
        </Field>
        <Field label="Name" htmlFor="display_name" hint="Optional display name.">
          <input
            id="display_name"
            type="text"
            autoComplete="given-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="sd-input"
          />
        </Field>
        <Field label="Date of birth" htmlFor="dob" hint="Required for age defaults.">
          <input
            id="dob"
            type="date"
            required
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="sd-input"
          />
        </Field>

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
          {pending ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="sd-auth-link-row">
        Already have an account?{" "}
        <Link href="/login">
          Log in
        </Link>
      </p>

      <p className="sd-auth-assurance">Diana supports students age 13 and older. Your information stays private by default.</p>
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
    <div className="sd-field">
      <label htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p>{hint}</p>}
    </div>
  );
}
