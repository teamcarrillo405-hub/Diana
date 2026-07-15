import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { rankAssignments } from "@/lib/scoring/next-five-minutes";
import { buildLobbyDashboardView } from "@/lib/dashboard/lobby-view";
import { loadProfile } from "@/lib/profile";
import { getLearnerProfile } from "@/lib/learning-loop/server";
import { sessionAdaptationForMood } from "@/lib/emotional/session";
import { sleepRecoveryAdjustment, type SleepQuality } from "@/lib/wellness/health";
import { energyFromBody, readinessFromSignalValue } from "@/lib/support/policy";
import { getReminderItems } from "./actions";
import { LastShownClassCookie } from "./last-shown-class-cookie";
import { LobbyDashboard } from "./lobby-dashboard";

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
  const roughActive = profile?.rough_mode_until
    ? new Date(profile.rough_mode_until).getTime() > now.getTime()
    : false;
  const adaptation = sessionAdaptationForMood(
    roughActive ? "rough" : profile?.session_mood,
  );
  const cookieStore = await cookies();
  const lastShownClassId = cookieStore.get("diana_last_class")?.value ?? null;
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const fourHoursAgoIso = new Date(
    now.getTime() - 4 * 60 * 60 * 1000,
  ).toISOString();

  const [
    { data: assignments },
    { data: signals },
    { data: latestReadinessSignal },
    { data: latestSleep },
    reminderItems,
  ] = await Promise.all([
    supabase
      .from("assignments")
      .select(
        "id, title, due_at, status, estimated_minutes, difficulty, class_id, kind, reading_load, writing_load, classes(name)",
      )
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
    getReminderItems(),
  ]);

  const recentSignals = (signals ?? []).filter(
    (
      signal,
    ): signal is { assignment_id: string; occurred_at: string } =>
      signal.assignment_id !== null,
  );
  const sleepAdjustment = sleepRecoveryAdjustment(
    latestSleep
      ? {
          sleep_date: latestSleep.sleep_date,
          sleep_quality: latestSleep.sleep_quality as SleepQuality,
          sleep_hours:
            latestSleep.sleep_hours === null
              ? null
              : Number(latestSleep.sleep_hours),
        }
      : null,
    now,
  );
  const readiness = readinessFromSignalValue(latestReadinessSignal?.value);
  const energy =
    search.energy ??
    energyFromBody(readiness?.body) ??
    sleepAdjustment.energyOverride ??
    adaptation.energyOverride ??
    "medium";
  const ranked = rankAssignments(
    assignments ?? [],
    recentSignals,
    now,
    energy,
    {
      diagnoses: profile?.diagnoses ?? [],
      extra_time_pct: profile?.extra_time_pct ?? 0,
    },
    lastShownClassId,
    learnerProfile,
  );
  const view = buildLobbyDashboardView({
    displayName: profile?.display_name,
    rankedAssignments: ranked,
    assignments: assignments ?? [],
    reminders: reminderItems,
    now,
  });

  return (
    <>
      <LastShownClassCookie classId={ranked[0]?.class_id ?? null} />
      <LobbyDashboard view={view} />
    </>
  );
}
