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
  id?: string;
  title?: string;
  due_at?: string | null;
  status: string;
  estimated_minutes?: number | null;
  classes?: { name?: string | null } | readonly { name?: string | null }[] | null;
}>;

export type LobbyPlanItem = Readonly<{
  id: string;
  title: string;
  className: string;
  dueLabel: string;
  estimateLabel: string;
  href: string;
  isPriority: boolean;
}>;

export type LobbyDeadlineItem = Readonly<{
  id: string;
  title: string;
  className: string;
  dueLabel: string;
  href: string;
  kind: "deadline" | "ready" | "earlier";
  tone: "violet" | "blue" | "mint" | "amber";
}>;

export type LobbyStudyProgress = Readonly<{
  percent: number;
  completedAssignments: number;
  totalAssignments: number;
  completedMinutes: number;
  plannedMinutes: number;
  days: readonly Readonly<{
    label: string;
    plannedPercent: number;
    completedPercent: number;
  }>[];
}>;

export type LobbySubjectOverview = Readonly<{
  totalMinutes: number;
  subjects: readonly Readonly<{
    name: string;
    minutes: number;
    share: number;
    color: "violet" | "blue" | "mint" | "amber";
  }>[];
}>;

export type LobbyAchievement = Readonly<{
  key: "completed" | "submitted" | "planned_time";
  label: string;
  detail: string;
  value: number;
  tone: "violet" | "blue" | "mint";
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
  studyProgress: LobbyStudyProgress;
  todayPlan: readonly LobbyPlanItem[];
  upcomingDeadlines: readonly LobbyDeadlineItem[];
  subjectOverview: LobbySubjectOverview;
  achievements: readonly LobbyAchievement[];
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
  weeklyAssignments?: readonly LobbyWeeklyAssignment[];
  now: Date;
}>;

export type LobbyWeeklyHomeworkProgress = Readonly<{
  completed: number;
  total: number;
  percent: number;
}>;

const DAY_MS = 24 * 60 * 60 * 1000;
const FINISHED_STATUSES = new Set(["done", "exporting", "submitted", "graded"]);
const SUBMITTED_STATUSES = new Set(["submitted", "graded"]);
const SUBJECT_COLORS = ["violet", "blue", "mint", "amber"] as const;

function assignmentClassName(assignment: Pick<Assignment, "classes">): string {
  const classes = assignment.classes;
  const joined = Array.isArray(classes) ? classes[0] : classes;
  return joined?.name?.trim() || "Independent work";
}

function weeklyAssignmentClassName(assignment: LobbyWeeklyAssignment): string {
  const classes = assignment.classes;
  const joined = Array.isArray(classes) ? classes[0] : classes;
  return joined?.name?.trim() || "Independent work";
}

function assignmentMinutes(assignment: Pick<LobbyWeeklyAssignment, "estimated_minutes">): number {
  return Math.max(0, Math.round(assignment.estimated_minutes ?? 0));
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

  const completed = assignments.filter((assignment) =>
    FINISHED_STATUSES.has(String(assignment.status)),
  ).length;

  return {
    completed,
    total: assignments.length,
    percent: Math.round((completed / assignments.length) * 100),
  };
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function dueTime(assignment: Pick<LobbyWeeklyAssignment, "due_at">): number | null {
  if (!assignment.due_at) return null;
  const due = new Date(assignment.due_at).getTime();
  return Number.isFinite(due) ? due : null;
}

function buildStudyProgress(
  assignments: readonly LobbyWeeklyAssignment[],
  weeklyProgress: LobbyWeeklyHomeworkProgress,
  now: Date,
): LobbyStudyProgress {
  const plannedMinutes = assignments.reduce(
    (total, assignment) => total + assignmentMinutes(assignment),
    0,
  );
  const completedMinutes = assignments
    .filter((assignment) => FINISHED_STATUSES.has(String(assignment.status)))
    .reduce((total, assignment) => total + assignmentMinutes(assignment), 0);
  const weekStart = startOfDay(now);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const dayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });
  const dayPlans = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + index);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    const dayAssignments = assignments.filter((assignment) => {
      const due = dueTime(assignment);
      return due !== null && due >= day.getTime() && due < nextDay.getTime();
    });
    const planned = dayAssignments.reduce((total, assignment) => total + assignmentMinutes(assignment), 0);
    const completed = dayAssignments
      .filter((assignment) => FINISHED_STATUSES.has(String(assignment.status)))
      .reduce((total, assignment) => total + assignmentMinutes(assignment), 0);
    return { label: dayFormatter.format(day), planned, completed };
  });
  const maxPlanned = Math.max(1, ...dayPlans.map((day) => day.planned));

  return {
    percent: weeklyProgress.total === 0 ? 0 : weeklyProgress.percent,
    completedAssignments: weeklyProgress.completed,
    totalAssignments: weeklyProgress.total,
    completedMinutes,
    plannedMinutes,
    days: dayPlans.map((day) => ({
      label: day.label,
      plannedPercent: Math.round((day.planned / maxPlanned) * 100),
      completedPercent: Math.round((day.completed / maxPlanned) * 100),
    })),
  };
}

function buildTodayPlan(
  rankedAssignments: readonly ScoredAssignment[],
  now: Date,
): readonly LobbyPlanItem[] {
  const todayStart = startOfDay(now).getTime();
  const tomorrowStart = todayStart + DAY_MS;
  const dueToday = rankedAssignments
    .filter((assignment) => {
      const due = dueTime(assignment);
      return due !== null && due >= todayStart && due < tomorrowStart;
    });
  const priority = rankedAssignments[0];
  const todayPlan = priority
    ? [priority, ...dueToday.filter((assignment) => assignment.id !== priority.id)]
    : dueToday;

  return todayPlan
    .slice(0, 4)
    .map((assignment, index) => ({
      id: assignment.id,
      title: normalizeDashboardAssignmentTitle(assignment.title),
      className: assignmentClassName(assignment),
      dueLabel: timingContext(assignment.due_at, now),
      estimateLabel: formatEstimate(Math.max(1, Math.round(assignment.effective_minutes ?? assignment.estimated_minutes ?? 5))),
      href: `${assignmentHref(assignment.id)}?focus=next-step`,
      isPriority: index === 0,
    }));
}

function buildUpcomingDeadlines(
  assignments: readonly Assignment[],
  reminders: readonly LobbyReminder[],
  now: Date,
): readonly LobbyDeadlineItem[] {
  const nowMs = now.getTime();
  const weekEndMs = nowMs + 7 * DAY_MS;
  const dueEarlierById = new Map(reminders.filter((reminder) => reminder.is_past_due).map((reminder) => [reminder.id, reminder]));
  const earlier = assignments
    .filter((assignment) => dueEarlierById.has(assignment.id))
    .sort((left, right) => (dueTime(left) ?? 0) - (dueTime(right) ?? 0))
    .slice(0, 1)
    .map((assignment) => ({
      id: assignment.id ?? "earlier",
      title: normalizeDashboardAssignmentTitle(assignment.title),
      className: assignmentClassName(assignment),
      dueLabel: "From earlier",
      href: assignmentHref(assignment.id),
      kind: "earlier" as const,
      tone: "amber" as const,
    }));
  const ready = assignments
    .filter((assignment) => String(assignment.status) === "done" || String(assignment.status) === "exporting")
    .slice(0, 2)
    .map((assignment) => ({
      id: assignment.id ?? "ready",
      title: normalizeDashboardAssignmentTitle(assignment.title),
      className: assignmentClassName(assignment),
      dueLabel: "Ready to turn in",
      href: assignmentHref(assignment.id),
      kind: "ready" as const,
      tone: "mint" as const,
    }));
  const deadlineIds = new Set([...earlier, ...ready].map((item) => item.id));
  const upcoming = assignments
    .filter((assignment) => {
      const due = dueTime(assignment);
      return due !== null && due >= nowMs && due <= weekEndMs && !deadlineIds.has(assignment.id ?? "");
    })
    .sort((left, right) => (dueTime(left) ?? Number.MAX_SAFE_INTEGER) - (dueTime(right) ?? Number.MAX_SAFE_INTEGER))
    .slice(0, Math.max(0, 4 - earlier.length - ready.length))
    .map((assignment, index) => ({
      id: assignment.id ?? `deadline-${index}`,
      title: normalizeDashboardAssignmentTitle(assignment.title),
      className: assignmentClassName(assignment),
      dueLabel: timingContext(assignment.due_at, now),
      href: assignmentHref(assignment.id),
      kind: "deadline" as const,
      tone: (SUBJECT_COLORS[index % SUBJECT_COLORS.length]) as LobbyDeadlineItem["tone"],
    }));
  return [...earlier, ...ready, ...upcoming];
}

function buildSubjectOverview(assignments: readonly LobbyWeeklyAssignment[]): LobbySubjectOverview {
  const bySubject = new Map<string, number>();
  for (const assignment of assignments) {
    const name = weeklyAssignmentClassName(assignment);
    bySubject.set(name, (bySubject.get(name) ?? 0) + assignmentMinutes(assignment));
  }
  const totalMinutes = [...bySubject.values()].reduce((total, minutes) => total + minutes, 0);
  const subjects = [...bySubject.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([name, minutes], index) => ({
      name,
      minutes,
      share: totalMinutes === 0 ? 0 : Math.round((minutes / totalMinutes) * 100),
      color: SUBJECT_COLORS[index] ?? "amber",
    }));
  return { totalMinutes, subjects };
}

function buildAchievements(
  assignments: readonly LobbyWeeklyAssignment[],
  studyProgress: LobbyStudyProgress,
): readonly LobbyAchievement[] {
  const submitted = assignments.filter((assignment) => SUBMITTED_STATUSES.has(String(assignment.status))).length;
  return [
    {
      key: "completed",
      label: "Assignments completed",
      detail: "This week",
      value: studyProgress.completedAssignments,
      tone: "violet",
    },
    {
      key: "submitted",
      label: "Work turned in",
      detail: "This week",
      value: submitted,
      tone: "blue",
    },
    {
      key: "planned_time",
      label: "Planned time finished",
      detail: studyProgress.plannedMinutes > 0
        ? `${studyProgress.completedMinutes} of ${studyProgress.plannedMinutes} min`
        : "Add a time estimate to track this",
      value: studyProgress.completedMinutes,
      tone: "mint",
    },
  ];
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
  weeklyAssignments = [],
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
  const studyProgress = buildStudyProgress(weeklyAssignments, weeklyProgress, now);

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
    studyProgress,
    todayPlan: buildTodayPlan(rankedAssignments, now),
    upcomingDeadlines: buildUpcomingDeadlines(assignments, reminders, now),
    subjectOverview: buildSubjectOverview(weeklyAssignments),
    achievements: buildAchievements(weeklyAssignments, studyProgress),
  };
}
