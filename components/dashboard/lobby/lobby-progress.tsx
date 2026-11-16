"use client";
import type { CSSProperties } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { formatMinutes, type TodayData } from "@/lib/dashboard/today-view";
import { WeeklyRunway } from "./weekly-runway";
import activity from "./today-progress-review.module.css";
import styles from "./lobby-progress-review.module.css";

export function LobbyProgress({ data }: { data: TodayData }) {
  const studied = data.studied.reduce((sum, minutes) => sum + minutes, 0);
  const planned = data.planned.reduce((sum, minutes) => sum + minutes, 0);
  const estimated = data.subjects.reduce((sum, subject) => sum + subject.minutes, 0);
  return <div className={`${activity.performance} ${styles.screen}`} data-lobby-performance>
    <header className={styles.heading}><p>{data.weekLabel}</p><h2>Progress</h2><p>Focus time and work due this week</p></header>
    <dl className={styles.results} aria-label="Weekly results"><div><dt>Due this week marked done</dt><dd><div className={styles.metric}><strong>{data.weeklyUnavailable ? "--" : data.finished}</strong><span>/ {data.weeklyUnavailable ? "--" : data.total}</span></div>{!data.weeklyUnavailable && data.total > 0 ? <progress className={styles.completion} aria-label="Assignments due this week marked done" max={data.total} value={data.finished} /> : <p className={styles.resultNote}>{data.weeklyUnavailable ? "Completion unavailable" : "No assignments due this week"}</p>}</dd></div><div><dt>Completed focus time</dt><dd><div className={styles.metric}><strong>{data.studyUnavailable ? "--" : formatMinutes(studied)}</strong></div><p className={styles.timeGoal}>{data.studyUnavailable ? "Focus history unavailable" : <>Recorded session target: <b>{formatMinutes(planned)}</b></>}</p></dd></div></dl>
    <div className={styles.statistics}><div className={styles.activity}><WeeklyRunway key={data.today} planned={data.planned} studied={data.studied} unavailable={data.studyUnavailable} initialDay={data.currentDay} /></div><section className={styles.classes} aria-label="By class"><header className={styles.sectionHeading}><h3>By class</h3><span>Estimated workload</span></header>{data.weeklyUnavailable ? <p className={styles.status}>Class workload unavailable</p> : data.subjects.length ? <ul className={styles.classList}>{data.subjects.map(subject => { const share = estimated > 0 ? subject.minutes / estimated * 100 : 0; return <li key={subject.name} style={{ "--class-color": subject.color } as CSSProperties}><BookOpen className={styles.classSymbol} size={25} aria-hidden="true" /><span className={styles.className}>{subject.name}</span><span className={styles.classTime}>{formatMinutes(subject.minutes)}</span><span className={styles.shareTrack} aria-hidden="true"><i style={{ width: `${share}%` }} /></span><span className={styles.shareValue}>{Math.round(share)}<span>%</span></span></li>; })}</ul> : <p className={styles.status}>{data.total ? "No estimates available for work due this week." : "No assignments due this week."}</p>}</section></div>
    <Link href="/proof" className={styles.recordLink}>View completed work</Link>
  </div>;
}
