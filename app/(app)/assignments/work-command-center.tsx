"use client";

import { useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import Link from "next/link";
import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { ArrowRight, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { StudentShell } from "@/components/student-shell/student-shell";
import type { StudentNavigationProfile } from "@/components/screen-design/student-desktop-nav";
import { assignmentActionLabel, assignmentCollectionState, assignmentDestination, assignmentStatusLabel, subjectArtwork, type AssignmentCollectionState } from "@/lib/assignment-navigation";
import { todayDateKey } from "@/lib/dashboard/today-view";
import type { AssignmentKind, AssignmentStatus } from "@/lib/supabase/types";
import shell from "@/components/student-shell/student-shell.module.css";
import schedule from "@/components/student-shell/schedule.module.css";
import styles from "./work-collection.module.css";

export type WorkCommandItem = {
  id: string; title: string; className: string; classColor: string; dueAt: string | null;
  minutes: number; kind: AssignmentKind; status: AssignmentStatus; reasons: string[];
  description?: string | null;
};
const categories: { id: AssignmentCollectionState; label: string }[] = [
  { id: "active", label: "Active" }, { id: "review", label: "Review" },
  { id: "ready", label: "Ready to submit" }, { id: "submitted", label: "Submitted" },
];

type Props = StudentNavigationProfile & { assignments: WorkCommandItem[]; nowIso: string; timeZone?: string; unavailable?: boolean; initialCategory?: AssignmentCollectionState; captureCount?:number };

export function WorkCommandCenter({ assignments, nowIso, timeZone = "UTC", unavailable = false, initialCategory = "active", captureCount=0, ...profile }: Props) {
  const today = todayDateKey(nowIso, timeZone);
  const [category, setCategory] = useState<AssignmentCollectionState>(initialCategory);
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("all");
  const [selectedId, setSelectedId] = useState(assignments[0]?.id ?? "");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [weekDay, setWeekDay] = useState(today);
  const picks = useRef(new Map<string, HTMLButtonElement>());
  const keyFor = (item: WorkCommandItem) => item.dueAt ? todayDateKey(item.dueAt, timeZone) : "undated";
  const filtered = assignments.filter(item => assignmentCollectionState(item.status) === category && (subject === "all" || subject === item.className) && `${item.title} ${item.className}`.toLowerCase().includes(query.trim().toLowerCase()));
  const items = filtered.filter(item => selectedDay === null || keyFor(item) === selectedDay);
  const selected = items.find(item => item.id === selectedId) ?? items[0];
  const days = Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(parseISO(weekDay), { weekStartsOn: 1 }), index));

  function onPickKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = ["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : ["ArrowUp", "ArrowLeft"].includes(event.key) ? -1 : 0;
    if (!step && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + step + items.length) % items.length;
    setSelectedId(items[next].id);
    picks.current.get(items[next].id)?.focus();
  }

  return <StudentShell active="Work" profile={profile} className={`${styles.root} ${schedule.root}`}>
    <main id="main-content" className={shell.main} tabIndex={-1}>
      <header className={shell.heading}><h1>Work</h1>{captureCount>0 ? <Link className={shell.secondary} href="/assignments/captures">Captured · {captureCount}</Link> : null}<Link className={shell.secondary} href="/quick-add"><Plus size={18} />Add assignment</Link></header>
      <div className={styles.toolbar}>
        <div className={styles.categories} role="group" aria-label="Assignment status">{categories.map(entry => <button key={entry.id} aria-label={`${entry.label} ${assignments.filter(item => assignmentCollectionState(item.status) === entry.id).length}`} aria-pressed={category === entry.id} onClick={() => { setCategory(entry.id); setSelectedDay(null); }}>{entry.label}<span>{assignments.filter(item => assignmentCollectionState(item.status) === entry.id).length}</span></button>)}</div>
        <div className={styles.filters}><label className={styles.search}><Search size={16} aria-hidden="true" /><input aria-label="Find assignment" placeholder="Find assignment" value={query} onChange={event => { setQuery(event.target.value); setSelectedDay(null); }} /></label><select aria-label="Subject" value={subject} onChange={event => { setSubject(event.target.value); setSelectedDay(null); }}><option value="all">All subjects</option>{[...new Set(assignments.map(item => item.className))].map(name => <option key={name}>{name}</option>)}</select></div>
      </div>
      <div className={schedule.period}><h2>{format(days[0], "MMM d")} - {format(days[6], "MMM d, yyyy")}</h2><div className={schedule.periodActions}>
        <button aria-label="Previous week" onClick={() => setWeekDay(format(addDays(parseISO(weekDay), -7), "yyyy-MM-dd"))}><ChevronLeft /></button>
        <button className={schedule.today} onClick={() => { setWeekDay(today); setSelectedDay(null); }}>Today</button>
        <button aria-label="Next week" onClick={() => setWeekDay(format(addDays(parseISO(weekDay), 7), "yyyy-MM-dd"))}><ChevronRight /></button>
      </div></div>
      <div className={schedule.dayRibbon} role="group" aria-label="Filter by due date">{days.map(day => { const key = format(day, "yyyy-MM-dd"); const count = filtered.filter(item => keyFor(item) === key).length; return <button key={key} aria-pressed={selectedDay === key} data-today={key === today || undefined} onClick={() => setSelectedDay(selectedDay === key ? null : key)}><span className={schedule.dayTop}>{format(day, "EEE")}</span><strong>{format(day, "d")}</strong><span className={schedule.dayCount}>{count} {count === 1 ? "assignment" : "assignments"}</span></button>; })}</div>
      <div className={styles.collectionScope}><button aria-pressed={selectedDay === null} onClick={() => setSelectedDay(null)}>All dates</button><button aria-pressed={selectedDay === "undated"} onClick={() => setSelectedDay("undated")}>No due date</button></div>
      {unavailable ? <section className={shell.empty}><h2>Your work could not load</h2><Link className={shell.secondary} href="/assignments">Try again</Link></section> : <div className={schedule.composition}>
        <aside className={schedule.agenda}><div className={schedule.agendaHeading}><h2>Your assignments</h2><span>{items.length}</span></div><div className={schedule.agendaItems} role="tablist" aria-label="Choose assignment" aria-orientation="vertical">{items.map((item, index) => <button key={item.id} ref={node => { if (node) picks.current.set(item.id, node); else picks.current.delete(item.id); }} role="tab" id={`assignment-${item.id}`} aria-controls="selected-assignment" aria-selected={selected?.id === item.id} tabIndex={selected?.id === item.id ? 0 : -1} onClick={() => setSelectedId(item.id)} onKeyDown={event => onPickKey(event, index)}><small>{assignmentStatusLabel(item.status)}</small><strong>{item.title}</strong><span>{item.className}</span></button>)}</div></aside>
        {selected ? <section id="selected-assignment" role="tabpanel" aria-labelledby={`assignment-${selected.id}`} className={schedule.selectedEvent}>
          <div className={schedule.eventComposition} style={{ "--event-color": selected.classColor } as CSSProperties}>
            <div className={schedule.feature}><div className={schedule.featureArt}><img src={subjectArtwork(selected.className)} alt="" /><div className={schedule.featureTitle}><span>{selected.className}</span><h2>{selected.title}</h2></div></div>{selected.description && <div className={schedule.eventSummary}><p>{selected.description}</p></div>}</div>
            <aside className={schedule.details} aria-label="Assignment details"><h3>Assignment details</h3><dl className={schedule.facts}><div><dt>Due</dt><dd>{selected.dueAt ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone }).format(new Date(selected.dueAt)) : "No due date"}</dd></div><div><dt>Estimated work</dt><dd>{selected.minutes} minutes</dd></div><div><dt>Status</dt><dd>{assignmentStatusLabel(selected.status)}</dd></div></dl><Link className={shell.primary} href={assignmentDestination(selected.id, selected.status)} aria-label={`${assignmentActionLabel(selected.status)} ${selected.title}`}>{assignmentActionLabel(selected.status)}<ArrowRight size={18} /></Link></aside>
          </div>
        </section> : <section className={shell.empty}><h2>{assignments.length ? "No matching assignments" : "No assignments yet"}</h2>{query || subject !== "all" || selectedDay !== null ? <button className={shell.secondary} onClick={() => { setQuery(""); setSubject("all"); setSelectedDay(null); }}>Clear filters</button> : <Link className={shell.primary} href="/quick-add">Add assignment</Link>}</section>}
      </div>}
    </main>
  </StudentShell>;
}
