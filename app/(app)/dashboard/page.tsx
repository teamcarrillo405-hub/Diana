import Link from "next/link";
import { cookies } from "next/headers";
import { EmptyStateMark } from "@/components/empty-state-mark";
import { createClient } from "@/lib/supabase/server";
import { rankAssignments } from "@/lib/scoring/next-five-minutes";
import { loadProfile } from "@/lib/profile";
import { EnergyPicker } from "./energy-picker";
import { TimeBudget } from "./time-budget";
import { formatDueAt } from "@/lib/format";
import { KIND_LABEL } from "@/lib/checklists/templates";
import { computeNightBudget } from "@/lib/time-budget/compute";
import { DueCards } from "./due-cards";
import { TokenBudgetBanner } from "./token-budget-banner";
import { ReadingLoadToggle, ReadingLoadBadge } from "./reading-load-toggle";
import { StartSessionButton } from "./start-session-button";
import { setLastShownClass, getEventIntentions, getReminderItems } from "./actions";
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
import { FocusHeroCard } from "./focus-hero-card";
import {
  energyFromBody,
  readinessFromSignalValue,
} from "@/lib/support/policy";
import { StudentStateCard } from "@/components/student-state-card";
import { buildStudentStateModel, sourceAnchorsFromAssignment } from "@/lib/student-state/model";
import { effectiveAiMode, type AiMode } from "@/lib/portal/teacher";
import type { AssignmentStatus } from "@/lib/supabase/types";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ energy?: "low" | "medium" | "high"; view?: "reading-load" }>;
}) {
  const supabase = await createClient();
  const profile = await loadProfile();
  const search = await searchParams;
  const now = new Date();
  const roughActive =
    profile?.rough_mode_until ? new Date(profile.rough_mode_until).getTime() > now.getTime() : false;
  const adaptation = sessionAdaptationForMood(roughActive ? "rough" : profile?.session_mood);
  const view = search.view;
  const isReadingLoadView = view === "reading-load";

  const cookieStore = await cookies();
  const lastShownClassId = cookieStore.get("diana_last_class")?.value ?? null;

  const { data: assignments } = await supabase
    .from("assignments")
    .select("id, title, description, rubric_text, due_at, created_at, status, estimated_minutes, difficulty, class_id, kind, reading_load, writing_load, ai_mode_override, classes(name, color, ai_mode)")
    .neq("status", "submitted")
    .neq("status", "graded")
    .neq("status", "abandoned")
    .order("due_at", { ascending: true, nullsFirst: false });

  const fourHoursAgoIso = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
  const { data: signals } = await supabase
    .from("task_signals")
    .select("assignment_id, occurred_at")
    .in("kind", ["started", "completed"])
    .gte("occurred_at", fourHoursAgoIso)
    .order("occurred_at", { ascending: false });

  const recentSignals = (signals ?? [])
    .filter((signal): signal is { assignment_id: string; occurred_at: string } => signal.assignment_id !== null);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { data: latestReadinessSignal } = await supabase
    .from("task_signals")
    .select("value, occurred_at")
    .eq("kind", "mood_checkin")
    .gte("occurred_at", todayStart.toISOString())
    .order("occurred_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: doneToday } = await supabase
    .from("task_signals")
    .select("id")
    .eq("kind", "completed")
    .gte("occurred_at", todayStart.toISOString());
  const doneTodayCount = doneToday?.length ?? 0;

  const { data: timeLogs } = await supabase
    .from("assignment_time_log")
    .select("started_at, ended_at, elapsed_minutes")
    .gte("started_at", todayStart.toISOString());
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
  const { data: overwhelmedToday } = await supabase
    .from("task_signals")
    .select("id")
    .eq("kind", "overwhelmed")
    .gte("occurred_at", todayStart.toISOString());

  const last24hIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const { data: supportSignals } = await supabase
    .from("task_signals")
    .select("assignment_id, kind, value, occurred_at")
    .in("kind", ["started", "completed", "overwhelmed", "context_switch", "study_helper_event", "recall_result"])
    .gte("occurred_at", last24hIso)
    .order("occurred_at", { ascending: false });

  const twoWeeksAgoIso = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: completionMilestones } = await supabase
    .from("task_signals")
    .select("assignment_id, assignments(kind)")
    .eq("kind", "completed")
    .gte("occurred_at", twoWeeksAgoIso)
    .not("assignment_id", "is", null)
    .limit(100);

  const burnout = burnoutSignal({
    minutesToday,
    openSessionMinutes,
    overwhelmedSignals: overwhelmedToday?.length ?? 0,
    mood: adaptation.mood,
  });
  const { data: latestSleep } = await supabase
    .from("sleep_logs")
    .select("sleep_date, sleep_quality, sleep_hours")
    .order("sleep_date", { ascending: false })
    .limit(1)
    .maybeSingle();
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

  const { data: dueCards } = await supabase
    .from("flashcards")
    .select("id")
    .lte("due_at", new Date().toISOString())
    .order("due_at", { ascending: true });
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
  );
  const eveningIntentions = await getEventIntentions();
  const reminderItems = await getReminderItems();

  const top = ranked[0];
  if (top?.class_id) {
    void setLastShownClass(top.class_id);
  }
  const rest = isReadingLoadView
    ? [...ranked]
        .filter((assignment) => assignment.id !== top?.id)
        .sort((a, b) => (b.reading_load ?? 0) - (a.reading_load ?? 0))
        .slice(0, 5)
    : ranked.slice(1, 1 + adaptation.visibleTaskCount);

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

  const ttsOn = profile?.tts_enabled;
  const topCreatedAt = top
    ? (assignments ?? []).find((assignment) => assignment.id === top.id)?.created_at ?? null
    : null;
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
        sourceAnchors: sourceAnchorsFromAssignment({
          title: top.title,
          description: topAssignmentRow?.description ?? null,
          rubricText: topAssignmentRow?.rubric_text ?? null,
        }),
      })
    : null;
  const supportPlan = studentStateModel?.supportPlan ?? null;

  return (
    <div className="space-y-7">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-brand-strong dark:text-brand">
          Command center
        </p>
        <h1 className="text-3xl font-bold leading-tight">
          Hi {profile?.display_name || "there"}.
        </h1>
        <p className="max-w-2xl text-muted">
          Your right-now plan adapts to energy, reading load, due dates, and what you already started.
        </p>
      </header>

      <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <EnergyPicker current={energy} />
        <div className="rounded-2xl border border-border bg-surface-raised p-3">
          <ReadingLoadToggle active={isReadingLoadView} />
        </div>
      </section>

      {!top ? (
        <EmptyState />
      ) : (
        <FocusHeroCard
          assignment={top as any}
          createdAt={topCreatedAt}
          energy={energy}
          roughMode={adaptation.mood === "rough"}
          supportPlan={supportPlan}
          tts={
            ttsOn
              ? {
                  text: `${top.title}. ${KIND_LABEL[top.kind]}. ${top.due_at ? formatDueAt(top.due_at) : ""}.`,
                  provider: profile?.tts_provider ?? "browser",
                  speed: Number(profile?.tts_speed ?? 1),
                  pitch: Number(profile?.tts_pitch ?? 1),
                  voice: profile?.tts_voice ?? "nova",
                }
              : undefined
          }
        />
      )}

      {studentStateModel && (
        <StudentStateCard model={studentStateModel} title="Why this support level" />
      )}

      {rest.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
            {isReadingLoadView ? "By reading load" : "Also on deck"}
          </h2>
          <ul className="animate-fade-in divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface-raised" style={{ animationDelay: "60ms" }}>
            {rest.map((assignment) => (
              <li key={assignment.id}>
                <Link
                  href={`/assignments/${assignment.id}`}
                  className="flex min-w-0 items-center justify-between gap-3 px-4 py-3 hover:bg-surface-soft"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {(assignment as any).classes?.color && (
                      <span
                        className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                        style={{ background: (assignment as any).classes.color }}
                      />
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-medium">{assignment.title}</p>
                      <p className="truncate text-xs text-muted">
                        {KIND_LABEL[assignment.kind]}
                        {assignment.due_at && ` | ${formatDueAt(assignment.due_at)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {isReadingLoadView && <ReadingLoadBadge load={assignment.reading_load} />}
                    <span className="hidden max-w-32 truncate text-xs text-muted sm:inline">
                      {assignment.reasons[0] ?? ""}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <details className="group">
          <summary className="touch-target flex cursor-pointer items-center justify-between rounded-2xl border border-border bg-surface-raised px-4 py-3 text-sm font-medium">
            <span>Support cues</span>
            <span className="text-xs text-muted group-open:hidden">Show</span>
            <span className="hidden text-xs text-muted group-open:inline">Hide</span>
          </summary>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
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
          </div>
        </details>
      </section>

      <DueCards count={dueCount} firstCardId={firstDueId} />

      <TimeBudget totalMinutes={budget.totalMinutes} items={budget.items} />

      <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap">
        <StartSessionButton roughMode={adaptation.mood === "rough"} difficulty={top?.difficulty ?? null} />
        <Link
          href="/assignments/new"
          className="touch-target inline-flex items-center justify-center rounded-xl border border-border bg-surface-raised px-4 py-2 text-sm hover:bg-surface-soft"
        >
          Add an assignment
        </Link>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-surface-raised p-8 text-center">
      <EmptyStateMark />
      <p className="text-lg font-medium">Nothing on deck.</p>
      <p className="mt-1 text-sm text-muted">
        Add an assignment to get started. Or add a class first so it has somewhere to live.
      </p>
      <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
        <Link
          href="/classes"
          className="touch-target inline-flex items-center justify-center rounded-xl border border-border px-3 py-2 text-sm hover:bg-surface-soft"
        >
          Set up a class
        </Link>
        <Link
          href="/assignments/new"
          className="touch-target inline-flex items-center justify-center rounded-xl bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-strong"
        >
          Add an assignment
        </Link>
      </div>
    </div>
  );
}
