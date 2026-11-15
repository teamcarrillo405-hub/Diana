"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { BookOpen, CheckCheck, ChevronRight, Clock3, Dna, Feather, Globe2, Landmark, Leaf, Pause, Play, Sigma, type LucideIcon } from "lucide-react";
import type { PreviewScenario, PreviewTask } from "./preview-data";
import styles from "./today-now-proof.module.css";

export const SUBJECT_SYMBOLS: Readonly<Record<string, LucideIcon>> = {
  History: Landmark,
  "Algebra I": Sigma,
  Biology: Dna,
  English: Feather,
  "Environmental Science": Leaf,
  "Spanish Language and Culture": Globe2,
};

function SubjectEmblem({ task, small = false }: { task: PreviewTask; small?: boolean }) {
  const Symbol = Object.hasOwn(SUBJECT_SYMBOLS, task.subject) ? SUBJECT_SYMBOLS[task.subject] : BookOpen;
  return <span data-subject-emblem data-small={small || undefined} aria-hidden="true" style={{ "--subject-color": task.color } as CSSProperties}><Symbol size={small ? 14 : 24} strokeWidth={1.8} /></span>;
}

export function TodayNowProof({ tasks, scenario, onTask, onStart = onTask, compact = false, composition = false, graphicLanguage = false, focused = false, resumable = false, launchPending = false, pausedSessions = {} }: { tasks: PreviewTask[]; scenario: PreviewScenario; onTask: (task: PreviewTask) => void; onStart?: (task: PreviewTask) => void; compact?: boolean; composition?: boolean; graphicLanguage?: boolean; focused?: boolean; resumable?: boolean; launchPending?: boolean; pausedSessions?: Record<string, number> }) {
  const task = tasks[0];
  const meta = task && <div className={styles.meta} data-now-meta><span><Clock3 size={16} />{task.minutes} min today</span><span>Due {task.due.toLowerCase()}</span></div>;
  const nextStep = !focused && <div className={styles.nextStep} data-now-step><p>Next step</p><h3>Choose three sources for your argument.</h3></div>;
  const start = task && <button type="button" className={styles.start} data-now-start aria-disabled={launchPending || undefined} aria-busy={launchPending || undefined} onClick={() => { if (!launchPending) onStart(task); }}><Play size={17} fill="currentColor" /><span>{resumable ? "Resume" : "Start"}</span></button>;
  const queue = !focused && !!tasks.slice(1).length && <div className={styles.queue} data-now-queue><p>Up next</p><ul>{tasks.slice(1).map(item => {
    const remaining = pausedSessions[item.id];
    const paused = remaining !== undefined;
    return <li key={item.id}><button type="button" onClick={() => onTask(item)} data-session-paused={paused || undefined} style={{ "--subject-color": item.color } as CSSProperties}>
      {graphicLanguage && <span data-now-queue-emblem aria-hidden="true"><SubjectEmblem task={item} small /></span>}
      <span className={styles.queueSubject} data-now-queue-subject>{compact && !graphicLanguage && <SubjectEmblem task={item} small />}{item.subject}</span>
      <strong data-now-queue-title>{item.title}</strong>
      {composition && <ChevronRight data-queue-chevron size={18} aria-hidden="true" />}
      <span className={styles.queueMinutes} data-now-queue-time>{paused ? <><Pause size={12} aria-hidden="true" />Paused <span>{Math.ceil(Math.max(0, remaining) / 60_000)} min left</span></> : <>{item.minutes} min</>}</span>
    </button></li>;
  })}</ul></div>;
  return <>
    <div className={styles.nowLayout} data-now-layout>
      <div className={styles.briefing} data-now-briefing>
        {!compact && <p className={styles.eyebrow}>Today&apos;s Plan</p>}
        {task ? <>
          <div data-now-heading>
            <div data-now-identity>
              <div className={styles.subject} data-now-subject>{compact && <SubjectEmblem task={task} />}<span>{task.subject}</span>{!compact && <span>First up</span>}</div>
            </div>
            <h2 className={styles.assignmentTitle} data-now-title data-long-title={task.title.length > 60}>{task.title}</h2>
          </div>
          {composition ? <div data-now-action>{meta}{start}</div> : compact ? <div data-now-launch><div data-now-launch-footer>{meta}{start}</div></div> : <>{meta}{nextStep}{start}</>}
        </> : <div className={styles.empty} data-now-empty><div data-now-identity>{composition && scenario !== "complete" ? <BookOpen size={30} /> : <CheckCheck size={30} />}</div><h2>{scenario === "unavailable" ? "Your plan is unavailable" : scenario === "complete" ? "Today's work is complete" : "A little room to plan"}</h2><p>{scenario === "unavailable" ? "Your work will appear when the connection returns." : scenario === "complete" ? "Your next plan will appear here." : "Choose an assignment to begin your day."}</p><Link className={styles.start} href="/quick-add">Add an assignment</Link></div>}
      </div>
    </div>
    {!focused && (composition ? <div data-now-support>{queue}</div> : queue)}
  </>;
}
