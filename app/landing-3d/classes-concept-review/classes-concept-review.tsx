"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from "react";
import { PreviewNavigation } from "../_components/preview-navigation";
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, FileText, NotebookPen, Play, Search, X } from "lucide-react";
import { CONCEPT_COURSES, courseSummary, type ClassWork, type ConceptCourse, type CourseResource } from "./fixtures";
import base from "../work-concept-review/work-concept-review.module.css";
import styles from "./classes-concept-review.module.css";

const SECTIONS = ["Overview", "Assignments", "Notes & Materials", "Practice"] as const;
type Section = typeof SECTIONS[number];
type Detail = { kind: "assignment"; work: ClassWork } | { kind: "resource"; resource: CourseResource } | { kind: "practice"; course: ConceptCourse };
type OpenDetail = (detail: Detail, event: MouseEvent<HTMLButtonElement>) => void;
const STATUS_LABELS = { active: "In progress", ready: "Ready to submit", submitted: "Submitted" };

function tabDestination(event: KeyboardEvent<HTMLButtonElement>, index: number, length: number) {
  const step = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : ["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 0;
  if (!step && event.key !== "Home" && event.key !== "End") return null;
  event.preventDefault();
  return event.key === "Home" ? 0 : event.key === "End" ? length - 1 : (index + step + length) % length;
}

function WorkRows({ items, openDetail }: { items: ClassWork[]; openDetail: OpenDetail }) {
  if (!items.length) return <div className={styles.emptyWork}><CheckCircle2 aria-hidden="true" /><h3>No active assignments</h3><p>Your submitted work is still available in Assignments.</p></div>;
  return <ul className={styles.workRows}>{items.map(item => <li key={item.id}>
    <span className={styles.workDate}><small>{item.state === "submitted" ? "Submitted" : "Due"}</small><strong>{item.due}</strong></span>
    <span className={styles.workName}><strong>{item.title}</strong><span data-state={item.state}>{STATUS_LABELS[item.state]}<span className={styles.separator}>/</span>{item.minutes} min</span></span>
    <button className={styles.rowAction} aria-label={`Open ${item.title}`} title={`Open ${item.title}`} onClick={event => openDetail({ kind: "assignment", work: item }, event)}><ArrowRight aria-hidden="true" /></button>
  </li>)}</ul>;
}

function ResourceRows({ items, openDetail }: { items: CourseResource[]; openDetail: OpenDetail }) {
  return <ul className={styles.resourceRows}>{items.map(item => <li key={item.id}>
    <button onClick={event => openDetail({ kind: "resource", resource: item }, event)}>
      <span className={styles.resourceIcon}>{item.kind === "Note" ? <NotebookPen aria-hidden="true" /> : <FileText aria-hidden="true" />}</span>
      <span><strong>{item.title}</strong><small>{item.kind}<span className={styles.separator}>/</span>{item.date}</small></span><ArrowRight aria-hidden="true" />
    </button>
  </li>)}</ul>;
}

function AssignmentSection({ course, openDetail }: { course: ConceptCourse; openDetail: OpenDetail }) {
  const [filter, setFilter] = useState("all");
  const items = course.assignments.filter(item => filter === "all" || item.state === filter);
  return <>
    <div className={styles.sectionHeading}><h3>Class assignments</h3><select aria-label="Assignment status" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All work</option><option value="active">In progress</option><option value="ready">Ready to submit</option><option value="submitted">Submitted</option></select></div>
    {items.length ? <WorkRows items={items} openDetail={openDetail} /> : <p className={styles.emptyResult}>No assignments in this view.</p>}
  </>;
}

function MaterialsSection({ course, openDetail }: { course: ConceptCourse; openDetail: OpenDetail }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const items = course.resources.filter(item => (filter === "all" || (filter === "notes" ? item.kind === "Note" : item.kind !== "Note")) && item.title.toLowerCase().includes(query.trim().toLowerCase()));
  return <>
    <div className={styles.sectionHeading}><h3>Course library</h3><span className={styles.count}>{course.resources.length} saved</span></div>
    <div className={styles.libraryTools}>
      <div className={styles.filters} role="group" aria-label="Material type">{["all", "notes", "files"].map(value => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === "all" ? "All" : value === "notes" ? "Notes" : "Files"}</button>)}</div>
      <label className={styles.search}><Search aria-hidden="true" /><input aria-label="Find a material" placeholder="Find a material" value={query} onChange={event => setQuery(event.target.value)} /></label>
    </div>
    {items.length ? <ResourceRows items={items} openDetail={openDetail} /> : <div className={styles.emptyResult}><p>No matching materials.</p><button className={styles.textAction} onClick={() => { setQuery(""); setFilter("all"); }}>Clear filters</button></div>}
  </>;
}

function PracticeRound({ course }: { course: ConceptCourse }) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [complete, setComplete] = useState(false);
  const questionTitle = useRef<HTMLLegendElement>(null);
  const resultTitle = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (complete) resultTitle.current?.focus();
    else questionTitle.current?.focus();
  }, [index, complete]);
  const question = course.questions[index];
  if (complete) return <div className={styles.practiceComplete}><CheckCircle2 aria-hidden="true" /><h3 ref={resultTitle} tabIndex={-1}>Practice complete</h3><p>{course.questions.length} questions reviewed.</p><button className={styles.textAction} onClick={() => { setIndex(0); setAnswer(null); setChecked(false); setComplete(false); }}>Practice again</button></div>;
  return <div className={styles.practiceRound}>
    <p className={styles.questionCount}>QUESTION {index + 1} / {course.questions.length}</p>
    <fieldset><legend ref={questionTitle} tabIndex={-1}>{question.prompt}</legend><div className={styles.answers}>{question.choices.map((choice, i) => <label key={choice} data-selected={answer === i} data-checked={checked && i === question.answer}>
      <input type="radio" name="practice-answer" value={i} checked={answer === i} disabled={checked} onChange={() => setAnswer(i)} /><span>{choice}</span>{checked && i === question.answer && <Check aria-hidden="true" />}
    </label>)}</div></fieldset>
    {checked && <p className={styles.feedback} data-correct={answer === question.answer} role="status">{question.explanation}</p>}
    <button className={base.launch} disabled={answer === null} onClick={() => {
      if (!checked) { setChecked(true); return; }
      if (index === course.questions.length - 1) { setComplete(true); return; }
      setIndex(index + 1); setAnswer(null); setChecked(false);
    }}>{checked ? index === course.questions.length - 1 ? "Finish practice" : "Next question" : "Check answer"}</button>
  </div>;
}

export function ClassesConceptReview() {
  const [selectedId, setSelectedId] = useState("biology");
  const [query, setQuery] = useState("");
  const [section, setSection] = useState<Section>("Overview");
  const [detail, setDetail] = useState<Detail | null>(null);
  const courseRefs = useRef(new Map<string, HTMLButtonElement>());
  const sectionRefs = useRef(new Map<Section, HTMLButtonElement>());
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  const courses = CONCEPT_COURSES.filter(course => `${course.name} ${course.discipline}`.toLowerCase().includes(query.trim().toLowerCase()));
  const course = courses.find(item => item.id === selectedId) ?? courses[0];
  const summary = course ? courseSummary(course) : null;

  useEffect(() => { if (detail && !dialog.current?.open) dialog.current?.showModal(); }, [detail]);

  function selectCourse(id: string, focus = false) {
    setSelectedId(id);
    if (focus) { courseRefs.current.get(id)?.focus({ preventScroll: true }); courseRefs.current.get(id)?.scrollIntoView?.({ block: "nearest", behavior: "auto" }); }
  }

  function selectSection(value: Section, focus = false) {
    setSection(value);
    if (focus) sectionRefs.current.get(value)?.focus({ preventScroll: true });
  }

  const openDetail: OpenDetail = (value, event) => { returnFocus.current = event.currentTarget; setDetail(value); };

  return <div className={`${base.root} ${styles.root}`} style={course ? { "--course-color": course.color } as CSSProperties : undefined}>
    <img className={base.world} src="/assets/today-now/diana-signature-studio-v1-1678.webp" alt="" />
    <PreviewNavigation active="Classes" />
    <div className={`${base.reviewBar} ${styles.reviewBar}`}><span className={base.reviewLabel}>CONCEPT REVIEW <span>/ SAMPLE DATA</span></span></div>
    <main className={styles.main} id="main-content" tabIndex={-1}>
      <header className={styles.pageHeading}><h1>CLASSES</h1><p>FALL 2026 <span>/</span> {CONCEPT_COURSES.length} CLASSES</p></header>
      <div className={styles.composition}>
        <aside className={styles.lineup}>
          <div className={styles.lineupHeading}><h2>Your lineup</h2><span>{String(courses.length).padStart(2, "0")}</span></div>
          <label className={styles.search}><Search aria-hidden="true" /><input aria-label="Find a class" placeholder="Find a class" value={query} onChange={event => setQuery(event.target.value)} />{query && <button aria-label="Clear class search" title="Clear search" onClick={() => setQuery("")}><X aria-hidden="true" /></button>}</label>
          <div className={styles.classTabs} role="tablist" aria-label="Choose a class" aria-orientation="vertical">{courses.map((item, i) => <button key={item.id} role="tab" id={`class-${item.id}`} aria-label={item.name} aria-controls="course-profile" aria-selected={item.id === course?.id} tabIndex={item.id === course?.id ? 0 : -1}
            ref={el => { if (el) courseRefs.current.set(item.id, el); else courseRefs.current.delete(item.id); }}
            onClick={() => selectCourse(item.id)} onKeyDown={event => { const next = tabDestination(event, i, courses.length); if (next !== null) selectCourse(courses[next].id, true); }}>
            <span><small>{item.discipline}</small><strong>{item.name}</strong></span>
          </button>)}</div>
          <label className={styles.mobilePicker}>Class<select aria-label="Choose class" value={course?.id ?? ""} onChange={event => { setQuery(""); selectCourse(event.target.value); }}><option value="" disabled>Select class</option>{CONCEPT_COURSES.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        </aside>

        {course && summary ? <section className={styles.profile} id="course-profile" role="tabpanel" aria-labelledby={`class-${course.id}`}>
          <div className={styles.identity} key={course.id}>
            <div className={styles.courseArt}>
              <img src={course.image} alt={course.imageAlt} />
              <span className={styles.courseCode}>{course.discipline} <span>/</span> {course.code}</span>
              <div className={styles.courseTitle}><h2>{course.name}</h2><p>{course.teacher}<span>/</span>{course.period}</p></div>
            </div>
            <aside className={styles.snapshot} aria-label="Class snapshot">
              <h3>Course record</h3>
              <div className={styles.grade}><span>Recorded grade</span>{course.grade ? <><strong>{course.grade.letter}<small>{course.grade.percent}%</small></strong><p>Confirmed {course.grade.recorded}</p></> : <p className={styles.unavailable}>No grade recorded</p>}</div>
              <div className={styles.workStats}><div><strong>{String(summary.open).padStart(2, "0")}</strong><span>Active work</span></div><div><strong>{String(summary.submitted).padStart(2, "0")}</strong><span>Submitted</span></div></div>
              <div className={styles.nextDue}><span>Next due</span><strong>{summary.nextDue ?? "Nothing scheduled"}</strong></div>
            </aside>
          </div>

          <div className={styles.sections} role="tablist" aria-label="Course sections">{SECTIONS.map((value, i) => <button key={value} role="tab" id={`section-${i}`} aria-controls={`section-panel-${i}`} aria-selected={section === value} tabIndex={section === value ? 0 : -1}
            ref={el => { if (el) sectionRefs.current.set(value, el); else sectionRefs.current.delete(value); }}
            onClick={() => selectSection(value)} onKeyDown={event => { const next = tabDestination(event, i, SECTIONS.length); if (next !== null) selectSection(SECTIONS[next], true); }}>{value}</button>)}</div>

          <div className={styles.sectionPanel} id="section-panel-0" role="tabpanel" aria-labelledby="section-0" hidden={section !== "Overview"}>
            <div className={styles.overview}>
              <section><div className={styles.sectionHeading}><h3>Current work</h3><button className={styles.textAction} onClick={() => selectSection("Assignments", true)}>View all <ArrowRight aria-hidden="true" /></button></div><WorkRows items={course.assignments.filter(item => item.state !== "submitted")} openDetail={openDetail} /></section>
              <section className={styles.latest}><div className={styles.sectionHeading}><h3>Latest material</h3><NotebookPen aria-hidden="true" /></div><ResourceRows items={course.resources.slice(0, 1)} openDetail={openDetail} /><button className={styles.libraryAction} onClick={() => selectSection("Notes & Materials", true)}><BookOpen aria-hidden="true" />Open course library<ArrowRight aria-hidden="true" /></button></section>
            </div>
          </div>
          <div className={styles.sectionPanel} id="section-panel-1" role="tabpanel" aria-labelledby="section-1" hidden={section !== "Assignments"}><AssignmentSection key={course.id} course={course} openDetail={openDetail} /></div>
          <div className={styles.sectionPanel} id="section-panel-2" role="tabpanel" aria-labelledby="section-2" hidden={section !== "Notes & Materials"}><MaterialsSection key={course.id} course={course} openDetail={openDetail} /></div>
          <div className={styles.sectionPanel} id="section-panel-3" role="tabpanel" aria-labelledby="section-3" hidden={section !== "Practice"}>
            <div className={styles.sectionHeading}><h3>Practice collection</h3><span className={styles.count}>01 set</span></div>
            <div className={styles.practiceSet}><span className={styles.practiceNumber}>01</span><div><span className={base.eyebrow}>QUICK PRACTICE</span><h3>{course.topic}</h3><p>{course.questions.length} questions<span className={styles.separator}>/</span>From {course.resources[0].title}</p></div><button className={base.launch} onClick={event => openDetail({ kind: "practice", course }, event)}><Play fill="currentColor" aria-hidden="true" />Start practice</button></div>
          </div>
        </section> : <section className={styles.emptySearch}><h2>No matching classes</h2><button className={base.secondary} onClick={() => setQuery("")}>Clear search</button></section>}
      </div>
    </main>

    <dialog className={`${base.dialog} ${styles.dialog}`} ref={dialog} aria-labelledby="class-detail-title" onClose={() => { setDetail(null); returnFocus.current?.focus(); }}>
      <button className={`${base.dialogClose} ${styles.close}`} aria-label="Close preview" title="Close preview" onClick={() => dialog.current?.close()}><X aria-hidden="true" /></button>
      <p className={base.eyebrow}>{detail?.kind === "resource" ? `${detail.resource.kind} / sample material` : detail?.kind === "practice" ? "Practice / sample set" : "Sample assignment"}</p>
      <h2 id="class-detail-title">{detail?.kind === "resource" ? detail.resource.title : detail?.kind === "practice" ? detail.course.topic : detail?.work.title}</h2>
      {detail?.kind === "resource" && <div className={styles.document}>{detail.resource.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>}
      {detail?.kind === "assignment" && <><p>{detail.work.brief}</p><p className={styles.sampleNotice}>Preview only. No study session has started.</p><button className={base.launch} onClick={() => dialog.current?.close()}><ArrowLeft aria-hidden="true" />Back to class</button></>}
      {detail?.kind === "practice" && <PracticeRound course={detail.course} />}
    </dialog>
  </div>;
}
