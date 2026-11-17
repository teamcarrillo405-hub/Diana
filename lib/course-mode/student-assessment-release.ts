import type { Json } from "@/lib/supabase/types";

function releaseInstant(value: Json | undefined) {
  return typeof value === "string" && value.trim() ? Date.parse(value) : NaN;
}

export function assessmentFeedbackReleased(
  feedbackRelease: string,
  conditions: Json,
  attemptStatus: string,
  now = Date.now(),
) {
  if (!["submitted", "scored", "confirmed"].includes(attemptStatus)) return false;
  if (feedbackRelease === "after_submission") return true;
  if (feedbackRelease === "after_confirmation") return attemptStatus === "confirmed";
  if (feedbackRelease !== "after_close" || !conditions || typeof conditions !== "object" || Array.isArray(conditions)) return false;
  const closesAt = releaseInstant(conditions.closesAt);
  return Number.isFinite(closesAt) && closesAt <= now;
}

export function classAssessmentPath(blueprintId: string, classId?: string, attemptId?: string) {
  const id = encodeURIComponent(blueprintId);
  const path = classId ? `/classes/${encodeURIComponent(classId)}/assessments/${id}` : `/course-mode/assessments/${id}`;
  return attemptId ? `${path}?attemptId=${encodeURIComponent(attemptId)}` : path;
}
