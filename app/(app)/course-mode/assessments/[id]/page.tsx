import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { startAssessmentAttempt } from "@/app/(app)/course-mode/student-actions";
import {
  AssessmentResponseReview,
  AssessmentSession,
  type AssessmentReviewResponse,
  type AssessmentSessionItem,
} from "@/components/course-mode/assessment-session";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import { StudentDesktopNav } from "@/components/screen-design/student-desktop-nav";
import { createClient } from "@/lib/supabase/server";

export default async function CourseAssessmentPage({
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
  const { data: blueprint } = await store.from("assessment_blueprints").select("id, course_id, title, purpose, instructions, max_attempts, version").eq("id", id).eq("status", "published").maybeSingle();
  if (!blueprint) notFound();
  const [{ data: course }, { data: items }, { data: attempts }] = await Promise.all([
    store.from("course_mode_courses").select("id, title").eq("id", blueprint.course_id).eq("status", "published").maybeSingle(),
    store.from("assessment_items").select("id, identifier, title, interaction_type, prompt, body, points_possible, position").eq("blueprint_id", id).order("position", { ascending: true }),
    store.from("assessment_attempts").select("id, status, attempt_number, auto_score, teacher_score, final_score, points_possible, final_percent, submitted_at, allotted_minutes, extra_time_pct, expires_at, last_saved_at").eq("blueprint_id", id).eq("student_id", user.id).order("attempt_number", { ascending: false }),
  ]);
  if (!course) notFound();
  const active = (attempts ?? []).find((attempt: any) => attempt.status === "in_progress") ?? null;
  const latest = (attempts ?? [])[0] ?? null;
  const visibleAttempt = active ?? latest;
  const { data: storedResponses } = visibleAttempt
    ? await store.from("assessment_responses")
      .select("item_id, student_response, auto_score, teacher_score, teacher_feedback")
      .eq("attempt_id", visibleAttempt.id)
    : { data: [] };
  const sessionItems: AssessmentSessionItem[] = (items ?? []).map((item: any) => ({
    id: item.id,
    title: item.title,
    interactionType: item.interaction_type,
    prompt: item.prompt,
    choices: Array.isArray(item.body?.choices)
      ? item.body.choices
        .filter((choice: any) => choice && typeof choice.identifier === "string" && typeof choice.label === "string")
        .map((choice: any) => ({ identifier: choice.identifier, label: choice.label }))
      : [],
    pointsPossible: Number(item.points_possible),
  }));
  const initialResponses = Object.fromEntries(
    (storedResponses ?? []).map((response: any) => [
      response.item_id,
      response.student_response,
    ]),
  );
  const reviewResponses: AssessmentReviewResponse[] = (storedResponses ?? []).map((response: any) => ({
    itemId: response.item_id,
    studentResponse: response.student_response,
    autoScore: response.auto_score === null ? null : Number(response.auto_score),
    teacherScore: response.teacher_score === null ? null : Number(response.teacher_score),
    teacherFeedback: response.teacher_feedback,
  }));
  const canStart = status !== "not-started"
    && !active
    && (attempts ?? []).filter((attempt: any) => attempt.status !== "voided").length < blueprint.max_attempts;
  const statusMessage = status === "started"
    ? "Your assessment is open. Responses save as you work."
    : status === "teacher-review"
      ? "Submitted. Your teacher will review the written responses."
      : status === "scored"
        ? "Submitted. Objective responses were scored using the approved rules."
        : status === "not-started"
          ? "This assessment could not be started yet."
          : status === "incomplete"
            ? "The assessment is still open. Add a response to every question before submitting."
            : status
              ? "The assessment is still open."
              : "";
  return (
    <div className="course-mode-shell min-h-dvh bg-[#081326] text-white">
      <StudentDesktopNav active="Classes" />
      <div className="mx-auto w-full max-w-[900px] px-5 pb-28 pt-8 lg:px-8">
        <Link href={`/course-mode/courses/${course.id}`} className="inline-flex items-center gap-2 text-sm font-bold text-cyan-300"><ArrowLeft size={16} /> {course.title}</Link>
        <header className="mt-5 border-b border-white/20 pb-7"><p className="m-0 text-xs font-black uppercase text-[#ff79da]">{blueprint.purpose} assessment</p><h1 className="mb-0 mt-2 text-4xl font-black">{blueprint.title}</h1>{blueprint.instructions ? <p className="mb-0 mt-3 max-w-2xl whitespace-pre-wrap text-slate-300">{blueprint.instructions}</p> : null}</header>
        {statusMessage ? <p className="mt-5 border border-amber-400 bg-amber-50 p-3 text-sm font-bold text-amber-950" role="status">{statusMessage}</p> : null}
        {!active && canStart ? <form action={startAssessmentAttempt} className="mt-6"><input type="hidden" name="blueprintId" value={id} /><button type="submit" className="min-h-11 bg-[#db2777] px-5 font-black text-white">Start assessment</button></form> : null}
        {active ? (
          <AssessmentSession
            blueprintId={id}
            attemptId={active.id}
            attemptNumber={active.attempt_number}
            items={sessionItems}
            initialResponses={initialResponses}
            expiresAt={active.expires_at}
            allottedMinutes={active.allotted_minutes}
            extraTimePct={active.extra_time_pct}
          />
        ) : null}
        {latest && latest.status !== "in_progress" ? (
          <AssessmentResponseReview
            attemptNumber={latest.attempt_number}
            status={latest.status}
            autoScore={latest.auto_score === null ? null : Number(latest.auto_score)}
            teacherScore={latest.teacher_score === null ? null : Number(latest.teacher_score)}
            finalScore={latest.final_score === null ? null : Number(latest.final_score)}
            pointsPossible={latest.points_possible === null ? null : Number(latest.points_possible)}
            finalPercent={latest.final_percent === null ? null : Number(latest.final_percent)}
            items={sessionItems}
            responses={reviewResponses}
          />
        ) : null}
        {!active && !canStart && !latest ? <p className="mt-6 text-slate-300">No additional attempt is available.</p> : null}
      </div>
      <StudentBottomNav />
    </div>
  );
}
