import { describe, expect, it } from "vitest";

import type { Assignment, ScoredAssignment } from "@/lib/scoring/next-five-minutes";
import type { ReminderItem } from "@/app/(app)/dashboard/actions";
import {
  buildLobbyDashboardView,
  calculateWeeklyHomeworkCompletion,
  calculateWeeklyHomeworkProgress,
  normalizeDashboardAssignmentTitle,
} from "./lobby-view";

const now = new Date("2026-09-14T17:00:00.000Z");

function assignment(
  values: Partial<ScoredAssignment> & Pick<ScoredAssignment, "id" | "title">,
): ScoredAssignment {
  return {
    id: values.id,
    title: values.title,
    due_at: values.due_at ?? null,
    status: values.status ?? "todo",
    estimated_minutes: values.estimated_minutes ?? 30,
    difficulty: values.difficulty ?? 2,
    class_id: values.class_id ?? "class-english",
    kind: values.kind ?? "reading",
    reading_load: values.reading_load ?? 2,
    writing_load: values.writing_load ?? 1,
    classes: values.classes ?? { name: "English" },
    score: values.score ?? 100,
    reasons: values.reasons ?? [],
    effective_minutes: values.effective_minutes ?? values.estimated_minutes ?? 30,
  };
}

function reminder(values: Partial<ReminderItem> & Pick<ReminderItem, "id" | "title">): ReminderItem {
  return {
    id: values.id,
    title: values.title,
    due_at: values.due_at ?? "2026-09-13T17:00:00.000Z",
    class_name: values.class_name ?? "English",
    class_color: values.class_color ?? "#2dd4bf",
    is_past_due: values.is_past_due ?? true,
    hours_until_due: values.hours_until_due ?? -24,
  };
}

describe("buildLobbyDashboardView", () => {
  it("adapts the real ranked assignment and factual attention groups", () => {
    const next = assignment({
      id: "assignment-next",
      title: "Read pages 40-60",
      estimated_minutes: 45,
      effective_minutes: 60,
    });
    const quiz = assignment({
      id: "assignment-quiz",
      title: "Chapter quiz",
      kind: "test_prep",
      due_at: "2026-09-18T17:00:00.000Z",
    });
    const readyToSubmit = assignment({
      id: "assignment-ready",
      title: "Theme response",
      status: "exporting",
    });

    const view = buildLobbyDashboardView({
      displayName: "Grayson Carrillo",
      rankedAssignments: [next],
      assignments: [next, quiz, readyToSubmit] as Assignment[],
      reminders: [reminder({ id: "assignment-overdue", title: "Vocabulary notes" })],
      feedbackCount: 3,
      now,
    });

    expect(view.studentName).toBe("Grayson");
    expect(view.hasNextMove).toBe(true);
    expect(view.nextMove).toEqual({
      actionLabel: "English",
      ariaLabel: "Start your next move",
      className: "English",
      completionPercent: 0,
      dueLabel: "No due time listed",
      estimateLabel: "est. 60 min",
      href: "/assignments/assignment-next?focus=next-step",
      title: "Read pages 40-60",
      fullTitle: "Read pages 40-60",
      weeklyCompletedCount: 0,
      weeklyTotalCount: 0,
    });
    expect(view.attention).toEqual([
      expect.objectContaining({
        key: "tests",
        count: 1,
        description: "1 coming up this week",
        href: "/assignments/assignment-quiz",
      }),
      expect.objectContaining({
        key: "due_earlier",
        count: 1,
        description: "1 past the due date",
        href: "/assignments/assignment-overdue",
      }),
      expect.objectContaining({
        key: "not_submitted",
        count: 1,
        description: "1 done, not submitted",
        href: "/assignments/assignment-ready",
      }),
      expect.objectContaining({
        key: "feedback",
        count: 3,
        description: "3 new notes from teachers",
        href: "/notifications",
      }),
    ]);
    expect(() => JSON.stringify(view)).not.toThrow();
  });

  it("keeps the Lobby honest when there is no assignment or attention data", () => {
    const view = buildLobbyDashboardView({
      displayName: "   ",
      rankedAssignments: [],
      assignments: [],
      reminders: [],
      now,
    });

    expect(view.studentName).toBe("Student");
    expect(view.hasNextMove).toBe(false);
    expect(view.nextMove).toEqual({
      actionLabel: "Caught up",
      ariaLabel: "You are caught up",
      className: "Your assignments are clear",
      completionPercent: 100,
      dueLabel: "Nothing is due now",
      estimateLabel: "Choose a class or add work",
      href: "/assignments",
      title: "Nothing needs an immediate start",
      fullTitle: "Nothing needs an immediate start",
      weeklyCompletedCount: 0,
      weeklyTotalCount: 0,
    });
    expect(view.attention.map(({ count }) => count)).toEqual([0, 0, 0, 0]);
    expect(view.attention.map(({ description }) => description)).toEqual([
      "Nothing coming up this week",
      "Nothing past the due date",
      "Everything ready is submitted",
      "No new teacher feedback",
    ]);
    expect(view.attention.slice(0, 3).every(({ href }) => href === "/assignments")).toBe(true);
    expect(view.attention[3].href).toBe("/notifications");
  });

  it("formats long next moves in hours and minutes", () => {
    const longAssignment = assignment({
      id: "assignment-report",
      title: "Three-page report",
      effective_minutes: 432,
    });

    const view = buildLobbyDashboardView({
      displayName: "Grayson",
      rankedAssignments: [longAssignment],
      assignments: [longAssignment],
      reminders: [],
      now,
    });

    expect(view.nextMove.estimateLabel).toBe("est. 7 hr 12 min");
  });

  it("clamps a factual assignment completion percentage", () => {
    const next = assignment({ id: "assignment-progress", title: "Practice set" });
    const view = buildLobbyDashboardView({
      displayName: "Grayson",
      rankedAssignments: [next],
      assignments: [next],
      reminders: [],
      weeklyHomeworkCompletionPercent: 138,
      now,
    });

    expect(view.nextMove.completionPercent).toBe(100);
  });

  it("calculates weekly completion from finished homework statuses", () => {
    const assignments = [
      { status: "done" },
      { status: "submitted" },
      { status: "in_progress" },
      { status: "todo" },
    ];
    expect(calculateWeeklyHomeworkCompletion(assignments)).toBe(50);
    expect(calculateWeeklyHomeworkProgress(assignments)).toEqual({
      completed: 2,
      total: 4,
      percent: 50,
    });
    expect(calculateWeeklyHomeworkCompletion([])).toBe(0);
  });

  it("removes trailing question counts only from the dashboard title", () => {
    expect(normalizeDashboardAssignmentTitle("Linear Equations: Three Questions")).toBe(
      "Linear Equations",
    );
    expect(normalizeDashboardAssignmentTitle("Chemistry Review - 8 Questions")).toBe(
      "Chemistry Review",
    );
    expect(normalizeDashboardAssignmentTitle("Why questions matter")).toBe(
      "Why questions matter",
    );
  });

  it("adds weekly counts and specific attention context", () => {
    const next = assignment({
      id: "assignment-next",
      title: "Linear Equations - 3 Questions",
    });
    const overdue = assignment({
      id: "assignment-overdue",
      title: "Vocabulary notes",
      due_at: "2026-09-12T17:00:00.000Z",
      classes: { name: "History" },
    });
    const view = buildLobbyDashboardView({
      displayName: "Grayson",
      rankedAssignments: [next],
      assignments: [next, overdue],
      reminders: [reminder({ id: overdue.id, title: overdue.title, class_name: "History" })],
      weeklyHomeworkCompletionPercent: 40,
      weeklyHomeworkCompletedCount: 2,
      weeklyHomeworkTotalCount: 5,
      now,
    });

    expect(view.nextMove.title).toBe("Linear Equations");
    expect(view.nextMove.fullTitle).toBe("Linear Equations - 3 Questions");
    expect(view.nextMove.weeklyCompletedCount).toBe(2);
    expect(view.nextMove.weeklyTotalCount).toBe(5);
    expect(view.attention[1]).toEqual(expect.objectContaining({
      assignmentTitle: "Vocabulary notes",
      className: "History",
      actionLabel: "Open",
      additionalItemCount: 0,
    }));
  });
});
