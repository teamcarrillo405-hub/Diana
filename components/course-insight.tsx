import {
  ArrowLeft,
  ArrowUpRight,
  BookOpenText,
  ChevronDown,
  ClipboardCheck,
  NotebookPen,
  Plus,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import { StudentDesktopNav } from "@/components/screen-design/student-desktop-nav";
import { CLASS_LIBRARY_STYLES } from "@/app/(app)/classes/my-classes-grid";

export type CourseInsightAssignment = {
  id: string;
  title: string;
  kind: string | null;
  dueAt: string | null;
};

export type CourseInsightNote = {
  id: string;
  title: string | null;
  updatedAt: string;
};

const COURSE_INSIGHT_STYLES = `
  .sd-course-insight .sd-class-library-main { padding-top:clamp(16px,2vw,28px); }
  .sd-course-insight-content { position:relative; z-index:4; display:grid; gap:14px; }
  .sd-course-insight-topline { display:flex; align-items:center; justify-content:space-between; gap:18px; }
  .sd-course-insight-back { display:inline-flex; min-height:44px; align-items:center; gap:8px; color:#f8faf7; font-size:14px; font-weight:500; text-decoration:none; text-shadow:0 2px 14px rgb(9 17 19 / .7); }
  .sd-course-insight-topline > span { color:#f8faf7; font-size:14px; text-shadow:0 2px 14px rgb(9 17 19 / .7); }
  .sd-course-insight-heading { display:flex; align-items:end; justify-content:space-between; gap:24px; }
  .sd-course-insight-heading h1, .sd-course-insight-heading p, .sd-course-insight-panel h2, .sd-course-insight-panel h3, .sd-course-insight-panel p { margin:0; }
  .sd-course-insight-heading h1 { max-width:18ch; color:#f8faf7; font:650 clamp(32px,4vw,56px)/1.05 var(--font-lexend),Lexend,sans-serif; letter-spacing:0; text-shadow:0 3px 20px rgb(9 17 19 / .72); }
  .sd-course-insight-heading p { margin-top:4px; color:#fff; font-size:16px; line-height:1.5; text-shadow:0 2px 14px rgb(9 17 19 / .88); }
  .sd-course-grade-summary { display:grid; min-width:136px; gap:3px; border:1px solid rgb(255 255 255 / .72); border-radius:12px 20px 12px 20px; background:rgb(248 250 247 / .42); padding:16px 18px; text-align:right; box-shadow:inset 0 1px 0 rgb(255 255 255 / .62); backdrop-filter:blur(22px) saturate(1.04); -webkit-backdrop-filter:blur(22px) saturate(1.04); }
  .sd-course-grade-summary span { color:var(--classes-muted); font-size:12px; }
  .sd-course-grade-summary strong { color:var(--classes-ink); font-size:28px; font-weight:650; line-height:1.1; }
  .sd-course-insight-grid { display:grid; grid-template-columns:minmax(0,1.65fr) minmax(300px,.7fr); align-items:start; gap:20px; }
  .sd-course-insight-panel { border:1px solid rgb(255 255 255 / .76); border-radius:16px 26px 16px 26px; background:linear-gradient(135deg,rgb(248 250 247 / .52),rgb(232 239 233 / .25)); box-shadow:inset 0 1px 0 rgb(255 255 255 / .62),0 18px 44px rgb(24 33 38 / .1); backdrop-filter:blur(28px) saturate(1.06); -webkit-backdrop-filter:blur(28px) saturate(1.06); }
  .sd-course-insight-panel-head { display:flex; align-items:center; justify-content:space-between; gap:14px; padding:22px 24px 18px; }
  .sd-course-insight-panel-head h2 { display:flex; align-items:center; gap:9px; color:var(--classes-ink); font-size:19px; font-weight:620; }
  .sd-course-insight-panel-head > span { color:var(--classes-muted); font-size:13px; }
  .sd-course-work-list { display:grid; padding:0 12px 12px; }
  .sd-course-work-item { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:18px; border-top:1px solid rgb(24 33 38 / .13); padding:17px 12px; }
  .sd-course-work-item:first-child { border-top:0; }
  .sd-course-work-item-copy { min-width:0; }
  .sd-course-work-item-copy small { display:block; color:var(--classes-muted); font-size:13px; line-height:1.35; }
  .sd-course-work-item-copy strong { display:block; overflow:hidden; margin-top:4px; color:#fff; font-size:16px; font-weight:560; line-height:1.35; text-overflow:ellipsis; text-shadow:0 2px 12px rgb(9 17 19 / .72); white-space:nowrap; }
  .sd-course-work-item-action { display:inline-flex; min-height:44px; align-items:center; gap:7px; border:1px solid rgb(24 33 38 / .24); border-radius:8px; background:rgb(255 255 255 / .38); padding:0 12px; color:var(--classes-ink); font-size:14px; font-weight:520; text-decoration:none; }
  .sd-course-work-item:first-child .sd-course-work-item-action { border-color:#c6d23f; background:var(--classes-yellow); color:#141d20; }
  .sd-course-work-empty { padding:8px 24px 26px; color:var(--classes-muted); font-size:15px; line-height:1.55; }
  .sd-course-insight-tools { display:grid; gap:14px; }
  .sd-course-tool { display:grid; gap:12px; min-width:0; border:1px solid rgb(255 255 255 / .72); border-radius:12px 20px 12px 20px; background:rgb(248 250 247 / .44); padding:18px; box-shadow:inset 0 1px 0 rgb(255 255 255 / .56),0 12px 30px rgb(24 33 38 / .07); backdrop-filter:blur(23px) saturate(1.04); -webkit-backdrop-filter:blur(23px) saturate(1.04); }
  .sd-course-tool-header { display:flex; align-items:center; justify-content:space-between; gap:12px; }
  .sd-course-tool-header h2 { display:flex; align-items:center; gap:8px; color:var(--classes-ink); font-size:17px; font-weight:610; }
  .sd-course-tool-header span { color:var(--classes-muted); font-size:12px; }
  .sd-course-tool p { overflow:hidden; color:var(--classes-muted); font-size:14px; line-height:1.5; text-overflow:ellipsis; white-space:nowrap; }
  .sd-course-tool-actions { display:flex; flex-wrap:wrap; gap:8px; }
  .sd-course-tool:has(a[href="#course-materials"]) { display:none; }
  .sd-course-tool-action { display:inline-flex; min-height:42px; align-items:center; gap:7px; border:1px solid rgb(24 33 38 / .24); border-radius:8px; background:rgb(255 255 255 / .46); padding:0 11px; color:var(--classes-ink); font-size:13px; font-weight:520; text-decoration:none; }
  .sd-course-tool-action--primary { border-color:#c6d23f; background:var(--classes-yellow); color:#141d20; }
  .sd-course-tool--practice { position:relative; overflow:visible; padding-top:42px; }
  .sd-course-tool--practice .sd-course-tool-header > h2 { display:none; }
  .sd-course-tool--practice .sd-course-tool-header { justify-content:flex-start; }
  .sd-course-practice-mark { position:static; display:grid; gap:0; min-width:84px; border:0!important; background:transparent!important; padding:0!important; color:var(--classes-ink)!important; font:650 25px/.78 var(--font-display),var(--font-lexend),sans-serif!important; letter-spacing:0!important; text-align:left; }
  .sd-course-practice-mark span { color:#0b8d9a!important; font:inherit!important; }
  .sd-course-materials { border:1px solid rgb(255 255 255 / .76); border-radius:14px 24px 14px 24px; background:rgb(248 250 247 / .4); box-shadow:inset 0 1px 0 rgb(255 255 255 / .62),0 14px 34px rgb(24 33 38 / .08); backdrop-filter:blur(24px) saturate(1.05); -webkit-backdrop-filter:blur(24px) saturate(1.05); }
  .sd-course-materials > summary { display:flex; min-height:58px; align-items:center; justify-content:space-between; gap:14px; padding:0 22px; color:var(--classes-ink); font-size:16px; font-weight:580; list-style:none; cursor:pointer; }
  .sd-course-materials > summary::-webkit-details-marker { display:none; }
  .sd-course-materials > summary svg { transition:transform 180ms ease; }
  .sd-course-materials[open] > summary svg { transform:rotate(180deg); }
  .sd-course-materials-inner { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:20px; border-top:1px solid rgb(24 33 38 / .13); padding:22px; }
  .sd-course-materials-copy { display:grid; gap:12px; }
  .sd-course-materials-copy h2 { color:var(--classes-ink); font-size:17px; font-weight:610; }
  .sd-course-materials-copy p { color:var(--classes-muted); font-size:14px; line-height:1.55; }
  .sd-course-insight .class-rubric-form { display:grid; gap:10px; }
  .sd-course-insight .class-rubric-form .diana-input { width:100%; border:1px solid rgb(24 33 38 / .22); border-radius:8px; background:rgb(255 255 255 / .56); padding:10px 12px; color:var(--classes-ink); font:400 14px/1.45 var(--font-lexend),Lexend,sans-serif; }
  .sd-course-insight .class-rubric-form p { color:var(--classes-muted); font-size:13px; line-height:1.45; }
  .sd-course-insight .class-rubric-form .diana-button-primary { min-height:42px; border:1px solid #c6d23f; border-radius:8px; background:var(--classes-yellow); padding:0 13px; color:#141d20; font:520 14px/1 var(--font-lexend),Lexend,sans-serif; }
  .sd-course-insight .class-material-upload { display:flex; flex-wrap:wrap; align-items:center; gap:8px 10px; padding-top:3px; }
  .sd-course-insight .class-material-upload-button, .sd-course-insight .class-material-upload-link, .sd-course-insight .class-material-upload-remove { display:inline-flex; min-height:40px; align-items:center; gap:7px; border:1px solid rgb(24 33 38 / .24); border-radius:8px; background:rgb(255 255 255 / .46); padding:0 11px; color:var(--classes-ink); font:520 13px/1 var(--font-lexend),Lexend,sans-serif; text-decoration:none; }
  .sd-course-insight .class-material-upload-button { cursor:pointer; }
  .sd-course-insight .class-material-upload-button:disabled { cursor:wait; opacity:.64; }
  .sd-course-insight .class-material-upload-link { border-color:rgb(24 33 38 / .15); background:transparent; }
  .sd-course-insight .class-material-upload-remove { border-color:transparent; background:transparent; cursor:pointer; text-decoration:underline; text-underline-offset:3px; }
  .sd-course-insight .class-material-upload-hint, .sd-course-insight .class-material-upload-message { width:100%; margin:0!important; color:var(--classes-muted)!important; font-size:12px!important; line-height:1.4!important; }
  @media (max-width:900px) { .sd-course-insight .sd-class-library-main { margin-top:6px; } .sd-course-insight-heading { align-items:start; } .sd-course-insight-grid { grid-template-columns:1fr; } .sd-course-insight-tools { grid-template-columns:repeat(2,minmax(0,1fr)); } .sd-course-materials-inner { grid-template-columns:1fr; } }
  @media (max-width:620px) { .sd-course-insight-heading { display:grid; grid-template-columns:1fr auto; gap:14px; } .sd-course-insight-heading h1 { font-size:31px; } .sd-course-grade-summary { min-width:100px; padding:12px; } .sd-course-grade-summary strong { font-size:23px; } .sd-course-work-item { grid-template-columns:1fr; gap:12px; } .sd-course-work-item-action { width:fit-content; } .sd-course-insight-tools { grid-template-columns:1fr; } .sd-course-materials-inner { padding:18px; } }
`;

const COURSE_INSIGHT_ALL_STYLES = `${CLASS_LIBRARY_STYLES}${COURSE_INSIGHT_STYLES}`;

function CourseMobileHeader() {
  return <header className="sd-class-library-mobile-header"><Link href="/dashboard" aria-label="Diana home"><DianaWordmark tight tone="dark" /></Link><Link href="/classes" className="sd-class-library-mobile-add" aria-label="Back to classes"><ArrowLeft size={20} aria-hidden="true" /></Link></header>;
}

function CourseFrame({ children }: { children: ReactNode }) {
  return <main className="sd-class-library-main" id="main-content"><span className="sd-class-library-notch sd-class-library-notch--top" aria-hidden="true" /><span className="sd-class-library-notch sd-class-library-notch--bottom" aria-hidden="true" />{children}</main>;
}

function assignmentMeta(assignment: CourseInsightAssignment) {
  if (assignment.dueAt) {
    return `Due ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(assignment.dueAt))}`;
  }
  return assignment.kind ? assignment.kind.replaceAll("_", " ") : "Assignment";
}

export function CourseInsight({
  classId,
  className,
  teacher,
  assignments,
  notes,
  rubricTitle,
  grade,
  sourceOpen,
  rubricForm,
  syllabusForm,
  profile,
}: {
  classId: string;
  className: string;
  teacher: string | null;
  assignments: readonly CourseInsightAssignment[];
  notes: readonly CourseInsightNote[];
  rubricTitle: string | null;
  grade: { label: string; percent: number | null } | null;
  sourceOpen: boolean;
  rubricForm: ReactNode;
  syllabusForm: ReactNode;
  profile?: { displayName?: string | null; photoUrl?: string | null; photoOffsetX?: number | null; photoOffsetY?: number | null; };
}) {
  const source = assignments[0] ? `assignment:${assignments[0].id}` : notes[0] ? `note:${notes[0].id}` : null;
  const practiceHref = source ? `/study-artifacts/new?source=${source}` : "/study-artifacts";
  const latestNote = notes[0] ?? null;

  const gradeLabel = grade?.label ?? "Not yet";
  const gradeDetail = grade?.percent != null ? `${grade.percent}%` : grade ? "Confirmed" : "No confirmed grade";

  return <ScreenDesignViewport className="sd-class-library sd-course-insight" aria-label={`${className} course insight`}><style>{COURSE_INSIGHT_ALL_STYLES}</style><StudentDesktopNav active="Classes" {...profile} /><CourseMobileHeader /><CourseFrame><div className="sd-course-insight-content"><div className="sd-course-insight-topline"><Link href="/classes" className="sd-course-insight-back"><ArrowLeft size={17} aria-hidden="true" /> Back to classes</Link><span>Course insight</span></div><header className="sd-course-insight-heading"><div><h1>{className}</h1><p>{teacher || "Teacher not added"}</p></div><div className="sd-course-grade-summary" aria-label={grade ? `Current grade ${grade.label}${grade.percent != null ? `, ${grade.percent}%` : ""}` : "Grade not available yet"}><span>Grade</span><strong>{gradeLabel}</strong><span>{gradeDetail}</span></div></header><div className="sd-course-insight-grid"><section className="sd-course-insight-panel" aria-labelledby="course-work-title"><div className="sd-course-insight-panel-head"><h2 id="course-work-title"><ClipboardCheck size={20} aria-hidden="true" /> Current work</h2><span>{assignments.length} {assignments.length === 1 ? "assignment" : "assignments"}</span></div>{assignments.length > 0 ? <div className="sd-course-work-list">{assignments.map((assignment) => <article className="sd-course-work-item" key={assignment.id}><div className="sd-course-work-item-copy"><small>{assignmentMeta(assignment)}</small><strong>{assignment.title}</strong></div><Link href={`/assignments/${assignment.id}`} className="sd-course-work-item-action">Open <ArrowUpRight size={15} aria-hidden="true" /></Link></article>)}</div> : <p className="sd-course-work-empty">No active assignments are saved for this class.</p>}</section><aside className="sd-course-insight-tools" aria-label="Course tools"><section className="sd-course-tool"><div className="sd-course-tool-header"><h2><NotebookPen size={18} aria-hidden="true" /> Notes</h2><span>{notes.length}</span></div><p>{latestNote ? latestNote.title || "Untitled note" : "No notes saved yet"}</p><div className="sd-course-tool-actions"><Link href={`/notes?classId=${classId}`} className="sd-course-tool-action">Open notes</Link><Link href={`/notes/new?class=${classId}`} className="sd-course-tool-action sd-course-tool-action--primary"><Plus size={15} aria-hidden="true" /> New note</Link></div></section><section className="sd-course-tool"><div className="sd-course-tool-header"><h2><BookOpenText size={18} aria-hidden="true" /> Rubric</h2><span>{rubricTitle ? "Saved" : "Not added"}</span></div><p>{rubricTitle || "Add teacher expectations before you begin."}</p><div className="sd-course-tool-actions"><a href="#course-materials" className="sd-course-tool-action">{rubricTitle ? "Review rubric" : "Add rubric"}</a></div></section><section className="sd-course-tool sd-course-tool--practice"><div className="sd-course-tool-header"><h2><Sparkles size={18} aria-hidden="true" /> Quiz</h2><span className="sd-course-practice-mark" aria-label="Study Lab">Study<span>Lab</span></span></div><p>{source ? "Build from this class&apos;s saved work." : "Add an assignment or note to make a quiz."}</p><div className="sd-course-tool-actions"><Link href={practiceHref} className="sd-course-tool-action sd-course-tool-action--primary">Generate quiz</Link></div></section></aside></div><details className="sd-course-materials" id="course-materials" open={sourceOpen}><summary>Course materials <ChevronDown size={18} aria-hidden="true" /></summary><div className="sd-course-materials-inner"><section className="sd-course-materials-copy"><h2>Rubric</h2><p>Save your teacher&apos;s criteria so they stay connected to this course and are available when you review work.</p>{rubricForm}</section><section className="sd-course-materials-copy"><h2>Syllabus</h2><p>Keep key course expectations and dates here. Diana can reference the material when it helps.</p>{syllabusForm}</section></div></details></div></CourseFrame><StudentBottomNav /></ScreenDesignViewport>;
}
