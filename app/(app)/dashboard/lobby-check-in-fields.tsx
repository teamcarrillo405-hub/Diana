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
  { value: "food", label: "A snack or food" },
  { value: "water", label: "Water" },
  { value: "break", label: "A break" },
];

export type CheckInAnswers = {
  energy: LobbyEnergy | null;
  sleepHours: string;
  movementType: LobbyMovement | null;
  movementMinutes: string;
};

export function CheckInQuestions({ answers, disabled, onChange }: {
  answers: CheckInAnswers;
  disabled: boolean;
  onChange?: (answers: CheckInAnswers) => void;
}) {
  return <>
    <div className={styles.energy}>
      <span>Energy</span>
      <div role="group" aria-label="Energy" className={styles.energyOptions}>
        {ENERGY_OPTIONS.map(option => <button
          key={option.value}
          type="button"
          aria-pressed={answers.energy === option.value}
          disabled={disabled}
          onClick={() => onChange?.({ ...answers, energy: option.value })}
        >{option.label}</button>)}
      </div>
    </div>
    <div className={styles.otherQuestions}>
      <label className={styles.field}>
        <span>Sleep hours <small>Optional</small></span>
        <input type="number" min="0" max="12" step="0.5" inputMode="decimal" value={answers.sleepHours} disabled={disabled} onChange={event => onChange?.({ ...answers, sleepHours: event.currentTarget.value })} placeholder="Not shared" aria-label="Sleep hours" />
      </label>
      <div className={styles.movement}>
        <label className={styles.field}>
          <span>Activity <small>Optional</small></span>
          <select aria-label="Movement type" value={answers.movementType ?? ""} disabled={disabled} onChange={event => onChange?.({ ...answers, movementType: (event.currentTarget.value || null) as LobbyMovement | null })}>
            <option value="">Not shared</option>
            {MOVEMENT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className={styles.field}>
          <span>Minutes</span>
          <input type="number" min="1" max="180" step="1" inputMode="numeric" aria-label="Movement minutes" placeholder="Not shared" value={answers.movementMinutes} disabled={disabled} onChange={event => onChange?.({ ...answers, movementMinutes: event.currentTarget.value })} />
        </label>
      </div>
    </div>
  </>;
}

export function SupportChoices({ need, disabled, onChange }: {
  need: StudentDailySupportNeed | null;
  disabled: boolean;
  onChange?: (need: StudentDailySupportNeed) => void;
}) {
  const id = useId();
  return <fieldset className={styles.supportChoices} aria-describedby={`${id}-description`}>
    <legend>What would help right now? <small>Optional</small></legend>
    <p id={`${id}-description`} className={styles.supportNote}>Diana can use your choice for up to 24 hours. It stays saved until you clear or replace it.</p>
    <div className={styles.supportOptions}>
      {SUPPORT_OPTIONS.map(option => <label key={option.value}>
        <input type="radio" name={`${id}-support`} value={option.value} checked={need === option.value} disabled={disabled} onChange={() => onChange?.(option.value)} />
        <span>{option.label}</span>
      </label>)}
    </div>
  </fieldset>;
}

/** The public Lobby shows the real questions without loading or writing student records. */
export function LobbyCheckInPreview() {
  return <div className={`${styles.form} ${styles.campusForm} ${styles.readOnly}`}>
    <CheckInQuestions answers={{ energy: null, sleepHours: "", movementType: null, movementMinutes: "" }} disabled />
    <div className={styles.dailySupport}>
      <SupportChoices need={null} disabled />
      <div className={styles.supportActions}>
        <button type="button" disabled>Save support choice</button>
        <button type="button" disabled>Clear support choice</button>
      </div>
    </div>
    <button type="button" className={styles.save} disabled>Save check-in</button>
  </div>;
}
