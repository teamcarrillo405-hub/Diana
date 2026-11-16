import Link from "next/link";
import { ArrowUpRight, BookOpenCheck, Send } from "lucide-react";
import type { TodayData } from "@/lib/dashboard/today-view";
import styles from "./lobby-history-campus.module.css";

/** Account-backed activity only. Completion and submission are distinct facts. */
export function LobbyHistory({ data, sample = false, logoUrl }: { data: TodayData; sample?: boolean; logoUrl?: string | null }) {
  return <div className={styles.history}>
    <header className={styles.heading}>
      <p className={styles.eyebrow}><span>YOUR WORK</span><span className={styles.week}>{data.weekLabel}</span>{logoUrl && <span className={styles.mobileBadge} aria-hidden="true"><img src={logoUrl} alt="" width={32} height={32} /></span>}</p>
      <h2>My Work</h2>
      <p className={styles.description}>Your assignment record for this week.</p>
      <div className={styles.mobilePortrait} aria-hidden="true"><img src="/assets/today-now/diana-relit-poster-v1.webp" alt="" width={72} height={100} /></div>
    </header>
    <section className={styles.workList} aria-labelledby="lobby-weekly-work-title">
      <div className={styles.workListHeader}><h3 id="lobby-weekly-work-title">This week’s assignments</h3><span>Due or submitted this week</span></div>
      {(data.weeklyUnavailable || data.submissionsUnavailable) && <p className={styles.listMessage}>Some assignment records are unavailable right now.</p>}
      {data.weekRecords.length ? <>
        <ul className={styles.assignmentList}>{data.weekRecords.map(record => {
          const content = <><span className={styles.assignmentIdentity}><strong>{record.title}</strong><span>{record.subject} · {record.timing}</span></span><span className={styles.assignmentStatus}>{record.status}</span>{!sample && <ArrowUpRight size={17} aria-hidden="true" />}</>;
          return <li key={record.id}>{sample ? <div className={styles.assignmentRow}>{content}</div> : <Link className={styles.assignmentRow} href={record.href}>{content}</Link>}</li>;
        })}</ul>
        <p className={styles.listCaption}>Showing up to five assignments due or submitted this week.</p>
      </> : !(data.weeklyUnavailable || data.submissionsUnavailable) && <p className={styles.listMessage}>No assignments due or submitted this week.</p>}
    </section>
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
