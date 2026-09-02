import { redirect } from "next/navigation";

import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { StudentDesktopNav } from "@/components/screen-design/student-desktop-nav";
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
    <ScreenDesignViewport className="sd-wellness-history diana-current-page" aria-label="Daily wellness record">
      <style>{WELLNESS_PAGE_STYLES}</style>
      <StudentDesktopNav active="More" displayName={profile?.display_name} photoUrl={profile?.photo_url} photoOffsetX={profile?.photo_offset_x} photoOffsetY={profile?.photo_offset_y} />
      <WellnessClient today={today} summary={summary} />
      <StudentBottomNav />
    </ScreenDesignViewport>
  );
}

type WellnessArchiveClient = { from: (table: "wellness_yearly_archives") => { select: (columns: string) => { eq: (column: string, value: string) => { gte: (column: string, value: string) => Promise<{ data: WellnessYearArchive[] | null }> } } } };

const WELLNESS_PAGE_STYLES = `
  .diana-authenticated-field:has(.sd-wellness-history) { padding-bottom:0!important; }
  .app-command-frame:has(.sd-wellness-history) { padding:0!important; }
  .diana-app-shell:has(.sd-wellness-history) .agent-fab-anchor,.diana-app-shell:has(.sd-wellness-history) .diana-mobile-command { display:none!important; }
  .sd-wellness-history { position:relative; min-height:max(100dvh,852px); overflow:hidden; background:linear-gradient(rgb(16 28 32 / .26),rgb(16 28 32 / .42)),url("/images/more-gamer-classroom.png") center/cover fixed; }
  .sd-wellness-history::before { position:absolute; inset:72px 0 0; z-index:0; background:radial-gradient(circle at 50% 45%,transparent 0 22%,rgb(10 17 20 / .22) 80%); content:""; pointer-events:none; }
  .sd-wellness-history > :not(.sd-student-desktop-nav) { position:relative; z-index:1; }
  .sd-wellness-history > .sd-student-bottom-nav { display:none!important; }
  @media (max-width:900px) { .sd-wellness-history { min-height:100dvh; background-attachment:scroll; }.sd-wellness-history::before { inset:0; }.sd-wellness-history > .sd-student-bottom-nav { position:fixed!important; z-index:75!important; right:12px!important; bottom:calc(8px + env(safe-area-inset-bottom))!important; left:12px!important; display:grid!important; width:auto!important; min-height:68px!important; grid-template-columns:repeat(5,minmax(0,1fr))!important; border:1px solid rgb(84 98 92 / .3)!important; border-radius:18px!important; background:rgb(231 236 231 / .92)!important; padding:5px 6px!important; box-shadow:0 18px 44px rgb(24 33 38 / .16)!important; backdrop-filter:blur(24px)!important; }.sd-wellness-history > .sd-student-bottom-nav a { display:flex!important; min-width:0!important; min-height:54px!important; flex-direction:column!important; align-items:center!important; justify-content:center!important; gap:3px!important; border-radius:11px!important; color:#53615c!important; font-size:11px!important; text-decoration:none!important; }.sd-wellness-history > .sd-student-bottom-nav a[aria-current="page"] { background:rgb(255 255 255 / .62)!important; color:#182126!important; } }
`;
