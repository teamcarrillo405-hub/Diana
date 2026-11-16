"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, ChevronDown } from "lucide-react";
import { formatMinutes, type TodayData } from "@/lib/dashboard/today-view";
import { WeeklyRunway } from "./weekly-runway";
import activity from "./today-progress-review.module.css";
import styles from "./lobby-this-week.module.css";

/** A single record of real weekly activity; marking done never implies submission. */
export function LobbyThisWeek({ data, sample = false }: { data: TodayData; sample?: boolean }) {
  const studied = data.studied.reduce((sum, minutes) => sum + minutes, 0);
  const planned = data.planned.reduce((sum, minutes) => sum + minutes, 0);
  const estimated = data.subjects.reduce((sum, subject) => sum + subject.minutes, 0);

  return <div className={`${activity.performance} ${styles.week}`} data-lobby-this-week>
    <header className={styles.heading}>
      <p className={styles.eyebrow}>Your week <span>{data.weekLabel}</span></p>
      <h2>This Week</h2>
      <p>Assignments and focus time for this week.</p>
    </header>

    <dl className={styles.summary} aria-label="Weekly summary">
      <div><dt>Due this week marked done</dt><dd>{data.weeklyUnavailable ? "Unavailable" : <><strong>{data.finished}</strong><span> / {data.total}</span></>}</dd></div>
      <div><dt>Submitted this week</dt><dd>{data.submissionsUnavailable ? "Unavailable" : <strong>{data.submitted}</strong>}</dd></div>
      <div><dt>Completed focus time</dt><dd>{data.studyUnavailable ? "Unavailable" : <strong>{formatMinutes(studied)}</strong>}</dd></div>
    </dl>
    <p className={styles.summaryNote}>Done includes submitted and graded work due this week. Submissions count by the date you turned them in. Marking done and submitting are separate steps.</p>

    <section className={styles.workList} aria-labelledby="lobby-weekly-work-title">
      <div className={styles.sectionHeader}><h3 id="lobby-weekly-work-title">This week’s assignments</h3><span>Due or submitted this week</span></div>
      {(data.weeklyUnavailable || data.submissionsUnavailable) && <p className={styles.listMessage}>Some assignment records are unavailable right now.</p>}
      {data.weekRecords.length ? <>
        <ul className={styles.assignmentList}>{data.weekRecords.map(record => {
          const content = <><span className={styles.assignmentIdentity}><strong>{record.title}</strong><span>{record.subject} · {record.timing}</span></span><span className={styles.assignmentStatus}>{record.status}</span>{!sample && <ArrowUpRight size={16} aria-hidden="true" />}</>;
          return <li key={record.id}>{sample ? <div className={styles.assignmentRow}>{content}</div> : <Link className={styles.assignmentRow} href={record.href}>{content}</Link>}</li>;
        })}</ul>
        <p className={styles.listCaption}>Showing up to five assignments due or submitted this week.</p>
      </> : !(data.weeklyUnavailable || data.submissionsUnavailable) && <p className={styles.listMessage}>No assignments due or submitted this week.</p>}
    </section>

    {sample
      ? <span className={styles.recordLink} aria-disabled="true">View completed work <ArrowUpRight size={17} aria-hidden="true" /></span>
      : <Link className={styles.recordLink} href="/proof">View completed work <ArrowUpRight size={17} aria-hidden="true" /></Link>}

    <details className={styles.studyDetails}>
      <summary>Study details <ChevronDown size={18} aria-hidden="true" /></summary>
      <p className={styles.target}>{data.studyUnavailable ? "Focus history unavailable" : <>Recorded session target: <b>{formatMinutes(planned)}</b></>}</p>
      <div className={styles.statistics}>
        <div className={styles.activity}><WeeklyRunway key={data.today} planned={data.planned} studied={data.studied} unavailable={data.studyUnavailable} initialDay={data.currentDay} /></div>
        <section className={styles.classes} aria-label="By class">
          <div className={styles.sectionHeader}><h3>By class</h3><span>Estimated workload</span></div>
          {data.weeklyUnavailable ? <p className={styles.listMessage}>Class workload unavailable</p> : data.subjects.length
            ? <ul className={styles.classList}>{data.subjects.map(subject => {
              const share = estimated > 0 ? subject.minutes / estimated * 100 : 0;
              return <li key={subject.name} style={{ "--class-color": subject.color } as CSSProperties}><BookOpen size={19} aria-hidden="true" /><span>{subject.name}</span><b>{formatMinutes(subject.minutes)}</b><span className={styles.shareTrack} aria-hidden="true"><i style={{ width: `${share}%` }} /></span><small>{Math.round(share)}%</small></li>;
            })}</ul>
            : <p className={styles.listMessage}>{data.total ? "No estimates available for work due this week." : "No assignments due this week."}</p>}
        </section>
      </div>
    </details>
  </div>;
}
