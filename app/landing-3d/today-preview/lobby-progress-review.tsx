"use client";

import type { CSSProperties } from "react";
import { BookOpen } from "lucide-react";
import { formatMinutes, reviewSubjectColors } from "./preview-data";
import { SUBJECT_SYMBOLS } from "./today-now-proof";
import { WeeklyRunway } from "./today-progress-review";
import activityStyles from "./today-progress-review.module.css";
import styles from "./lobby-progress-review.module.css";

type SubjectWork = { name: string; minutes: number; color: string };

export function LobbyProgressReview({ completed, total, planned, studied, subjects, unavailable }: {
  completed: number;
  total: number;
  planned: readonly number[];
  studied: readonly number[];
  subjects: readonly SubjectWork[];
  unavailable: boolean;
}) {
  const studiedMinutes = studied.reduce((sum, minutes) => sum + minutes, 0);
  const plannedMinutes = planned.reduce((sum, minutes) => sum + minutes, 0);
  const estimatedMinutes = subjects.reduce((sum, subject) => sum + subject.minutes, 0);
  const percentage = total > 0 ? Math.min(100, Math.max(0, Math.round(completed / total * 100))) : 0;

  return <div className={`${activityStyles.performance} ${styles.screen}`} data-lobby-performance>
    <header className={styles.heading}><p>This week</p><h2>Progress</h2></header>
    <dl className={styles.results} aria-label="Weekly results">
      <div>
        <dt>Assignments complete</dt>
        <dd><div className={styles.metric}><strong>{unavailable ? "--" : completed}</strong><span>/ {total}</span></div>
        {!unavailable && total > 0 ? <>
          <progress className={styles.completion} aria-label="Weekly assignments complete" max={total} value={Math.min(total, Math.max(0, completed))}>{completed} of {total}</progress>
          <p className={styles.resultNote}><b>{percentage}%</b> of weekly goal</p>
        </> : <>
          <div className={styles.emptyTrack} aria-hidden="true" />
          <p className={styles.resultNote}>{unavailable ? "Completion unavailable" : "No weekly goal yet"}</p>
        </>}
        </dd>
      </div>
      <div>
        <dt>Study time completed</dt>
        <dd><div className={styles.metric}><strong>{unavailable ? "--" : formatMinutes(studiedMinutes)}</strong></div>
        <p className={styles.timeGoal}>of <b>{formatMinutes(plannedMinutes)}</b> planned</p>
        </dd>
      </div>
    </dl>
    <div className={styles.statistics}>
      <div className={styles.activity}>
        <WeeklyRunway planned={planned} studied={studied} unavailable={unavailable} />
        {(unavailable || !total) && <p className={styles.status} role="status">{unavailable ? "Study history temporarily unavailable." : "No assignments planned this week."}</p>}
      </div>
      <section className={styles.classes} aria-label="By Class" data-class-workload>
        <header className={styles.sectionHeading}><h3>By Class</h3><span>Estimated workload</span></header>
        {unavailable ? <p className={styles.status} role="status">Class workload temporarily unavailable.</p> : !subjects.length ? <p className={styles.status}>Your classes appear here when you plan some work.</p> : <ul className={styles.classList} aria-label="Class workload shares">
          {subjects.map(subject => {
            const share = estimatedMinutes > 0 ? Math.max(0, subject.minutes / estimatedMinutes * 100) : 0;
            const Symbol = Object.hasOwn(SUBJECT_SYMBOLS, subject.name) ? SUBJECT_SYMBOLS[subject.name] : BookOpen;
            return <li key={subject.name} style={{ "--class-color": reviewSubjectColors[subject.name] ?? subject.color } as CSSProperties}>
              <Symbol className={styles.classSymbol} size={25} strokeWidth={1.8} aria-hidden="true" />
              <span className={styles.className}>{subject.name}</span>
              <span className={styles.classTime}>{formatMinutes(subject.minutes)}</span>
              <span className={styles.shareTrack} aria-hidden="true"><i style={{ width: `${share}%` }} /></span>
              <span className={styles.shareValue}>{Math.round(share)}<span>%</span></span>
            </li>;
          })}
        </ul>}
      </section>
    </div>
  </div>;
}
