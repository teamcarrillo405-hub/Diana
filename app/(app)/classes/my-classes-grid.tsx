"use client";

import { ArrowRight, CalendarDays, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { StudentShell } from "@/components/student-shell/student-shell";
import type { StudentNavigationProfile } from "@/components/screen-design/student-desktop-nav";
import { subjectArtwork } from "@/lib/assignment-navigation";
import { calendarTimeZone } from "@/lib/calendar/time-zone";
import { formatCampusName } from "@/lib/school-branding";
import { schoolLogo } from "@/lib/school-branding-display";
import shell from "@/components/student-shell/student-shell.module.css";
import classroom from "../assignments/work-collection.module.css";
import styles from "./classes-roster.module.css";

export type SubjectLibraryCardModel = {
  id: string;
  name: string;
  teacher: string | null;
  href: string;
  openWorkCount: number;
  submittedCount: number;
  nextAssignmentTitle: string | null;
  nextAssignmentDueAt?: string | null;
  gradeLabel?: string | null;
  gradePercent?: number | null;
  gradeConfirmedAt?: string | null;
  gradeUnavailable?: boolean;
};

type Props = {
  createForm: ReactNode;
  createOpen: boolean;
  closeCreateHref?: string;
  profile?: StudentNavigationProfile;
  schoolName?: string | null;
  schoolLogoUrl?: string | null;
  timeZone?: string | null;
  unavailable?: boolean;
  workUnavailable?: boolean;
};

function gradeText(card: SubjectLibraryCardModel) {
  return card.gradeLabel ?? (card.gradeUnavailable ? "Grade unavailable" : "No grade posted");
}

function dateLabel(value: string | null | undefined, format: Intl.DateTimeFormat) {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? format.format(date) : null;
}

function FeaturedClass({ card, timeZone, workUnavailable }: {
  card: SubjectLibraryCardModel;
  timeZone: string;
  workUnavailable: boolean;
}) {
  const updated = dateLabel(card.gradeConfirmedAt, new Intl.DateTimeFormat("en-US", {
    timeZone, month: "short", day: "numeric", year: "numeric",
  }));
  const due = dateLabel(card.nextAssignmentDueAt, new Intl.DateTimeFormat("en-US", {
    timeZone, weekday: "short", month: "short", day: "numeric",
  }));

  return <section id="selected-class" role="tabpanel" aria-labelledby={`class-${card.id}`} className={styles.feature}>
    <div className={styles.art}>
      <img src={subjectArtwork(card.name)} alt="" />
      <div className={styles.featureTitle}>
        <h2>{card.name}</h2>
        {card.teacher && <p>{card.teacher}</p>}
      </div>
    </div>
    <div className={styles.summary}>
      <div className={styles.gradeSummary}>
        <span>Confirmed grade</span>
        <p>
          <strong data-posted={Boolean(card.gradeLabel)}>{gradeText(card)}</strong>
          {card.gradeLabel && card.gradePercent != null && <small>{card.gradePercent}%</small>}
        </p>
        {updated && card.gradeConfirmedAt && <p className={styles.confirmed}>Confirmed <time dateTime={card.gradeConfirmedAt}>{updated}</time></p>}
      </div>
      <div className={styles.nextDue}>
        <CalendarDays size={18} aria-hidden="true" />
        <div>
          <span>Next assignment</span>
          {workUnavailable ? <p>Assignments could not load.</p> : card.nextAssignmentTitle ? <>
            <p>{card.nextAssignmentTitle}</p>
            {due && card.nextAssignmentDueAt ? <time dateTime={card.nextAssignmentDueAt}>Due {due}</time> : <small>No due date</small>}
          </> : <p>No active assignments</p>}
        </div>
      </div>
      <Link className={`${shell.primary} ${styles.openClass}`} href={card.href}>Open class <ArrowRight size={20} aria-hidden="true" /></Link>
    </div>
    {!workUnavailable && <div className={styles.workCounts}>
      <span><strong>{card.openWorkCount}</strong> Active</span>
      <span><strong>{card.submittedCount}</strong> Submitted</span>
    </div>}
  </section>;
}

export function EmptyClassLibrary(props: Props) { return <MyClassesGrid {...props} cards={[]} />; }

export function MyClassesGrid({
  cards, createForm, createOpen, closeCreateHref, profile, schoolName, schoolLogoUrl, timeZone,
  unavailable = false, workUnavailable = false,
}: Props & { cards: SubjectLibraryCardModel[] }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(cards[0]?.id);
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const filter = query.trim().toLowerCase();
  const visible = cards.filter(card => `${card.name} ${card.teacher ?? ""}`.toLowerCase().includes(filter));
  const selected = visible.find(card => card.id === selectedId) ?? visible[0];
  const logo = schoolLogo(schoolLogoUrl);

  function moveSelection(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const direction = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    if (!direction && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const nextIndex = event.key === "Home" ? 0
      : event.key === "End" ? visible.length - 1
      : (index + direction + visible.length) % visible.length;
    const next = visible[nextIndex];
    setSelectedId(next.id);
    refs.current.get(next.id)?.focus();
  }

  return <StudentShell active="Classes" campus campusScene profile={profile} className={styles.root}>
    <main id="main-content" className={styles.main} tabIndex={-1}>
      {logo && <div className={classroom.roomBanner} aria-hidden="true" data-classroom-banner>
        <div className={classroom.bannerFabric}><span><img src={logo} alt="" /></span></div>
      </div>}
      <header className={styles.pageHeading}>
        <div className={styles.pageTitle}><p>{formatCampusName(schoolName)}</p><h1>Classes</h1></div>
        <Link href={createOpen ? closeCreateHref ?? "/classes" : "/classes?create=1"} className={shell.secondary}>
          {createOpen ? closeCreateHref ? "Back to assignment setup" : "Close" : <><Plus size={18} aria-hidden="true" />Add class</>}
        </Link>
      </header>
      {createOpen && <section className={styles.classForm} aria-label="Add a class"><h2>Add a class</h2>{createForm}</section>}
      {unavailable ? (
        <div className={`${shell.empty} ${styles.empty}`} role="status"><h2>Classes could not load</h2><button className={shell.secondary} onClick={() => window.location.reload()}>Try again</button></div>
      ) : !cards.length ? (
        <div className={`${shell.empty} ${styles.empty}`}><h2>Add your first class</h2>{!createOpen && <Link className={shell.primary} href="/classes?create=1">Add class <Plus aria-hidden="true" /></Link>}</div>
      ) : (
        <div className={styles.layout}>
          <aside className={styles.roster}>
            <label className={styles.search}>
              <Search size={16} aria-hidden="true" />
              <input type="search" aria-label="Find a class" placeholder="Find a class" value={query} onChange={event => setQuery(event.target.value)} />
            </label>
            {visible.length > 0 && <>
              <div className={styles.rosterHeading} aria-hidden="true"><span>Your classes</span><span>Grade</span></div>
              <div className={styles.classTabs} role="tablist" aria-label="Your classes" aria-orientation="vertical">
                {visible.map((card, index) => <button
                  key={card.id}
                  role="tab"
                  id={`class-${card.id}`}
                  aria-label={`${card.name}, ${card.gradeLabel ? "confirmed grade " : ""}${gradeText(card)}`}
                  aria-controls="selected-class"
                  aria-selected={selected?.id === card.id}
                  tabIndex={selected?.id === card.id ? 0 : -1}
                  ref={element => {
                    if (element) refs.current.set(card.id, element);
                    else refs.current.delete(card.id);
                  }}
                  onClick={() => setSelectedId(card.id)}
                  onKeyDown={event => moveSelection(event, index)}
                >
                  <strong>{card.name}</strong>
                  <span className={styles.rowGrade} data-posted={Boolean(card.gradeLabel)}>
                    {gradeText(card)}
                  </span>
                </button>)}
              </div>
            </>}
          </aside>
          {selected ? <FeaturedClass card={selected} timeZone={calendarTimeZone(timeZone)} workUnavailable={workUnavailable} />
            : <div className={`${shell.empty} ${styles.empty}`}><h2>No matching classes</h2><button className={shell.secondary} onClick={() => setQuery("")}>Clear search</button></div>}
        </div>
      )}
    </main>
  </StudentShell>;
}

