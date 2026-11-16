import Link from "next/link";
import { ArrowUpRight, BookOpenCheck, Clock3, Send } from "lucide-react";
import { formatMinutes, type TodayData } from "@/lib/dashboard/today-view";
import styles from "./campus-lobby.module.css";

/** Account-backed activity only. Completion and submission are distinct facts. */
export function LobbyHistory({ data }: { data: TodayData }) {
  const studied = data.studied.reduce((sum, minutes) => sum + minutes, 0);
  return <div className={styles.history}>
    <header className={styles.historyHeading}>
      <p>YOUR WORK · {data.weekLabel}</p>
      <h2>My Work</h2>
      <p>A clear view of what you have worked on this week.</p>
    </header>
    <dl className={styles.historyGrid}>
      <div><dt><BookOpenCheck size={19} aria-hidden="true" /> Work marked done</dt><dd>{data.weeklyUnavailable ? "Unavailable" : data.finished}<p>From assignments due this week</p></dd></div>
      <div><dt><Send size={19} aria-hidden="true" /> Submitted</dt><dd>{data.submissionsUnavailable ? "Unavailable" : data.submitted}<p>Assignments submitted this week</p></dd></div>
      <div><dt><Clock3 size={19} aria-hidden="true" /> Study time</dt><dd>{data.studyUnavailable ? "Unavailable" : formatMinutes(studied)}<p>Completed focus time this week</p></dd></div>
    </dl>
    <p className={styles.historyNote}>Marking work done and submitting it are separate steps.</p>
    <Link className={styles.historyLink} href="/proof">View completed work <ArrowUpRight size={17} aria-hidden="true" /></Link>
  </div>;
}
