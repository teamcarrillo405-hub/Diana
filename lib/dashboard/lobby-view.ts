import type {
  Assignment,
  ScoredAssignment,
} from "@/lib/scoring/next-five-minutes";

type LobbyReminder = Readonly<{
  id: string;
  is_past_due: boolean;
}>;

export type LobbyNextMove = Readonly<{
  actionLabel: string;
  ariaLabel: string;
  className: string;
  estimateLabel: string;
  href: string;
  title: string;
}>;

export type LobbyAttentionKey = "tests" | "due_earlier" | "not_submitted";

export type LobbyAttentionCard = Readonly<{
  key: LobbyAttentionKey;
  label: string;
  count: number;
  description: string;
  href: string;
  tone: "purple" | "orange" | "yellow";
}>;

export type LobbyDashboardView = Readonly<{
  studentName: string;
  nextMove: LobbyNextMove;
  attention: readonly [
    LobbyAttentionCard,
    LobbyAttentionCard,
    LobbyAttentionCard,
  ];
}>;

export type LobbyDashboardViewInput = Readonly<{
  displayName: string | null | undefined;
  rankedAssignments: readonly ScoredAssignment[];
  assignments: readonly Assignment[];
  reminders: readonly LobbyReminder[];
  now: Date;
}>;

const DAY_MS = 24 * 60 * 60 * 1000;

function assignmentClassName(assignment: Pick<Assignment, "classes">): string {
  const classes = assignment.classes;
  const joined = Array.isArray(classes) ? classes[0] : classes;
  return joined?.name?.trim() || "Independent work";
}

function firstWord(value: string): string {
  return value.trim().split(/\s+/u)[0] || "Work";
}

function assignmentHref(id: string | undefined): string {
  return id ? `/assignments/${encodeURIComponent(id)}` : "/assignments";
}

function countLabel(
  count: number,
  singular: string,
  plural: string,
  empty: string,
): string {
  if (count === 0) return empty;
  return `${count} ${count === 1 ? singular : plural}`;
}

function nextMoveFor(
  rankedAssignments: readonly ScoredAssignment[],
): LobbyNextMove {
  const next = rankedAssignments[0];
  if (!next) {
    return {
      actionLabel: "View work",
      ariaLabel: "Review your work",
      className: "Your assignments are clear",
      estimateLabel: "Choose a class or add work",
      href: "/assignments",
      title: "Nothing needs an immediate start",
    };
  }

  const className = assignmentClassName(next);
  const estimate = Math.max(
    1,
    Math.round(next.effective_minutes ?? next.estimated_minutes ?? 5),
  );

  return {
    actionLabel: `Start ${firstWord(className)}`,
    ariaLabel: "Start your next move",
    className,
    estimateLabel: `est. ${estimate} min`,
    href: `${assignmentHref(next.id)}?focus=next-step`,
    title: next.title,
  };
}

export function buildLobbyDashboardView({
  displayName,
  rankedAssignments,
  assignments,
  reminders,
  now,
}: LobbyDashboardViewInput): LobbyDashboardView {
  const nowMs = now.getTime();
  const weekEndMs = nowMs + 7 * DAY_MS;
  const tests = assignments
    .filter((assignment) => {
      if (assignment.kind !== "test_prep" || !assignment.due_at) return false;
      const dueMs = new Date(assignment.due_at).getTime();
      return dueMs >= nowMs && dueMs <= weekEndMs;
    })
    .sort(
      (left, right) =>
        new Date(left.due_at!).getTime() - new Date(right.due_at!).getTime(),
    );
  const dueEarlier = reminders.filter((reminder) => reminder.is_past_due);
  const notSubmitted = assignments.filter((assignment) => {
    const status = String(assignment.status);
    return status === "exporting" || status === "done";
  });
  const firstName = displayName?.trim().split(/\s+/u)[0] || "Student";

  return {
    studentName: firstName,
    nextMove: nextMoveFor(rankedAssignments),
    attention: [
      {
        key: "tests",
        label: "Quizzes & tests",
        count: tests.length,
        description: countLabel(
          tests.length,
          "coming up this week",
          "coming up this week",
          "Nothing coming up this week",
        ),
        href: assignmentHref(tests[0]?.id),
        tone: "purple",
      },
      {
        key: "due_earlier",
        label: "Due earlier",
        count: dueEarlier.length,
        description: countLabel(
          dueEarlier.length,
          "past the due date",
          "past the due date",
          "Nothing past the due date",
        ),
        href: assignmentHref(dueEarlier[0]?.id),
        tone: "orange",
      },
      {
        key: "not_submitted",
        label: "Not turned in",
        count: notSubmitted.length,
        description: countLabel(
          notSubmitted.length,
          "done, not submitted",
          "done, not submitted",
          "Everything ready is submitted",
        ),
        href: assignmentHref(notSubmitted[0]?.id),
        tone: "yellow",
      },
    ],
  };
}
