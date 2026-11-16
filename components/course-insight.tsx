import { ArrowLeft, ArrowRight, FileText, NotebookPen, Plus, Settings } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { StudentShell } from "@/components/student-shell/student-shell";
import { ClassIdentity } from "@/components/student-shell/class-identity";
import { SectionTabs } from "@/components/student-shell/section-tabs";
import type { StudentNavigationProfile } from "@/components/screen-design/student-desktop-nav";
import { assignmentActionLabel, assignmentDestination, assignmentStatusLabel } from "@/lib/assignment-navigation";
import type { AssignmentStatus } from "@/lib/supabase/types";
import shell from "@/components/student-shell/student-shell.module.css";
import styles from "@/components/student-shell/classes.module.css";
import {classReferenceResources} from "@/lib/learning-engine/open-resources";

export type CourseInsightAssignment = { id: string; title: string; kind: string | null; dueAt: string | null; status: AssignmentStatus };
export type CourseInsightNote = { id: string; title: string | null; updatedAt: string };
export type CourseInsightMaterial = {id:string;title:string;assignmentTitle:string;href:string};

export function CourseInsight({ classId, className, teacher, assignments, notes, grade, sourceOpen, workOrigin, rubricForm, syllabusForm, profile, timeZone = "UTC", workUnavailable = false, notesUnavailable = false, materials=[],materialsUnavailable=false,practiceEnabled=false }: {
  classId: string; className: string; teacher: string | null; assignments: readonly CourseInsightAssignment[]; notes: readonly CourseInsightNote[]; rubricTitle: string | null; grade: { label: string; percent: number | null } | null; sourceOpen: boolean; rubricForm: ReactNode; syllabusForm: ReactNode; profile?: StudentNavigationProfile; timeZone?: string; workUnavailable?: boolean; notesUnavailable?: boolean;
  materials?:readonly CourseInsightMaterial[];materialsUnavailable?:boolean;practiceEnabled?:boolean;
  workOrigin?: CourseInsightAssignment;
}) {
  const active = assignments.filter(assignment => assignment.status !== "submitted" && assignment.status !== "graded");
  const references=classReferenceResources(className);
  const date = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone }).format(new Date(value));
  function workRows(rows: readonly CourseInsightAssignment[]) {
    if (workUnavailable) return <p className={shell.muted} role="status">Assignments could not load. <a href={`/classes/${classId}`}>Try again</a></p>;
    return rows.length ? <ul className={styles.workRows}>{rows.map(assignment => <li key={assignment.id}>
      <span className={styles.workDate}><small>{assignment.dueAt ? "Due" : "No due date"}</small>{assignment.dueAt && <strong>{date(assignment.dueAt)}</strong>}</span>
      <span className={styles.workName}><strong>{assignment.title}</strong><span>{assignmentStatusLabel(assignment.status)}</span></span>
      <Link className={styles.rowAction} href={assignmentDestination(assignment.id, assignment.status)} aria-label={`${assignmentActionLabel(assignment.status)} ${assignment.title}`}><ArrowRight size={18} aria-hidden="true" /></Link>
    </li>)}</ul> : <p className={shell.muted}>No active assignments.</p>;
  }
  function noteRows(rows: readonly CourseInsightNote[]) {
    if (notesUnavailable) return <p className={shell.muted} role="status">Notes could not load. <a href={`/classes/${classId}`}>Try again</a></p>;
    return rows.length ? <ul className={styles.resourceRows}>{rows.map(note => <li key={note.id}><Link href={`/notes/${note.id}`}><span className={styles.resourceIcon}><NotebookPen size={18} aria-hidden="true" /></span><span><strong>{note.title || "Untitled note"}</strong><small>Updated {date(note.updatedAt)}</small></span><ArrowRight size={16} aria-hidden="true" /></Link></li>)}</ul> : <p className={shell.muted}>No notes yet.</p>;
  }
  return <StudentShell active="Classes" campus={sourceOpen} profile={profile} className={styles.root}>
    <main id="main-content" className={`${styles.main} ${styles.detailMain}`} tabIndex={-1}>
      <header className={styles.pageHeading}><Link className={styles.textAction} href={workOrigin ? assignmentDestination(workOrigin.id, workOrigin.status) : "/classes"}><ArrowLeft size={18} aria-hidden="true" />{workOrigin ? "Back to assignment" : "Classes"}</Link><Link className={shell.secondary} href={`/classes/${classId}/settings`}><Settings size={16} aria-hidden="true" />Class settings</Link></header>
      {sourceOpen ? <div className={styles.materialHeading}><p>{className}</p><h1>Class materials</h1></div> : <ClassIdentity name={className} teacher={teacher} grade={grade} openCount={active.length} submittedCount={assignments.length - active.length} heading="h1" />}
      <SectionTabs id="course" label="Class sections" initial={sourceOpen ? "materials" : "overview"} sections={[
        { id: "overview", label: "Overview", content: <div className={styles.overview}><section><div className={styles.sectionHeading}><h3>Current work</h3><Link className={styles.textAction} href={`/quick-add?class=${classId}`}><Plus size={16} aria-hidden="true" />Add work</Link></div>{workRows(active.slice(0, 4))}</section><section><div className={styles.sectionHeading}><h3>Recent notes</h3></div>{noteRows(notes.slice(0, 3))}</section></div> },
        { id: "assignments", label: "Assignments", content: <><div className={styles.sectionHeading}><h3>All work</h3><Link className={shell.secondary} href={`/quick-add?class=${classId}`}><Plus size={16} aria-hidden="true" />Add work</Link></div>{workRows(assignments)}</> },
        { id: "materials", label: "Materials", content: <>
          <div className={styles.sectionHeading}><h3>Assignment files</h3>{practiceEnabled&&<Link className={shell.secondary} href={`/classes/${classId}/practice`}>Guided practice <ArrowRight size={16} aria-hidden="true"/></Link>}</div>
          {materialsUnavailable?<p role="status">Files could not load. <Link href={`/classes/${classId}?materials=1`}>Try again</Link></p>:materials.length?<ul className={styles.resourceRows}>{materials.map(material=><li key={material.id}><Link href={material.href}><span className={styles.resourceIcon}><FileText size={18} aria-hidden="true"/></span><span><strong>{material.title}</strong><small>{material.assignmentTitle}</small></span><ArrowRight size={16} aria-hidden="true"/></Link></li>)}</ul>:<p className={shell.muted}>Files attached to assignments in this class appear here.</p>}
          {references.length>0&&<section className={styles.referenceBooks}><div className={styles.sectionHeading}><h3>Reference book</h3></div>{references.map(book=><div key={book.id}><Link href={`/classes/${classId}/reference/${book.id}`}>{book.title} →</Link><p className={shell.muted}>{book.authors} · <a href={book.licenseUrl} target="_blank" rel="noreferrer">{book.license}</a></p></div>)}</section>}
          <div className={styles.materials}><section><details><summary>Rubric</summary>{rubricForm}</details></section><section><details><summary>Syllabus</summary>{syllabusForm}</details></section></div>
        </> },
        { id:"notes",label:"Notes",content:<><div className={styles.sectionHeading}><h3>Class notes</h3><Link href={`/notes/new?class=${classId}`} className={shell.secondary}><Plus size={16} aria-hidden="true"/>New note</Link></div>{noteRows(notes)}</> },
        { id: "quiz", label: "Quiz", content: <div className={shell.empty}><h2>Quiz from your class work</h2><Link href={`/study?classId=${classId}`} className={shell.primary}>Open Quiz <ArrowRight aria-hidden="true" /></Link></div> },
      ]} />
    </main>
  </StudentShell>;
}
