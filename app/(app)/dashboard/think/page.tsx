import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadProfile } from "@/lib/profile";
import type { DianaOrbState } from "@/components/signal/clarity-orb";
import {
  sessionAdaptationForMood,
  shouldShowMoodCheckIn,
} from "@/lib/emotional/session";
import { sleepRecoveryAdjustment, type SleepQuality } from "@/lib/wellness/health";
import { energyFromBody, readinessFromSignalValue } from "@/lib/support/policy";

import { DashboardTabShell } from "@/components/ui/dashboard-tab-shell";
import { TabHeading } from "@/components/ui/tab-heading";
import { DashboardTabs } from "../dashboard-tabs";
import { MoodCheckIn } from "../mood-check-in";
import { SessionAdaptationCard } from "../session-adaptation-card";
import { SleepRecoveryCard } from "../sleep-recovery-card";
import { EnergyPicker } from "../energy-picker";
import { WeeklyReflection } from "../weekly-reflection";

// Diana — THINK tab. "How am I." Models work/page.tsx exactly: server
// component, one parallel batch, lobby-skinned heading + DashboardTabs.
export default async function ThinkPage({
  searchParams,
}: {
  searchParams: Promise<{ energy?: "low" | "medium" | "high"; brain?: DianaOrbState }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const profile = await loadProfile();
  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    { data: latestReadinessSignal },
    { data: overwhelmedToday },
    { data: latestSleep },
  ] = await Promise.all([
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
      .eq("kind", "overwhelmed")
      .gte("occurred_at", todayStart.toISOString()),
    supabase
      .from("sleep_logs")
      .select("sleep_date, sleep_quality, sleep_hours")
      .order("sleep_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const roughActive = profile?.rough_mode_until
    ? new Date(profile.rough_mode_until).getTime() > now.getTime()
    : false;
  const adaptation = sessionAdaptationForMood(roughActive ? "rough" : profile?.session_mood);
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
  const energy =
    sp.energy ??
    energyFromBody(readiness?.body) ??
    sleepAdjustment.energyOverride ??
    adaptation.energyOverride ??
    "medium";
  const brainState: DianaOrbState =
    sp.brain ??
    (roughActive || (overwhelmedToday?.length ?? 0) > 0
      ? "overwhelmed"
      : energy === "low"
        ? "low"
        : energy === "high"
          ? "on-it"
          : "okay");

  return (
    <DashboardTabShell>
        <DashboardTabs />
        <TabHeading
          kicker="How am I"
          title="Think"
          sub="Check in, adapt tonight, and reflect on the week."
          accent="var(--gl-purple-light)"
        />

        {/* Each of these self-gates: MoodCheckIn hides once today's check-in
            exists; SessionAdaptationCard hides when mood is good; SleepRecoveryCard
            hides when there's no message; WeeklyReflection hides outside its window. */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-12)" }}>
          <MoodCheckIn
            visible={shouldShowMoodCheckIn({
              disabled: profile?.mood_checkin_disabled,
              lastCheckInAt: profile?.last_mood_checkin_at,
              now,
            })}
          />
          <SessionAdaptationCard adaptation={adaptation} />
          <SleepRecoveryCard message={sleepAdjustment.message} />
          <EnergyPicker currentBrain={brainState} />
          <WeeklyReflection
            lastReflectedAt={profile?.last_weekly_reflection_at ?? null}
            mood={profile?.session_mood ?? null}
          />
          <Link
            href="/notes"
            style={{
              alignSelf: "flex-start",
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-3)",
              borderRadius: "var(--radius-button)",
              border: "1px solid var(--gl-purple-30)",
              background: "var(--gl-purple-14)",
              padding: "var(--space-5) var(--space-10)",
              fontFamily: "var(--font-display)",
              fontWeight: "var(--weight-800)",
              fontSize: "var(--text-13)",
              letterSpacing: "var(--tracking-04)",
              textTransform: "uppercase",
              color: "var(--gl-purple-light)",
              textDecoration: "none",
            }}
          >
            See all notes →
          </Link>
        </div>
    </DashboardTabShell>
  );
}
