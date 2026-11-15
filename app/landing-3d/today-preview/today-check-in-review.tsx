"use client";

import { useId, useState, type CSSProperties } from "react";
import { BatteryFull, BatteryLow, BatteryMedium, ChevronDown, Footprints, Moon } from "lucide-react";
import styles from "./today-check-in-review.module.css";

const ENERGY_OPTIONS = [
  { label: "Low", Icon: BatteryLow },
  { label: "Okay", Icon: BatteryMedium },
  { label: "Good", Icon: BatteryFull },
] as const;
const MOVEMENT_OPTIONS = ["Walk", "Run", "Bike", "Team sport", "Strength", "Stretch", "Dance", "Other"];

export function TodayCheckInReview({ onSaved }: { onSaved?: () => void }) {
  const [energy, setEnergy] = useState("Okay");
  const [sleep, setSleep] = useState(8);
  const [movement, setMovement] = useState("Walk");
  const [minutes, setMinutes] = useState(30);
  const [saved, setSaved] = useState(false);
  const id = useId();

  return <div className={styles.checkIn}>
    <header className={styles.heading}><p>Before you focus</p><h2>Check-In</h2></header>
    <form onSubmit={event => { event.preventDefault(); if (!saved) { setSaved(true); onSaved?.(); } }} onChange={() => setSaved(false)}>
      <div className={styles.energySection}>
        <h3 id={`${id}-energy`}>Energy</h3>
        <div className={styles.energyChoices} role="group" aria-labelledby={`${id}-energy`}>
          {ENERGY_OPTIONS.map(({ label, Icon }) => <button type="button" key={label} aria-pressed={energy === label} onClick={() => { if (energy !== label) { setEnergy(label); setSaved(false); } }}><Icon size={24} strokeWidth={2.25} aria-hidden="true" /><span>{label}</span></button>)}
        </div>
      </div>
      <div className={styles.section}>
        <div className={styles.valueRow}>
          <label className={styles.label} htmlFor={`${id}-sleep`}><Moon size={24} strokeWidth={2.25} aria-hidden="true" />Sleep</label>
          <output className={styles.value} htmlFor={`${id}-sleep`} aria-live="off">{sleep}<span>hrs</span></output>
        </div>
        <input className={styles.range} id={`${id}-sleep`} type="range" min="0" max="12" step=".5" value={sleep} aria-label="Sleep" aria-valuetext={`${sleep} hours`} onChange={event => setSleep(Number(event.target.value))} style={{ "--fill": `${sleep / 12 * 100}%` } as CSSProperties} />
        <div className={styles.scale} aria-hidden="true"><span>0 hrs</span><span>6</span><span>12 hrs</span></div>
      </div>
      <div className={styles.section}>
        <div className={styles.valueRow}>
          <div className={styles.movement}>
            <label className={styles.label} htmlFor={`${id}-movement`}><Footprints size={24} strokeWidth={2.25} aria-hidden="true" />Movement</label>
            <div className={styles.selectWrap}><select id={`${id}-movement`} aria-label="Movement type" value={movement} onChange={event => setMovement(event.target.value)}>{MOVEMENT_OPTIONS.map(value => <option key={value}>{value}</option>)}</select><ChevronDown size={20} strokeWidth={2.25} aria-hidden="true" /></div>
          </div>
          <output className={styles.value} htmlFor={`${id}-minutes`} aria-live="off">{minutes}<span>min</span></output>
        </div>
        <input className={styles.range} id={`${id}-minutes`} type="range" aria-label="Movement minutes" aria-valuetext={`${minutes} minutes`} min="0" max="180" step="5" value={minutes} onChange={event => setMinutes(Number(event.target.value))} style={{ "--fill": `${minutes / 180 * 100}%` } as CSSProperties} />
        <div className={styles.scale} aria-hidden="true"><span>0 min</span><span>90</span><span>180 min</span></div>
      </div>
      <footer className={styles.footer}>
        <button className={styles.save} type="submit" data-state={saved ? "saved" : "choosing"} aria-disabled={saved || undefined}>{saved ? "Saved for today" : "Save check-in"}</button>
        <span className={styles.srOnly} role="status">{saved ? "Check-in saved in this preview only." : ""}</span>
      </footer>
    </form>
  </div>;
}
