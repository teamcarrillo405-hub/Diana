"use client";

import { useId, useState, useTransition } from "react";
import { studyTimeLabel } from "@/lib/calendar/planning";
import { saveCalendarWeekPlan } from "./planning-actions";
import styles from "./calendar-week-planning.module.css";

export function CalendarWeekPlanning({ weekStart, estimatedMinutes, plannedMinutes, initialAvailableMinutes, unavailable = false, unknownEstimateCount = 0, planningNote, onPlanStudy }: {
  weekStart: string; estimatedMinutes: number; plannedMinutes: number; initialAvailableMinutes: number | null; unavailable?: boolean; unknownEstimateCount?: number; planningNote?: string | null; onPlanStudy?: () => void;
}) {
  const titleId = useId();
  const [available, setAvailable] = useState(initialAvailableMinutes);
  const [hours, setHours] = useState(String(Math.floor((initialAvailableMinutes ?? 0) / 60)));
  const [minutes, setMinutes] = useState(String((initialAvailableMinutes ?? 0) % 60));
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  function save(value: number | null) {
    setNotice("");
    startTransition(async () => {
      try {
        const result = await saveCalendarWeekPlan({ weekStart, availableMinutes: value });
        if ("error" in result) { setNotice(result.error ?? "Try saving again."); return; }
        setAvailable(result.availableMinutes);
        setEditing(false);
        setNotice(value === null ? "Available time cleared." : "Available time saved.");
      } catch { setNotice("Your available study time could not be saved. Try again."); }
    });
  }
  const difference = available === null ? null : available - estimatedMinutes;
  return <section className={styles.panel} aria-labelledby={titleId}>
    <div className={styles.heading}><h2 id={titleId}>Time for your week</h2><button type="button" aria-expanded={editing} onClick={() => setEditing(!editing)}>{available === null ? "Add available time" : "Edit available time"}</button></div>
    <dl className={styles.metrics}><div><dt>Estimated work</dt><dd>{unknownEstimateCount > 0 ? estimatedMinutes > 0 ? `${studyTimeLabel(estimatedMinutes)} +` : "Not set" : studyTimeLabel(estimatedMinutes)}</dd></div><div><dt>Study blocks planned</dt><dd>{studyTimeLabel(plannedMinutes)}</dd></div><div><dt>Time you have available</dt><dd>{available === null ? "Not set" : studyTimeLabel(available)}</dd></div></dl>
    {unknownEstimateCount > 0 ? <p>Time estimates are still needed for {unknownEstimateCount} {unknownEstimateCount === 1 ? "assignment" : "assignments"}.</p> : null}
    {unavailable ? <p role="status">Some planning information could not load. These totals may be incomplete.</p> : null}
    {difference !== null && !unavailable && unknownEstimateCount === 0 ? <p>{difference >= 0 ? `${studyTimeLabel(difference)} available beyond the estimated work.` : `${studyTimeLabel(-difference)} more work estimated than the time you entered. Choose what to focus on or split the work into shorter blocks.`}</p> : null}
    {editing ? <form className={styles.editor} onSubmit={event => { event.preventDefault(); save(Number(hours) * 60 + Number(minutes)); }}>
      <p>How much study time do you have this week? This is your estimate.</p>
      <div className={styles.fields}><label>Hours<input type="number" inputMode="numeric" min="0" max="168" required value={hours} onChange={event => setHours(event.target.value)} /></label><label>Minutes<input type="number" inputMode="numeric" min="0" max="59" required value={minutes} onChange={event => setMinutes(event.target.value)} /></label></div>
      <div className={styles.actions}><button type="submit" disabled={pending}>{pending ? "Saving…" : "Save time"}</button><button type="button" disabled={pending} onClick={() => setEditing(false)}>Cancel</button>{available !== null ? <button type="button" disabled={pending} onClick={() => save(null)}>Clear</button> : null}</div>
    </form> : null}
    {notice ? <p role="status">{notice}</p> : null}
    {planningNote ? <p className={styles.note}>{planningNote}</p> : null}
    {onPlanStudy ? <button type="button" className={styles.plan} onClick={onPlanStudy}>Plan a study block</button> : null}
  </section>;
}
