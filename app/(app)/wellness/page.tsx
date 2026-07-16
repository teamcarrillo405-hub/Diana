import { redirect } from "next/navigation";

import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { createClient } from "@/lib/supabase/server";
import { todayIsoDate } from "@/lib/wellness/health";
import { WellnessClient } from "./wellness-client";

const WELLNESS_STYLES = `
  .diana-authenticated-field:has(.sd-wellness-recovery) { padding-bottom:0!important; }
  .app-command-frame:has(.sd-wellness-recovery) { padding:0!important; }
  .app-command-frame:has(.sd-wellness-recovery) .diana-mobile-command,
  .diana-app-shell:has(.sd-wellness-recovery) .agent-fab-anchor { display:none!important; }
  .diana-app:has(.sd-wellness-recovery) nextjs-portal { display:none!important; }
  .diana-app:has(.sd-wellness-recovery) .skip-link { transition:none; }
  .diana-app:has(.sd-wellness-recovery) .skip-link:focus { transform:translateY(0)!important; }
  .sd-wellness-recovery { display:flex; height:max(100dvh,852px); max-height:max(100dvh,852px); flex-direction:column; overflow:hidden; background:#0f172a; color:#fff; font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; }
  .sd-wellness-recovery::before { position:absolute; inset:0; z-index:-1; background:radial-gradient(circle at top right,rgb(116 192 255 / .07),transparent 38%),radial-gradient(circle at bottom left,rgb(255 121 218 / .07),transparent 42%); content:""; }
  .sd-wellness-recovery * { box-sizing:border-box; }
  .sd-wellness-recovery button,.sd-wellness-recovery input,.sd-wellness-recovery select,.sd-wellness-recovery textarea { font:inherit; }
  .sd-wellness-recovery button:focus-visible,.sd-wellness-recovery input:focus-visible,.sd-wellness-recovery select:focus-visible,.sd-wellness-recovery textarea:focus-visible,.sd-wellness-recovery a:focus-visible { outline:2px solid #74c0ff; outline-offset:3px; }
  .sd-wellness-header { position:relative; z-index:30; flex:none; padding:52px 24px 16px; background:rgb(15 23 42 / .82); backdrop-filter:blur(12px); }
  .sd-wellness-header-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
  .sd-wellness-header .sd-source-wordmark { width:auto; height:16px; }
  .sd-wellness-close { display:grid; width:40px; height:40px; place-items:center; border:1px solid rgb(255 255 255 / .1); border-radius:999px; background:rgb(255 255 255 / .05); color:#f8fafc; text-decoration:none; }
  .sd-wellness-header h1 { margin:0; color:#f8fafc; font-size:24px; font-style:italic; font-weight:950; letter-spacing:-.045em; line-height:1; text-transform:uppercase; }
  .sd-wellness-header p { margin:7px 0 0; color:#94a3b8; font-size:9px; font-weight:950; letter-spacing:.19em; text-transform:uppercase; }
  .sd-wellness-scroll { position:relative; min-height:0; flex:1; overflow-y:auto; padding:18px 24px 120px; scrollbar-width:none; }
  .sd-wellness-scroll::-webkit-scrollbar { display:none; }
  .sd-wellness-controls { display:grid; gap:27px; margin-top:4px; }
  .sd-wellness-control { display:grid; gap:11px; }
  .sd-wellness-control-head { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:0 2px; }
  .sd-wellness-control-title { display:flex; align-items:center; gap:8px; color:#f8fafc; }
  .sd-wellness-control-title svg { color:#74c0ff; }
  .sd-wellness-control[data-tone="pink"] .sd-wellness-control-title svg,.sd-wellness-control[data-tone="pink"] output { color:#ff79da; }
  .sd-wellness-control h2 { margin:0; font-size:10px; font-weight:950; letter-spacing:.16em; text-transform:uppercase; }
  .sd-wellness-control output { color:#74c0ff; font-size:13px; font-style:italic; font-weight:950; text-transform:uppercase; }
  .sd-wellness-range-wrap { position:relative; display:flex; height:40px; align-items:center; border:1px solid rgb(255 255 255 / .07); border-radius:12px; background:rgb(255 255 255 / .035); padding:0 13px; }
  .sd-wellness-range-wrap::before { position:absolute; inset:0; width:var(--sleep-fill,70%); border-radius:11px; background:linear-gradient(90deg,rgb(116 192 255 / .74),rgb(255 121 218 / .74)); content:""; }
  .sd-wellness-range-wrap input { position:absolute; inset:0; z-index:2; width:100%; height:100%; margin:0; cursor:pointer; opacity:.001; }
  .sd-wellness-range-labels { position:relative; z-index:1; display:flex; width:100%; justify-content:space-between; color:rgb(255 255 255 / .55); font-size:8px; font-weight:950; text-transform:uppercase; }
  .sd-wellness-range-marker { position:absolute; top:0; bottom:0; left:var(--sleep-fill,70%); z-index:1; width:3px; background:#fff; box-shadow:0 0 10px #fff; }
  .sd-wellness-segments { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:4px; min-height:40px; border:1px solid rgb(255 255 255 / .07); border-radius:12px; background:rgb(255 255 255 / .035); padding:4px; }
  .sd-wellness-segments button { border:0; border-radius:9px; background:transparent; color:#94a3b8; font-size:8px; font-weight:950; letter-spacing:.08em; text-transform:uppercase; }
  .sd-wellness-segments button[aria-pressed="true"] { background:linear-gradient(100deg,#74c0ff,#ff79da); color:#0f172a; }
  .sd-wellness-quality { display:flex; gap:6px; margin-top:2px; }
  .sd-wellness-quality button { border:1px solid rgb(255 255 255 / .09); border-radius:999px; background:rgb(255 255 255 / .035); padding:6px 9px; color:#94a3b8; font-size:7px; font-weight:900; text-transform:uppercase; }
  .sd-wellness-quality button[aria-pressed="true"] { border-color:#74c0ff; color:#74c0ff; }
  .sd-wellness-forecast { position:relative; display:grid; gap:11px; margin-top:32px; border:1px solid rgb(255 255 255 / .1); border-left:4px solid #74c0ff; border-radius:17px; background:rgb(255 255 255 / .05); padding:17px; backdrop-filter:blur(8px); }
  .sd-wellness-forecast-head { display:flex; align-items:center; gap:10px; color:#74c0ff; }
  .sd-wellness-forecast-icon { display:grid; width:39px; height:39px; place-items:center; border-radius:999px; background:rgb(255 255 255 / .08); }
  .sd-wellness-forecast h2 { margin:0; font-size:9px; font-weight:950; letter-spacing:.2em; text-transform:uppercase; }
  .sd-wellness-forecast h3 { margin:0; color:#f8fafc; font-size:17px; font-style:italic; font-weight:950; line-height:1.08; text-transform:uppercase; }
  .sd-wellness-forecast p { margin:0; color:#cbd5e1; font-size:10px; font-style:italic; font-weight:700; line-height:1.55; }
  .sd-wellness-private-log { display:grid; gap:8px; margin-top:20px; }
  .sd-wellness-private-log h2 { margin:0; color:#94a3b8; font-size:8px; font-style:italic; font-weight:950; letter-spacing:.16em; text-transform:uppercase; }
  .sd-wellness-private-items { display:flex; gap:7px; overflow-x:auto; padding-bottom:2px; scrollbar-width:none; }
  .sd-wellness-private-items::-webkit-scrollbar { display:none; }
  .sd-wellness-private-item { min-width:132px; border:1px solid rgb(255 255 255 / .08); border-radius:11px; background:rgb(255 255 255 / .035); padding:9px 10px; }
  .sd-wellness-private-item strong { display:block; overflow:hidden; color:#f8fafc; font-size:8px; font-weight:950; text-overflow:ellipsis; text-transform:uppercase; white-space:nowrap; }
  .sd-wellness-private-item small { display:block; margin-top:3px; color:#64748b; font-size:7px; font-weight:800; text-transform:uppercase; }
  .sd-wellness-status { margin-top:14px; border:1px solid rgb(116 192 255 / .22); border-radius:11px; background:rgb(116 192 255 / .06); padding:9px 11px; color:#cbd5e1; font-size:9px; line-height:1.4; }
  .sd-wellness-quick { position:absolute; right:24px; bottom:108px; z-index:55; display:grid; width:64px; height:64px; place-items:center; border:0; border-radius:16px; background:linear-gradient(135deg,#74c0ff,#ff79da); color:#0f172a; box-shadow:0 10px 30px rgb(45 212 191 / .27); }
  .sd-wellness-footer { position:relative; z-index:50; flex:none; border-top:1px solid rgb(255 255 255 / .05); background:rgb(15 23 42 / .86); padding:18px 24px 23px; backdrop-filter:blur(16px); }
  .sd-wellness-submit { width:100%; min-height:51px; border:0; border-radius:12px; background:linear-gradient(90deg,#74c0ff,#ff79da); color:#0f172a; font-size:11px; font-style:italic; font-weight:950; letter-spacing:.14em; text-transform:uppercase; box-shadow:0 0 20px rgb(116 192 255 / .24); }
  .sd-wellness-submit:disabled,.sd-wellness-quick:disabled { opacity:.55; }
  .sd-wellness-drawer-backdrop { position:absolute; inset:0; z-index:70; background:rgb(2 6 23 / .72); backdrop-filter:blur(4px); }
  .sd-wellness-drawer { position:absolute; right:0; bottom:0; left:0; z-index:75; max-height:73%; overflow-y:auto; border:1px solid rgb(255 255 255 / .12); border-radius:24px 24px 0 0; background:#131e34; padding:20px 24px 28px; box-shadow:0 -20px 60px rgb(0 0 0 / .35); }
  .sd-wellness-drawer-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:16px; }
  .sd-wellness-drawer h2 { margin:0; font-size:16px; font-style:italic; font-weight:950; text-transform:uppercase; }
  .sd-wellness-drawer-close { display:grid; width:34px; height:34px; place-items:center; border:1px solid rgb(255 255 255 / .1); border-radius:999px; background:rgb(255 255 255 / .05); color:#f8fafc; }
  .sd-wellness-drawer-tabs { display:flex; gap:7px; margin-bottom:15px; }
  .sd-wellness-drawer-tabs button { border:1px solid rgb(255 255 255 / .1); border-radius:999px; background:transparent; padding:7px 11px; color:#94a3b8; font-size:8px; font-weight:950; text-transform:uppercase; }
  .sd-wellness-drawer-tabs button[aria-pressed="true"] { border-color:#ff79da; background:#ff79da; color:#0f172a; }
  .sd-wellness-form { display:grid; gap:10px; }
  .sd-wellness-form label { display:grid; gap:5px; color:#94a3b8; font-size:8px; font-weight:900; letter-spacing:.08em; text-transform:uppercase; }
  .sd-wellness-form input,.sd-wellness-form select,.sd-wellness-form textarea { width:100%; border:1px solid rgb(255 255 255 / .1); border-radius:10px; background:rgb(255 255 255 / .04); padding:10px 11px; color:#f8fafc; font-size:10px; text-transform:none; }
  .sd-wellness-form textarea { min-height:65px; resize:vertical; }
  .sd-wellness-form button[type="submit"] { min-height:41px; border:0; border-radius:10px; background:#74c0ff; color:#0f172a; font-size:9px; font-style:italic; font-weight:950; text-transform:uppercase; }
  .diana-app .sd-wellness-recovery button { clip-path:none; font-family:inherit; transform:none; }
  .diana-app .sd-wellness-quality button { display:inline-flex; width:auto; min-height:29px; border:1px solid rgb(255 255 255 / .09); border-radius:999px; background:rgb(255 255 255 / .035); padding:6px 9px; color:#94a3b8; box-shadow:none; }
  .diana-app .sd-wellness-quality button[aria-pressed="true"] { border-color:#74c0ff; background:rgb(116 192 255 / .05); color:#74c0ff; }
  .diana-app .sd-wellness-segments button { display:flex; width:100%; min-height:30px; border:0; border-radius:9px; background:transparent; padding:0; color:#94a3b8; box-shadow:none; }
  .diana-app .sd-wellness-segments button[aria-pressed="true"] { background:linear-gradient(100deg,#74c0ff,#ff79da); color:#0f172a; }
  .diana-app .sd-wellness-quick { display:grid; width:64px; min-height:64px; border:0; border-radius:16px; background:linear-gradient(135deg,#74c0ff,#ff79da); padding:0; color:#0f172a; box-shadow:0 10px 30px rgb(45 212 191 / .27); }
  .diana-app .sd-wellness-submit { display:flex; width:100%; min-height:51px; border:0; border-radius:12px; background:linear-gradient(90deg,#74c0ff,#ff79da); padding:0 16px; color:#0f172a; box-shadow:0 0 20px rgb(116 192 255 / .24); }
  .diana-app .sd-wellness-drawer-backdrop { display:block; width:100%; min-height:100%; border:0; border-radius:0; background:rgb(2 6 23 / .72); padding:0; box-shadow:none; }
  .diana-app .sd-wellness-drawer-close { display:grid; width:34px; min-height:34px; border:1px solid rgb(255 255 255 / .1); border-radius:999px; background:rgb(255 255 255 / .05); padding:0; color:#f8fafc; box-shadow:none; }
  .diana-app .sd-wellness-drawer-tabs button { display:inline-flex; width:auto; min-height:30px; border:1px solid rgb(255 255 255 / .1); border-radius:999px; background:transparent; padding:7px 11px; color:#94a3b8; box-shadow:none; }
  .diana-app .sd-wellness-drawer-tabs button[aria-pressed="true"] { border-color:#ff79da; background:#ff79da; color:#0f172a; }
  .diana-app .sd-wellness-form button[type="submit"] { display:flex; width:100%; min-height:41px; border:0; border-radius:10px; background:#74c0ff; padding:0 12px; color:#0f172a; box-shadow:none; }
  @media (prefers-reduced-motion:reduce) { .sd-wellness-recovery * { scroll-behavior:auto!important; transition:none!important; } }
`;

export default async function WellnessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: activityLogs }, { data: goals }, { data: sleepLogs }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("session_mood")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("wellness_activity_logs")
        .select("id, logged_for, activity_type, duration_minutes, felt, notes")
        .eq("owner_id", user.id)
        .order("logged_for", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("wellness_goals")
        .select("id, title, category, target_text, next_step")
        .eq("owner_id", user.id)
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("sleep_logs")
        .select("id, sleep_date, sleep_quality, sleep_hours, focus_note")
        .eq("owner_id", user.id)
        .order("sleep_date", { ascending: false })
        .limit(5),
    ]);

  const sessionMood = isSessionMood(profile?.session_mood) ? profile.session_mood : null;

  return (
    <ScreenDesignViewport className="sd-wellness-recovery" aria-label="Wellness and recovery">
      <style>{WELLNESS_STYLES}</style>
      <WellnessClient
        today={todayIsoDate()}
        initialMood={sessionMood}
        activityLogs={activityLogs ?? []}
        goals={goals ?? []}
        sleepLogs={sleepLogs ?? []}
      />
    </ScreenDesignViewport>
  );
}

function isSessionMood(value: unknown): value is "good" | "meh" | "rough" {
  return value === "good" || value === "meh" || value === "rough";
}
