import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { rankAssignments } from "@/lib/scoring/next-five-minutes";
import { buildTodayView, todayWeek } from "@/lib/dashboard/today-view";
import { TodayDashboard } from "@/components/dashboard/today-dashboard";
import {
  lobbyCheckInDayKey,
  lobbyCheckInFromSignalValue,
} from "@/lib/dashboard/lobby-check-in";
import { loadProfile } from "@/lib/profile";
import { getLearnerProfile } from "@/lib/learning-loop/server";
import { sessionAdaptationForMood } from "@/lib/emotional/session";
import { sleepRecoveryAdjustment, type SleepQuality } from "@/lib/wellness/health";
import { energyFromBody, readinessFromSignalValue } from "@/lib/support/policy";
import { LastShownClassCookie } from "./last-shown-class-cookie";
import { LobbyCheckIn } from "./lobby-check-in";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ energy?: "low" | "medium" | "high" }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const profile = await loadProfile();
  const search = await searchParams;
  const now = new Date();
  const timeZone = profile?.timezone || "America/Los_Angeles";
  const checkInDay = lobbyCheckInDayKey(now, timeZone);

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
  const week = todayWeek(now, timeZone);
  const fourHoursAgoIso = new Date(
    now.getTime() - 4 * 60 * 60 * 1000,
  ).toISOString();

  const [
    { data: assignments, error: assignmentsError },
    { data: signals },
    { data: readinessSignals },
    { data: latestSleep },
    { data: weeklyAssignments, error: weeklyError },
    { data: focusLogs, error: focusError },
    { data: submittedAssignments, error: submittedError },
  ] = await Promise.all([
    supabase
      .from("assignments")
      .select(
        "id, title, due_at, status, estimated_minutes, difficulty, class_id, kind, reading_load, writing_load, classes(name)",
      )
      .eq("owner_id", user.id)
      .neq("status", "submitted")
      .neq("status", "graded")
      .neq("status", "abandoned")
      .order("due_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("task_signals")
      .select("assignment_id, occurred_at")
      .eq("owner_id", user.id)
      .in("kind", ["started", "completed"])
      .gte("occurred_at", fourHoursAgoIso)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("task_signals")
      .select("value, occurred_at")
      .eq("owner_id", user.id)
      .eq("kind", "mood_checkin")
      .gte("occurred_at", new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString())
      .order("occurred_at", { ascending: false })
      .limit(16),
    supabase
      .from("sleep_logs")
      .select("sleep_date, sleep_quality, sleep_hours")
      .eq("owner_id", user.id)
      .order("sleep_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("assignments")
      .select("id, title, due_at, status, estimated_minutes, classes(name)")
      .eq("owner_id", user.id)
      .gte("due_at", week.start)
      .lt("due_at", week.end)
      .neq("status", "abandoned"),
    supabase
      .from("assignment_time_log")
      .select("id, started_at, target_ends_at, ended_at, elapsed_minutes, focus_state")
      .eq("owner_id", user.id)
      .lt("started_at", week.end)
      .or(`ended_at.is.null,ended_at.gte.${week.start}`),
    supabase
      .from("assignments")
      .select("id, title, due_at, status, estimated_minutes, submitted_at, classes(name)")
      .eq("owner_id", user.id)
      .gte("submitted_at", week.start)
      .lt("submitted_at", week.end)
      .in("status", ["submitted", "graded"]),
  ]);

  const recentSignals = (signals ?? []).filter(
    (
      signal,
    ): signal is { assignment_id: string; occurred_at: string } =>
      signal.assignment_id !== null,
  );
  const latestReadinessSignal = (readinessSignals ?? []).find(
    (signal) => lobbyCheckInDayKey(signal.occurred_at, timeZone) === checkInDay,
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
  const data = buildTodayView({
    now, timeZone, ranked,
    assignments: assignmentsError ? null : assignments ?? [],
    weeklyAssignments: weeklyError ? null : weeklyAssignments ?? [],
    focusLogs: focusError ? null : focusLogs ?? [],
    submittedAssignments: submittedError ? null : submittedAssignments ?? [],
  });
  const initialCheckIn = lobbyCheckInFromSignalValue(
    latestReadinessSignal?.value,
  );

  return (
    <>
      <LastShownClassCookie classId={ranked[0]?.class_id ?? null} />
      <TodayDashboard
        data={data}
        schoolBranding={{ primaryColor: profile?.school_primary_color, secondaryColor: profile?.school_secondary_color, logoUrl: profile?.school_logo_url }}
        profile={{
          displayName: profile?.display_name,
          photoUrl: profile?.photo_url,
          photoOffsetX: profile?.photo_offset_x,
          photoOffsetY: profile?.photo_offset_y,
        }}
        checkIn={<LobbyCheckIn key={checkInDay} initialValue={initialCheckIn} sleepDate={checkInDay} appearance="today" />}
      />
    </>
  );
}
