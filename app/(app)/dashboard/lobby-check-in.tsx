"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLobbyCheckInCompletion } from "@/components/dashboard/lobby/lobby-check-in-completion";
import type { LobbyCheckInValue, StudentDailySupportNeed } from "@/lib/dashboard/lobby-check-in";
import { getStudentSupportPreferences, saveLobbyCheckIn, saveStudentDailySupportNeed, saveTutorPersonalizationPreference } from "./actions";
import { EnergyChoice, SleepAndActivity, SupportChoices, type CheckInAnswers } from "./lobby-check-in-fields";
import styles from "./lobby-check-in.module.css";

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
  const [savedAnswers, setSavedAnswers] = useState(answers);
  const [need, setNeed] = useState<StudentDailySupportNeed | null>(null);
  const [savedNeed, setSavedNeed] = useState<StudentDailySupportNeed | null>(null);
  const [clearSavedSupport, setClearSavedSupport] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [savedEnabled, setSavedEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [supportError, setSupportError] = useState("");
  const [savingAction, setSavingAction] = useState<"check-in" | "sharing" | null>(null);
  const saving = useRef(false);
  const [message, setMessage] = useState(initialValue ? "Saved for today." : "");
  const [sharingMessage, setSharingMessage] = useState("");
  const busy = savingAction !== null;
  const answersChanged = answers.energy !== savedAnswers.energy ||
    answers.sleepHours !== savedAnswers.sleepHours ||
    answers.movementType !== savedAnswers.movementType ||
    answers.movementMinutes !== savedAnswers.movementMinutes;
  const needChanged = ready && (need !== savedNeed || clearSavedSupport);

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
      } else setSupportError(result.error);
    }).catch(() => { if (active) setSupportError("Your support choices are unavailable right now."); });
    return () => { active = false; };
  }, [loadAttempt]);

  function updateAnswers(next: CheckInAnswers) {
    setAnswers(next);
    setMessage("");
  }

  function updateNeed(value: StudentDailySupportNeed | null, clearExpired = false) {
    setNeed(value);
    setClearSavedSupport(clearExpired);
    setMessage(value === null && (savedNeed !== null || clearExpired) ? "Save check-in to clear your support choice." : "");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current || (!answersChanged && !needChanged)) return;
    const { energy, sleepHours, movementType, movementMinutes } = answers;
    const sleep = sleepHours === "" ? null : Number(sleepHours);
    const minutes = movementMinutes === "" ? null : Number(movementMinutes);
    if (answersChanged) {
      if (!energy) {
        setMessage("Choose your energy to save sleep or activity.");
        return;
      }
      if (sleep !== null && (!Number.isFinite(sleep) || sleep < 0 || sleep > 12)) {
        setMessage("Enter sleep from 0 to 12 hours.");
        return;
      }
      if ((movementType === null) !== (minutes === null) ||
          (minutes !== null && (!Number.isInteger(minutes) || minutes < 1 || minutes > 180))) {
        setMessage("Choose an activity and 1 to 180 minutes, or leave both blank.");
        return;
      }
    }

    saving.current = true;
    setSavingAction("check-in");
    setMessage("");
    const supportConfirmation = need === null ? "Support choice cleared." : "Support choice saved.";
    let savedSupport = false;
    try {
      if (needChanged) {
        const result = await saveStudentDailySupportNeed(need);
        if (!result.ok) {
          setMessage(result.error);
          return;
        }
        setSavedNeed(need);
        setClearSavedSupport(false);
        savedSupport = true;
      }
      if (answersChanged && energy) {
        const result = await saveLobbyCheckIn({ energy, sleepHours: sleep, movementType, movementMinutes: minutes, sleepDate });
        if (!result.ok) {
          setMessage(savedSupport ? `${supportConfirmation} ${result.error}` : result.error);
          return;
        }
        setSavedAnswers(answers);
        setMessage("Saved for today.");
        if (onCompleted) onCompleted(energy, result.signalId);
        else router.refresh();
      } else setMessage(supportConfirmation);
    } catch {
      const checkInError = "The check-in could not be saved yet. Try again.";
      setMessage(savedSupport ? `${supportConfirmation} ${checkInError}` : needChanged ? "Your support choice could not be saved yet." : checkInError);
    } finally {
      saving.current = false;
      setSavingAction(null);
    }
  }

  async function saveSharingPreference() {
    if (saving.current || !ready || enabled === savedEnabled) return;
    saving.current = true;
    setSavingAction("sharing");
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
    finally {
      saving.current = false;
      setSavingAction(null);
    }
  }

  return <section className={appearance === "classic" ? "sd-lobby-checkin" : undefined} data-primary={primary || undefined}>
    <form className={appearance === "today" ? [styles.form, styles.campusForm].join(" ") : styles.form} onSubmit={submit} noValidate>
      <EnergyChoice energy={answers.energy} disabled={busy} onChange={energy => updateAnswers({ ...answers, energy })} />
      <div className={styles.dailySupport}>
        <SupportChoices need={need} disabled={!ready || busy} onChange={updateNeed} onClear={() => updateNeed(null)} />
        {supportError && <>
          <p role="status" className={styles.status}>{supportError}</p>
          <button className={styles.secondaryAction} type="button" disabled={busy} aria-label="Retry loading support choices" onClick={() => { setSupportError(""); setLoadAttempt(value => value + 1); }}>Retry</button>
        </>}
      </div>
      <SleepAndActivity answers={answers} disabled={busy} onChange={updateAnswers} />
      <button type="submit" className={styles.save} disabled={busy || (!answersChanged && !needChanged)}>{savingAction === "check-in" ? "Saving…" : "Save check-in"}</button>
      <p role="status" className={styles.status}>{message}</p>
      <details className={styles.sharing}>
        <summary>Data and privacy</summary>
        <p>Your support choice stays saved until you clear or replace it.</p>
        {need === null && savedNeed === null && <button className={styles.secondaryAction} type="button" disabled={!ready || busy || clearSavedSupport} onClick={() => updateNeed(null, true)}>Clear saved support choice</button>}
        <label>
          <input type="checkbox" checked={enabled} disabled={!ready || busy} onChange={event => { setEnabled(event.target.checked); setSharingMessage(""); }} />
          <span>Allow general guidance based on my learning accommodations, recent mood and support choice to be shared with Diana&apos;s AI provider to personalize help.</span>
        </label>
        <p>This is optional and off by default. Diana does not automatically include diagnosis labels or your specific support choice in this guidance. Information you choose to write or upload may be sent when you request AI help. Sharing changes apply to future requests. They cannot recall a request already sent.</p>
        <button className={styles.secondaryAction} type="button" disabled={!ready || busy || enabled === savedEnabled} onClick={() => void saveSharingPreference()}>Save sharing preference</button>
        <p role="status" className={styles.status}>{sharingMessage || (ready && enabled !== savedEnabled ? "Sharing preference changed. Save to apply it." : "")}</p>
      </details>
    </form>
    {appearance === "classic" ? <Link href="/wellness" className="sd-lobby-checkin-open">Log wellness</Link> : null}
  </section>;
}
