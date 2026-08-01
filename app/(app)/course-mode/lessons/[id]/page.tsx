import { ArrowLeft, CheckCircle2, Play } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { updateLessonProgress } from "@/app/(app)/course-mode/student-actions";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import { StudentDesktopNav } from "@/components/screen-design/student-desktop-nav";
import { createClient } from "@/lib/supabase/server";

export default async function CourseLessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { id } = await params;
  const status = (await searchParams).status;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const store = supabase as any;
  const { data: lesson } = await store.from("course_mode_lessons").select("id, unit_id, title, summary, estimated_minutes, accessibility_variants").eq("id", id).eq("status", "published").maybeSingle();
  if (!lesson) notFound();
  const { data: unit } = await store.from("course_mode_units").select("id, course_id, title").eq("id", lesson.unit_id).eq("status", "published").maybeSingle();
  if (!unit) notFound();
  const [{ data: course }, { data: resources }, { data: progress }] = await Promise.all([
    store.from("course_mode_courses").select("id, title").eq("id", unit.course_id).eq("status", "published").maybeSingle(),
    store.from("course_mode_lesson_resources").select("id, resource_type, title, source_uri, content_text, position").eq("lesson_id", id).order("position", { ascending: true }),
    store.from("course_mode_lesson_progress").select("status, started_at, completed_at").eq("lesson_id", id).eq("student_id", user.id).maybeSingle(),
  ]);
  if (!course) notFound();
  return (
    <div className="course-mode-shell min-h-dvh bg-[#081326] text-white">
      <StudentDesktopNav active="Classes" />
      <div className="mx-auto w-full max-w-[900px] px-5 pb-28 pt-8 lg:px-8">
        <Link href={`/course-mode/courses/${course.id}`} className="inline-flex items-center gap-2 text-sm font-bold text-cyan-300"><ArrowLeft size={16} /> {course.title}</Link>
        <header className="mt-5 border-b border-white/20 pb-7"><p className="m-0 text-xs font-black uppercase text-cyan-300">{unit.title}</p><h1 className="mb-0 mt-2 text-4xl font-black">{lesson.title}</h1>{lesson.estimated_minutes ? <p className="mb-0 mt-2 text-slate-300">{lesson.estimated_minutes} minutes</p> : null}</header>
        {status ? <p className="mt-5 border border-amber-400 bg-amber-50 p-3 text-sm font-bold text-amber-950" role="status">{status === "completed" ? "Lesson marked complete." : status === "in_progress" ? "Lesson started." : "Lesson progress was not updated."}</p> : null}
        <section className="course-mode-light mt-7 rounded-md border border-dashed border-white/30 bg-[#f4efe6] p-6 text-slate-950">
          <h2 className="m-0 text-xl font-black">Lesson</h2>
          <p className="mb-0 mt-3 whitespace-pre-wrap text-base leading-7 text-slate-800">{lesson.summary || "The teacher has not added lesson text yet."}</p>
          {(resources ?? []).map((resource: any) => <article key={resource.id} className="mt-5 border-t border-slate-300 pt-4"><h3 className="m-0 text-base font-black">{resource.title}</h3>{resource.content_text ? <p className="mb-0 mt-2 whitespace-pre-wrap leading-7 text-slate-700">{resource.content_text}</p> : null}{resource.source_uri ? <a href={resource.source_uri} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm font-bold text-blue-800 underline">Open teacher resource</a> : null}</article>)}
        </section>
        <div className="mt-5 flex flex-wrap gap-3">
          {progress?.status !== "in_progress" && progress?.status !== "completed" ? <form action={updateLessonProgress}><input type="hidden" name="lessonId" value={id} /><input type="hidden" name="status" value="in_progress" /><button className="inline-flex min-h-11 items-center gap-2 bg-white px-4 font-black text-slate-950" type="submit"><Play size={17} /> Start lesson</button></form> : null}
          {progress?.status !== "completed" ? <form action={updateLessonProgress}><input type="hidden" name="lessonId" value={id} /><input type="hidden" name="status" value="completed" /><button className="inline-flex min-h-11 items-center gap-2 bg-[#db2777] px-4 font-black text-white" type="submit"><CheckCircle2 size={17} /> Mark complete</button></form> : <p className="m-0 inline-flex items-center gap-2 font-black text-emerald-300"><CheckCircle2 size={18} /> Complete</p>}
        </div>
      </div>
      <StudentBottomNav />
    </div>
  );
}
