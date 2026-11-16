"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useLobbyCheckInCompletion } from "@/components/dashboard/lobby/lobby-check-in-completion";
import type { LobbyCheckInValue, StudentDailySupportNeed } from "@/lib/dashboard/lobby-check-in";
import { getStudentSupportPreferences, saveLobbyCheckIn, saveStudentDailySupportNeed, saveTutorPersonalizationPreference } from "./actions";
import { CheckInQuestions, SupportChoices, type CheckInAnswers } from "./lobby-check-in-fields";
import styles from "./lobby-check-in.module.css";

type SaveState = "choosing" | "saving" | "saved" | "error";

export function LobbyCheckIn({ initialValue, sleepDate, primary = false, appearance = "classic" }: {
  initialValue: LobbyCheckInValue | null;
  sleepDate: string;
  primary?: boolean;
  appearance?: "classic" | "today";
}) {
  const router = useRouter();
  const onCompleted = useLobbyCheckInCompletion();
  const [answers, setAnswers] = useState<CheckInAnswers>({
    energy: initialValue?.energy ?? null,
    sleepHours: initialValue?.sleepHours?.toString() ?? "",
    movementType: initialValue?.movementType ?? null,
    movementMinutes: initialValue?.movementMinutes?.toString() ?? "",
  });
  const [saveState, setSaveState] = useState<SaveState>(initialValue ? "saved" : "choosing");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const saving = useRef(false);

  function updateAnswers(next: CheckInAnswers) {
    setAnswers(next);
    setMessage(null);
    setSaveState("choosing");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { energy, sleepHours, movementType, movementMinutes } = answers;
    if (!energy || saving.current) return;
    const sleep = sleepHours === "" ? null : Number(sleepHours);
    const minutes = movementMinutes === "" ? null : Number(movementMinutes);
    if ((sleep !== null && (!Number.isFinite(sleep) || sleep < 0 || sleep > 12)) ||
        ((movementType === null) !== (minutes === null)) ||
        (minutes !== null && (!Number.isInteger(minutes) || minutes < 1 || minutes > 180))) {
      setSaveState("error");
      setMessage("Enter sleep from 0 to 12 hours. For movement, choose an activity and 1 to 180 minutes, or leave both blank.");
      return;
    }
    saving.current = true;
    setSaveState("saving");
    setMessage(null);
    startTransition(async () => {
      let result: Awaited<ReturnType<typeof saveLobbyCheckIn>>;
      try {
        result = await saveLobbyCheckIn({ energy, sleepHours: sleep, movementType, movementMinutes: minutes, sleepDate });
      } catch {
        saving.current = false;
        setSaveState("error");
        setMessage("The check-in could not be saved yet. Try again when ready.");
        return;
      }
      saving.current = false;
      if (!result.ok) { setSaveState("error"); setMessage(result.error); return; }
      setSaveState("saved");
      if (onCompleted) onCompleted(energy, result.signalId);
      else router.refresh();
    });
  }

  const status = saveState === "saving" || pending ? "Saving" : saveState === "saved" ? "Saved for today" : "";

  return <section className={appearance === "classic" ? "sd-lobby-checkin" : undefined} data-primary={primary || undefined}>
    <form className={appearance === "today" ? [styles.form, styles.campusForm].join(" ") : styles.form} onSubmit={submit} noValidate>
      <CheckInQuestions answers={answers} disabled={pending} onChange={updateAnswers} />
      <DailySupportPreferences>
        <button type="submit" className={styles.save} data-state={saveState} disabled={pending || !answers.energy || saveState === "saved"}>{status || (saveState === "error" ? "Try again" : "Save check-in")}</button>
        <span role="status" aria-live="polite" className={styles.status}>{message ?? status}</span>
      </DailySupportPreferences>
    </form>
    {appearance === "classic" ? <Link href="/wellness" className="sd-lobby-checkin-open">Log wellness</Link> : null}
  </section>;
}

function DailySupportPreferences({ children }: { children: ReactNode }) {
  const [need, setNeed] = useState<StudentDailySupportNeed | null>(null);
  const [savedNeed, setSavedNeed] = useState<StudentDailySupportNeed | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [savedEnabled, setSavedEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");
  const [sharingMessage, setSharingMessage] = useState("");

  useEffect(() => {
    let active = true;
    void getStudentSupportPreferences().then((result) => {
      if (!active) return;
      if (result.ok) {
        setNeed(result.need);
        setSavedNeed(result.need);
        setEnabled(result.personalizationEnabled);
        setSavedEnabled(result.personalizationEnabled);
        setReady(true);
      } else setSupportMessage(result.error);
    }).catch(() => { if (active) setSupportMessage("Your support choices are unavailable right now."); });
    return () => { active = false; };
  }, [loadAttempt]);

  async function saveNeed(value: StudentDailySupportNeed | null) {
    setBusy(true);
    setSupportMessage("");
    try {
      const result = await saveStudentDailySupportNeed(value);
      if (result.ok) {
        setNeed(value);
        setSavedNeed(value);
        setSupportMessage(value ? "Support choice saved for 24 hours." : "Support choice cleared.");
      } else setSupportMessage(result.error);
    } catch { setSupportMessage("Your support choice could not be saved yet."); }
    finally { setBusy(false); }
  }

  async function saveSharingPreference() {
    setBusy(true);
    setSharingMessage("");
    try {
      const result = await saveTutorPersonalizationPreference(enabled);
      if (result.ok) {
        setSavedEnabled(enabled);
        setSharingMessage("Sharing preference saved.");
      } else {
        setEnabled(savedEnabled);
        setSharingMessage(result.error + " Reload to confirm your saved preference.");
      }
    } catch {
      setEnabled(savedEnabled);
      setSharingMessage("Your sharing preference could not be confirmed. Reload to check it.");
    }
    finally { setBusy(false); }
  }

  return <>
    <div className={styles.dailySupport}>
      <SupportChoices need={need} disabled={!ready || busy} onChange={value => { setNeed(value); setSupportMessage(""); }} />
      <div className={styles.supportActions}>
        <button type="button" disabled={!ready || busy || !need} onClick={() => void saveNeed(need)}>Save support choice</button>
        <button type="button" disabled={!ready || busy} onClick={() => void saveNeed(null)}>Clear support choice</button>
      </div>
      <p role="status" className={styles.status}>{supportMessage || (ready && need !== savedNeed ? "Support choice changed. Save to apply it." : "")}</p>
      {!ready && supportMessage && <button className={styles.secondaryAction} type="button" onClick={() => { setSupportMessage(""); setLoadAttempt(value => value + 1); }}>Retry loading support choices</button>}
    </div>
    {children}
    <details className={styles.sharing}>
      <summary>AI sharing preference</summary>
      <label>
        <input type="checkbox" checked={enabled} disabled={!ready || busy} onChange={event => { setEnabled(event.target.checked); setSharingMessage(""); }} />
        <span>Allow general guidance based on my learning accommodations, recent mood and support choice to be shared with Diana&apos;s AI provider to personalize help.</span>
      </label>
      <p>This is optional and off by default. Diana does not automatically include diagnosis labels or your specific support choice in this guidance. Information you choose to write or upload may be sent when you request AI help. Sharing changes apply to future requests. They cannot recall a request already sent.</p>
      <button className={styles.secondaryAction} type="button" disabled={!ready || busy || enabled === savedEnabled} onClick={() => void saveSharingPreference()}>Save sharing preference</button>
      <p role="status" className={styles.status}>{sharingMessage || (ready && enabled !== savedEnabled ? "Sharing preference changed. Save to apply it." : "")}</p>
    </details>
  </>;
}
