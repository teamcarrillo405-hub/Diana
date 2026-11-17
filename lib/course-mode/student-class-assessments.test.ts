import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { assessmentFeedbackReleased } from "./student-assessment-release";
import { loadStudentClassAssessments } from "./student-class-assessments";
import type { Database } from "@/lib/supabase/types";

describe("student assessment release", () => {
  const now = Date.parse("2026-11-17T13:00:00Z");

  it("keeps questions in progress and feedback awaiting teacher confirmation private", () => {
    expect(assessmentFeedbackReleased("after_submission", {}, "in_progress", now)).toBe(false);
    expect(assessmentFeedbackReleased("after_submission", {}, "submitted", now)).toBe(true);
    expect(assessmentFeedbackReleased("after_confirmation", {}, "scored", now)).toBe(false);
    expect(assessmentFeedbackReleased("after_confirmation", {}, "confirmed", now)).toBe(true);
  });

  it("requires a valid elapsed close time when the teacher releases feedback after close", () => {
    expect(assessmentFeedbackReleased("after_close", {}, "confirmed", now)).toBe(false);
    expect(assessmentFeedbackReleased("after_close", { closesAt: "invalid" }, "confirmed", now)).toBe(false);
    expect(assessmentFeedbackReleased("after_close", { closesAt: "2026-11-17T14:00:00Z" }, "confirmed", now)).toBe(false);
    expect(assessmentFeedbackReleased("after_close", { closesAt: "2026-11-17T12:30:00Z" }, "confirmed", now)).toBe(true);
  });
});

describe("class assessment summaries", () => {
  it("loads comments only for the signed student's latest confirmed and released attempt in the class", async () => {
    function query(data: unknown) {
      const promise = Promise.resolve({ data, error: null });
      return {
        select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(), not: vi.fn().mockReturnThis(), then: promise.then.bind(promise),
      };
    }
    const blueprints = query([
      { id: "ready", title: "Line equations", feedback_release: "after_confirmation", release_conditions: {} },
      { id: "held", title: "Functions", feedback_release: "after_close", release_conditions: {} },
    ]);
    const attempts = query([
      { id: "current", blueprint_id: "ready", status: "confirmed", final_score: 0, points_possible: 10, confirmed_at: "2026-11-16T10:00:00Z" },
      { id: "earlier", blueprint_id: "ready", status: "confirmed", final_score: 7, points_possible: 10, confirmed_at: "2026-11-15T10:00:00Z" },
      { id: "withheld", blueprint_id: "held", status: "confirmed", final_score: 8, points_possible: 10, confirmed_at: "2026-11-15T10:00:00Z" },
    ]);
    const responses = query([{ attempt_id: "current", teacher_feedback: "Check the slope first." }]);
    const tables: Record<string, ReturnType<typeof query>> = {
      assessment_blueprints: blueprints,
      assessment_attempts: attempts,
      assessment_responses: responses,
    };
    const supabase = { from: (table: string) => tables[table] } as unknown as SupabaseClient<Database>;

    const summary = await loadStudentClassAssessments(supabase, "student", "algebra", "course");
    expect(blueprints.eq).toHaveBeenCalledWith("course_id", "course");
    expect(blueprints.eq).toHaveBeenCalledWith("status", "published");
    expect(attempts.eq).toHaveBeenCalledWith("student_id", "student");
    expect(attempts.eq).toHaveBeenCalledWith("status", "confirmed");
    expect(responses.in).toHaveBeenCalledWith("attempt_id", ["current"]);
    expect(summary.feedback).toEqual([{
      assignmentId: "current", assignmentTitle: "Line equations", score: 0, outOf: 10,
      gradedAt: "2026-11-16T10:00:00Z", feedback: "Check the slope first.",
      href: "/classes/algebra/assessments/ready?attemptId=current",
    }]);
    expect(summary.teacherQuizzes).toHaveLength(2);
  });
});
