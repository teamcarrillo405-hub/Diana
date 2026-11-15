import { StudentShell } from "@/components/student-shell/student-shell";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { buildWellnessDashboardSummary, getWellnessDetailStart, type WellnessYearArchive } from "@/lib/wellness/history";
import { todayIsoDate } from "@/lib/wellness/health";
import { maintainWellnessHistory } from "@/lib/wellness/retention";
import { WellnessClient } from "./wellness-client";

export default async function WellnessPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await maintainWellnessHistory(supabase);

  const today = todayIsoDate();
  const detailStart = getWellnessDetailStart(today);
  const yearStart = `${today.slice(0, 4)}-01-01`;
  const archiveClient = supabase as unknown as WellnessArchiveClient;
  const [{ data: profile }, { data: sleepLogs }, { data: activityLogs }, { data: moodLogs }, archiveResult] = await Promise.all([
    supabase.from("profiles").select("display_name, photo_url, photo_offset_x, photo_offset_y").eq("user_id", user.id).maybeSingle(),
    supabase.from("sleep_logs").select("sleep_date, sleep_hours").eq("owner_id", user.id).gte("sleep_date", detailStart).order("sleep_date", { ascending: false }),
    supabase.from("wellness_activity_logs").select("logged_for, duration_minutes").eq("owner_id", user.id).gte("logged_for", detailStart).order("logged_for", { ascending: false }),
    supabase.from("task_signals").select("occurred_at, value").eq("owner_id", user.id).eq("kind", "mood_checkin").gte("occurred_at", `${detailStart}T00:00:00.000Z`).order("occurred_at", { ascending: false }),
    archiveClient.from("wellness_yearly_archives").select("logged_for, check_in_completed, energy_total, energy_samples, sleep_total, sleep_samples, movement_minutes").eq("owner_id", user.id).gte("logged_for", yearStart),
  ]);
  const summary = buildWellnessDashboardSummary({
    today,
    sleepLogs: (sleepLogs ?? []).map((row) => ({ sleep_date: row.sleep_date, sleep_hours: row.sleep_hours === null ? null : Number(row.sleep_hours) })),
    activityLogs: (activityLogs ?? []).map((row) => ({ logged_for: row.logged_for, duration_minutes: Number(row.duration_minutes) })),
    moodLogs: moodLogs ?? [],
    archivedDays: archiveResult.data ?? [],
  });

  return (
    <StudentShell active="More" version="12" profile={{displayName:profile?.display_name,photoUrl:profile?.photo_url,photoOffsetX:profile?.photo_offset_x,photoOffsetY:profile?.photo_offset_y}}>
      <WellnessClient today={today} summary={summary} />
    </StudentShell>
  );
}

type WellnessArchiveClient = { from: (table: "wellness_yearly_archives") => { select: (columns: string) => { eq: (column: string, value: string) => { gte: (column: string, value: string) => Promise<{ data: WellnessYearArchive[] | null }> } } } };

