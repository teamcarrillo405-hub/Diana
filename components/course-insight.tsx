import { ArrowLeft, ArrowRight, BookOpen, FileText, NotebookPen, Plus, Settings } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import type { StudentNavigationProfile } from "@/components/screen-design/student-desktop-nav";
import { ClassIdentity } from "@/components/student-shell/class-identity";
import { SectionTabs } from "@/components/student-shell/section-tabs";
import { StudentShell } from "@/components/student-shell/student-shell";
import styles from "@/components/student-shell/classes.module.css";
import shell from "@/components/student-shell/student-shell.module.css";
import { assignmentActionLabel, assignmentDestination, assignmentStatusLabel } from "@/lib/assignment-navigation";
import { calendarTimeZone } from "@/lib/calendar/time-zone";
import { classReferenceResources } from "@/lib/learning-engine/open-resources";
import type { AssignmentStatus } from "@/lib/supabase/types";

export type CourseInsightAssignment = {
  id: string;
  title: string;
  kind: string | null;
  dueAt: string | null;
  status: AssignmentStatus;
};
export type CourseInsightNote = { id: string; title: string | null; updatedAt: string };
export type CourseInsightMaterial = { id: string; title: string; assignmentTitle: string; href: string };
export type CourseInsightQuiz = { id: string; title: string; updatedAt: string };
export type CourseInsightTeacherQuiz = { id: string; title: string; href: string };
export type CourseInsightSection = "overview" | "assignments" | "materials" | "notes" | "quiz" | "grades";
export type CourseInsightFeedback = {
  assignmentId: string;
  assignmentTitle: string;
  score: number | null;
  outOf: number | null;
  feedback: string | null;
  gradedAt: string | null;
  href?: string;
};

type CourseInsightProps = {
  classId: string;
  className: string;
  teacher: string | null;
  assignments: readonly CourseInsightAssignment[];
  notes: readonly CourseInsightNote[];
  rubricTitle: string | null;
  grade: { label: string; percent: number | null; confirmedAt?: string | null } | null;
  gradeUnavailable?: boolean;
  feedback?: readonly CourseInsightFeedback[];
  feedbackUnavailable?: boolean;
  materials?: readonly CourseInsightMaterial[];
  materialsUnavailable?: boolean;
  quizzes?: readonly CourseInsightQuiz[];
  quizzesUnavailable?: boolean;
  teacherQuizzes?: readonly CourseInsightTeacherQuiz[];
  teacherQuizzesUnavailable?: boolean;
  quizAssignments?: readonly CourseInsightAssignment[];
  practiceEnabled?: boolean;
  sourceOpen: boolean;
  initialSection?: CourseInsightSection;
  workOrigin?: CourseInsightAssignment;
  rubricForm: ReactNode;
  syllabusForm: ReactNode;
  profile?: StudentNavigationProfile;
  campusName?: string;
  timeZone?: string;
  workUnavailable?: boolean;
  notesUnavailable?: boolean;
};

function ResourceRow({ href, title, detail, icon }: { href: string; title: string; detail?: string | null; icon: ReactNode }) {
  return (
    <li>
      <Link href={href}>
        <span className={styles.resourceIcon}>{icon}</span>
        <span><strong>{title}</strong>{detail ? <small>{detail}</small> : null}</span>
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </li>
  );
}

function scoreLabel(score: number | null, outOf: number | null) {
  if (score == null || !Number.isFinite(score)) return null;
  const format = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
  return outOf != null && Number.isFinite(outOf)
    ? `${format.format(score)} / ${format.format(outOf)} points`
    : `${format.format(score)} points`;
}

export function CourseInsight({
  classId, className, teacher, assignments, notes, rubricTitle, grade, gradeUnavailable = false,
  feedback = [], feedbackUnavailable = false, materials = [], materialsUnavailable = false,
  quizzes = [], quizzesUnavailable = false, teacherQuizzes = [], teacherQuizzesUnavailable = false,
  quizAssignments = [], practiceEnabled = false,
  sourceOpen, initialSection = "overview", workOrigin, rubricForm, syllabusForm, profile,
  campusName, timeZone = "UTC", workUnavailable = false, notesUnavailable = false,
}: CourseInsightProps) {
  const classPath = `/classes/${encodeURIComponent(classId)}`;
  const active = assignments.filter(assignment => assignment.status !== "submitted" && assignment.status !== "graded" && assignment.status !== "abandoned");
  const completed = assignments.filter(assignment => assignment.status === "submitted" || assignment.status === "graded");
  const references = classReferenceResources(className);
  const section = sourceOpen ? "materials" : initialSection;
  const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: calendarTimeZone(timeZone) });
  const date = (value?: string | null) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? dateFormatter.format(parsed) : null;
  };
  const assignmentsById = new Map(assignments.map(assignment => [assignment.id, assignment] as const));
  const recentFeedback = feedback.find(item => Boolean(item.feedback?.trim())) ?? feedback[0];
  const recentScore = recentFeedback ? scoreLabel(recentFeedback.score, recentFeedback.outOf) : null;

  function workRows(rows: readonly CourseInsightAssignment[], empty: string, retrySection: CourseInsightSection) {
    if (workUnavailable) return <p className={shell.muted} role="status">Assignments could not load. <Link href={`${classPath}?section=${retrySection}`}>Try again</Link></p>;
    if (!rows.length) return <p className={shell.muted}>{empty}</p>;
    return <ul className={styles.workRows}>{rows.map(assignment => {
      const action = assignmentActionLabel(assignment.status);
      const due = date(assignment.dueAt);
      return (
        <li key={assignment.id}>
          <span className={styles.workDate}>{due && assignment.dueAt ? <><small>Due</small><time dateTime={assignment.dueAt}>{due}</time></> : <small>No due date</small>}</span>
          <span className={styles.workName}><strong>{assignment.title}</strong><span>{assignmentStatusLabel(assignment.status)}</span></span>
          <Link className={styles.rowAction} href={assignmentDestination(assignment.id, assignment.status)} aria-label={`${action} ${assignment.title}`}>{action}<ArrowRight size={16} aria-hidden="true" /></Link>
        </li>
      );
    })}</ul>;
  }

  function noteRows(rows: readonly CourseInsightNote[], empty: string) {
    if (notesUnavailable) return <p className={shell.muted} role="status">Notes could not load. <Link href={`${classPath}?section=notes`}>Try again</Link></p>;
    if (!rows.length) return <p className={shell.muted}>{empty}</p>;
    return <ul className={styles.resourceRows}>{rows.map(note => {
      const updated = date(note.updatedAt);
      return <ResourceRow key={note.id} href={`/notes/${note.id}`} title={note.title || "Untitled note"} detail={updated ? `Updated ${updated}` : null} icon={<NotebookPen size={17} aria-hidden="true" />} />;
    })}</ul>;
  }

  function materialRows(rows: readonly CourseInsightMaterial[], empty: string) {
    if (materialsUnavailable) return <p className={shell.muted} role="status">Files could not load. <Link href={`${classPath}?materials=1`}>Try again</Link></p>;
    if (!rows.length) return <p className={shell.muted}>{empty}</p>;
    return <ul className={styles.resourceRows}>{rows.map(material => (
      <ResourceRow key={material.id} href={material.href} title={material.title} detail={material.assignmentTitle} icon={<FileText size={17} aria-hidden="true" />} />
    ))}</ul>;
  }

  const overview = (
    <div className={styles.overview}>
      <section className={styles.panel}>
        <div className={styles.sectionHeading}><h2>Next assignments</h2><Link className={styles.textAction} href={`${classPath}?section=assignments`}>All assignments <ArrowRight size={16} aria-hidden="true" /></Link></div>
        {workRows(active.slice(0, 3), "No active assignments.", "assignments")}
      </section>
      <div className={styles.overviewSide}>
        <section className={styles.panel}>
          <div className={styles.sectionHeading}><h2>Recent notes</h2><Link className={styles.textAction} href={`${classPath}?section=notes`}>All notes <ArrowRight size={16} aria-hidden="true" /></Link></div>
          {noteRows(notes.slice(0, 1), "No notes yet.")}
        </section>
        <section className={styles.panel}>
          <div className={styles.sectionHeading}><h2>Latest material</h2><Link className={styles.textAction} href={`${classPath}?section=materials`}>All materials <ArrowRight size={16} aria-hidden="true" /></Link></div>
          {materialRows(materials.slice(0, 1), "No assignment files yet.")}
        </section>
      </div>
      {recentFeedback ? (
        <section className={`${styles.panel} ${styles.overviewFeedback}`}>
          <div className={styles.sectionHeading}><h2>Latest grade or feedback</h2><Link className={styles.textAction} href={`${classPath}?section=grades`}>View grades &amp; feedback <ArrowRight size={16} aria-hidden="true" /></Link></div>
          <p className={styles.feedbackTitle}>{recentFeedback.assignmentTitle}</p>
          {recentScore ? <p className={styles.score}>{recentScore}</p> : null}
          {recentFeedback.feedback ? <p className={styles.feedbackPreview}>{recentFeedback.feedback}</p> : null}
        </section>
      ) : null}
    </div>
  );

  const assignmentsPanel = (
    <section className={styles.panel}>
      <div className={styles.sectionHeading}><h2>All assignments</h2><Link className={shell.secondary} href={`/quick-add?class=${classId}`}><Plus size={16} aria-hidden="true" />Add work</Link></div>
      {workRows([...active, ...completed], "No assignments yet.", "assignments")}
    </section>
  );

  const materialsPanel = (
    <>
      <section className={styles.panel}>
        <div className={styles.sectionHeading}><h2>Assignment files</h2></div>
        {materialRows(materials, "Files attached to assignments in this class appear here.")}
      </section>
      {references.length > 0 ? (
        <section className={styles.panel}>
          <div className={styles.sectionHeading}><h2>Reference books</h2></div>
          <ul className={styles.resourceRows}>{references.map(book => (
            <ResourceRow key={book.id} href={`${classPath}/reference/${book.id}`} title={book.title} detail={book.authors} icon={<BookOpen size={18} aria-hidden="true" />} />
          ))}</ul>
        </section>
      ) : null}
      <div className={styles.materials}>
        <details className={styles.panel} open={sourceOpen && Boolean(rubricTitle)}>
          <summary>Rubric</summary>
          {rubricForm}
        </details>
        <details className={styles.panel}><summary>Syllabus</summary>{syllabusForm}</details>
      </div>
    </>
  );

  const notesPanel = (
    <section className={styles.panel}>
      <div className={styles.sectionHeading}><h2>Class notes</h2><Link href={`/notes/new?class=${classId}`} className={shell.secondary}><Plus size={16} aria-hidden="true" />New note</Link></div>
      {noteRows(notes, "No notes yet.")}
    </section>
  );

  const quizzesPanel = (
    <div className={styles.overview}>
      <section className={styles.panel}>
        <div className={styles.sectionHeading}><h2>School quizzes</h2></div>
        {teacherQuizzesUnavailable ? <p role="status" className={shell.muted}>School quizzes could not load. <Link href={`${classPath}?section=quiz`}>Try again</Link></p> : null}
        {teacherQuizzes.length > 0 ? (
          <ul className={styles.resourceRows}>{teacherQuizzes.map(quiz => (
            <ResourceRow key={quiz.id} href={quiz.href} title={quiz.title} icon={<FileText size={17} aria-hidden="true" />} />
          ))}</ul>
        ) : null}
        {quizAssignments.length > 0 ? workRows(quizAssignments, "No school quizzes have been shared with Diana for this class.", "quiz") : null}
        {!teacherQuizzesUnavailable && !teacherQuizzes.length && !quizAssignments.length ? <p className={shell.muted}>No school quizzes have been shared with Diana for this class.</p> : null}
      </section>
      <section className={styles.panel}>
        <div className={styles.sectionHeading}><h2>Diana practice</h2></div>
        <div className={styles.practiceActions}>
          <Link href={`/study?classId=${classId}`} className={shell.primary}>Make a practice quiz <ArrowRight size={17} aria-hidden="true" /></Link>
          {practiceEnabled ? <Link href={`${classPath}/practice`} className={shell.secondary}>Guided practice <ArrowRight size={17} aria-hidden="true" /></Link> : null}
        </div>
        <h3 className={styles.subheading}>Saved quizzes</h3>
        {quizzesUnavailable ? <p role="status" className={shell.muted}>Saved quizzes could not load. <Link href={`${classPath}?section=quiz`}>Try again</Link></p> : quizzes.length > 0 ? (
          <ul className={styles.resourceRows}>{quizzes.map(quiz => {
            const updated = date(quiz.updatedAt);
            return <ResourceRow key={quiz.id} href={`/study-artifacts/${quiz.id}?classId=${encodeURIComponent(classId)}`} title={quiz.title} detail={updated ? `Updated ${updated}` : null} icon={<FileText size={17} aria-hidden="true" />} />;
          })}</ul>
        ) : <p className={shell.muted}>No saved quizzes for this class yet.</p>}
      </section>
    </div>
  );

  const gradesPanel = (
    <section className={styles.panel}>
      <div className={styles.sectionHeading}><h2>Assignment grades &amp; teacher feedback</h2></div>
      {feedbackUnavailable ? <p role="status" className={shell.muted}>Grades or feedback could not load. <Link href={`${classPath}?section=grades`}>Try again</Link></p> : null}
      {feedback.length > 0 ? (
        <ul className={styles.feedbackRows}>{feedback.map(item => {
          const score = scoreLabel(item.score, item.outOf);
          const gradedDate = date(item.gradedAt);
          const assignment = assignmentsById.get(item.assignmentId);
          const href = item.href ?? (assignment ? assignmentDestination(assignment.id, assignment.status) : null);
          const actionLabel = item.href || !assignment ? "Open graded work" : assignmentActionLabel(assignment.status);
          return (
            <li key={item.assignmentId}>
              <div className={styles.feedbackHeader}>
                <h3>{item.assignmentTitle}</h3>
                {score ? <span className={styles.score}>{score}</span> : null}
              </div>
              {gradedDate && item.gradedAt ? <small className={styles.feedbackDate}>Graded <time dateTime={item.gradedAt}>{gradedDate}</time></small> : null}
              {item.feedback ? <p className={styles.feedbackText}>{item.feedback}</p> : null}
              {href ? <Link className={styles.textAction} href={href} aria-label={`${actionLabel} ${item.assignmentTitle}`}>{actionLabel}<ArrowRight size={16} aria-hidden="true" /></Link> : null}
            </li>
          );
        })}</ul>
      ) : !feedbackUnavailable ? <p className={shell.muted}>No assignment grades or teacher feedback have been shared with Diana yet.</p> : null}
    </section>
  );

  return (
    <StudentShell active="Classes" campus campusScene profile={profile} className={styles.root}>
      <main id="main-content" className={styles.main} tabIndex={-1}>
        <header className={styles.pageHeading}>
          <Link className={styles.textAction} href={workOrigin ? assignmentDestination(workOrigin.id, workOrigin.status) : "/classes"}>
            <ArrowLeft size={18} aria-hidden="true" />{workOrigin ? "Back to assignment" : "Back to Classes"}
          </Link>
          <Link className={shell.secondary} href={`${classPath}/settings`}><Settings size={16} aria-hidden="true" />Class settings</Link>
        </header>
        {sourceOpen ? (
          <div className={styles.materialHeading}><p>{className}</p><h1>Class materials</h1></div>
        ) : (
          <>
            {campusName ? <p className={styles.campusName}>{campusName}</p> : null}
            <ClassIdentity name={className} teacher={teacher} grade={grade} gradeDate={date(grade?.confirmedAt)} gradeUnavailable={gradeUnavailable}
              openCount={active.length} submittedCount={completed.length} heading="h1" />
          </>
        )}
        <div className={styles.detailTabs}>
          <SectionTabs key={`${classId}:${section}`} id="course" label="Class sections" initial={section} sections={[
            { id: "overview", label: "Overview", content: overview },
            { id: "assignments", label: "Assignments", content: assignmentsPanel },
            { id: "notes", label: "Notes", content: notesPanel },
            { id: "materials", label: "Materials", content: materialsPanel },
            { id: "quiz", label: "Quizzes & Practice", content: quizzesPanel },
            { id: "grades", label: "Grades & Feedback", content: gradesPanel },
          ]} />
        </div>
      </main>
    </StudentShell>
  );
}
