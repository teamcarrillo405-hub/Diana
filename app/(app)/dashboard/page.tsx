import { cookies } from "next/headers";
import { LobbyHero } from "./lobby-hero";
import { ReminderBanner } from "./reminder-banner";
import { createClient } from "@/lib/supabase/server";
import { rankAssignments } from "@/lib/scoring/next-five-minutes";
import { loadProfile } from "@/lib/profile";
import { getLearnerProfile } from "@/lib/learning-loop/server";
import { formatDueAt } from "@/lib/format";
import { getReminderItems } from "./actions";
import { sessionAdaptationForMood } from "@/lib/emotional/session";
import { sleepRecoveryAdjustment, type SleepQuality } from "@/lib/wellness/health";
import { energyFromBody, readinessFromSignalValue } from "@/lib/support/policy";
import { LastShownClassCookie } from "./last-shown-class-cookie";
import { ClassesGrid, classTheme, type ClassCardData } from "./classes-grid";

// The dashboard renders the locked Student Lobby — hero + reminders + class grid.
// Every richer feature (quests, subject signals, mood/evening/reflection, body
// support, mission card, first-week journey) lives on its own route (/future-path,
// /notes, /assignments, /assignments/[id], /wellness, /body-double), so this page
// only fetches what the three mounted components actually need.

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ energy?: "low" | "medium" | "high" }>;
}) {
  const supabase = await createClient();
  const profile = await loadProfile();
  const search = await searchParams;
  const now = new Date();

  // Cross-device lobby photo, read from the owner's profile (RLS-scoped).
  const playerPhotoUrl: string | null = profile?.photo_url ?? null;
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
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekStartIso = weekStart.toISOString();

  // One parallel batch — every query here is independent and feeds the render.
  const [
    { data: assignments },
    { data: signals },
    { data: latestReadinessSignal },
    { data: latestSleep },
    { data: weekDoneSignals },
    { data: weeklyClasses },
    reminderItems,
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
      .from("task_signals")
      .select("assignment_id")
      .eq("kind", "completed")
      .gte("occurred_at", weekStartIso)
      .not("assignment_id", "is", null),
    supabase
      .from("classes")
      .select("id, name, color")
      .is("archived_at", null)
      .order("created_at", { ascending: true })
      .limit(12),
    getReminderItems(),
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

  // ── Lobby data ──────────────────────────────────────────────────────────────
  const weekNumber = profile?.onboarded_at
    ? Math.max(1, Math.ceil((now.getTime() - new Date(profile.onboarded_at).getTime()) / (7 * 86400000)))
    : 1;
  const weekDone = new Set((weekDoneSignals ?? []).map((s) => s.assignment_id)).size;
  // Total = still-open work due this week + work already completed this week. The
  // open list excludes submitted/graded, so completed work must be added back in;
  // otherwise the denominator shrinks as the student finishes (was showing 3/1).
  const openDueThisWeek = (assignments ?? []).filter((a) => {
    if (!a.due_at) return false;
    const t = new Date(a.due_at).getTime();
    return t >= weekStart.getTime() && t < weekStart.getTime() + 7 * 86400000;
  }).length;
  const weekTotal = openDueThisWeek + weekDone;

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
      href: `/classes/${cls.id}`,
    } satisfies ClassCardData;
  });

  return (
    <div className="student-portal-page">
      <LastShownClassCookie classId={top?.class_id ?? null} />

      <LobbyHero
        studentName={profile?.display_name || "Player"}
        weekNumber={weekNumber}
        weekDone={weekDone}
        weekTotal={weekTotal}
        focusHref={taskHref}
        photoUrl={playerPhotoUrl}
        energy={energy}
      />
      <ReminderBanner items={reminderItems} />
      <ClassesGrid classes={classCardDataList} />
    </div>
  );
}
