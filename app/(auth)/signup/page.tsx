"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AudioLines, BookOpenCheck, LockKeyhole } from "lucide-react";
import { FutureModeToggle } from "@/components/future-mode-toggle";
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
            Built for high school focus
          </p>
          <h1 className="mt-1 text-2xl font-bold">Create your command center</h1>
          <p className="safe-copy mt-2 max-w-full text-sm text-muted">Set up the private space for next moves, voice capture, and study proof.</p>
        </div>
      </header>

      <div className="grid gap-2 text-xs text-muted sm:grid-cols-3">
        <AuthCue icon={AudioLines} label="Talk it out" />
        <AuthCue icon={BookOpenCheck} label="Use class sources" />
        <AuthCue icon={LockKeyhole} label="Keep it yours" />
      </div>

      <div className="auth-command-preview rounded-2xl border border-brand/20 bg-brand/10 p-3" data-visual="auth-after-login-preview">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-strong dark:text-brand">Your setup starts with</p>
          <span className="rounded-full bg-surface-raised/80 px-2 py-1 text-[11px] font-semibold text-brand-strong dark:text-brand">
            Student-owned
          </span>
        </div>
        <p className="mt-2 text-sm font-semibold">Classes, notes, and study proof in one private space.</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-muted">
          <span className="rounded-full border border-border bg-surface-raised px-2 py-1 text-center">Sources</span>
          <span className="rounded-full border border-border bg-surface-raised px-2 py-1 text-center">Cards</span>
          <span className="rounded-full border border-border bg-surface-raised px-2 py-1 text-center">Voice</span>
        </div>
      </div>

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
          className="touch-target w-full rounded-xl bg-brand px-4 py-3 font-medium text-white transition hover:bg-brand-strong disabled:opacity-50"
        >
          {pending ? "Creating account..." : "Create account"}
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
          box-sizing: border-box;
          border: 1px solid rgb(var(--border));
          background: rgb(var(--surface-raised));
          color: rgb(var(--fg));
          border-radius: 0.75rem;
          min-height: 44px;
          padding: 0.7rem 0.8rem;
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

function AuthCue({ icon: Icon, label }: { icon: typeof AudioLines; label: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-2">
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
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
