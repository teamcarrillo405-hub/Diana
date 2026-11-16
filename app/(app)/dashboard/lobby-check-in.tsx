"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import styles from "@/components/dashboard/today-dashboard.module.css";
import checkInStyles from "./lobby-check-in.module.css";
import { useLobbyCheckInCompletion } from "@/components/dashboard/lobby/lobby-check-in-completion";

import type { LobbyCheckInValue, LobbyEnergy, LobbyMovement, StudentDailySupportNeed } from "@/lib/dashboard/lobby-check-in";
import { getStudentSupportPreferences, saveLobbyCheckIn, saveStudentDailySupportNeed, saveTutorPersonalizationPreference } from "./actions";

const ENERGY_OPTIONS: ReadonlyArray<{ value: LobbyEnergy; label: string }> = [
  { value: "low", label: "Low" },
  { value: "okay", label: "Okay" },
  { value: "good", label: "Good" },
];

const MOVEMENT_OPTIONS: ReadonlyArray<{ value: LobbyMovement; label: string }> = [
  { value: "walk", label: "Walk" },
  { value: "run", label: "Run" },
  { value: "bike", label: "Bike" },
  { value: "team_sport", label: "Team sport" },
  { value: "strength", label: "Strength" },
  { value: "stretch", label: "Stretch" },
  { value: "dance", label: "Dance" },
  { value: "other", label: "Other" },
];

type SaveState = "choosing" | "saving" | "saved" | "error";

export function LobbyCheckIn({ initialValue, sleepDate, primary = false, appearance = "classic" }: {
  initialValue: LobbyCheckInValue | null;
  sleepDate: string;
  primary?: boolean;
  appearance?: "classic" | "today";
}) {
  const router = useRouter();
  const onCompleted = useLobbyCheckInCompletion();
  const [energy, setEnergy] = useState<LobbyEnergy | null>(initialValue?.energy ?? null);
  const [sleepHours, setSleepHours] = useState(initialValue?.sleepHours?.toString() ?? "");
  const [movementType, setMovementType] = useState<LobbyMovement | null>(initialValue?.movementType ?? null);
  const [movementMinutes, setMovementMinutes] = useState(initialValue?.movementMinutes?.toString() ?? "");
  const [saveState, setSaveState] = useState<SaveState>(initialValue ? "saved" : "choosing");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const saving = useRef(false);

  function choosing() {
    setMessage(null);
    setSaveState("choosing");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
    <form className={`${styles.checkIn} ${checkInStyles.form}`} onSubmit={submit} noValidate>
      <div className={checkInStyles.energy}><span>Energy</span><div role="group" aria-label="Energy" className={checkInStyles.energyOptions}>{ENERGY_OPTIONS.map(option => <button key={option.value} type="button" aria-pressed={energy === option.value} disabled={pending} onClick={() => { setEnergy(option.value); choosing(); }}>{option.label}</button>)}</div></div>
      <label className={checkInStyles.field}><span>Sleep hours <small>Optional</small></span><input type="number" min="0" max="12" step="0.5" inputMode="decimal" value={sleepHours} disabled={pending} onChange={event => { setSleepHours(event.currentTarget.value); choosing(); }} placeholder="Not shared" aria-label="Sleep hours" /></label>
      <div className={checkInStyles.movement}>
        <label className={checkInStyles.field}><span>Movement <small>Optional</small></span><select aria-label="Movement type" value={movementType ?? ""} disabled={pending} onChange={event => { setMovementType((event.currentTarget.value || null) as LobbyMovement | null); choosing(); }}><option value="">Not shared</option>{MOVEMENT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label className={checkInStyles.field}><span>Minutes</span><input type="number" min="1" max="180" step="1" inputMode="numeric" aria-label="Movement minutes" placeholder="Not shared" value={movementMinutes} disabled={pending} onChange={event => { setMovementMinutes(event.currentTarget.value); choosing(); }} /></label>
      </div>
      <button type="submit" className={checkInStyles.save} data-state={saveState} disabled={pending || !energy || saveState === "saved"}>{status || (saveState === "error" ? "Try again" : "Save check-in")}</button>
      <span role="status" aria-live="polite" className={checkInStyles.status}>{message ?? status}</span>
    </form>
    {appearance === "classic" ? <Link href="/wellness" className="sd-lobby-checkin-open">Log wellness</Link> : null}
    <DailySupportPreferences />
  </section>;
}

function DailySupportPreferences() {
  const [need, setNeed] = useState<StudentDailySupportNeed | "">("");
  const [savedNeed, setSavedNeed] = useState<StudentDailySupportNeed | "">("");
  const [enabled, setEnabled] = useState(false);
  const [savedEnabled, setSavedEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void getStudentSupportPreferences().then((result) => {
      if (!active) return;
      if (result.ok) {
        setNeed(result.need ?? "");
        setSavedNeed(result.need ?? "");
        setEnabled(result.personalizationEnabled);
        setSavedEnabled(result.personalizationEnabled);
        setReady(true);
      } else setMessage(result.error);
    }).catch(() => { if (active) setMessage("Your support choices are unavailable right now."); });
    return () => { active = false; };
  }, [loadAttempt]);

  async function saveNeed(value: StudentDailySupportNeed | null) {
    setBusy(true);
    setMessage("");
    try {
      const result = await saveStudentDailySupportNeed(value);
      if (result.ok) {
        setNeed(value ?? "");
        setSavedNeed(value ?? "");
        setMessage(value ? "Support choice saved for 24 hours." : "Support choice cleared.");
      } else setMessage(result.error);
    } catch { setMessage("Your support choice could not be saved yet."); }
    finally { setBusy(false); }
  }

  async function saveSharingPreference() {
    setBusy(true);
    setMessage("");
    try {
      const result = await saveTutorPersonalizationPreference(enabled);
      if (result.ok) {
        setSavedEnabled(enabled);
        setMessage("Sharing preference saved.");
      } else {
        setEnabled(savedEnabled);
        setMessage(result.error + " Reload to confirm your saved preference.");
      }
    } catch {
      setEnabled(savedEnabled);
      setMessage("Your sharing preference could not be confirmed. Reload to check it.");
    }
    finally { setBusy(false); }
  }

  return <section aria-label="Optional support choices" style={{ display: "grid", gap: 12, marginTop: 16, padding: 16, border: "1px solid #8d78ab", borderRadius: 8, background: "#f8f5fc", color: "#292035" }}>
    <p>Optional: let Diana know if a snack, water or a break would help. You can skip this or clear it at any time. The choice is used for up to 24 hours.</p>
    <label>What would help right now?
      <select aria-label="What would help right now?" style={{ display: "block", width: "100%", minHeight: 44, marginTop: 6, background: "white", color: "#292035", border: "1px solid #655573", borderRadius: 6, padding: "0 10px" }} value={need} disabled={!ready || busy} onChange={(event) => setNeed(event.target.value as StudentDailySupportNeed | "")}>
        <option value="">Prefer not to share</option>
        <option value="food">A snack or food</option>
        <option value="water">Water</option>
        <option value="break">A break</option>
      </select>
    </label>
    {ready && need !== savedNeed && <p>Support choice changed. Save to apply it.</p>}
    <div>
      <button type="button" style={{ minHeight: 44, padding: "8px 12px", background: "#60239e", color: "white", border: "1px solid #60239e", borderRadius: 6 }} disabled={!ready || busy} onClick={() => void saveNeed(need || null)}>Save support choice</button>{" "}
      <button type="button" style={{ minHeight: 44, padding: "8px 12px", background: "white", color: "#292035", border: "1px solid #655573", borderRadius: 6 }} disabled={!ready || busy} onClick={() => void saveNeed(null)}>Clear support choice</button>
    </div>
    <label>
      <input type="checkbox" checked={enabled} disabled={!ready || busy} onChange={(event) => setEnabled(event.target.checked)} />{" "}
      Allow general guidance based on my learning accommodations, recent mood and support choice to be shared with Diana&apos;s AI provider to personalize help.
    </label>
    <p>This is optional and off by default. Diana does not automatically include diagnosis labels or your specific support choice in this guidance. Information you choose to write or upload may be sent when you request AI help. Sharing changes apply to future requests; they cannot recall a request already sent. Your support choice remains stored until you clear or replace it.</p>
    {ready && enabled !== savedEnabled && <p>Sharing preference changed. Save to apply it.</p>}
    <button type="button" style={{ minHeight: 44, padding: "8px 12px", background: "white", color: "#292035", border: "1px solid #655573", borderRadius: 6 }} disabled={!ready || busy || enabled === savedEnabled} onClick={() => void saveSharingPreference()}>Save sharing preference</button>
    <p role="status">{message}</p>
    {!ready && message && <button type="button" style={{ minHeight: 44, padding: "8px 12px", background: "white", color: "#292035", border: "1px solid #655573", borderRadius: 6 }} onClick={() => { setMessage(""); setLoadAttempt((value) => value + 1); }}>Retry loading support choices</button>}
  </section>;
}
