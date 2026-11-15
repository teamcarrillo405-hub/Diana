"use client";
import { DianaWordmark } from "@/components/screen-design/primitives";
import styles from "@/components/student-shell/shared-report.module.css";
import type { ParentSummary } from "@/lib/sharing/types";
const date = (value:string) => new Date(value).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"});
export function ParentSummaryView({summary}:{summary:ParentSummary}) {
 return <div className={styles.root}><main id="main-content" className={styles.paper}>
  <header><DianaWordmark tight tone="dark" /><p>Week of {date(summary.weekStartIso)}</p><h1>Shared progress</h1></header>
  <dl className={styles.stats}><div><dt>Completed work</dt><dd>{summary.completedThisWeek}</dd></div><div><dt>Due in seven days</dt><dd>{summary.upcomingNext7Days}</dd></div><div><dt>Study time this week</dt><dd>{summary.studyMinutesThisWeek} min</dd></div></dl>
  {summary.progressNotes.length ? <section><h2>Progress notes</h2>{summary.progressNotes.map((note,index)=><article key={`${note.createdAt}-${index}`}><p>{note.noteText}</p><small>{note.authorName} · {date(note.createdAt)}</small></article>)}</section> : null}
  {summary.masteryConcepts.length ? <section><h2>Concept confidence</h2><ul className={styles.list}>{summary.masteryConcepts.map(concept=><li key={concept.name}><span>{concept.name}</span><strong>{concept.level.toFixed(0)} of 4</strong></li>)}</ul></section> : null}
  <footer><p>Private link · Expires {date(summary.expiresAt)}</p><button type="button" onClick={()=>window.print()}>Print report</button></footer>
 </main></div>;
}
