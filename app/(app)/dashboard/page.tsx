import { cookies } from "next/headers";
import { TodayGamePlan, type NextMove, type TodayClass } from "./today-game-plan";
import { ReminderBanner } from "./reminder-banner";
import { NeedsAttention } from "./needs-attention";
import { createClient } from "@/lib/supabase/server";
import { rankAssignments } from "@/lib/scoring/next-five-minutes";
import { buildNeedsAttention, type FeedbackNote } from "@/lib/dashboard/needs-attention";
import { loadProfile } from "@/lib/profile";
import { getLearnerProfile } from "@/lib/learning-loop/server";
import { getReminderItems } from "./actions";
import { sessionAdaptationForMood } from "@/lib/emotional/session";
import { sleepRecoveryAdjustment, type SleepQuality } from "@/lib/wellness/health";
import { energyFromBody, readinessFromSignalValue } from "@/lib/support/policy";
import { LastShownClassCookie } from "./last-shown-class-cookie";

function classNameOf(a: { classes?: { name?: string | null } | Array<{ name?: string | null }> | null }): string | null {
  const c = a.classes;
  if (!c) return null;
  return Array.isArray(c) ? (c[0]?.name ?? null) : (c.name ?? null);
}

// Model B landing: the dashboard is just the next-move hero + an overdue summary.
// Classes live on their own /classes tab; every richer feature (quests, subject
// signals, mood/evening/reflection, body support, mission card) lives on its own
// route, so this page only fetches what the hero + reminder banner need.

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ energy?: "low" | "medium" | "high" }>;
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

  const cookieStore = await cookies();
  const lastShownClassId = cookieStore.get("diana_last_class")?.value ?? null;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const fourHoursAgoIso = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // One parallel batch — every query here is independent and feeds the render.
  const [
    { data: assignments },
    { data: signals },
    { data: latestReadinessSignal },
    { data: latestSleep },
    { data: feedbackNotes },
    reminderItems,
    { data: activeClasses },
    { data: assignmentStatuses },
    { data: focusLogs },
  ] = await Promise.all([
    supabase
      .from("assignments")
      .select("id, title, due_at, created_at, status, estimated_minutes, difficulty, class_id, kind, reading_load, writing_load, ai_mode_override, classes(name, color, ai_mode)")
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
      .from("sleep_logs")
      .select("sleep_date, sleep_quality, sleep_hours")
      .order("sleep_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("teacher_progress_notes")
      .select("id, note_text, created_at, assignment_id, assignments(title)")
      .gte("created_at", sevenDaysAgoIso)
      .order("created_at", { ascending: false }),
    getReminderItems(),
    supabase
      .from("classes")
      .select("id, name, color")
      .is("archived_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("assignments")
      .select("class_id, status, updated_at"),
    supabase
      .from("assignment_time_log")
      .select("elapsed_minutes")
      .gte("started_at", sevenDaysAgoIso)
      .not("ended_at", "is", null),
  ]);

  const recentSignals = (signals ?? [])
    .filter((signal): signal is { assignment_id: string; occurred_at: string } => signal.assignment_id !== null);
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
  const taskHref = top ? `/assignments/${top.id}?focus=next-step` : "/assignments/new";
  const nextMove: NextMove | null = top
    ? { className: classNameOf(top), title: top.title, estMin: top.effective_minutes ?? top.estimated_minutes ?? 5 }
    : null;

  const needsAttention = buildNeedsAttention(assignments ?? [], (feedbackNotes ?? []) as FeedbackNote[], now);
  const completedStatuses = new Set(["done", "submitted", "graded"]);
  const classTones: TodayClass["tone"][] = ["blue", "pink", "teal", "amber"];
  const classCards: TodayClass[] = (activeClasses ?? []).map((classItem, index) => {
    const rows = (assignmentStatuses ?? []).filter((assignment) => assignment.class_id === classItem.id);
    const completed = rows.filter((assignment) => completedStatuses.has(assignment.status)).length;
    const activeCount = Math.max(0, rows.length - completed);
    return {
      id: classItem.id,
      name: classItem.name,
      activeCount,
      completionPercent: rows.length ? Math.round((completed / rows.length) * 100) : 0,
      tone: classTones[index % classTones.length],
    };
  });
  const completedTasks = (assignmentStatuses ?? []).filter((assignment) =>
    completedStatuses.has(assignment.status) && new Date(assignment.updated_at).getTime() >= new Date(sevenDaysAgoIso).getTime(),
  ).length;
  const focusMinutes = Math.round((focusLogs ?? []).reduce((total, log) => total + Number(log.elapsed_minutes ?? 0), 0));

  return (
    <div className="student-portal-page">
      <LastShownClassCookie classId={top?.class_id ?? null} />

      <TodayGamePlan
        studentName={profile?.display_name || "Player"}
        focusHref={taskHref}
        nextMove={nextMove}
        metrics={{
          focusMinutes,
          activeTasks: (assignments ?? []).length,
          completedTasks,
          classCount: classCards.length,
        }}
        classes={classCards}
      />
      <ReminderBanner items={reminderItems} />
      <NeedsAttention categories={needsAttention} />
    </div>
  );
}
