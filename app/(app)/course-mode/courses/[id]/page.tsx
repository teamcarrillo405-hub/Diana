import { ArrowLeft, BookOpen, CheckCircle2, ClipboardList } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import { StudentDesktopNav } from "@/components/screen-design/student-desktop-nav";
import { createClient } from "@/lib/supabase/server";

export default async function StudentCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const store = supabase as any;
  const { data: course } = await store.from("course_mode_courses")
    .select("id, title, subject_domain, grade_band, course_level, status")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  if (!course) notFound();
  const [{ data: units }, { data: assignments }, { data: assessments }, { data: readiness }] = await Promise.all([
    store.from("course_mode_units").select("id, title, summary, position").eq("course_id", id).eq("status", "published").order("position", { ascending: true }),
    store.from("course_mode_assignments").select("id, title, instructions, due_at").eq("course_id", id).eq("status", "published").order("due_at", { ascending: true }),
    store.from("assessment_blueprints").select("id, title, purpose, max_attempts").eq("course_id", id).eq("status", "published").order("created_at", { ascending: true }),
    store.rpc("get_my_course_objective_readiness", { p_course_id: id }),
  ]);
  const unitIds = (units ?? []).map((unit: any) => unit.id);
  const { data: lessons } = unitIds.length > 0
    ? await store.from("course_mode_lessons").select("id, unit_id, title, summary, estimated_minutes, position").in("unit_id", unitIds).eq("status", "published").order("position", { ascending: true })
    : { data: [] };
  const { data: progress } = (lessons ?? []).length > 0
    ? await store.from("course_mode_lesson_progress").select("lesson_id, status").eq("student_id", user.id).in("lesson_id", (lessons ?? []).map((lesson: any) => lesson.id))
    : { data: [] };
  const { data: studentAssignments } = (assignments ?? []).length > 0
    ? await supabase.from("assignments").select("id, course_mode_assignment_id, status").eq("owner_id", user.id).in("course_mode_assignment_id", (assignments ?? []).map((assignment: any) => assignment.id))
    : { data: [] };
  const objectiveReadiness = Array.isArray(readiness) ? readiness : [];
  const nextObjective = objectiveReadiness.find((objective: any) => objective.ready && Number(objective.currentMastery) < 1) ?? null;

  return (
    <div className="course-mode-shell min-h-dvh bg-[#081326] text-white">
      <StudentDesktopNav active="Classes" />
      <div className="mx-auto w-full max-w-[1080px] px-5 pb-28 pt-8 lg:px-8">
        <Link href="/classes" className="inline-flex items-center gap-2 text-sm font-bold text-cyan-300"><ArrowLeft size={16} /> Classes</Link>
        <header className="mt-5 border-b border-white/20 pb-7">
          <p className="m-0 text-xs font-black uppercase text-cyan-300">{String(course.subject_domain).replaceAll("_", " ")} | {course.grade_band}</p>
          <h1 className="mb-0 mt-2 text-4xl font-black">{course.title}</h1>
          {course.course_level ? <p className="mb-0 mt-2 text-slate-300">{course.course_level}</p> : null}
        </header>
        {nextObjective ? (
          <section className="course-mode-light mt-7 rounded-md border border-dashed border-white/30 bg-[#f4efe6] p-5 text-slate-950">
            <p className="m-0 text-xs font-black uppercase text-[#db2777]">Ready next</p>
            <h2 className="mb-0 mt-2 text-xl font-black">{nextObjective.title}</h2>
            <p className="mb-0 mt-2 text-sm text-slate-600">
              Current evidence: {Math.round(Number(nextObjective.currentMastery) * 100)}%. Diana will use the next aligned lesson or assessment without changing your teacher’s requirements.
            </p>
          </section>
        ) : null}

        <section className="mt-8">
          <div className="flex items-center gap-3"><BookOpen aria-hidden="true" /><h2 className="m-0 text-2xl font-black">Lessons</h2></div>
          <div className="mt-4 grid gap-5">{(units ?? []).map((unit: any) => <section key={unit.id} className="course-mode-light rounded-md border border-dashed border-white/30 bg-[#f4efe6] p-5 text-slate-950"><h3 className="m-0 text-xl font-black">{unit.title}</h3>{unit.summary ? <p className="mb-0 mt-2 text-sm leading-6 text-slate-700">{unit.summary}</p> : null}<div className="mt-4 grid gap-2">{(lessons ?? []).filter((lesson: any) => lesson.unit_id === unit.id).map((lesson: any) => {
            const state = (progress ?? []).find((item: any) => item.lesson_id === lesson.id)?.status ?? "not_started";
            return <Link key={lesson.id} href={`/course-mode/lessons/${lesson.id}`} className="flex min-h-16 items-center justify-between gap-4 border border-slate-300 bg-white p-3 text-slate-950"><span><strong>{lesson.title}</strong>{lesson.estimated_minutes ? <small className="mt-1 block text-slate-600">{lesson.estimated_minutes} min</small> : null}</span><span className="inline-flex items-center gap-2 text-xs font-black uppercase text-slate-600">{state === "completed" ? <CheckCircle2 size={17} className="text-emerald-700" /> : null}{state.replaceAll("_", " ")}</span></Link>;
          })}</div></section>)}</div>
        </section>

        <section className="mt-10">
          <div className="flex items-center gap-3"><ClipboardList aria-hidden="true" /><h2 className="m-0 text-2xl font-black">Assignments and checks</h2></div>
          <div className="mt-4 grid gap-3">
            {(assignments ?? []).map((assignment: any) => {
              const studentAssignment = (studentAssignments ?? []).find((item) => item.course_mode_assignment_id === assignment.id);
              return <article key={assignment.id} className="course-mode-light rounded-md border border-dashed border-white/30 bg-[#f4efe6] p-4 text-slate-950"><strong>{assignment.title}</strong>{assignment.due_at ? <p className="mb-0 mt-1 text-sm text-slate-600">Due {new Date(assignment.due_at).toLocaleString()}</p> : null}{studentAssignment ? <Link href={`/assignments/${studentAssignment.id}/workspace`} className="mt-4 inline-flex min-h-10 items-center bg-slate-950 px-3 text-sm font-black text-white">Open workspace</Link> : <p className="mb-0 mt-3 text-sm font-bold text-amber-900">This assignment has not been sent to your Work list yet.</p>}</article>;
            })}
            {(assessments ?? []).map((assessment: any) => <article key={assessment.id} className="course-mode-light rounded-md border border-dashed border-white/30 bg-white p-4 text-slate-950"><p className="m-0 text-xs font-black uppercase text-[#db2777]">{assessment.purpose}</p><strong className="mt-1 block">{assessment.title}</strong><Link href={`/course-mode/assessments/${assessment.id}`} className="mt-4 inline-flex min-h-10 items-center bg-slate-950 px-3 text-sm font-black text-white">Open assessment</Link></article>)}
          </div>
        </section>
      </div>
      <StudentBottomNav />
    </div>
  );
}
