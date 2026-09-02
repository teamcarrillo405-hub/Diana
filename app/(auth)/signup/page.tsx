"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { validateDateOfBirth } from "@/lib/age";
import {
  learnerAccessForAgeBracket,
  TEEN_GUARDIAN_PERMISSION_POLICY_VERSION,
} from "@/lib/learner-access-policy";
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
  const [teenGuardianPermissionAttested, setTeenGuardianPermissionAttested] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedDob = validateDateOfBirth(dob);
  const selectedBracket = selectedDob.valid ? selectedDob.bracket : null;
  const isTeenSignup = selectedBracket === "13_to_17";

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
      return setError("Diana isn't available for users under 13 yet. A verified parent or guardian process is still required.");
    }
    if (bracket === "13_to_17" && !teenGuardianPermissionAttested) {
      return setError("Confirm that your parent or guardian has given permission before creating a teen account.");
    }

    setPending(true);
    let onboardingDraft: ScreenDesignOnboardingAnswers | null = null;
    try {
      onboardingDraft = readPublicOnboardingDraft(window.sessionStorage);
    } catch {
      // Some privacy modes block the storage getter. Direct signup still works.
    }
    const supabase = createClient();
    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || null,
          date_of_birth: dob,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          ...(bracket === "13_to_17"
            ? {
                teen_guardian_permission_attested: true,
                teen_guardian_permission_policy_version:
                  TEEN_GUARDIAN_PERMISSION_POLICY_VERSION,
                teen_guardian_permission_source: "signup_attestation",
              }
            : {}),
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
            onChange={(e) => {
              const nextDob = e.target.value;
              setDob(nextDob);
              const nextValidation = validateDateOfBirth(nextDob);
              if (!nextValidation.valid || nextValidation.bracket !== "13_to_17") {
                setTeenGuardianPermissionAttested(false);
              }
            }}
            className="sd-input"
          />
        </Field>

        {isTeenSignup ? (
          <fieldset className="sd-field" aria-describedby="teen-guardian-permission-help">
            <legend>Parent or guardian permission</legend>
            <label htmlFor="teen_guardian_permission_attested">
              <input
                id="teen_guardian_permission_attested"
                name="teen_guardian_permission_attested"
                type="checkbox"
                required
                checked={teenGuardianPermissionAttested}
                onChange={(event) => setTeenGuardianPermissionAttested(event.target.checked)}
              />
              <span>
                I confirm that my parent or guardian has given me permission to create this
                account and use Diana&apos;s AI-powered study features.
              </span>
            </label>
            <p id="teen-guardian-permission-help">
              This records your attestation only. Diana does not collect identity documents
              here, and this is not the verified consent process required for children under 13.
            </p>
          </fieldset>
        ) : null}

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
