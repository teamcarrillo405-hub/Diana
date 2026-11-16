import Link from "next/link";
import { ArrowUpRight, BookOpenCheck, Send } from "lucide-react";
import type { TodayData } from "@/lib/dashboard/today-view";
import styles from "./lobby-history-campus.module.css";

/** Account-backed activity only. Completion and submission are distinct facts. */
export function LobbyHistory({ data, sample = false }: { data: TodayData; sample?: boolean }) {
  return <div className={styles.history}>
    <header className={styles.heading}>
      <p className={styles.eyebrow}><span>YOUR WORK</span><span className={styles.week}>{data.weekLabel}</span></p>
      <h2>My Work</h2>
      <p className={styles.description}>Your assignment record for this week.</p>
    </header>
    <dl className={styles.records} aria-label="This week's assignment record">
      <div className={styles.record}><dt><BookOpenCheck size={21} aria-hidden="true" /> <span>Due this week marked done</span></dt><dd><strong>{data.weeklyUnavailable ? "Unavailable" : data.finished}</strong><p>Includes submitted and graded assignments</p></dd></div>
      <div className={styles.record}><dt><Send size={21} aria-hidden="true" /> <span>Submitted this week</span></dt><dd><strong>{data.submissionsUnavailable ? "Unavailable" : data.submitted}</strong><p>Based on submission date, regardless of due date</p></dd></div>
    </dl>
    <p className={styles.note}>Marking work done and submitting it are separate steps.</p>
    {sample
      ? <span className={styles.link} aria-disabled="true"><span>View completed work</span><ArrowUpRight size={21} aria-hidden="true" /></span>
      : <Link className={styles.link} href="/proof"><span>View completed work</span><ArrowUpRight size={21} aria-hidden="true" /></Link>}
  </div>;
}
