"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import Link from "next/link";
import { addDays, format, isValid, parseISO, startOfWeek } from "date-fns";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Inbox, Plus, Search } from "lucide-react";
import { StudentShell } from "@/components/student-shell/student-shell";
import type { StudentNavigationProfile } from "@/components/screen-design/student-desktop-nav";
import { assignmentActionLabel, assignmentCollectionState, assignmentDestination, assignmentStatusLabel, subjectArtwork, type AssignmentCollectionState } from "@/lib/assignment-navigation";
import { todayDateKey } from "@/lib/dashboard/today-view";
import { formatCampusName } from "@/lib/school-branding";
import { schoolLogo } from "@/lib/school-branding-display";
import type { AssignmentKind, AssignmentStatus } from "@/lib/supabase/types";
import shell from "@/components/student-shell/student-shell.module.css";
import styles from "./work-collection.module.css";

export type WorkCommandItem = {
  id: string;
  title: string;
  className: string;
  classColor: string;
  dueAt: string | null;
  minutes: number | null;
  kind: AssignmentKind;
  status: AssignmentStatus;
  reasons: string[];
  description?: string | null;
};

const categories = [
  { id: "active", label: "Active", empty: "No active assignments", hint: "Add an assignment or check another status." },
  { id: "review", label: "Review", empty: "Nothing to review", hint: "Work you send to Diana for review appears here." },
  { id: "ready", label: "Ready to submit", empty: "Nothing ready to submit", hint: "Work you prepare to hand in appears here." },
  { id: "submitted", label: "Submitted", empty: "No submitted assignments", hint: "Your hand-in records appear here." },
] as const;

type BoardState = {
  category: AssignmentCollectionState;
  query: string;
  subject: string;
  selectedId: string;
  selectedDay: string | null;
  weekDay: string;
};

type Props = StudentNavigationProfile & {
  assignments: WorkCommandItem[];
  nowIso: string;
  timeZone?: string;
  unavailable?: boolean;
  initialCategory?: AssignmentCollectionState;
  captureCount?: number;
  schoolName?: string | null;
  schoolLogoUrl?: string | null;
  studentId?: string;
  restoreContext?: boolean;
};

function isDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(value) && isValid(parseISO(value));
}

function restoreBoard(key: string, defaults: BoardState): BoardState {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) ?? "null") as Partial<BoardState> | null;
    if (!saved) return defaults;
    return {
      category: categories.find(entry => entry.id === saved.category)?.id ?? defaults.category,
      query: typeof saved.query === "string" ? saved.query.slice(0, 120) : "",
      subject: typeof saved.subject === "string" ? saved.subject : "all",
      selectedId: typeof saved.selectedId === "string" ? saved.selectedId : "",
      selectedDay: saved.selectedDay === "undated" || isDateKey(saved.selectedDay) ? saved.selectedDay : null,
      weekDay: isDateKey(saved.weekDay) ? saved.weekDay : defaults.weekDay,
    };
  } catch {
    return defaults;
  }
}

export function WorkCommandCenter({ assignments, nowIso, timeZone = "UTC", unavailable = false, initialCategory = "active", captureCount = 0, schoolName, schoolLogoUrl, studentId, restoreContext = false, ...profile }: Props) {
  const today = todayDateKey(nowIso, timeZone);
  const campusName = formatCampusName(schoolName);
  const campusLogo = schoolLogo(schoolLogoUrl);
  const storageKey = studentId ? `diana.work.board.${studentId}` : null;
  const [board, setBoard] = useState<BoardState>(() => ({
    category: initialCategory, query: "", subject: "all", selectedId: "", selectedDay: null, weekDay: today,
  }));
  const [datesOpen, setDatesOpen] = useState(false);
  const { category, query, selectedId, selectedDay, weekDay } = board;
  const picks = useRef(new Map<string, HTMLButtonElement>());
  const dateToggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const defaults: BoardState = { category: initialCategory, query: "", subject: "all", selectedId: "", selectedDay: null, weekDay: today };
    setBoard(restoreContext && storageKey ? restoreBoard(storageKey, defaults) : defaults);
  }, [initialCategory, restoreContext, storageKey, today]);

  const subjects = [...new Set(assignments.map(item => item.className))].sort();
  const subject = subjects.includes(board.subject) ? board.subject : "all";
  const filtered = assignments.filter(item =>
    assignmentCollectionState(item.status) === category
    && (subject === "all" || subject === item.className)
    && `${item.title} ${item.className}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const itemsByDay = new Map<string, WorkCommandItem[]>();
  for (const item of filtered) {
    const day = item.dueAt ? todayDateKey(item.dueAt, timeZone) : "undated";
    const dayItems = itemsByDay.get(day);
    if (dayItems) dayItems.push(item);
    else itemsByDay.set(day, [item]);
  }
  const items = selectedDay === null ? filtered : (itemsByDay.get(selectedDay) ?? []);
  const selected = items.find(item => item.id === selectedId) ?? items[0];
  const artSubject = selected && /\bprimary sources?\b/iu.test(selected.title) ? "History" : selected?.className;
  const days = Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(parseISO(weekDay), { weekStartsOn: 1 }), index));
  const selectedCategory = categories.find(entry => entry.id === category) ?? categories[0];
  const hasFilters = Boolean(query.trim()) || subject !== "all" || selectedDay !== null;
  const dueFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone });
  const shortDueFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone });
  const dateLabel = selectedDay === "undated" ? "No due date" : selectedDay ? format(parseISO(selectedDay), "MMM d") : "Any due date";

  function update(patch: Partial<BoardState>) {
    setBoard(current => ({ ...current, ...patch }));
  }

  function saveReturn() {
    if (!storageKey) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ ...board, subject, selectedId: selected?.id ?? "" }));
    } catch {
      // Navigation still works when browser storage is unavailable.
    }
  }

  function onPickKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    if (!step && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + step + items.length) % items.length;
    update({ selectedId: items[next].id });
    picks.current.get(items[next].id)?.focus();
  }

  function changeWeek(amount: number) {
    update({ weekDay: format(addDays(parseISO(weekDay), amount), "yyyy-MM-dd"), selectedDay: null });
  }

  function pickDate(day: string | null) {
    update(day === today ? { weekDay: today, selectedDay: day } : { selectedDay: day });
    if (dateToggle.current?.getClientRects().length) {
      setDatesOpen(false);
      dateToggle.current.focus();
    }
  }

  return (
    <StudentShell active="Work" profile={profile} campusScene showAdd={false}>
      <main id="main-content" className={`${shell.main} ${styles.main}`} tabIndex={-1}>
        {campusLogo && <div className={styles.roomBanner} data-work-campus-banner aria-hidden="true">
          <div className={styles.bannerFabric}><span><img src={campusLogo} alt="" /></span></div>
        </div>}
        <header className={styles.header}>
          <div className={styles.identity}><p>{campusName}</p><h1>Work</h1></div>
          <div className={styles.headerActions}>
            {captureCount > 0 && <Link className={shell.secondary} href="/assignments/captures" onClick={saveReturn}><Inbox size={17} aria-hidden="true" /><span>Captured</span><span className={styles.captureCount}>{captureCount}</span></Link>}
            <Link className={shell.secondary} href="/quick-add" onClick={saveReturn} aria-label="Add assignment"><Plus size={18} aria-hidden="true" /><span className={styles.fullAdd}>Add assignment</span><span className={styles.shortAdd}>Add</span></Link>
          </div>
        </header>

        <div className={styles.toolbar}>
          <div className={styles.categories} role="group" aria-label="Assignment status">
            {categories.map(entry => {
              const count = assignments.filter(item => assignmentCollectionState(item.status) === entry.id).length;
              return <button key={entry.id} aria-label={`${entry.label} ${count}`} aria-pressed={category === entry.id} onClick={() => update({ category: entry.id })}>
                {entry.id === "ready" ? <><span className={styles.fullStatus}>Ready to submit</span><span className={styles.shortStatus}>Ready</span></> : entry.label}
                <span className={styles.categoryCount} aria-hidden="true">{count}</span>
              </button>;
            })}
          </div>
          <div className={styles.filters}>
            <label className={styles.search}><Search size={17} aria-hidden="true" /><input aria-label="Find assignment" placeholder="Search" value={query} maxLength={120} onChange={event => update({ query: event.target.value, selectedDay: null })} /></label>
            <select aria-label="Subject" value={subject} onChange={event => update({ subject: event.target.value, selectedDay: null })}>
              <option value="all">All subjects</option>
              {subjects.map(name => <option key={name}>{name}</option>)}
            </select>
            <button ref={dateToggle} className={styles.dateToggle} type="button" aria-expanded={datesOpen} aria-controls="work-dates" onClick={() => setDatesOpen(open => !open)}>
              <CalendarDays size={17} aria-hidden="true" />{dateLabel}
            </button>
          </div>
        </div>

        <section id="work-dates" className={styles.datePanel} data-open={datesOpen} aria-label="Assignment dates" onKeyDown={event => {
          if (event.key === "Escape" && datesOpen && dateToggle.current?.getClientRects().length) {
            setDatesOpen(false);
            dateToggle.current.focus();
          }
        }}>
          <div className={styles.dateHeading}>
            <span>{format(days[0], "MMM d")} to {format(days[6], "MMM d, yyyy")}</span>
            <div className={styles.weekNavigation}>
              <button aria-label="Previous week" onClick={() => changeWeek(-7)}><ChevronLeft size={19} aria-hidden="true" /></button>
              <button aria-pressed={selectedDay === today} onClick={() => pickDate(today)}>Today</button>
              <button aria-label="Next week" onClick={() => changeWeek(7)}><ChevronRight size={19} aria-hidden="true" /></button>
            </div>
            <div className={styles.dateOptions}>
              <button aria-pressed={selectedDay === null} onClick={() => pickDate(null)}>All dates</button>
              <button aria-pressed={selectedDay === "undated"} onClick={() => pickDate("undated")}>No due date</button>
            </div>
          </div>
          <div className={styles.days} role="group" aria-label="Filter by due date">
            {days.map(day => {
              const key = format(day, "yyyy-MM-dd");
              const count = itemsByDay.get(key)?.length ?? 0;
              const countLabel = `${count} ${count === 1 ? "assignment" : "assignments"}`;
              return (
                <button key={key} aria-label={`${format(day, "EEEE, MMMM d")}, ${countLabel}`} aria-pressed={selectedDay === key} aria-current={key === today ? "date" : undefined} onClick={() => pickDate(selectedDay === key ? null : key)}>
                  <span className={styles.dayWeekday}>{format(day, "EEE")}</span>
                  <strong className={styles.dayDate}>{format(day, "d")}</strong>
                  <span className={styles.dayCount} data-empty={count === 0 || undefined} aria-hidden="true">{count}<span className={styles.dayNoun}> {count === 1 ? "assignment" : "assignments"}</span></span>
                </button>
              );
            })}
          </div>
        </section>

        {unavailable ? <section className={styles.empty} role="status"><h2>Your work could not load</h2><Link className={shell.secondary} href="/assignments">Try again</Link></section> : selected ? (
          <div className={styles.board}>
            <section className={styles.roster} aria-labelledby="work-roster">
              <h2 id="work-roster">Assignments</h2>
              <div className={styles.rows} role="tablist" aria-label="Choose assignment" aria-orientation="vertical">
                {items.map((item, index) => (
                  <button key={item.id} ref={node => { if (node) picks.current.set(item.id, node); else picks.current.delete(item.id); }} role="tab" id={`assignment-${item.id}`} aria-controls="selected-assignment" aria-selected={selected.id === item.id} tabIndex={selected.id === item.id ? 0 : -1} onClick={() => update({ selectedId: item.id })} onKeyDown={event => onPickKey(event, index)}>
                    <span className={styles.classDot} style={{ "--class-color": item.classColor } as CSSProperties} aria-hidden="true" />
                    <span className={styles.rowCopy}>
                      <strong>{item.title}</strong>
                      <span>{item.className} · {assignmentStatusLabel(item.status)}</span>
                    </span>
                    <span className={styles.rowDue}>{item.dueAt ? shortDueFormatter.format(new Date(item.dueAt)) : "Undated"}</span>
                  </button>
                ))}
              </div>
            </section>
            <section id="selected-assignment" role="tabpanel" aria-labelledby={`assignment-${selected.id}`} className={styles.selected}>
              <div className={styles.featured}>
                <div className={styles.art} style={{ "--assignment-art": `url("${subjectArtwork(artSubject ?? selected.className)}")` } as CSSProperties}>
                  <div>
                    <span className={styles.course}>{selected.className}</span>
                    <h2>{selected.title}</h2>
                  </div>
                </div>
                <div className={styles.assignmentDetails}>
                  <h3>Assignment details</h3>
                  <dl className={styles.facts}>
                    <div><dt>Due</dt><dd>{selected.dueAt ? dueFormatter.format(new Date(selected.dueAt)) : "No due date"}</dd></div>
                    {selected.minutes !== null && <div><dt>Estimated work</dt><dd>{selected.minutes} min</dd></div>}
                    <div><dt>Status</dt><dd>{assignmentStatusLabel(selected.status)}</dd></div>
                  </dl>
                  <Link className={`${shell.primary} ${styles.open}`} href={assignmentDestination(selected.id, selected.status)} onClick={saveReturn} aria-label={`${assignmentActionLabel(selected.status)} ${selected.title}`}>{assignmentActionLabel(selected.status)}<ArrowRight size={20} aria-hidden="true" /></Link>
                </div>
              </div>
              {selected.description && <details key={selected.id} className={styles.instructions}><summary>Assignment instructions</summary><p>{selected.description}</p></details>}
            </section>
          </div>
        ) : (
          <section className={styles.empty} aria-live="polite">
            <h2>{hasFilters ? "No matching assignments" : assignments.length ? selectedCategory.empty : "No assignments yet"}</h2>
            <p>{hasFilters ? "Try a different search, subject, or due date." : assignments.length ? selectedCategory.hint : "Add your first assignment to see it here."}</p>
            {hasFilters ? <button className={shell.secondary} onClick={() => update({ query: "", subject: "all", selectedDay: null })}>Clear filters</button> : category !== "active" && assignments.length > 0 ? <button className={shell.secondary} onClick={() => update({ category: "active" })}>Show active work</button> : null}
          </section>
        )}
      </main>
    </StudentShell>
  );
}
