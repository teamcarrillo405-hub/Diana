import { HeartPulse } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { todayIsoDate } from "@/lib/wellness/health";
import { WellnessClient } from "./wellness-client";
import { PageShell } from "../page-shell";

export default async function WellnessPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const today = todayIsoDate();
  if (!user) {
    return null;
  }

  const [{ data: activityLogs }, { data: goals }, { data: sleepLogs }] = await Promise.all([
    supabase
      .from("wellness_activity_logs")
      .select("id, logged_for, activity_type, duration_minutes, felt, notes, created_at")
      .order("logged_for", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("wellness_goals")
      .select("id, title, category, target_text, next_step, active, created_at")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("sleep_logs")
      .select("id, sleep_date, sleep_quality, sleep_hours, focus_note, updated_at")
      .order("sleep_date", { ascending: false })
      .limit(5),
  ]);

  return (
    <PageShell
      active="More"
      eyebrow="Wellness"
      title="Take care of how you feel."
      subtitle="Track activity, sleep, and goals so the support fits how you actually feel day to day."
      accent="var(--gl-green)"
      icon={HeartPulse}
    >
      <WellnessClient
        today={today}
        activityLogs={activityLogs ?? []}
        goals={goals ?? []}
        sleepLogs={sleepLogs ?? []}
      />
    </PageShell>
  );
}
