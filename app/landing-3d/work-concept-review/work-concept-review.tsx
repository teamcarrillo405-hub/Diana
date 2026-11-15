"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { PreviewNavigation } from "../_components/preview-navigation";
import { addDays, format, isSameMonth, parseISO, startOfWeek } from "date-fns";
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, FileText, GalleryHorizontalEnd, LayoutGrid, Play, Search, X } from "lucide-react";
import { CONCEPT_ASSIGNMENTS, WORK_REVIEW_TODAY, assignmentAction, type ConceptAssignment, type WorkState } from "./fixtures";
import styles from "./work-concept-review.module.css";
import calendar from "../calendar-concept-review/calendar-concept-review.module.css";
import hub from "./work-calendar.module.css";

type Concept = "franchise" | "carousel";
const categories: { id: WorkState; label: string }[] = [
  { id: "active", label: "Active" }, { id: "review", label: "Review" },
  { id: "ready", label: "Ready to submit" }, { id: "submitted", label: "Submitted" },
];

function statusLabel(item: ConceptAssignment) {
  return item.state === "active" ? item.completed ? "In progress" : "Not started" : categories.find(entry => entry.id === item.state)!.label;
}

const dateKey = (date: Date) => format(date, "yyyy-MM-dd");
const dateLabel = (day: string) => format(parseISO(day), "EEEE, MMMM d");
const dueTime = (item: ConceptAssignment) => item.dueTime ? format(parseISO(`${item.dueDate}T${item.dueTime}`), "h:mm a") : "Submitted";
const matchesFilters = (item: ConceptAssignment, category: WorkState, query: string, subject: string) => item.state === category && (subject === "all" || item.subject === subject) && `${item.title} ${item.subject}`.toLowerCase().includes(query.trim().toLowerCase());

function AssignmentBrief({ item, action }: { item: ConceptAssignment; action: ReactNode }) {
  return <aside className={`${calendar.details} ${hub.details}`} aria-label="Assignment details">
    <h3>Assignment details</h3>
    <dl className={calendar.facts}><div><dt>{item.state === "submitted" ? "Submission record" : "Due"}</dt><dd>{format(parseISO(item.dueDate), "EEE, MMM d")}<strong>{dueTime(item)}</strong></dd></div>
      {item.state !== "submitted" && <div><dt>Estimated work</dt><dd>{item.minutes} minutes</dd></div>}
      <div><dt>Assignment status</dt><dd data-ready={item.state === "ready" || item.state === "review"} data-submitted={item.state === "submitted"}>{statusLabel(item)}</dd></div>
    </dl>
    <SavedProgress item={item} className={hub.progress} />
    <div className={hub.action}>{action}</div>
  </aside>;
}

function AssignmentResources({ item }: { item: ConceptAssignment }) {
  return <details className={hub.resources}><summary>Requirements &amp; materials<ChevronDown aria-hidden="true" /></summary><div>
    <section aria-label="Assignment requirements"><h3>{item.state === "submitted" ? "Completed work" : "Requirements"}</h3><ul className={hub.requirements}>{item.requirements.map((text, i) => <li key={text}><span>{String(i + 1).padStart(2, "0")}</span><span>{text}</span></li>)}</ul></section>
    <section aria-label="Assignment materials"><h3>Materials <span>{item.materials.length}</span></h3><ul className={hub.materials}>{item.materials.map(file => <li key={file}><FileText aria-hidden="true" /><span>{file}</span></li>)}</ul></section>
  </div></details>;
}

function SavedProgress({ item, className = "" }: { item: ConceptAssignment; className?: string }) {
  return <div className={`${styles.savedProgress} ${className}`}>
    <span className={styles.eyebrow}>{item.state === "submitted" ? "Completed work" : "Saved work"}</span>
    <strong>{item.completed}<span> / {item.total}</span><small>sections complete</small></strong>
    <div className={styles.progressTrack} role="progressbar" aria-label="Assignment sections complete" aria-valuenow={item.completed} aria-valuemin={0} aria-valuemax={item.total}>
      {Array.from({ length: item.total }, (_, i) => <span key={i} data-complete={i < item.completed} />)}
    </div>
  </div>;
}

export function WorkConceptReview() {
  const [concept, setConcept] = useState<Concept>("franchise");
  const [category, setCategory] = useState<WorkState>("active");
  const [selectedId, setSelectedId] = useState("chemistry");
  const [selectedDay, setSelectedDay] = useState(CONCEPT_ASSIGNMENTS[0].dueDate);
  const [compact, setCompact] = useState(false);
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("all");
  const [grid, setGrid] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const pickerRefs = useRef(new Map<string, HTMLButtonElement>());
  const launchRef = useRef<HTMLButtonElement>(null);
  const dayRefs = useRef(new Map<string, HTMLButtonElement>());
  const collection = CONCEPT_ASSIGNMENTS.filter(item => matchesFilters(item, category, query, subject));
  const items = concept === "franchise" ? collection.filter(item => item.dueDate === selectedDay) : collection;
  const selected = items.find(item => item.id === selectedId) ?? items[0];
  const selectedIndex = selected ? items.indexOf(selected) : -1;
  const date = parseISO(selectedDay);
  const days = Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(date, { weekStartsOn: 1 }), index));
  const weekItems = CONCEPT_ASSIGNMENTS.filter(item => item.dueDate >= dateKey(days[0]) && item.dueDate <= dateKey(days[6]));
  const nextDay = collection.map(item => item.dueDate).filter(day => day > selectedDay).sort()[0];
  const periodLabel = `${format(days[0], "MMM d")} - ${format(days[6], isSameMonth(days[0], days[6]) ? "d, yyyy" : "MMM d, yyyy")}`;

  useEffect(() => {
    const media = window.matchMedia?.("(max-width: 640px)");
    if (!media) return;
    const update = () => setCompact(media.matches);
    update(); media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  function selectItem(id: string, focus = false) {
    setSelectedId(id);
    const item = CONCEPT_ASSIGNMENTS.find(entry => entry.id === id);
    if (item) setSelectedDay(item.dueDate);
    if (focus) {
      const button = pickerRefs.current.get(id);
      button?.focus({ preventScroll: true });
      button?.scrollIntoView?.({ block: "nearest", inline: "nearest", behavior: "auto" });
    }
  }

  function pickerKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1
      : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!step && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1
      : (index + step + items.length) % items.length;
    selectItem(items[next].id, true);
  }

  function chooseCategory(id: WorkState) {
    setCategory(id);
    const first = CONCEPT_ASSIGNMENTS.find(item => matchesFilters(item, id, query, subject));
    setSelectedId(first?.id ?? "");
    if (first) setSelectedDay(first.dueDate);
  }

  function updateFilters(nextQuery: string, nextSubject: string) {
    setQuery(nextQuery); setSubject(nextSubject);
    const matches = CONCEPT_ASSIGNMENTS.filter(item => matchesFilters(item, category, nextQuery, nextSubject));
    const first = matches.find(item => item.id === selectedId) ?? matches[0];
    setSelectedId(first?.id ?? "");
    if (first) setSelectedDay(first.dueDate);
  }

  function chooseDay(day: string, focus = false) {
    setSelectedDay(day); setSelectedId("");
    if (focus) requestAnimationFrame(() => { dayRefs.current.get(day)?.focus({ preventScroll: true }); dayRefs.current.get(day)?.scrollIntoView?.({ block: "nearest", inline: "nearest" }); });
  }

  function chooseConcept(value: Concept) {
    if (selected) { setSelectedId(selected.id); setSelectedDay(selected.dueDate); }
    setConcept(value);
  }

  function filters() {
    return <div className={styles.filters}>
      <label className={styles.search}><Search size={16} aria-hidden="true" /><input aria-label="Find assignment" placeholder="Find assignment" value={query} onChange={event => updateFilters(event.target.value, subject)} />{query && <button aria-label="Clear search" onClick={() => updateFilters("", subject)}><X size={14} /></button>}</label>
      <select aria-label="Subject" value={subject} onChange={event => updateFilters(query, event.target.value)}><option value="all">All subjects</option>{[...new Set(CONCEPT_ASSIGNMENTS.map(item => item.subject))].map(name => <option key={name}>{name}</option>)}</select>
    </div>;
  }

  function launchButton(item: ConceptAssignment) {
    return <button ref={launchRef} className={`${styles.launch} ${hub.launch}`} onClick={() => dialog.current?.showModal()}>
      {item.state === "active" ? <Play size={17} fill="currentColor" aria-hidden="true" /> : <FileText size={17} aria-hidden="true" />}
      {assignmentAction(item)}
    </button>;
  }

  return <div className={`${styles.root} ${calendar.root} ${hub.root}`}>
    <img className={styles.world} src="/assets/today-now/diana-signature-studio-v1-1678.webp" alt="" />
    <PreviewNavigation active="Work" />
    <div className={styles.reviewBar}>
      <span className={styles.reviewLabel}>CONCEPT REVIEW <span>/ SAMPLE DATA</span></span>
      <div className={styles.conceptSwitch} role="group" aria-label="Compare Work concepts">
        <button aria-label="A Franchise hub" aria-pressed={concept === "franchise"} onClick={() => chooseConcept("franchise")}><span>A</span>Franchise hub</button>
        <button aria-label="B Card carousel" aria-pressed={concept === "carousel"} onClick={() => chooseConcept("carousel")}><span>B</span>Card carousel</button>
      </div>
    </div>

    <main className={`${styles.main} ${hub.main}`} id="main-content" tabIndex={-1} data-concept={concept}>
      <header className={`${styles.pageHeading} ${hub.heading}`}><h1>WORK</h1>{concept === "franchise" ? filters() : <p>SEPTEMBER 14 <span>/</span> 20, 2026</p>}</header>
      <div className={`${styles.toolbar} ${hub.toolbar}`}>
        {concept === "franchise" && <div className={calendar.period}><h2 aria-live="polite">{periodLabel}</h2><div className={calendar.periodActions}>
          <button title="Previous week" aria-label="Previous week" onClick={() => chooseDay(dateKey(addDays(date, -7)))}><ChevronLeft aria-hidden="true" /></button>
          <button className={calendar.today} onClick={() => chooseDay(WORK_REVIEW_TODAY)}>Today</button>
          <button title="Next week" aria-label="Next week" onClick={() => chooseDay(dateKey(addDays(date, 7)))}><ChevronRight aria-hidden="true" /></button>
        </div></div>}
        <div className={styles.categories} role="group" aria-label="Assignment status">
          {categories.map(entry => <button key={entry.id} aria-label={`${entry.label} ${CONCEPT_ASSIGNMENTS.filter(item => item.state === entry.id).length}`} aria-pressed={category === entry.id} onClick={() => chooseCategory(entry.id)}>
            {entry.label}<span>{CONCEPT_ASSIGNMENTS.filter(item => item.state === entry.id).length}</span>
          </button>)}
        </div>
        {concept === "carousel" && filters()}
      </div>

      {concept === "franchise" ? <>
        <div className={calendar.dayRibbon} role="tablist" aria-label="Assignment days">{days.map((day, index) => {
          const key = dateKey(day); const entries = collection.filter(item => item.dueDate === key);
          return <button key={key} role="tab" id={`work-day-${key}`} aria-controls="work-day-panel" aria-label={dateLabel(key)} aria-describedby={`work-day-count-${key}`} aria-selected={selectedDay === key} aria-current={key === WORK_REVIEW_TODAY ? "date" : undefined} tabIndex={selectedDay === key ? 0 : -1}
            ref={el => { if (el) dayRefs.current.set(key, el); else dayRefs.current.delete(key); }} onClick={() => chooseDay(key)} onKeyDown={event => {
              const step = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : ["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 0;
              if (!step && !["Home", "End"].includes(event.key)) return;
              event.preventDefault(); const next = event.key === "Home" ? 0 : event.key === "End" ? 6 : (index + step + 7) % 7; chooseDay(dateKey(days[next]), true);
            }}>
            <span className={calendar.dayTop}>{format(day, "EEE")}<span>{key === WORK_REVIEW_TODAY ? "TODAY" : format(day, "MMM")}</span></span><strong>{format(day, "dd")}</strong>
            <span className={calendar.daySubject}>{entries[0]?.subject ?? "No work due"}</span><span className={calendar.dayCount} id={`work-day-count-${key}`}>{entries.length} {entries.length === 1 ? "assignment" : "assignments"}</span><span className={calendar.mobileCount} aria-hidden="true">{entries.length || ""}</span>
          </button>;
        })}</div>
        <div id="work-day-panel" role="tabpanel" aria-labelledby={`work-day-${selectedDay}`} className={calendar.composition}>
        <aside className={calendar.agenda}>
          <div className={calendar.agendaHeading}><h2>{format(date, "EEEE")}</h2><span>{String(items.length).padStart(2, "0")}</span></div>
          {items.length ? <div className={calendar.agendaItems} role="tablist" aria-label="Choose assignment" aria-orientation={compact ? "horizontal" : "vertical"}>
            {items.map((item, i) => <button key={item.id} ref={el => { if (el) pickerRefs.current.set(item.id, el); else pickerRefs.current.delete(item.id); }} role="tab" id={`work-tab-${item.id}`} aria-label={`${item.subject} ${item.title}`} aria-selected={item.id === selected.id} aria-controls="work-selected-panel" tabIndex={item.id === selected.id ? 0 : -1} onClick={() => selectItem(item.id)} onKeyDown={event => pickerKey(event, i)}>
              <small>{item.state === "submitted" ? "SUBMITTED" : "DUE"} <span>/</span> {item.dueTime ? dueTime(item) : item.day}</small><strong>{item.title}</strong><span>{item.subject}</span>
            </button>)}
          </div> : <p className={calendar.agendaEmpty}>No matching assignments.</p>}
          <div className={calendar.agendaFoot}><CalendarDays aria-hidden="true" /><span>{format(date, "MMMM d, yyyy")}</span></div>
        </aside>
        {selected ? <section id="work-selected-panel" role="tabpanel" aria-labelledby={`work-tab-${selected.id}`} className={calendar.selectedEvent}>
          <div className={calendar.eventComposition} key={selected.id} style={{ "--event-color": selected.color } as CSSProperties}>
            <div className={calendar.feature}>
              <div className={calendar.featureArt}><img src={selected.image} alt={selected.imageAlt} /><span className={calendar.eventKind}>Assignment</span><div className={calendar.featureTitle}><span>{selected.subject}</span><h2>{selected.title}</h2></div></div>
              <div className={calendar.eventSummary}><span className={calendar.summaryIcon}><BookOpen aria-hidden="true" /></span><p>{selected.brief}</p></div>
              <AssignmentResources item={selected} />
            </div>
            <AssignmentBrief item={selected} action={launchButton(selected)} />
          </div>
        </section> : <section className={calendar.openDay}><CalendarDays aria-hidden="true" /><span>{dateLabel(selectedDay)}</span><h2>{collection.length ? "NO WORK DUE" : "No matching assignments"}</h2>{query || subject !== "all" ? <button className={styles.secondary} onClick={() => updateFilters("", "all")}>Clear filters</button> : nextDay && <button className={calendar.textAction} onClick={() => chooseDay(nextDay, true)}>Next assignment day<ArrowRight aria-hidden="true" /></button>}</section>}
        </div>
        <footer className={calendar.weekRecord}><span>THIS WEEK</span><p><strong>{weekItems.length}</strong>assignments</p><p><strong>{weekItems.filter(item => item.state === "ready").length}</strong>ready to submit</p><p><strong>{weekItems.filter(item => item.state === "submitted").length}</strong>submitted</p></footer>
      </> : !selected ? <section className={styles.empty}><h2>No matching assignments</h2><button className={styles.secondary} onClick={() => updateFilters("", "all")}>Clear filters</button></section> : <section className={styles.carouselLayout}>
        <div className={styles.collectionHeading}><p className={styles.eyebrow}>Your collection <span>{String(selectedIndex + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}</span></p>
          <div className={styles.collectionTools}><button className={styles.iconButton} aria-label={grid ? "Show carousel" : "Show grid"} title={grid ? "Show carousel" : "Show grid"} onClick={() => setGrid(!grid)}>{grid ? <GalleryHorizontalEnd size={18} /> : <LayoutGrid size={18} />}</button>
          <button className={styles.iconButton} aria-label="Previous assignment" title="Previous assignment" disabled={selectedIndex === 0} onClick={() => selectItem(items[selectedIndex - 1].id, true)}><ArrowLeft size={19} /></button>
          <button className={styles.iconButton} aria-label="Next assignment" title="Next assignment" disabled={selectedIndex === items.length - 1} onClick={() => selectItem(items[selectedIndex + 1].id, true)}><ArrowRight size={19} /></button></div>
        </div>
        <div className={`${styles.cards} ${grid ? styles.cardGrid : ""}`} role="tablist" aria-label="Choose assignment">
          {items.map((item, i) => <button key={item.id} className={styles.assignmentCard} role="tab" id={`work-tab-${item.id}`} aria-label={`${item.subject} ${item.title}`} ref={el => { if (el) pickerRefs.current.set(item.id, el); else pickerRefs.current.delete(item.id); }} aria-selected={selected.id === item.id} aria-controls="work-selected-panel" tabIndex={selected.id === item.id ? 0 : -1} onClick={() => selectItem(item.id)} onKeyDown={event => pickerKey(event, i)} style={{ "--subject-color": item.color } as CSSProperties}>
            <span className={styles.cardImage}><img src={item.image} alt={item.imageAlt} /><span>{item.subject}</span></span>
            <span className={styles.cardCopy}><small>{item.state === "active" ? item.completed > 0 ? "IN PROGRESS" : "NOT STARTED" : categories.find(entry => entry.id === item.state)?.label.toUpperCase()}</small><strong>{item.title}</strong><span>{item.due}<span>{item.minutes} min</span></span></span>
          </button>)}
        </div>
        <div id="work-selected-panel" role="tabpanel" aria-labelledby={`work-tab-${selected.id}`} className={styles.carouselDetail}>
          <div><p className={styles.eyebrow}>{selected.subject}</p><h2>{selected.title}</h2><p>{selected.brief}</p></div><SavedProgress item={selected} />{launchButton(selected)}
        </div>
      </section>}
    </main>

    <dialog ref={dialog} className={styles.dialog} aria-labelledby="session-preview-heading" onClose={() => launchRef.current?.focus()}>
      <button className={`${styles.dialogClose} ${hub.dialogClose}`} title="Close session preview" aria-label="Close session preview" onClick={() => dialog.current?.close()}><X size={22} /></button>
      <p className={styles.eyebrow}>Session preview</p><h2 id="session-preview-heading">{selected?.title}</h2><p>This is sample work. No study session has started and your saved assignments are unchanged.</p>
      <button className={`${styles.launch} ${hub.launch}`} onClick={() => dialog.current?.close()}><ArrowLeft size={17} />Back to collection</button>
    </dialog>
  </div>;
}
