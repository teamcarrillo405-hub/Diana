"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { validateDateOfBirth } from "@/lib/age";
import { learnerAccessForAgeBracket } from "@/lib/learner-access-policy";
import { passwordValidation } from "@/lib/auth/entry";
import { clearPublicOnboardingDraft, readPublicOnboardingDraft } from "@/lib/onboarding/public-draft";
import type { ScreenDesignOnboardingAnswers } from "@/lib/onboarding/screendesign";
export default function SignupPage() {
  const router = useRouter(),
    submitting = useRef(false);
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [displayName, setDisplayName] = useState(""),
    [dob, setDob] = useState("");
  const [visible, setVisible] = useState(false),
    [pending, setPending] = useState(false),
    [confirmationSent, setConfirmationSent] = useState(false),
    [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null),
    [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(v => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting.current) return;
    setError(null);
    const validatedDob = validateDateOfBirth(dob);
    if (!validatedDob.valid) {
      setError(validatedDob.reason === "required" ? "Please enter your date of birth." : "That date of birth doesn't look right.");
      return;
    }
    if (learnerAccessForAgeBracket(validatedDob.bracket).accountAccess !== "allowed") {
      setError("Diana is available to students age 13 and older.");
      return;
    }
    const validation = passwordValidation(password, password);
    if (validation) {
      setError(validation);
      return;
    }
    submitting.current = true;
    setPending(true);
    try {
      let draft: ScreenDesignOnboardingAnswers | null = null;
      try {
        draft = readPublicOnboardingDraft(window.sessionStorage);
      } catch {/* Privacy modes may block browser storage. */}
      const {
        data,
        error: signupError
      } = await createClient().auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim() || null,
            date_of_birth: dob,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            ...(draft ? {
              learning_hurdle: draft.learningHurdle,
              study_schedule_preference: draft.studySchedulePreference
            } : {})
          },
          emailRedirectTo: window.location.origin + "/auth/callback"
        }
      });
      if (signupError) {
        setError("Your account could not be created. Check your details or try signing in if you already have an account.");
        return;
      }
      try {
        clearPublicOnboardingDraft(window.sessionStorage);
      } catch {/* Account creation does not depend on browser storage. */}
      setPassword("");
      if (!data.session) {
        setConfirmationSent(true);
        setCooldown(60);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("The connection paused. Your details are still here. Try creating your account again.");
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }
  async function resend() {
    if (submitting.current || cooldown > 0) return;
    submitting.current = true;
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      await createClient().auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin + "/auth/callback"
        }
      });
      setNotice("If confirmation is needed for this email, a new link will arrive shortly.");
      setCooldown(60);
    } catch {
      setError("The connection paused. Try requesting the confirmation link again.");
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }
  if (confirmationSent) return <div className="entry-sent"><header className="entry-card-header"><h1>Check your email</h1><p>Use the confirmation link to finish creating your account.</p></header><p className="entry-description">Check the inbox and spam folder for {email}. If you already have an account, you can sign in.</p>{notice ? <p className="entry-notice" role="status">{notice}</p> : null}{error ? <p className="entry-error" role="status">{error}</p> : null}<button className="entry-secondary" type="button" disabled={pending || cooldown > 0} onClick={() => void resend()}>{pending ? "Requesting…" : cooldown > 0 ? "Resend available in " + cooldown + "s" : "Resend confirmation"}</button><Link className="entry-inline-link" href="/login">Back to sign in</Link><button className="entry-secondary" type="button" disabled={pending} onClick={() => {
      setConfirmationSent(false);
      setError(null);
      setNotice(null);
    }}>Use another email</button></div>;
  return <div><header className="entry-card-header"><h1>Create account</h1><p>Make a campus that works for you.</p></header><form method="post" onSubmit={onSubmit} className="entry-form" aria-busy={pending}>
    <Field label="Email" htmlFor="email"><input id="email" type="email" autoComplete="email" disabled={pending} required maxLength={320} value={email} onChange={e => setEmail(e.target.value)} /></Field>
    <Field label="Password" htmlFor="password" hint="12+ characters. A phrase works well."><div className="entry-password"><input id="password" type={visible ? "text" : "password"} autoComplete="new-password" disabled={pending} minLength={12} maxLength={128} required value={password} onChange={e => setPassword(e.target.value)} /><button type="button" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} onClick={() => setVisible(v => !v)}>{visible ? "Hide" : "Show"}</button></div></Field>
    <Field label="Name" htmlFor="display_name" hint="Optional"><input id="display_name" type="text" autoComplete="given-name" disabled={pending} maxLength={80} value={displayName} onChange={e => setDisplayName(e.target.value)} /></Field>
    <Field label="Date of birth" htmlFor="dob" hint="Diana is for students age 13 and older."><input id="dob" type="date" autoComplete="bday" disabled={pending} required value={dob} onChange={e => setDob(e.target.value)} /></Field>
    {error ? <div className="entry-error" role="status">{error}</div> : null}<button type="submit" disabled={pending} className="entry-submit">{pending ? "Creating account…" : "Create account"}</button></form>
    <p className="entry-link-row">Already have an account? <Link href="/login">Log in</Link></p><p className="entry-assurance">Your information stays private by default.</p></div>;
}
function Field({
  label,
  htmlFor,
  hint,
  children
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return <div className="sd-field"><label htmlFor={htmlFor}>{label}</label>{children}{hint ? <p>{hint}</p> : null}</div>;
}
