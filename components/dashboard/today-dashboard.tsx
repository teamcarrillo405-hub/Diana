"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Award, BookOpen, CalendarDays, CheckCheck, ChevronRight, Clock3, FileCheck2, Heart, LayoutGrid, MoreHorizontal, Play, Plus, RotateCcw, Sparkles, X } from "lucide-react";
import { DianaWordmark } from "@/components/screen-design/primitives";
import { StudentDesktopNav } from "@/components/screen-design/student-desktop-nav";
import { formatMinutes, type TodayData, type TodayTask } from "@/lib/dashboard/today-view";
import { PanelHeading, ProgressRing, SubjectDonut, WeeklyBars } from "./today-graphics";
import { TodayStageLayout } from "./today-stage-layout";
import styles from "./today-dashboard.module.css";

type Profile = { displayName?: string | null; photoUrl?: string | null; photoOffsetX?: number | null; photoOffsetY?: number | null };
type Dialog = { title: string; subtitle: string; body: ReactNode };

export function TodayDashboard({ data, profile, checkIn }: { data: TodayData; profile: Profile; checkIn: ReactNode }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [priority] = data.plan;
  const studied = data.studied.reduce((sum, value) => sum + value, 0);
  const planned = data.planned.reduce((sum, value) => sum + value, 0);

  useEffect(() => {
    if (dialog && !dialogRef.current?.open) dialogRef.current?.showModal();
    if (dialog) dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    if (!dialog && dialogRef.current?.open) dialogRef.current?.close();
  }, [dialog]);

  const showTasks = (title: string, items: TodayTask[]) => setDialog({ title, subtitle: data.dateLabel, body: <ul className={styles.dialogList}>{items.map(task => <li key={task.id}><Link href={task.href}><strong>{task.title}</strong><span>{task.subject} / {task.date} / {task.due}</span></Link></li>)}</ul> });
  const milestones = [
    { title: "Work completed", label: "Assignments completed", value: data.finished, unavailable: data.weeklyUnavailable, asset: "work-completed.svg", description: "Completed assignments due this week. Each assignment counts once, including work finished ahead of its due date. Submission is a separate step." },
    { title: "Time well spent", label: "Sessions finished", value: data.sessions, unavailable: data.studyUnavailable, asset: "sessions-finished.svg", description: "Recorded focus sessions finished this week. Assignment estimates and open timers are not counted as completed sessions." },
    { title: "Handed in", label: "Work submitted", value: data.submitted, unavailable: data.submissionsUnavailable, asset: "work-submitted.svg", description: "Assignments submitted this week, regardless of their due date. Ready-to-submit work is not counted." },
  ];
  const retry = <button type="button" className={styles.textAction} onClick={() => router.refresh()}><RotateCcw size={15} />Try again</button>;

  return <div className={`${styles.preview} ${styles.live}`} data-today-dashboard>
    <StudentDesktopNav active="Today" {...profile} />
    <header className={styles.mobileHeader}>
      <DianaWordmark tight tone="dark" />
      <Link href="/quick-add" aria-label="Add assignment"><Plus size={20} /></Link>
      <Link href="/me" className={styles.avatar} aria-label="Your profile">{(profile.displayName?.trim() || "Student").slice(0, 1).toUpperCase()}</Link>
    </header>
    <div className={styles.frame}>
      <div className={styles.grid} aria-label="Today">
        <h1 className={styles.srOnly}>Today</h1>
        <TodayStageLayout>
        <section className={`${styles.panel} ${styles.planPanel}`} aria-label="Today's Plan">
          <PanelHeading title="Today's Plan" label="Your active route" action={<span className={styles.smallIcon}><Clock3 size={19} /></span>} />
          {data.assignmentsUnavailable ? <div className={styles.empty}><h3>Your plan could not load</h3>{retry}</div> : priority ? <>
            <div className={styles.priorityTask}>
              <div className={styles.priorityEyebrow}><span><i style={{ background: priority.color }} />{priority.subject}</span><span>First up</span></div>
              <h3>{priority.title}</h3>
              <div className={styles.priorityMeta}><span><Clock3 size={14} />{priority.minutes ? `${priority.minutes} min estimated` : "Time not estimated"}</span><span>{priority.due}</span></div>
              <Link className={styles.primaryAction} href={priority.href}><Play size={16} fill="currentColor" />Start</Link>
            </div>
            {!!data.plan.slice(1, 4).length && <p className={styles.routeLabel}>Up next</p>}
            <ul className={styles.planList}>{data.plan.slice(1, 4).map(task => <li key={task.id}><Link href={task.href}><i style={{ background: task.color }} /><span><strong>{task.title}</strong><small>{task.subject} <span>/</span> {task.minutes ? `${task.minutes} min` : "No estimate"}</small></span><ChevronRight size={17} /></Link></li>)}</ul>
            {data.plan.length > 4 && <button type="button" className={styles.textAction} onClick={() => showTasks("Today's plan", data.plan)}>View all {data.plan.length} tasks<ArrowRight size={15} /></button>}
          </> : <div className={styles.empty}><CheckCheck size={32} /><h3>A little room to plan</h3><p>No unfinished assignments to start.</p><Link href="/quick-add">Add an assignment<ArrowRight size={16} /></Link></div>}
        </section>

        <section className={`${styles.panel} ${styles.studyPanel}`} aria-label="Study Progress">
          <PanelHeading title="Study Progress" label="Your week in motion" action={<button className={styles.iconButton} title="About your weekly progress" aria-label="About your weekly progress" onClick={() => setDialog({ title: "Your weekly progress", subtitle: data.weekLabel, body: <><p>The assignment goal includes work due this week. The ring shows how much of that work is complete, including assignments finished early.</p><p>Planned bars use the target durations you chose when starting focus sessions. Studied bars use saved elapsed minutes from finished focus sessions, split across the local dates they cover. Open timers and assignment estimates do not add completed time.</p><p>Future calendar events are not treated as study plans. These totals update when you return after finishing a session.</p></> })}><Sparkles size={19} /></button>} />
          <div className={styles.studyGraphics}><ProgressRing completed={data.finished} total={data.total} unavailable={data.weeklyUnavailable} /><WeeklyBars key={data.today} initialDay={data.currentDay} planned={data.planned} studied={data.studied} unavailable={data.studyUnavailable} /></div>
          <div className={styles.progressSummary}><div><strong>{data.weeklyUnavailable ? "--" : data.finished}<span> / {data.weeklyUnavailable ? "--" : data.total}</span></strong><p>this week&apos;s assignments complete</p></div><div><strong>{data.studyUnavailable ? "--" : formatMinutes(studied)}<span> / {data.studyUnavailable ? "--" : formatMinutes(planned)}</span></strong><p>{data.studyUnavailable ? "Study history unavailable" : "planned focus time"}</p></div></div>
        </section>

        <section className={`${styles.panel} ${styles.deadlinePanel}`} aria-label="Upcoming due dates">
          <PanelHeading title="Upcoming due dates" label="Seven days ahead" action={<button className={styles.iconButton} title="View all upcoming work" aria-label="View all upcoming work" onClick={() => showTasks("Upcoming work", [...data.deadlines, ...data.earlierWork, ...data.otherReady])}><ArrowUpRight size={20} /></button>} />
          {data.assignmentsUnavailable ? <div className={styles.empty}><h3>Your due dates could not load</h3>{retry}</div> : <>
            <DeadlineList items={data.deadlines.slice(0, 3)} />
            {!!data.earlierWork.length && <div className={styles.earlierWork}><h3>Earlier work{data.earlierWork.length > 1 ? ` (${data.earlierWork.length})` : ""}</h3><DeadlineList items={data.earlierWork.slice(0, 1)} earlier /></div>}
            {!!data.otherReady.length && <div className={styles.earlierWork}><h3>Ready to submit</h3><DeadlineList items={data.otherReady.slice(0, 1)} /></div>}
            {!data.deadlines.length && !data.earlierWork.length && !data.otherReady.length && <div className={styles.empty}><CalendarDays size={30} /><h3>Room in your week</h3><p>No upcoming due dates.</p><Link href="/calendar">Open calendar<ArrowRight size={16} /></Link></div>}
            <p className={styles.panelFooter}><CalendarDays size={14} />{data.deadlines.length > 3 ? `${data.deadlines.length} upcoming / ` : ""}Through {data.horizonLabel}</p>
          </>}
        </section>

        <section className={`${styles.panel} ${styles.checkInPanel}`} aria-label="Check-In"><PanelHeading title="Check-In" label="Before you focus" action={<span className={styles.smallIcon}><Heart size={19} /></span>} />{checkIn}</section>
        <section className={`${styles.panel} ${styles.subjectPanel}`} aria-label="Subject Overview"><PanelHeading title="Subject Overview" label="This week's mix" action={<span className={styles.smallIcon}><BookOpen size={19} /></span>} />{data.weeklyUnavailable ? <div className={styles.empty}><p>Your subject totals could not load.</p>{retry}</div> : <SubjectDonut key={data.weekLabel} subjects={data.subjects} />}<p className={styles.panelFooter}>Share of estimated assignment work due this week</p></section>
        <section className={`${styles.panel} ${styles.achievementPanel}`} aria-label="Achievements"><PanelHeading title="Achievements" label="Your work, recorded" action={<span className={styles.smallIcon}><Award size={19} /></span>} />
          <div className={styles.badges}>{milestones.map(milestone => <button key={milestone.label} className={styles.badge} data-earned={milestone.value > 0 && !milestone.unavailable} onClick={() => setDialog({ title: milestone.title, subtitle: milestone.label, body: <><p className={styles.milestoneCount}>{milestone.unavailable ? "Unavailable" : milestone.value}</p><p>{milestone.unavailable ? "Your history could not load. Please try again." : milestone.description}</p>{milestone.unavailable && retry}</> })}>
            <Image className={styles.milestoneArt} src={`/images/today-milestones/${milestone.asset}`} width={128} height={140} alt="" />
            <strong>{milestone.title}</strong><span className={styles.badgeNumber}>{milestone.unavailable ? "--" : milestone.value}</span><small>{milestone.label}</small>
          </button>)}</div><p className={styles.achievementFooter}><Sparkles size={15} />Every bit of progress counts.</p>
        </section>
        </TodayStageLayout>
      </div>
    </div>
    <nav className={styles.mobileNav} aria-label="Primary mobile"><Link href="/dashboard" aria-current="page"><LayoutGrid size={21} /><span>Today</span></Link><Link href="/assignments"><FileCheck2 size={21} /><span>Work</span></Link><Link href="/classes"><BookOpen size={21} /><span>Classes</span></Link><Link href="/calendar"><CalendarDays size={21} /><span>Calendar</span></Link><Link href="/more"><MoreHorizontal size={21} /><span>More</span></Link></nav>
    <dialog ref={dialogRef} className={styles.dialog} onClose={() => setDialog(null)} onCancel={() => setDialog(null)} aria-labelledby="today-dialog-title"><div><header><p>{dialog?.subtitle}</p><button className={styles.iconButton} title="Close" aria-label="Close" onClick={() => setDialog(null)}><X size={20} /></button></header><h2 id="today-dialog-title">{dialog?.title}</h2>{dialog?.body}</div></dialog>
  </div>;
}

function DeadlineList({ items, earlier = false }: { items: TodayTask[]; earlier?: boolean }) {
  return <ul className={styles.deadlineList}>{items.map(task => <li key={task.id}><Link href={task.href}><span className={`${styles.calendarTile} ${task.ready ? styles.readyTile : earlier ? styles.earlierTile : ""}`} aria-hidden="true">{task.ready ? <FileCheck2 size={22} /> : <><span>{task.month}</span><b>{task.day}</b></>}</span><span className={styles.deadlineCopy}><strong>{task.title}</strong><small>{task.subject} <span>/</span> {task.date}</small><em className={task.ready ? styles.readyLabel : undefined}>{task.due}</em></span><ChevronRight size={16} /></Link></li>)}</ul>;
}
