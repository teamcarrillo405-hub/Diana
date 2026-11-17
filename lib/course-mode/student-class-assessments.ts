import type { SupabaseClient } from "@supabase/supabase-js";

import { assessmentFeedbackReleased, classAssessmentPath } from "@/lib/course-mode/student-assessment-release";
import type { Database } from "@/lib/supabase/types";

export async function loadStudentClassAssessments(
  supabase: SupabaseClient<Database>,
  studentId: string,
  classId: string,
  courseId: string | null,
) {
  const result = { teacherQuizzes: [] as { id: string; title: string; href: string }[], feedback: [] as {
    assignmentId: string;
    assignmentTitle: string;
    score: number | null;
    outOf: number | null;
    feedback: string | null;
    gradedAt: string | null;
    href: string;
  }[], teacherQuizzesUnavailable: false, feedbackUnavailable: false };
  if (!courseId) return result;

  const { data: blueprints, error } = await supabase.from("assessment_blueprints")
    .select("id, title, feedback_release, release_conditions")
    .eq("course_id", courseId)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .order("id", { ascending: true });
  if (error) return { ...result, teacherQuizzesUnavailable: true, feedbackUnavailable: true };
  if (!blueprints?.length) return result;

  const blueprintById = new Map(blueprints.map((blueprint) => [blueprint.id, blueprint]));
  result.teacherQuizzes = blueprints.map(({ id, title }) => ({ id, title, href: classAssessmentPath(id, classId) }));
  const { data: attempts, error: attemptError } = await supabase.from("assessment_attempts")
    .select("id, blueprint_id, status, final_score, points_possible, confirmed_at")
    .eq("student_id", studentId)
    .eq("status", "confirmed")
    .in("blueprint_id", [...blueprintById.keys()])
    .order("confirmed_at", { ascending: false })
    .order("attempt_number", { ascending: false });
  if (attemptError) return { ...result, feedbackUnavailable: true };

  const now = Date.now();
  const latest = new Map<string, NonNullable<typeof attempts>[number]>();
  for (const attempt of attempts ?? []) {
    const blueprint = blueprintById.get(attempt.blueprint_id);
    if (blueprint && !latest.has(blueprint.id) && assessmentFeedbackReleased(blueprint.feedback_release, blueprint.release_conditions, attempt.status, now)) {
      latest.set(blueprint.id, attempt);
    }
  }
  if (!latest.size) return result;

  const { data: responses, error: responseError } = await supabase.from("assessment_responses")
    .select("attempt_id, teacher_feedback")
    .in("attempt_id", [...latest.values()].map((attempt) => attempt.id))
    .not("teacher_feedback", "is", null)
    .order("scored_at", { ascending: true })
    .order("id", { ascending: true });
  const commentsByAttempt = new Map<string, string[]>();
  for (const response of responses ?? []) {
    const comment = response.teacher_feedback?.trim();
    if (comment) {
      const comments = commentsByAttempt.get(response.attempt_id) ?? [];
      comments.push(comment);
      commentsByAttempt.set(response.attempt_id, comments);
    }
  }
  result.feedback = [...latest].map(([blueprintId, attempt]) => ({
    assignmentId: attempt.id,
    assignmentTitle: blueprintById.get(blueprintId)?.title ?? "Class assessment",
    score: attempt.final_score,
    outOf: attempt.points_possible,
    feedback: commentsByAttempt.get(attempt.id)?.join("\n\n") ?? null,
    gradedAt: attempt.confirmed_at,
    href: classAssessmentPath(blueprintId, classId, attempt.id),
  }));
  return { ...result, feedbackUnavailable: Boolean(responseError) };
}
