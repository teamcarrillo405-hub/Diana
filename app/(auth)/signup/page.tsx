"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AudioLines, BookOpenCheck, LockKeyhole } from "lucide-react";
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
    <div className="auth-command-card future-card mobile-safe-width min-w-0">
      <header className="auth-card-header">
        <p className="nexus-kicker">Student-owned support</p>
        <h2>Create your Diana</h2>
        <p>Start with the private space for classes, next moves, proof, and Future Path.</p>
      </header>

      <form onSubmit={onSubmit} className="auth-primary-form">
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
        <Field label="Password" htmlFor="password" hint="8+ characters.">
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
        <Field label="Name" htmlFor="display_name" hint="Optional display name.">
          <input
            id="display_name"
            type="text"
            autoComplete="given-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Date of birth" htmlFor="dob" hint="Required for age defaults.">
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
          <div className="auth-error" role="status">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="nexus-button nexus-button-primary touch-target w-full px-4 py-3 font-medium transition disabled:opacity-50"
        >
          {pending ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="auth-link-row">
        Already have an account?{" "}
        <Link href="/login" className="text-accent underline underline-offset-2 decoration-accent/50 hover:decoration-accent">
          Log in
        </Link>
      </p>

      <div className="auth-cue-strip">
        <AuthCue icon={AudioLines} label="Talk it out" />
        <AuthCue icon={BookOpenCheck} label="Use class sources" />
        <AuthCue icon={LockKeyhole} label="Keep it yours" />
      </div>

      <div className="auth-preview-tile" data-visual="auth-after-login-preview">
        <div>
          <span>Starts with</span>
          <strong>Classes, sources, voice, and proof.</strong>
        </div>
        <small>Sources / Cards / Voice</small>
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
    <div className="auth-field">
      <label htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p>{hint}</p>}
    </div>
  );
}
