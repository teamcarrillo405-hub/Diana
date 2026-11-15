"use client";

import { ArrowUpRight, CalendarDays, ChevronRight, FileCheck2 } from "lucide-react";
import type { PreviewTask } from "./preview-data";
import styles from "./today-upcoming-review.module.css";

type UpcomingProps = {
  deadlines: PreviewTask[];
  earlierWork: PreviewTask[];
  unavailable: boolean;
  onTask: (task: PreviewTask, origin: HTMLElement) => void;
  onViewAll: (origin: HTMLElement) => void;
};

function DeadlineRow({ task, featured = false, onTask }: { task: PreviewTask; featured?: boolean; onTask: UpcomingProps["onTask"] }) {
  return <li className={styles.deadline} data-featured={featured || undefined}>
    <button type="button" className={styles.row} aria-haspopup="dialog" aria-label={`${task.title}. ${task.subject}. Due ${task.date}. ${task.minutes} minute session. View details`} onClick={event => onTask(task, event.currentTarget)}>
      <span className={styles.date} aria-hidden="true"><span>{task.date.split(" ")[0]}</span><b>{task.day}</b></span>
      <span className={styles.copy}>
        <span className={styles.subject}>{task.subject}</span>
        <strong>{task.title}</strong>
        <span className={styles.meta}><span data-soon={task.due === "Tomorrow" || undefined}>{task.due}</span><span>{task.minutes} min session</span></span>
      </span>
      <ChevronRight className={styles.chevron} size={18} strokeWidth={1.8} aria-hidden="true" />
    </button>
  </li>;
}

export function TodayUpcomingReview({ deadlines, earlierWork, unavailable, onTask, onViewAll }: UpcomingProps) {
  const scheduled = deadlines.filter(task => !task.ready);
  const ready = deadlines.filter(task => task.ready);

  return <div className={styles.upcoming}>
    <header className={styles.heading}>
      <div><p>Upcoming <span>/ Sep 9 - 15</span></p><h2>Next 7 days</h2></div>
      {!unavailable && deadlines.length > 0 && <button type="button" className={styles.viewAll} title="View all upcoming work" aria-label="View all upcoming work" aria-haspopup="dialog" onClick={event => onViewAll(event.currentTarget)}><ArrowUpRight size={22} strokeWidth={1.8} aria-hidden="true" /></button>}
    </header>
    {unavailable ? <div className={styles.empty} role="status"><CalendarDays size={32} strokeWidth={1.5} aria-hidden="true" /><h3>Your schedule is unavailable</h3><p>Your deadlines will appear when the connection returns.</p></div> : <>
      {scheduled.length > 0 ? <ul className={styles.schedule} aria-label="Deadlines in the next seven days">{scheduled.map((task, index) => <DeadlineRow key={task.id} task={task} featured={index === 0} onTask={onTask} />)}</ul> : <div className={styles.empty}><CalendarDays size={32} strokeWidth={1.5} aria-hidden="true" /><h3>Room in your week</h3><p>No upcoming deadlines in this sample.</p></div>}
      {ready.length > 0 && <section className={styles.ready} aria-label="Ready to submit">
        <h3><FileCheck2 size={19} strokeWidth={1.8} aria-hidden="true" />Ready to submit <span>{ready.length}</span></h3>
        <ul>{ready.map(task => <li key={task.id}>
          <button type="button" className={`${styles.row} ${styles.readyRow}`} aria-haspopup="dialog" aria-label={`${task.title}. ${task.subject}. Ready to submit. Due ${task.date}. Review assignment`} onClick={event => onTask(task, event.currentTarget)}>
            <span className={styles.copy}><span className={styles.subject}>{task.subject} <span>/ Due {task.date}</span></span><strong>{task.title}</strong></span>
            <span className={styles.reviewLabel}>Review <ChevronRight size={18} strokeWidth={1.8} aria-hidden="true" /></span>
          </button>
        </li>)}</ul>
      </section>}
      {earlierWork.length > 0 && <section className={styles.earlier} aria-label="Earlier work"><h3>Earlier work</h3><ul>{earlierWork.map(task => <DeadlineRow key={task.id} task={task} onTask={onTask} />)}</ul></section>}
    </>}
  </div>;
}
