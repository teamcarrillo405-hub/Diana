"use client";
import Link from "next/link";
import { CalendarDays, Clock3, Play } from "lucide-react";
import type { TodayTask } from "@/lib/dashboard/today-view";
import styles from "./today-now-proof.module.css";

export function LobbyNow({ task, unavailable, onRetry, sample = false, checkInNote }: { task?: TodayTask; unavailable: boolean; onRetry?: () => void; sample?: boolean; checkInNote?: string }) {
  const action = task && <><Play size={17} fill="currentColor" aria-hidden="true" /><span>{task.ready ? "Review submission" : task.resumable ? "Resume" : "Start"}</span></>;
  return <div className={styles.nowLayout} data-now-layout><div className={styles.briefing} data-now-briefing>
    {unavailable ? <div className={styles.empty} data-now-empty><h2>Your plan could not load</h2><button className={styles.start} data-now-start disabled={sample} onClick={onRetry}>Try again</button></div> : task ? <>
      <div data-now-heading><p className={styles.eyebrow} data-campus-eyebrow>YOUR NEXT MOVE</p><div data-now-identity><div className={styles.subject} data-now-subject><span>{task.subject}</span></div></div><h2 className={styles.assignmentTitle} data-now-title data-long-title={task.title.length > 60}>{task.title}</h2></div>
      <div data-now-action><dl className={styles.meta} data-now-meta>
        <div className={styles.metaItem}><dt><Clock3 size={15} aria-hidden="true" /> Estimated time</dt><dd>{task.minutes ? `${task.minutes} min` : "Not set"}</dd></div>
        <div className={styles.metaItem}><dt><CalendarDays size={15} aria-hidden="true" /> {task.ready ? "Status" : "Due"}</dt><dd>{task.due}</dd></div>
      </dl>{sample ? <span className={styles.start} data-now-start aria-disabled="true">{action}</span> : <Link className={styles.start} data-now-start href={task.href}>{action}</Link>}</div>
    </> : <div className={styles.empty} data-now-empty><h2>A little room to plan</h2>{sample
      ? <span className={styles.start} data-now-start aria-disabled="true">Add assignment</span>
      : <Link className={styles.start} data-now-start href="/quick-add">Add assignment</Link>}</div>}
    {checkInNote && <p data-lobby-check-in-note role="status">{checkInNote}</p>}
  </div></div>;
}
