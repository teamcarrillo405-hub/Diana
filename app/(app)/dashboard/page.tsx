import Link from "next/link";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { GradeMoveCard } from "./grade-move-card";
import { LobbyHero } from "./lobby-hero";
import { ClassesGrid, type ClassCardData } from "./classes-grid";
import type { QuestItem } from "./quest-carousel";
import { CalendarClock } from "lucide-react";
import { nextUpcomingTest } from "@/lib/test-prep/plan";
import { firstWeekJourney } from "@/lib/journey/first-week";
import { createClient } from "@/lib/supabase/server";
import { isWellnessSupportAssignment, rankAssignments } from "@/lib/scoring/next-five-minutes";
import { loadProfile } from "@/lib/profile";
import { getLearnerProfile } from "@/lib/learning-loop/server";
import { formatDueAt } from "@/lib/format";
import { KIND_LABEL } from "@/lib/checklists/templates";
import { computeNightBudget } from "@/lib/time-budget/compute";
import { TokenBudgetBanner } from "./token-budget-banner";
import { ReadingLoadToggle } from "./reading-load-toggle";
import { getEventIntentions, getReminderItems } from "./actions";
import { EveningPlanning } from "./evening-planning";
import { DoneToday } from "./done-today";
import { ReminderBanner } from "./reminder-banner";
import { BurnoutCue } from "./burnout-cue";
import { MoodCheckIn } from "./mood-check-in";
import { SessionAdaptationCard } from "./session-adaptation-card";
import { WeeklyReflection } from "./weekly-reflection";
import { SleepRecoveryCard } from "./sleep-recovery-card";
import {
  burnoutSignal,
  sessionAdaptationForMood,
  shouldShowMoodCheckIn,
} from "@/lib/emotional/session";
import { sleepRecoveryAdjustment, type SleepQuality } from "@/lib/wellness/health";
import {
  energyFromBody,
  readinessFromSignalValue,
} from "@/lib/support/policy";
import { StudentStateCard } from "@/components/student-state-card";
import type { DianaOrbState } from "@/components/signal/clarity-orb";
import {
  LaunchSequence,
  StudentTodayCommandCenter,
  type SubjectSignal,
  SupportCueDrawer,
  TonightDrawer,
} from "@/components/student-portal/student-today";
import { buildStudentStateModel, sourceAnchorsFromAssignment } from "@/lib/student-state/model";
import { effectiveAiMode, type AiMode } from "@/lib/portal/teacher";
import type { AssignmentStatus } from "@/lib/supabase/types";
import { LastShownClassCookie } from "./last-shown-class-cookie";

type SubjectClassJoin = {
  name?: string | null;
  color?: string | null;
};

type AssignmentForSubjectSignal = {
  id: string;
  title: string;
  kind: string;
  status: string;
  due_at: string | null;
  estimated_minutes: number | null;
  reading_load: number | null;
  classes?: SubjectClassJoin | SubjectClassJoin[] | null;
};

const subjectSignalTones: SubjectSignal["tone"][] = ["cyan", "pink", "gold", "blue", "purple"];

type StarterStep = {
  step: number;
  action: string;
  minutes: number;
  done: boolean;
};

function clampSignal(value: number) {
  return Math.max(8, Math.min(98, Math.round(value)));
}

function dueMs(value: string | null | undefined) {
  return value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER;
}

function subjectLabelForAssignment(assignment: AssignmentForSubjectSignal) {
  const joined = Array.isArray(assignment.classes) ? assignment.classes[0] : assignment.classes;
  const className = joined?.name?.trim();
  return className || KIND_LABEL[assignment.kind as keyof typeof KIND_LABEL] || "School";
}

function buildSubjectSignals(
  assignments: AssignmentForSubjectSignal[],
  ranked: Array<{ id: string }>,
  now: Date,
): SubjectSignal[] {
  if (assignments.length === 0) {
    return [
      {
        label: "Classes",
        detail: "Set the school board",
        nextTitle: "Add one class",
        href: "/classes",
        count: 0,
        statusLabel: "setup",
        score: 64,
        tone: "cyan",
        meters: [
          { label: "due", value: 28 },
          { label: "load", value: 18 },
          { label: "proof", value: 38 },
        ],
      },
      {
        label: "Assignments",
        detail: "Start the first lane",
        nextTitle: "Add one assignment",
        href: "/assignments/new",
        count: 0,
        statusLabel: "ready",
        score: 72,
        tone: "pink",
        meters: [
          { label: "due", value: 34 },
          { label: "load", value: 24 },
          { label: "proof", value: 34 },
        ],
      },
      {
        label: "Proof",
        detail: "Keep receipts visible",
        nextTitle: "Save original work",
        href: "/proof",
        count: 0,
        statusLabel: "proof",
        score: 78,
        tone: "gold",
        meters: [
          { label: "due", value: 18 },
          { label: "load", value: 20 },
          { label: "proof", value: 78 },
        ],
      },
      {
        label: "Future Path",
        detail: "Build the story",
        nextTitle: "Add one proof point",
        href: "/future-path",
        count: 0,
        statusLabel: "story",
        score: 70,
        tone: "blue",
        meters: [
          { label: "due", value: 16 },
          { label: "load", value: 16 },
          { label: "proof", value: 70 },
        ],
      },
    ];
  }

  const rankedIndex = new Map(ranked.map((assignment, index) => [assignment.id, index]));
  const groups = new Map<string, AssignmentForSubjectSignal[]>();

  for (const assignment of assignments) {
    const label = subjectLabelForAssignment(assignment);
    const current = groups.get(label) ?? [];
    current.push(assignment);
    groups.set(label, current);
  }

  return Array.from(groups.entries())
    .map(([label, rows]) => {
      const orderedRows = [...rows].sort((a, b) => {
        const rankA = rankedIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const rankB = rankedIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER;
        return rankA - rankB || dueMs(a.due_at) - dueMs(b.due_at);
      });
      const nextRow = orderedRows[0];
      const nextDue = orderedRows.find((row) => row.due_at)?.due_at ?? null;
      const soonCount = rows.filter((row) => {
        if (!row.due_at) return false;
        const days = (new Date(row.due_at).getTime() - now.getTime()) / 86_400_000;
        return days <= 3;
      }).length;
      const highReadCount = rows.filter((row) => Number(row.reading_load ?? 0) >= 3).length;
      const totalMinutes = rows.reduce((sum, row) => sum + Math.max(0, Number(row.estimated_minutes ?? 0)), 0);
      const rank = rankedIndex.get(nextRow.id) ?? Number.MAX_SAFE_INTEGER;
      const urgency = nextDue
        ? (() => {
            const days = (new Date(nextDue).getTime() - now.getTime()) / 86_400_000;
            if (days <= 1) return 92;
            if (days <= 3) return 78;
            if (days <= 7) return 62;
            return 48;
          })()
        : 34 + rows.length * 7;
      const load = 22 + rows.length * 13 + highReadCount * 8 + Math.floor(totalMinutes / 35) * 5;
      const proof = 40 + Math.max(0, 24 - rank * 4) + soonCount * 7;
      const score = clampSignal((urgency * 0.42) + ((100 - Math.min(load, 100)) * 0.18) + (proof * 0.4));

      return {
        label,
        rank,
        due: dueMs(nextDue),
        signal: {
          label,
          detail: nextDue ? formatDueAt(nextDue) : `${Math.max(5, totalMinutes || 5)} min estimated`,
          nextTitle: nextRow.title,
          href: `/assignments/${nextRow.id}?focus=next-step`,
          count: rows.length,
          statusLabel: statusLabelForInventory(nextRow.status),
          score,
          tone: subjectSignalTones[0],
          meters: [
            { label: "due", value: clampSignal(urgency) },
            { label: "load", value: clampSignal(load) },
            { label: "proof", value: clampSignal(proof) },
          ],
        } satisfies SubjectSignal,
      };
    })
    .sort((a, b) => a.rank - b.rank || a.due - b.due || b.signal.count - a.signal.count)
    .slice(0, 4)
    .map((entry, index) => ({
      ...entry.signal,
      tone: subjectSignalTones[index % subjectSignalTones.length],
    }));
}

function countActiveSubjects(assignments: AssignmentForSubjectSignal[]) {
  if (assignments.length === 0) return 0;
  return new Set(assignments.map(subjectLabelForAssignment)).size;
}

function dashboardHref({
  energy,
  brain,
  mode,
  readingLoad,
}: {
  energy: "low" | "medium" | "high";
  brain: DianaOrbState;
  mode: "full" | "calm-light";
  readingLoad: boolean;
}) {
  const params = new URLSearchParams({ energy, brain, nexus: mode });
  if (readingLoad) params.set("view", "reading-load");
  return `/dashboard?${params.toString()}`;
}

function firstOpenStarterStep(row: { steps?: StarterStep[] | null } | null | undefined) {
  const steps = row?.steps;
  if (!Array.isArray(steps)) return null;
  return steps.find((step) => !step.done) ?? steps[0] ?? null;
}

function fallbackStarterStep(assignment: { kind: string; reading_load?: number | null } | null | undefined) {
  if (!assignment) return "Add one class or assignment so Diana can build your first next move.";
  if ((assignment.reading_load ?? 0) >= 3) return "Open the prompt and mark the first source line.";
  if (assignment.kind === "problem_set") return "Do one model problem with the work visible.";
  if (assignment.kind === "test_prep") return "Try one recall pass before looking at notes.";
  if (assignment.kind === "presentation") return "Write the first line you will say.";
  return "Open the task and choose the first visible part.";
}

const ACCENT_CYCLE = ["#29d0ff", "#a855f7", "#f59e0b", "#36e07a", "#f472b6"];

function classTheme(cls: { id: string; name: string; color?: string | null }) {
  const n = cls.name || "";
  if (/math|algebra|geometry|calculus|pre.?calc|stats|trig/i.test(n))
    return { symbol: "M", bannerBg: "linear-gradient(135deg,#0a1a3c,#1428a0)", accent: "#29d0ff" };
  if (/english|writing|lit|language|essay|grammar|composition/i.test(n))
    return { symbol: "E", bannerBg: "linear-gradient(135deg,#1a0d3c,#2a0d7a)", accent: "#a855f7" };
  if (/science|bio|chem|physics|earth|environ/i.test(n))
    return { symbol: "S", bannerBg: "linear-gradient(135deg,#0a2a10,#0d5c1a)", accent: "#36e07a" };
  if (/hist|social|world|gov|econ|geo|civics/i.test(n))
    return { symbol: "H", bannerBg: "linear-gradient(135deg,#2a1000,#6b2600)", accent: "#f59e0b" };
  if (/art|music|drama|theater|dance|creative|photo/i.test(n))
    return { symbol: "A", bannerBg: "linear-gradient(135deg,#2a002a,#6b006b)", accent: "#f472b6" };
  if (/pe|physical|health|sport|fitness|gym/i.test(n))
    return { symbol: "P", bannerBg: "linear-gradient(135deg,#1a2a00,#3a5c00)", accent: "#84cc16" };
  if (/spanish|french|german|latin|chinese|japanese|korean|lang/i.test(n))
    return { symbol: "L", bannerBg: "linear-gradient(135deg,#1a1000,#3a2600)", accent: "#ffd24a" };
  const FALLBACK = [
    { bannerBg: "linear-gradient(135deg,#0a1a3c,#1428a0)", accent: "#29d0ff" },
    { bannerBg: "linear-gradient(135deg,#1a0d3c,#2a0d7a)", accent: "#a855f7" },
    { bannerBg: "linear-gradient(135deg,#0a2a10,#0d5c1a)", accent: "#36e07a" },
    { bannerBg: "linear-gradient(135deg,#2a1000,#6b2600)", accent: "#f59e0b" },
    { bannerBg: "linear-gradient(135deg,#2a002a,#6b006b)", accent: "#f472b6" },
  ];
  return { symbol: (n[0] ?? "C").toUpperCase(), ...FALLBACK[cls.id.charCodeAt(0) % FALLBACK.length] };
}

function statusLabelForInventory(status: string) {
  if (status === "todo") return "ready";
  if (status === "drafting" || status === "checking") return "in progress";
  if (status === "exporting") return "done";
  if (status === "submitted") return "submitted";
  if (status === "graded") return "graded";
  return "check later";
}

function bodySupportDetailFor(
  support: { due_at?: string | null } | null,
  brainState: DianaOrbState,
) {
  if (support) {
    const due = support.due_at ? formatDueAt(support.due_at) : "ready when you are";
    return `${due}. Keep this visible, separate from the best move.`;
  }
  if (brainState === "low" || brainState === "overwhelmed") {
    return "Low selected. Start small, then check water, food, or a short reset.";
  }
  return "Use this lane for sleep, energy, food, movement, or a reset.";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    energy?: "low" | "medium" | "high";
    view?: "reading-load";
    brain?: DianaOrbState;
    nexus?: "full" | "calm-light";
  }>;
}) {
  const supabase = await createClient();
  const profile = await loadProfile();
  const search = await searchParams;
  const now = new Date();
  const learnerProfile = profile
    ? await getLearnerProfile({ supabase, ownerId: profile.user_id })
    : null;
  const roughActive =
    profile?.rough_mode_until ? new Date(profile.rough_mode_until).getTime() > now.getTime() : false;
  const adaptation = sessionAdaptationForMood(roughActive ? "rough" : profile?.session_mood);
  const view = search.view;
  const isReadingLoadView = view === "reading-load";

  const cookieStore = await cookies();
  const lastShownClassId = cookieStore.get("diana_last_class")?.value ?? null;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const fourHoursAgoIso = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
  const last24hIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const twoWeeksAgoIso = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekStartIso = weekStart.toISOString();

  // One parallel batch — every query here is independent (P1 perf work).
  const [
    { data: assignments },
    { data: signals },
    { data: latestReadinessSignal },
    { data: doneToday },
    { data: timeLogs },
    { data: overwhelmedToday },
    { data: supportSignals },
    { data: completionMilestones },
    { data: latestSleep },
    { data: inboxToday },
    { data: submittedToday },
    { data: anyClass },
    { data: anyConnection },
    { data: anyStartSignal },
    { data: anyTimeLog },
    { data: dueCards },
    { data: weeklyClasses },
    { data: weekDoneSignals },
  ] = await Promise.all([
    supabase
      .from("assignments")
      .select("id, title, description, rubric_text, due_at, created_at, status, estimated_minutes, difficulty, class_id, kind, reading_load, writing_load, ai_mode_override, classes(name, color, ai_mode)")
      .neq("status", "submitted")
      .neq("status", "graded")
      .neq("status", "abandoned")
      .order("due_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("task_signals")
      .select("assignment_id, occurred_at")
      .in("kind", ["started", "completed"])
      .gte("occurred_at", fourHoursAgoIso)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("task_signals")
      .select("value, occurred_at")
      .eq("kind", "mood_checkin")
      .gte("occurred_at", todayStart.toISOString())
      .order("occurred_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("task_signals")
      .select("id")
      .eq("kind", "completed")
      .gte("occurred_at", todayStart.toISOString()),
    supabase
      .from("assignment_time_log")
      .select("started_at, ended_at, elapsed_minutes")
      .gte("started_at", todayStart.toISOString()),
    supabase
      .from("task_signals")
      .select("id")
      .eq("kind", "overwhelmed")
      .gte("occurred_at", todayStart.toISOString()),
    supabase
      .from("task_signals")
      .select("assignment_id, kind, value, occurred_at")
      .in("kind", ["started", "completed", "overwhelmed", "context_switch", "study_helper_event", "recall_result"])
      .gte("occurred_at", last24hIso)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("task_signals")
      .select("assignment_id, assignments(kind)")
      .eq("kind", "completed")
      .gte("occurred_at", twoWeeksAgoIso)
      .not("assignment_id", "is", null)
      .limit(100),
    supabase
      .from("sleep_logs")
      .select("sleep_date, sleep_quality, sleep_hours")
      .order("sleep_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("inbox_items")
      .select("id, status")
      .gte("created_at", todayStart.toISOString()),
    supabase
      .from("assignments")
      .select("id")
      .eq("status", "submitted")
      .gte("submitted_at", todayStart.toISOString()),
    supabase.from("classes").select("id").limit(1),
    supabase.from("lms_connections").select("id").limit(1),
    supabase.from("task_signals").select("id").in("kind", ["started", "completed"]).limit(1),
    supabase.from("assignment_time_log").select("id").limit(1),
    supabase
      .from("flashcards")
      .select("id")
      .lte("due_at", new Date().toISOString())
      .order("due_at", { ascending: true }),
    supabase
      .from("classes")
      .select("id, name, color")
      .is("archived_at", null)
      .order("created_at", { ascending: true })
      .limit(12),
    supabase
      .from("task_signals")
      .select("assignment_id")
      .eq("kind", "completed")
      .gte("occurred_at", weekStartIso)
      .not("assignment_id", "is", null),
  ]);

  const recentSignals = (signals ?? [])
    .filter((signal): signal is { assignment_id: string; occurred_at: string } => signal.assignment_id !== null);
  const doneTodayCount = doneToday?.length ?? 0;
  const capturedTodayCount = inboxToday?.length ?? 0;
  const needsCheckCount = (inboxToday ?? []).filter((item) => item.status === "unclassified").length;
  const submittedTodayCount = submittedToday?.length ?? 0;
  const minutesToday = (timeLogs ?? []).reduce((sum, log) => {
    if (typeof log.elapsed_minutes === "number") return sum + log.elapsed_minutes;
    if (log.ended_at) {
      return sum + Math.max(0, Math.round((new Date(log.ended_at).getTime() - new Date(log.started_at).getTime()) / 60000));
    }
    return sum;
  }, 0);
  const openSessionMinutes = (timeLogs ?? []).reduce((sum, log) => {
    if (log.ended_at) return sum;
    return sum + Math.max(0, Math.round((now.getTime() - new Date(log.started_at).getTime()) / 60000));
  }, 0);

  const burnout = burnoutSignal({
    minutesToday,
    openSessionMinutes,
    overwhelmedSignals: overwhelmedToday?.length ?? 0,
    mood: adaptation.mood,
  });
  const sleepAdjustment = sleepRecoveryAdjustment(
    latestSleep
      ? {
          sleep_date: latestSleep.sleep_date,
          sleep_quality: latestSleep.sleep_quality as SleepQuality,
          sleep_hours: latestSleep.sleep_hours === null ? null : Number(latestSleep.sleep_hours),
        }
      : null,
    now,
  );
  const readiness = readinessFromSignalValue(latestReadinessSignal?.value);
  const energy = search.energy ?? energyFromBody(readiness?.body) ?? sleepAdjustment.energyOverride ?? adaptation.energyOverride ?? "medium";
  const requestedBrainState =
    search.brain === "low" ||
    search.brain === "okay" ||
    search.brain === "on-it" ||
    search.brain === "overwhelmed" ||
    search.brain === "creative"
      ? search.brain
      : null;
  const brainState: DianaOrbState =
    requestedBrainState ??
    (roughActive || (overwhelmedToday?.length ?? 0) > 0
      ? "overwhelmed"
      : energy === "low"
        ? "low"
        : energy === "high"
          ? "on-it"
          : "okay");
  const nexusMode = search.nexus === "calm-light" ? "calm-light" : "full";

  const journey = firstWeekJourney({
    hasClassOrConnection: (anyClass?.length ?? 0) > 0 || (anyConnection?.length ?? 0) > 0,
    assignmentCount: assignments?.length ?? 0,
    hasStartedAnything: (anyStartSignal?.length ?? 0) > 0,
    hasFocusSession: (anyTimeLog?.length ?? 0) > 0,
    onboardedAt: profile?.onboarded_at ?? null,
    now,
  });

  const dueCount = dueCards?.length ?? 0;
  const firstDueId = dueCards?.[0]?.id ?? null;

  const ranked = rankAssignments(
    assignments ?? [],
    recentSignals,
    new Date(),
    energy,
    {
      diagnoses: profile?.diagnoses ?? [],
      extra_time_pct: profile?.extra_time_pct ?? 0,
      },
      lastShownClassId,
      learnerProfile,
    );
  const top = ranked[0];
  const topStepsPromise = top
    ? supabase
        .from("assignment_steps")
        .select("steps")
        .eq("assignment_id", top.id)
        .maybeSingle()
    : Promise.resolve({ data: null });
  const [{ data: topStepsRow }, eveningIntentions, reminderItems] = await Promise.all([
    topStepsPromise,
    getEventIntentions(),
    getReminderItems(),
  ]);

  const budget = computeNightBudget(
    (assignments ?? []).map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      classId: assignment.class_id,
      kind: assignment.kind,
      estimated_minutes: assignment.estimated_minutes,
      reading_load: assignment.reading_load,
      due_at: assignment.due_at,
      status: assignment.status,
    })),
    {
      diagnoses: profile?.diagnoses ?? [],
      extra_time_pct: profile?.extra_time_pct ?? 0,
    },
  );

  const sameKindCompletions14d = top
    ? (completionMilestones ?? []).filter((row) => {
        const joined = (row as { assignments?: { kind?: unknown } | Array<{ kind?: unknown }> | null }).assignments;
        const kind = Array.isArray(joined) ? joined[0]?.kind : joined?.kind;
        return kind === top.kind;
      }).length
    : 0;
  const topAssignmentRow = top ? (assignments ?? []).find((assignment) => assignment.id === top.id) : null;
  const topClass = Array.isArray(topAssignmentRow?.classes)
    ? topAssignmentRow?.classes[0]
    : topAssignmentRow?.classes;
  const topSourceAnchors = topAssignmentRow
    ? sourceAnchorsFromAssignment({
        title: top.title,
        description: topAssignmentRow.description ?? null,
        rubricText: topAssignmentRow.rubric_text ?? null,
      })
    : [];
  const topClassMode: AiMode =
    topClass?.ai_mode === "red" || topClass?.ai_mode === "yellow"
      ? topClass.ai_mode
      : "green";
  const topOverride: AiMode | null =
    topAssignmentRow?.ai_mode_override === "red" ||
    topAssignmentRow?.ai_mode_override === "yellow" ||
    topAssignmentRow?.ai_mode_override === "green"
      ? topAssignmentRow.ai_mode_override
      : null;
  const studentStateModel = top
    ? buildStudentStateModel({
        assignment: {
          ...top,
          status: top.status as AssignmentStatus,
          reading_load: top.reading_load ?? 0,
          writing_load: top.writing_load ?? 0,
          difficulty: top.difficulty ?? 3,
          effective_minutes: top.effective_minutes ?? top.estimated_minutes ?? 20,
        },
        aiPolicy: effectiveAiMode(topClassMode, topOverride),
        readiness,
        energy,
        signals: supportSignals ?? [],
        milestones: { sameKindCompletions14d },
        sourceAnchors: topSourceAnchors,
      })
    : null;
  const taskTitle = top ? top.title : "Get your work a home.";
  const starterStep = firstOpenStarterStep(topStepsRow);
  const taskNextMove = starterStep?.action ?? fallbackStarterStep(top);
  const taskHref = top ? `/assignments/${top.id}?focus=next-step` : "/assignments/new";
  const taskMinutes = top
    ? Math.max(3, Math.round(starterStep?.minutes ?? Math.min(15, top.effective_minutes ?? top.estimated_minutes ?? 10)))
    : 5;
  const taskReason = top?.due_at ? formatDueAt(top.due_at) : top ? "ready when you are" : "setup first";
  const missionChannel = topClass?.name?.trim() || (top ? KIND_LABEL[top.kind] : "Setup");
  const missionType = top ? KIND_LABEL[top.kind] : "First setup";
  const missionLoadLabel = top
    ? `${Math.max(3, Math.round(top.effective_minutes ?? top.estimated_minutes ?? taskMinutes))} min for you`
    : "5 min setup";
  const missionProofLabel =
    topSourceAnchors.length > 0
      ? `${topSourceAnchors.length} source ${topSourceAnchors.length === 1 ? "anchor" : "anchors"}`
      : top
        ? "proof slot ready"
        : "add source later";
  const subjectSignals = buildSubjectSignals(assignments ?? [], ranked, now);
  const subjectCount = countActiveSubjects(assignments ?? []);

  // ── Lobby data ──────────────────────────────────────────────────────────────
  const weekNumber = profile?.onboarded_at
    ? Math.max(1, Math.ceil((now.getTime() - new Date(profile.onboarded_at).getTime()) / (7 * 86400000)))
    : 1;
  const weekDone = new Set((weekDoneSignals ?? []).map((s) => s.assignment_id)).size;
  const weekTotal = (assignments ?? []).filter((a) => {
    if (!a.due_at) return false;
    const t = new Date(a.due_at).getTime();
    return t >= weekStart.getTime() && t < weekStart.getTime() + 7 * 86400000;
  }).length;

  const questItems: QuestItem[] = ranked.slice(0, 5).map((a, i) => {
    const aRow = (assignments ?? []).find((x) => x.id === a.id);
    const subject = aRow ? subjectLabelForAssignment(aRow) : KIND_LABEL[a.kind as keyof typeof KIND_LABEL] || "Work";
    return {
      n: i + 1,
      subject,
      title: a.title,
      due: a.due_at ? formatDueAt(a.due_at) : "no due date",
      accent: ACCENT_CYCLE[i % ACCENT_CYCLE.length],
      href: `/assignments/${a.id}?focus=next-step`,
    };
  });

  const classCardDataList: ClassCardData[] = (weeklyClasses ?? []).map((cls) => {
    const asgts = (assignments ?? []).filter((a) => a.class_id === cls.id);
    const needsAttentionAsgts = asgts.filter((a) => a.due_at && new Date(a.due_at).getTime() < now.getTime());
    const inProgressAsgts = asgts.filter((a) => ["drafting", "checking"].includes(a.status));
    const doneAsgts = asgts.filter((a) => a.status === "exporting");
    const topRanked = ranked.find((a) => a.class_id === cls.id);
    const nextDue = [...asgts]
      .filter((a) => a.due_at)
      .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime())[0];
    const theme = classTheme(cls);
    return {
      id: cls.id,
      name: cls.name,
      symbol: theme.symbol,
      bannerBg: theme.bannerBg,
      accent: theme.accent,
      active: inProgressAsgts.length > 0 || topRanked?.class_id === cls.id,
      needsAttention: needsAttentionAsgts.length > 0,
      allDone: asgts.length > 0 && asgts.length === doneAsgts.length,
      pct: asgts.length > 0 ? Math.round((doneAsgts.length / asgts.length) * 100) : 0,
      period: "",
      activeAssignment: topRanked?.title ?? inProgressAsgts[0]?.title ?? "",
      dueBadge: nextDue?.due_at ? formatDueAt(nextDue.due_at) : asgts.length === 0 ? "no tasks" : "no due date",
      href: `/assignments?class=${cls.id}`,
    };
  });
  const bodySupport = ranked.find((assignment) => assignment.id !== top?.id && isWellnessSupportAssignment(assignment))
    ?? ranked.find((assignment) => isWellnessSupportAssignment(assignment))
    ?? null;
  const bodySupportTitle = bodySupport?.title ?? "Body check";
  const bodySupportDetail = bodySupportDetailFor(bodySupport, brainState);
  const bodySupportHref = bodySupport ? `/assignments/${bodySupport.id}?focus=next-step` : "/wellness";

  return (
    <div className="student-portal-page">
      <LastShownClassCookie classId={top?.class_id ?? null} />

      {/* Full-bleed Grayson Lobby — breaks out of app-command-frame padding */}
      <div
        style={{
          marginTop: "calc(-1 * clamp(0.85rem, 1.8vw, 1.75rem))",
          marginInline: "calc(-1 * clamp(0.85rem, 1.8vw, 1.75rem))",
        }}
      >
        <LobbyHero
          studentName={profile?.display_name || "Player"}
          weekNumber={weekNumber}
          weekDone={weekDone}
          weekTotal={weekTotal}
          quests={questItems}
          gameDay={{ title: "HOME 🏈", time: "FRI 7:00 PM", opponent: "vs Eagles" }}
          focusHref={taskHref}
        />
        <ClassesGrid classes={classCardDataList} />
      </div>

      <div className="diana-page student-today-page" data-nexus-mode={nexusMode}>
      <StudentTodayCommandCenter
        studentName={profile?.display_name || "there"}
        taskTitle={taskTitle}
        nextMove={taskNextMove}
        href={taskHref}
        minutes={taskMinutes}
        reason={taskReason}
        missionChannel={missionChannel}
        missionType={missionType}
        missionLoadLabel={missionLoadLabel}
        missionProofLabel={missionProofLabel}
        doneTodayCount={doneTodayCount}
        capturedTodayCount={capturedTodayCount}
        readyTodayCount={ranked.length}
        submittedTodayCount={submittedTodayCount}
        needsCheckCount={needsCheckCount}
        leftTodayCount={ranked.length}
        whyReasons={top?.reasons ?? []}
        brainState={brainState}
        readingControl={<ReadingLoadToggle active={isReadingLoadView} />}
        subjectSignals={subjectSignals}
        subjectCount={subjectCount || subjectSignals.length}
        bodySupportTitle={bodySupportTitle}
        bodySupportDetail={bodySupportDetail}
        bodySupportHref={bodySupportHref}
        styleMode={nexusMode}
        fullModeHref={dashboardHref({ energy, brain: brainState, mode: "full", readingLoad: isReadingLoadView })}
        calmModeHref={dashboardHref({ energy, brain: brainState, mode: "calm-light", readingLoad: isReadingLoadView })}
      />

      <LaunchSequence journey={journey} />

      <section className="pm-secondary-stack" aria-label="Planning context">
      {(() => {
        const upcomingTest = nextUpcomingTest(assignments ?? [], now);
        if (!upcomingTest?.due_at) return null;
        const days = Math.max(
          0,
          Math.round(
            (new Date(new Date(upcomingTest.due_at).toDateString()).getTime() -
              new Date(now.toDateString()).getTime()) /
              86_400_000,
          ),
        );
        return (
          <Link
            href={`/assignments/${(upcomingTest as { id: string }).id}`}
            className="pm-test-plan-card touch-target"
          >
            <CalendarClock size={17} className="mt-0.5 shrink-0 text-brand" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold">
                {upcomingTest.title}
                <span className="font-normal text-muted">
                  {" "}· {days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`}
                </span>
              </span>
              <span className="mt-0.5 block text-xs text-muted">
                A day-by-day prep plan is ready. Practice early, light recall the night before.
              </span>
            </span>
          </Link>
        );
      })()}

      <Suspense fallback={null}>
        <GradeMoveCard />
      </Suspense>

        {studentStateModel && (
          <details className="today-drawer pm-support-rationale">
            <summary className="touch-target">
              <span>Support reasoning</span>
              <small>Open</small>
            </summary>
            <div className="today-drawer-content">
              <StudentStateCard model={studentStateModel} title="Why this support level" />
            </div>
          </details>
        )}
      </section>

      <SupportCueDrawer>
        <DoneToday count={doneTodayCount} />
        <ReminderBanner items={reminderItems} />
        <MoodCheckIn
          visible={shouldShowMoodCheckIn({
            disabled: profile?.mood_checkin_disabled,
            lastCheckInAt: profile?.last_mood_checkin_at,
            now,
          })}
        />
        <SessionAdaptationCard adaptation={adaptation} />
        <BurnoutCue show={burnout.show} message={burnout.message} />
        <SleepRecoveryCard message={sleepAdjustment.message} />
        {profile && <TokenBudgetBanner profile={profile} />}
        <EveningPlanning intentions={eveningIntentions} />
        <WeeklyReflection
          lastReflectedAt={profile?.last_weekly_reflection_at ?? null}
          mood={profile?.session_mood ?? null}
        />
      </SupportCueDrawer>

      <TonightDrawer
        totalMinutes={budget.totalMinutes}
        items={budget.items}
        dueCount={dueCount}
        firstCardId={firstDueId}
      />
      </div>
    </div>
  );
}
