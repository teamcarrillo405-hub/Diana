import { describe, expect, it } from "vitest";

import type { Assignment, ScoredAssignment } from "@/lib/scoring/next-five-minutes";
import type { ReminderItem } from "@/app/(app)/dashboard/actions";
import { buildLobbyDashboardView } from "./lobby-view";

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
      now,
    });

    expect(view.studentName).toBe("Grayson");
    expect(view.nextMove).toEqual({
      actionLabel: "Start English",
      ariaLabel: "Start your next move",
      className: "English",
      estimateLabel: "est. 60 min",
      href: "/assignments/assignment-next?focus=next-step",
      title: "Read pages 40-60",
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
    expect(view.nextMove).toEqual({
      actionLabel: "View work",
      ariaLabel: "Review your work",
      className: "Your assignments are clear",
      estimateLabel: "Choose a class or add work",
      href: "/assignments",
      title: "Nothing needs an immediate start",
    });
    expect(view.attention.map(({ count }) => count)).toEqual([0, 0, 0]);
    expect(view.attention.map(({ description }) => description)).toEqual([
      "Nothing coming up this week",
      "Nothing past the due date",
      "Everything ready is submitted",
    ]);
    expect(view.attention.every(({ href }) => href === "/assignments")).toBe(true);
  });
});
