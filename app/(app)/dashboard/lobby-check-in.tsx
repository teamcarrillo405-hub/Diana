"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type CSSProperties, useEffect, useState, useTransition } from "react";
import styles from "@/components/dashboard/today-dashboard.module.css";

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
  const [energy, setEnergy] = useState<LobbyEnergy | null>(initialValue?.energy ?? null);
  const [sleepHours, setSleepHours] = useState(initialValue?.sleepHours ?? 8);
  const [sleepLogged, setSleepLogged] = useState(initialValue !== null);
  const [movementType, setMovementType] = useState<LobbyMovement | null>(initialValue?.movementType ?? null);
  const [movementMinutes, setMovementMinutes] = useState(initialValue?.movementMinutes ?? 30);
  const [saveState, setSaveState] = useState<SaveState>(initialValue ? "saved" : "choosing");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const allChosen = Boolean(energy && sleepLogged && movementType && movementMinutes > 0);

  useEffect(() => {
    if (!allChosen || saveState !== "choosing" || !energy || !movementType) return;

    const timer = window.setTimeout(() => {
      setSaveState("saving");
      setMessage(null);
      startTransition(async () => {
        const result = await saveLobbyCheckIn({ energy, sleepHours, movementType, movementMinutes, sleepDate });
        if (!result.ok) {
          setSaveState("error");
          setMessage(result.error);
          return;
        }
        setSaveState("saved");
        router.refresh();
      });
    }, 650);
    return () => window.clearTimeout(timer);
  }, [allChosen, energy, movementMinutes, movementType, router, saveState, sleepDate, sleepHours]);

  function choosing() {
    setMessage(null);
    setSaveState("choosing");
  }

  const status = saveState === "saving" || pending ? "Saving" : saveState === "saved" ? "Saved for today" : "";

  if (appearance === "today") return (<>
    <form className={styles.checkIn} onSubmit={event => { event.preventDefault(); setSleepLogged(true); choosing(); }}>
      <div className={styles.energyRow}><span>Energy</span><div role="group" aria-label="Energy" className={styles.energyOptions}>{ENERGY_OPTIONS.map(option => <button key={option.value} type="button" aria-pressed={energy === option.value} disabled={pending} onClick={() => { setEnergy(option.value); choosing(); }}>{option.label}</button>)}</div></div>
      <label className={styles.rangeRow}><span>Sleep <output>{sleepHours} hrs</output></span><input type="range" min="0" max="12" step=".5" value={sleepHours} disabled={pending} onChange={event => { setSleepHours(Number(event.target.value)); setSleepLogged(true); choosing(); }} aria-label="Sleep" style={{ "--fill": `${sleepHours / 12 * 100}%` } as CSSProperties} /></label>
      <div className={styles.movementRow}><label>Movement<select aria-label="Movement type" value={movementType ?? ""} disabled={pending} onChange={event => { setMovementType(event.target.value as LobbyMovement); choosing(); }}><option value="" disabled>Choose activity</option>{MOVEMENT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label className={styles.rangeRow}><span><span className={styles.srOnly}>Movement minutes</span><output>{movementMinutes} min</output></span><input type="range" aria-label="Movement minutes" min="0" max="180" step="5" value={movementMinutes} disabled={pending} onChange={event => { setMovementMinutes(Number(event.target.value)); choosing(); }} style={{ "--fill": `${movementMinutes / 180 * 100}%` } as CSSProperties} /></label></div>
      <button type="submit" className={styles.checkInSave} data-state={saveState} disabled={pending || !energy || !movementType || movementMinutes <= 0 || saveState === "saved"}>
        {status || (saveState === "error" ? "Try again" : "Save check-in")}
      </button>
      <span className={message ? styles.emptyNote : styles.srOnly} role="status">{message ?? status}</span>
    </form>
    <DailySupportPreferences />
  </>
  );

  return (
    <section className="sd-lobby-checkin" data-primary={primary || undefined}>
      <div className="sd-lobby-checkin-sliders">
        <EnergySlider energy={energy} disabled={pending} onSelect={(value) => { setEnergy(value); choosing(); }} />
        <RangeSlider label="Sleep" value={sleepHours} min={0} max={12} step={0.5} valueLabel={`${sleepHours.toFixed(sleepHours % 1 ? 1 : 0)} hrs`} disabled={pending} onChange={(value) => { setSleepHours(value); setSleepLogged(true); choosing(); }} />
        <MovementSlider activity={movementType} minutes={movementMinutes} disabled={pending} onActivityChange={(value) => { setMovementType(value); choosing(); }} onMinutesChange={(value) => { setMovementMinutes(value); choosing(); }} />
      </div>
      <div className="sd-lobby-checkin-status" data-state={saveState} aria-live="polite" hidden={!message && !status && saveState !== "error"}>
        <span>{message ?? status}</span>
        {saveState === "error" && allChosen ? <button type="button" onClick={() => setSaveState("choosing")}>Try again</button> : null}
      </div>
      <Link href="/wellness" className="sd-lobby-checkin-open">Log wellness</Link>
      <DailySupportPreferences />
    </section>
  );
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

function EnergySlider({ energy, disabled, onSelect }: {
  energy: LobbyEnergy | null;
  disabled: boolean;
  onSelect: (value: LobbyEnergy) => void;
}) {
  const selectedIndex = ENERGY_OPTIONS.findIndex((option) => option.value === energy);
  const rangeValue = selectedIndex >= 0 ? selectedIndex : 1;
  const style = { "--checkin-offset": `${Math.max(selectedIndex, 0) * (100 / ENERGY_OPTIONS.length)}%` } as CSSProperties;
  return (
    <div className="sd-lobby-checkin-slider-row" role="group" aria-label="Energy">
      <span className="sd-lobby-checkin-slider-label">Energy</span>
      <div className="sd-lobby-checkin-slider" style={style} data-selected={energy !== null || undefined}>
        <input type="range" min={0} max={ENERGY_OPTIONS.length - 1} step={1} value={rangeValue} disabled={disabled} aria-label="Energy check-in" aria-valuetext={selectedIndex >= 0 ? ENERGY_OPTIONS[selectedIndex]?.label : "Not selected"} onChange={(event) => onSelect(ENERGY_OPTIONS[Number(event.currentTarget.value)]!.value)} />
        <div className="sd-lobby-checkin-slider-labels" aria-hidden="true">
          {ENERGY_OPTIONS.map((option, index) => <span key={option.value} data-active={selectedIndex === index || undefined}>{option.label}</span>)}
        </div>
      </div>
    </div>
  );
}

function RangeSlider({ label, value, min, max, step, valueLabel, disabled, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  valueLabel: string;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  const percentage = ((value - min) / (max - min)) * 100;
  const style = { "--checkin-range-fill": `${percentage}%` } as CSSProperties;
  return (
    <div className="sd-lobby-checkin-slider-row" role="group" aria-label={label}>
      <span className="sd-lobby-checkin-slider-label">{label}</span>
      <label className="sd-lobby-checkin-range" style={style}>
        <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} aria-label={label} aria-valuetext={valueLabel} onChange={(event) => onChange(Number(event.currentTarget.value))} />
        <output>{valueLabel}</output>
      </label>
    </div>
  );
}

function MovementSlider({ activity, minutes, disabled, onActivityChange, onMinutesChange }: {
  activity: LobbyMovement | null;
  minutes: number;
  disabled: boolean;
  onActivityChange: (value: LobbyMovement) => void;
  onMinutesChange: (value: number) => void;
}) {
  return (
    <div className="sd-lobby-checkin-slider-row sd-lobby-checkin-movement" role="group" aria-label="Movement">
      <span className="sd-lobby-checkin-slider-label">Movement</span>
      <div className="sd-lobby-checkin-movement-controls">
        <label className="sd-lobby-checkin-activity-select">
          <span className="sr-only">Movement type</span>
          <select value={activity ?? ""} disabled={disabled} aria-label="Movement type" onChange={(event) => onActivityChange(event.currentTarget.value as LobbyMovement)}>
            <option value="" disabled>Choose activity</option>
            {MOVEMENT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <RangeSlider label="Movement minutes" value={minutes} min={0} max={180} step={5} valueLabel={`${minutes} min`} disabled={disabled} onChange={onMinutesChange} />
      </div>
    </div>
  );
}
