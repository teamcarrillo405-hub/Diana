"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type CSSProperties, useEffect, useState, useTransition } from "react";
import styles from "@/components/dashboard/today-dashboard.module.css";

import type { LobbyCheckInValue, LobbyEnergy, LobbyMovement } from "@/lib/dashboard/lobby-check-in";
import { saveLobbyCheckIn } from "./actions";

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

  if (appearance === "today") return (
    <form className={styles.checkIn} onSubmit={event => { event.preventDefault(); setSleepLogged(true); choosing(); }}>
      <div className={styles.energyRow}><span>Energy</span><div role="group" aria-label="Energy" className={styles.energyOptions}>{ENERGY_OPTIONS.map(option => <button key={option.value} type="button" aria-pressed={energy === option.value} disabled={pending} onClick={() => { setEnergy(option.value); choosing(); }}>{option.label}</button>)}</div></div>
      <label className={styles.rangeRow}><span>Sleep <output>{sleepHours} hrs</output></span><input type="range" min="0" max="12" step=".5" value={sleepHours} disabled={pending} onChange={event => { setSleepHours(Number(event.target.value)); setSleepLogged(true); choosing(); }} aria-label="Sleep" style={{ "--fill": `${sleepHours / 12 * 100}%` } as CSSProperties} /></label>
      <div className={styles.movementRow}><label>Movement<select aria-label="Movement type" value={movementType ?? ""} disabled={pending} onChange={event => { setMovementType(event.target.value as LobbyMovement); choosing(); }}><option value="" disabled>Choose activity</option>{MOVEMENT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label className={styles.rangeRow}><span><span className={styles.srOnly}>Movement minutes</span><output>{movementMinutes} min</output></span><input type="range" aria-label="Movement minutes" min="0" max="180" step="5" value={movementMinutes} disabled={pending} onChange={event => { setMovementMinutes(Number(event.target.value)); choosing(); }} style={{ "--fill": `${movementMinutes / 180 * 100}%` } as CSSProperties} /></label></div>
      <button type="submit" className={styles.checkInSave} data-state={saveState} disabled={pending || !energy || !movementType || movementMinutes <= 0 || saveState === "saved"}>
        {status || (saveState === "error" ? "Try again" : "Save check-in")}
      </button>
      <span className={message ? styles.emptyNote : styles.srOnly} role="status">{message ?? status}</span>
    </form>
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
    </section>
  );
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
