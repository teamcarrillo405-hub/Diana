"use client";

import { ChevronLeft, ChevronRight, HeartPulse, Moon, PersonStanding, Sparkles } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import {
  getWellnessDetailStart,
  getWellnessWindow,
  getWellnessWindowDates,
  shiftWellnessWindow,
  type WellnessDashboardSummary,
  type WellnessDayRecord,
} from "@/lib/wellness/history";
import styles from "./wellness-dashboard.module.css";

type WellnessHistoryClientProps = {
  today: string;
  summary: WellnessDashboardSummary;
};

type WellnessRangeMode = "week" | "month";

export function WellnessClient({ today, summary }: WellnessHistoryClientProps) {
  const [mode, setMode] = useState<WellnessRangeMode>("week");
  const [anchorDate, setAnchorDate] = useState(today);
  const detailStart = getWellnessDetailStart(today);
  const window = useMemo(
    () => getWellnessWindow(today, mode, anchorDate),
    [anchorDate, mode, today],
  );
  const recordsByDate = useMemo(
    () => new Map(summary.dailyRecords.map((record) => [record.date, record])),
    [summary.dailyRecords],
  );
  const dates = useMemo(
    () => getWellnessWindowDates(window.start, window.end),
    [window.end, window.start],
  );

  const previousAnchor = shiftWellnessWindow(anchorDate, mode, -1);
  const previousWindow = getWellnessWindow(today, mode, previousAnchor);
  const nextAnchor = shiftWellnessWindow(anchorDate, mode, 1);
  const nextWindow = getWellnessWindow(today, mode, nextAnchor);
  const canMoveBack = previousWindow.end >= detailStart;
  const canMoveForward = nextWindow.start <= today;

  function changeMode(nextMode: WellnessRangeMode) {
    setMode(nextMode);
    setAnchorDate(today);
  }

  return (
    <main className={styles.main} id="main-content">
      <section className={styles.frame} aria-labelledby="wellness-title">
        <div className={styles.topNotch} aria-hidden="true" />
        <header className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>DAILY WELLNESS</p>
            <h1 id="wellness-title">Your wellness record</h1>
          </div>
          <p className={styles.retention}>Daily details are kept for three months.</p>
        </header>

        <section className={styles.metrics} aria-label="Year-to-date wellness summary">
          <MetricCard icon={<HeartPulse aria-hidden="true" />} label="Check-ins" value={`${summary.monthlyCheckInPercent}%`} detail={`${summary.monthlyCheckInDays} of ${summary.monthlyDayCount} days this month`} />
          <MetricCard icon={<Sparkles aria-hidden="true" />} label="Average energy" value={summary.averageEnergy === null ? "-" : `${summary.averageEnergy.toFixed(1)} / 3`} detail="Year to date" />
          <MetricCard icon={<Moon aria-hidden="true" />} label="Average sleep" value={summary.averageSleepHours === null ? "-" : `${summary.averageSleepHours.toFixed(1)} h`} detail="Year to date" />
          <MetricCard icon={<PersonStanding aria-hidden="true" />} label="Average movement" value={summary.averageMovementMinutes === null ? "-" : `${Math.round(summary.averageMovementMinutes)} min`} detail="Per check-in, year to date" />
        </section>

        <section className={styles.recordSection} aria-labelledby="daily-record-title">
          <div className={styles.recordHeader}>
            <div>
              <p className={styles.eyebrow}>HISTORY</p>
              <h2 id="daily-record-title">Daily information</h2>
            </div>
            <div className={styles.segmented} role="group" aria-label="Choose record view">
              <button type="button" aria-pressed={mode === "week"} onClick={() => changeMode("week")}>Week</button>
              <button type="button" aria-pressed={mode === "month"} onClick={() => changeMode("month")}>Month</button>
            </div>
          </div>

          <div className={styles.rangeBar}>
            <button type="button" className={styles.rangeButton} onClick={() => setAnchorDate(previousAnchor)} disabled={!canMoveBack} aria-label="Show earlier wellness records"><ChevronLeft aria-hidden="true" /></button>
            <p>{window.label}</p>
            <button type="button" className={styles.rangeButton} onClick={() => setAnchorDate(nextAnchor)} disabled={!canMoveForward} aria-label="Show newer wellness records"><ChevronRight aria-hidden="true" /></button>
          </div>

          <div className={mode === "month" ? styles.monthGrid : styles.weekList}>
            {dates.map((date) => <DayRecord key={date} date={date} record={recordsByDate.get(date) ?? null} compact={mode === "month"} />)}
          </div>
        </section>
        <div className={styles.bottomNotch} aria-hidden="true" />
      </section>
    </main>
  );
}

function MetricCard({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return (
    <article className={styles.metricCard}>
      <span className={styles.metricIcon}>{icon}</span>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function DayRecord({ date, record, compact }: { date: string; record: WellnessDayRecord | null; compact: boolean }) {
  const dateLabel = new Date(`${date}T00:00:00.000Z`).toLocaleDateString("en-US", {
    weekday: compact ? "short" : "long", month: "short", day: "numeric", timeZone: "UTC",
  });
  const energyLabel = record?.energy === "good" ? "Good" : record?.energy === "meh" ? "Steady" : record?.energy === "rough" ? "Low" : "-";
  const sleepLabel = record?.sleepHours === null || record?.sleepHours === undefined ? "-" : `${record.sleepHours.toFixed(1)} h`;
  const movementLabel = record?.movementMinutes ? `${record.movementMinutes} min` : "-";

  return (
    <article className={compact ? styles.dayCard : styles.dayRow} data-recorded={record?.checkedIn ? "true" : "false"}>
      <div className={styles.dayDate}>
        <time dateTime={date}>{dateLabel}</time>
        <span>{record?.checkedIn ? "Recorded" : "No entry"}</span>
      </div>
      <div className={styles.dayValues}>
        <Value label="Energy" value={energyLabel} />
        <Value label="Sleep" value={sleepLabel} />
        <Value label="Movement" value={movementLabel} />
      </div>
    </article>
  );
}

function Value({ label, value }: { label: string; value: string }) {
  return <span><small>{label}</small><strong>{value}</strong></span>;
}
