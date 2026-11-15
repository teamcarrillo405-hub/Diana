"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { validateDateOfBirth } from "@/lib/age";
import { learnerAccessForAgeBracket } from "@/lib/learner-access-policy";
import {
  clearPublicOnboardingDraft,
  readPublicOnboardingDraft,
} from "@/lib/onboarding/public-draft";
import type { ScreenDesignOnboardingAnswers } from "@/lib/onboarding/screendesign";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [dob, setDob] = useState("");
  const [pending, setPending] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validatedDob = validateDateOfBirth(dob);
    if (!validatedDob.valid) {
      if (validatedDob.reason === "required") {
        return setError("Please enter your date of birth.");
      }
      return setError("That date of birth doesn't look right.");
    }

    const bracket = validatedDob.bracket;
    const access = learnerAccessForAgeBracket(bracket);
    if (access.accountAccess !== "allowed") {
      return setError("Diana is available to students age 13 and older.");
    }

    setPending(true);
    let onboardingDraft: ScreenDesignOnboardingAnswers | null = null;
    try {
      onboardingDraft = readPublicOnboardingDraft(window.sessionStorage);
    } catch {
      // Some privacy modes block the storage getter. Direct signup still works.
    }
    const supabase = createClient();
    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || null,
          date_of_birth: dob,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          ...(onboardingDraft
            ? {
                learning_hurdle: onboardingDraft.learningHurdle,
                study_schedule_preference:
                  onboardingDraft.studySchedulePreference,
              }
            : {}),
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setPending(false);

    if (signupError) return setError(signupError.message);
    try {
      clearPublicOnboardingDraft(window.sessionStorage);
    } catch {
      // Account creation succeeded, so unavailable browser storage is non-blocking.
    }
    if (!data.session) { setConfirmationSent(true); return; }
    router.push("/dashboard");
    router.refresh();
  }

  if (confirmationSent) return <div><h1>Check your email</h1><p>Use the confirmation link to finish creating your account.</p><Link href="/login">Back to sign in</Link></div>;

  return (
    <div>
      <header className="entry-card-header">
        
        <h1>Create account</h1>
      </header>

      <form onSubmit={onSubmit} className="entry-form">
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
        <Field label="Name" htmlFor="display_name" hint="Optional">
          <input
            id="display_name"
            type="text"
            autoComplete="given-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="sd-input"
          />
        </Field>
        <Field label="Date of birth" htmlFor="dob" hint="Diana is for students age 13 and older.">
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
          <div className="entry-error" role="status">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="entry-submit"
        >
          {pending ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="entry-link-row">
        Already have an account?{" "}
        <Link href="/login">
          Log in
        </Link>
      </p>

      <p className="entry-assurance">Your information stays private by default.</p>
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
