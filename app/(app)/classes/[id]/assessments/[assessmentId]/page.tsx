import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { AssessmentResponseReview, AssessmentSession } from "@/components/course-mode/assessment-session";
import { StudentShell } from "@/components/student-shell/student-shell";
import shell from "@/components/student-shell/student-shell.module.css";
import styles from "@/components/student-shell/submission.module.css";
import { assessmentFeedbackReleased } from "@/lib/course-mode/student-assessment-release";
import { loadProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { startAssessmentAttempt } from "@/app/(app)/course-mode/student-actions";

const Id = z.string().uuid();
const Choice = z.object({ identifier: z.string(), label: z.string() });
const Interaction = z.enum(["choice", "multiple_choice", "text_entry", "numeric_entry", "extended_text"]);
const AssessmentBody = z.object({ choices: z.array(Choice).optional() });
const DraftResponse = z.union([z.string(), z.array(z.string())]);

export default async function CourseAssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; assessmentId: string }>;
  searchParams: Promise<{ attemptId?: string; status?: string }>;
}) {
  const { id: classId, assessmentId: id } = await params;
  const requested = await searchParams;
  if (!Id.safeParse(id).success || !Id.safeParse(classId).success
    || (requested.attemptId && !Id.safeParse(requested.attemptId).success)) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: blueprint } = await supabase.from("assessment_blueprints")
    .select("id, course_id, title, instructions, max_attempts, version, feedback_release, release_conditions")
    .eq("id", id).eq("status", "published").maybeSingle();
  if (!blueprint) notFound();
  const [{ data: cls }, { data: publishedCourse }, { data: enrolled }, profile] = await Promise.all([
    supabase.from("classes").select("id, name").eq("id", classId).eq("owner_id", user.id)
      .eq("course_mode_course_id", blueprint.course_id).is("archived_at", null).maybeSingle(),
    supabase.from("course_mode_courses").select("id").eq("id", blueprint.course_id).eq("status", "published").maybeSingle(),
    supabase.rpc("is_enrolled_in_course", { target_course_id: blueprint.course_id }),
    loadProfile(),
  ]);
  if (!cls || !publishedCourse || enrolled !== true) notFound();

  const { data: attempts, error: attemptError } = await supabase.from("assessment_attempts")
    .select("id, blueprint_version, status, attempt_number, auto_score, teacher_score, final_score, points_possible, final_percent, expires_at, allotted_minutes, extra_time_pct")
    .eq("blueprint_id", id).eq("student_id", user.id).neq("status", "voided")
    .order("attempt_number", { ascending: false });
  const previous = attempts ?? [];
  const now = Date.now();
  const active = previous.find((attempt) => attempt.status === "in_progress" && (!attempt.expires_at || Date.parse(attempt.expires_at) > now));
  const shown = requested.attemptId ? previous.find((attempt) => attempt.id === requested.attemptId) : active ?? previous[0];
  if (requested.attemptId && !shown) notFound();

  // Question and score data follow the active attempt or the teacher's release rule.
  const working = Boolean(shown && active?.id === shown.id && shown.blueprint_version === blueprint.version);
  const released = Boolean(shown && shown.blueprint_version === blueprint.version
    && assessmentFeedbackReleased(blueprint.feedback_release, blueprint.release_conditions, shown.status, now));
  const [itemsResult, responseResult] = shown && (working || released) ? await Promise.all([
    supabase.from("assessment_items").select("id, title, interaction_type, prompt, body, points_possible")
      .eq("blueprint_id", id).order("position", { ascending: true }),
    supabase.from("assessment_responses").select("item_id, student_response, auto_score, teacher_score, teacher_feedback").eq("attempt_id", shown.id),
  ]) : [{ data: null, error: null }, { data: null, error: null }];

  const items = (itemsResult.data ?? []).flatMap((item) => {
    const kind = Interaction.safeParse(item.interaction_type);
    if (!kind.success) return [];
    const body = AssessmentBody.safeParse(item.body);
    return [{
      id: item.id, title: item.title, interactionType: kind.data, prompt: item.prompt,
      choices: body.success ? body.data.choices ?? [] : [], pointsPossible: item.points_possible,
    }];
  });
  const replies = responseResult.data ?? [];
  const initialResponses = Object.fromEntries(replies.flatMap((response) => {
    const parsed = DraftResponse.safeParse(response.student_response);
    return parsed.success ? [[response.item_id, parsed.data]] : [];
  }));
  const canStart = !attemptError && !active && !requested.attemptId && previous.length < blueprint.max_attempts;
  const unavailable = Boolean(attemptError || itemsResult.error || responseResult.error || ((working || released) && !items.length));

  return (
    <StudentShell active="Classes" campus className={`${styles.root} ${shell.classesRoom}`} profile={{
      displayName: profile?.display_name, photoUrl: profile?.photo_url,
      photoOffsetX: profile?.photo_offset_x, photoOffsetY: profile?.photo_offset_y,
    }}>
      <main className={styles.main} id="main-content">
        <Link className={styles.back} href={`/classes/${cls.id}?section=${requested.attemptId ? "grades" : "quiz"}`}><ArrowLeft size={18} aria-hidden="true" />Back to {cls.name}</Link>
        <header className={styles.title}>
          <p className={styles.eyebrow}>Teacher assessment</p>
          <h1>{blueprint.title}</h1>
        </header>
        {unavailable ? <p className={styles.notice} role="status">This assessment couldn’t load. Return to your class and try again.</p> : null}
        {!unavailable && requested.status === "not-started" ? <p className={styles.notice} role="status">This assessment isn’t available to start right now.</p> : null}
        {!unavailable && canStart ? (
          <div className={styles.paper}>
            {blueprint.instructions ? <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{blueprint.instructions}</p> : null}
            <form action={startAssessmentAttempt} className={styles.controls}>
              <input type="hidden" name="blueprintId" value={blueprint.id} />
              <input type="hidden" name="classId" value={cls.id} />
              <button type="submit" className={`${shell.primary} ${styles.primary}`}>Start assessment</button>
            </form>
          </div>
        ) : null}
        {!unavailable && working && shown ? <AssessmentSession key={shown.id} blueprintId={id} attemptId={shown.id}
          attemptNumber={shown.attempt_number} items={items} initialResponses={initialResponses} expiresAt={shown.expires_at}
          allottedMinutes={shown.allotted_minutes} extraTimePct={shown.extra_time_pct} /> : null}
        {!unavailable && released && shown ? <AssessmentResponseReview attemptNumber={shown.attempt_number}
          status={shown.status} autoScore={shown.auto_score} teacherScore={shown.teacher_score}
          finalScore={shown.final_score} pointsPossible={shown.points_possible} finalPercent={shown.final_percent}
          items={items} responses={replies.map((response) => ({
            itemId: response.item_id, studentResponse: response.student_response, autoScore: response.auto_score,
            teacherScore: response.teacher_score, teacherFeedback: response.teacher_feedback,
          }))} /> : null}
        {!unavailable && shown && !working && !released ? (
          <p className={styles.notice} role="status">{shown.status === "in_progress" ? "This attempt is no longer open." : "Your results will appear when your teacher releases feedback."}</p>
        ) : null}
      </main>
    </StudentShell>
  );
}
