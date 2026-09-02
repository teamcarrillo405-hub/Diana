import type {
  Assignment,
  ScoredAssignment,
} from "@/lib/scoring/next-five-minutes";

type LobbyReminder = Readonly<{
  id: string;
  is_past_due: boolean;
  title?: string;
  due_at?: string | null;
  class_name?: string | null;
}>;

type LobbyWeeklyAssignment = Readonly<{
  status: string;
}>;

export type LobbyNextMove = Readonly<{
  actionLabel: string;
  ariaLabel: string;
  className: string;
  completionPercent: number;
  dueLabel: string;
  estimateLabel: string;
  href: string;
  title: string;
  fullTitle: string;
  weeklyCompletedCount: number;
  weeklyTotalCount: number;
}>;

export type LobbyAttentionKey =
  | "tests"
  | "due_earlier"
  | "not_submitted"
  | "feedback";

export type LobbyAttentionCard = Readonly<{
  key: LobbyAttentionKey;
  label: string;
  count: number;
  description: string;
  href: string;
  tone: "purple" | "orange" | "yellow" | "green";
  assignmentTitle: string;
  className: string;
  contextLabel: string;
  actionLabel: string;
  additionalItemCount: number;
}>;

export type LobbyDashboardView = Readonly<{
  studentName: string;
  hasNextMove: boolean;
  nextMove: LobbyNextMove;
  attention: readonly [
    LobbyAttentionCard,
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
  feedbackCount?: number;
  weeklyHomeworkCompletionPercent?: number;
  weeklyHomeworkCompletedCount?: number;
  weeklyHomeworkTotalCount?: number;
  now: Date;
}>;

export type LobbyWeeklyHomeworkProgress = Readonly<{
  completed: number;
  total: number;
  percent: number;
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

function formatEstimate(minutes: number): string {
  if (minutes < 90) return `est. ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes === 0
    ? `est. ${hours} hr`
    : `est. ${hours} hr ${remainingMinutes} min`;
}

export function calculateWeeklyHomeworkCompletion(
  assignments: readonly LobbyWeeklyAssignment[],
): number {
  return calculateWeeklyHomeworkProgress(assignments).percent;
}

export function calculateWeeklyHomeworkProgress(
  assignments: readonly LobbyWeeklyAssignment[],
): LobbyWeeklyHomeworkProgress {
  if (assignments.length === 0) {
    return { completed: 0, total: 0, percent: 0 };
  }

  const completedStatuses = new Set([
    "done",
    "exporting",
    "submitted",
    "graded",
  ]);
  const completed = assignments.filter((assignment) =>
    completedStatuses.has(String(assignment.status)),
  ).length;

  return {
    completed,
    total: assignments.length,
    percent: Math.round((completed / assignments.length) * 100),
  };
}

const QUESTION_COUNT_WORDS =
  "one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve";

export function normalizeDashboardAssignmentTitle(title: string): string {
  const normalized = title
    .replace(
      new RegExp(
        String.raw`\s*(?:[-:|]\s*)?(?:\(|\[)?(?:\d+|${QUESTION_COUNT_WORDS})\s+questions?(?:\)|\])?\s*$`,
        "iu",
      ),
      "",
    )
    .replace(/\s{2,}/gu, " ")
    .trim();

  return normalized || title.trim();
}

function timingContext(dueAt: string | null | undefined, now: Date): string {
  if (!dueAt) return "No due time listed";
  const dueMs = new Date(dueAt).getTime();
  if (!Number.isFinite(dueMs)) return "Due date available in assignment";

  const deltaDays = Math.ceil((dueMs - now.getTime()) / DAY_MS);
  if (deltaDays < -1) return `Due ${Math.abs(deltaDays)} days ago`;
  if (deltaDays === -1) return "Due yesterday";
  if (deltaDays === 0) return "Due today";
  if (deltaDays === 1) return "Due tomorrow";
  return `Due in ${deltaDays} days`;
}

function nextMoveFor(
  rankedAssignments: readonly ScoredAssignment[],
  weeklyProgress: LobbyWeeklyHomeworkProgress,
  now: Date,
): LobbyNextMove {
  const next = rankedAssignments[0];
  if (!next) {
    return {
      actionLabel: "Caught up",
      ariaLabel: "You are caught up",
      className: "Your assignments are clear",
      completionPercent: weeklyProgress.total === 0 ? 100 : weeklyProgress.percent,
      dueLabel: "Nothing is due now",
      estimateLabel: "Choose a class or add work",
      href: "/assignments",
      title: "Nothing needs an immediate start",
      fullTitle: "Nothing needs an immediate start",
      weeklyCompletedCount: weeklyProgress.completed,
      weeklyTotalCount: weeklyProgress.total,
    };
  }

  const className = assignmentClassName(next);
  const estimate = Math.max(
    1,
    Math.round(next.effective_minutes ?? next.estimated_minutes ?? 5),
  );

  return {
    actionLabel: firstWord(className),
    ariaLabel: "Start your next move",
    className,
    completionPercent: Math.max(0, Math.min(100, Math.round(weeklyProgress.percent))),
    dueLabel: timingContext(next.due_at, now),
    estimateLabel: formatEstimate(estimate),
    href: `${assignmentHref(next.id)}?focus=next-step`,
    title: normalizeDashboardAssignmentTitle(next.title),
    fullTitle: next.title,
    weeklyCompletedCount: weeklyProgress.completed,
    weeklyTotalCount: weeklyProgress.total,
  };
}

export function buildLobbyDashboardView({
  displayName,
  rankedAssignments,
  assignments,
  reminders,
  feedbackCount = 0,
  weeklyHomeworkCompletionPercent = 0,
  weeklyHomeworkCompletedCount = 0,
  weeklyHomeworkTotalCount = 0,
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
  const assignmentsById = new Map(assignments.map((assignment) => [assignment.id, assignment]));
  const firstDueEarlier = dueEarlier[0];
  const dueEarlierAssignment = firstDueEarlier
    ? assignmentsById.get(firstDueEarlier.id)
    : undefined;
  const weeklyProgress = {
    completed: Math.max(0, Math.round(weeklyHomeworkCompletedCount)),
    total: Math.max(0, Math.round(weeklyHomeworkTotalCount)),
    percent: Math.max(0, Math.min(100, Math.round(weeklyHomeworkCompletionPercent))),
  } satisfies LobbyWeeklyHomeworkProgress;

  return {
    studentName: firstName,
    hasNextMove: rankedAssignments.length > 0,
    nextMove: nextMoveFor(rankedAssignments, weeklyProgress, now),
    attention: [
      {
        key: "tests",
        label: "Quizzes & Tests",
        count: tests.length,
        description: countLabel(
          tests.length,
          "coming up this week",
          "coming up this week",
          "Nothing coming up this week",
        ),
        href: assignmentHref(tests[0]?.id),
        tone: "purple",
        assignmentTitle: tests[0]
          ? normalizeDashboardAssignmentTitle(tests[0].title)
          : "No quiz or test selected",
        className: tests[0] ? assignmentClassName(tests[0]) : "Classes",
        contextLabel: timingContext(tests[0]?.due_at, now),
        actionLabel: "Open",
        additionalItemCount: Math.max(0, tests.length - 1),
      },
      {
        key: "due_earlier",
        label: "Due Earlier",
        count: dueEarlier.length,
        description: countLabel(
          dueEarlier.length,
          "past the due date",
          "past the due date",
          "Nothing past the due date",
        ),
        href: assignmentHref(dueEarlier[0]?.id),
        tone: "orange",
        assignmentTitle: normalizeDashboardAssignmentTitle(
          dueEarlierAssignment?.title ?? firstDueEarlier?.title ?? "Assignment due earlier",
        ),
        className: dueEarlierAssignment
          ? assignmentClassName(dueEarlierAssignment)
          : firstDueEarlier?.class_name?.trim() || "Class work",
        contextLabel: timingContext(
          dueEarlierAssignment?.due_at ?? firstDueEarlier?.due_at,
          now,
        ),
        actionLabel: "Open",
        additionalItemCount: Math.max(0, dueEarlier.length - 1),
      },
      {
        key: "not_submitted",
        label: "Not Turned In",
        count: notSubmitted.length,
        description: countLabel(
          notSubmitted.length,
          "done, not submitted",
          "done, not submitted",
          "Everything ready is submitted",
        ),
        href: assignmentHref(notSubmitted[0]?.id),
        tone: "yellow",
        assignmentTitle: notSubmitted[0]
          ? normalizeDashboardAssignmentTitle(notSubmitted[0].title)
          : "No assignment ready to submit",
        className: notSubmitted[0]
          ? assignmentClassName(notSubmitted[0])
          : "Classes",
        contextLabel: notSubmitted[0] ? "Ready to submit" : "Nothing waiting",
        actionLabel: "Open",
        additionalItemCount: Math.max(0, notSubmitted.length - 1),
      },
      {
        key: "feedback",
        label: "Feedback",
        count: feedbackCount,
        description: countLabel(
          feedbackCount,
          "new note from a teacher",
          "new notes from teachers",
          "No new teacher feedback",
        ),
        href: "/notifications",
        tone: "green",
        assignmentTitle: "Teacher feedback",
        className: "Notifications",
        contextLabel: feedbackCount > 0 ? "New feedback available" : "No new feedback",
        actionLabel: "Open",
        additionalItemCount: Math.max(0, feedbackCount - 1),
      },
    ],
  };
}
