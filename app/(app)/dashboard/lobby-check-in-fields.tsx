"use client";

import { useId } from "react";
import type { LobbyEnergy, LobbyMovement, StudentDailySupportNeed } from "@/lib/dashboard/lobby-check-in";
import styles from "./lobby-check-in.module.css";

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

const SUPPORT_OPTIONS: ReadonlyArray<{ value: StudentDailySupportNeed; label: string }> = [
  { value: "food", label: "Snack" },
  { value: "water", label: "Water" },
  { value: "break", label: "Break" },
];

export type CheckInAnswers = {
  energy: LobbyEnergy | null;
  sleepHours: string;
  movementType: LobbyMovement | null;
  movementMinutes: string;
};

export function EnergyChoice({ energy, disabled, onChange }: {
  energy: LobbyEnergy | null;
  disabled: boolean;
  onChange?: (energy: LobbyEnergy) => void;
}) {
  return <div className={styles.energy}>
    <span>Energy</span>
    <div role="group" aria-label="Energy" className={styles.energyOptions}>
      {ENERGY_OPTIONS.map(option => <button
        key={option.value}
        type="button"
        aria-pressed={energy === option.value}
        disabled={disabled}
        onClick={() => onChange?.(option.value)}
      >{option.label}</button>)}
    </div>
  </div>;
}

export function SleepAndActivity({ answers, disabled, onChange }: {
  answers: CheckInAnswers;
  disabled: boolean;
  onChange?: (answers: CheckInAnswers) => void;
}) {
  return <details className={styles.optionalQuestions}>
    <summary>Sleep and activity</summary>
    <div className={styles.otherQuestions}>
      <label className={styles.field}>
        <span>Sleep hours</span>
        <input type="number" min="0" max="12" step="0.5" inputMode="decimal" value={answers.sleepHours} disabled={disabled} onChange={event => onChange?.({ ...answers, sleepHours: event.currentTarget.value })} />
      </label>
      <label className={styles.field}>
        <span>Activity</span>
        <select value={answers.movementType ?? ""} disabled={disabled} onChange={event => {
          const movementType = (event.currentTarget.value || null) as LobbyMovement | null;
          onChange?.({ ...answers, movementType, movementMinutes: movementType ? answers.movementMinutes : "" });
        }}>
          <option value="">Choose activity</option>
          {MOVEMENT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      {answers.movementType && <label className={styles.field}>
        <span>Minutes</span>
        <input type="number" min="1" max="180" step="1" inputMode="numeric" value={answers.movementMinutes} disabled={disabled} onChange={event => onChange?.({ ...answers, movementMinutes: event.currentTarget.value })} />
      </label>}
    </div>
  </details>;
}

export function SupportChoices({ need, disabled, onChange, onClear }: {
  need: StudentDailySupportNeed | null;
  disabled: boolean;
  onChange?: (need: StudentDailySupportNeed) => void;
  onClear?: () => void;
}) {
  const id = useId();
  return <fieldset className={styles.supportChoices} aria-describedby={`${id}-description`}>
    <legend>Need anything?</legend>
    <div className={styles.supportOptions}>
      {SUPPORT_OPTIONS.map(option => <label key={option.value}>
        <input type="radio" name={`${id}-support`} value={option.value} checked={need === option.value} disabled={disabled} onChange={() => onChange?.(option.value)} />
        <span>{option.label}</span>
      </label>)}
    </div>
    <div className={styles.supportFootnote}>
      <p id={`${id}-description`} className={styles.supportNote}>Used for up to 24 hours.</p>
      {need && onClear && <button className={styles.clearSupport} type="button" aria-label="Clear support choice" disabled={disabled} onClick={onClear}>Clear</button>}
    </div>
  </fieldset>;
}

/** The public Lobby shows the real questions without loading or writing student records. */
export function LobbyCheckInPreview() {
  return <div className={`${styles.form} ${styles.campusForm} ${styles.readOnly}`}>
    <EnergyChoice energy={null} disabled />
    <div className={styles.dailySupport}>
      <SupportChoices need={null} disabled />
    </div>
    <SleepAndActivity answers={{ energy: null, sleepHours: "", movementType: null, movementMinutes: "" }} disabled />
    <button type="button" className={styles.save} disabled>Save check-in</button>
  </div>;
}
