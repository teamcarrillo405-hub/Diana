import Link from "next/link";
import { Share2 } from "lucide-react";
import { redirect } from "next/navigation";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import { weekOverWeek } from "@/lib/insights/week-over-week";
import { createClient } from "@/lib/supabase/server";
import {
  InsightsClient,
  type DailyInsightPoint,
  type InsightEvidenceLink,
} from "./insights-client";

const INSIGHTS_STYLES = `
  .sd-progress-insights { --pi-navy:#0f172a; --pi-pink:#ff79da; --pi-teal:#2dd4bf; display:flex; height:max(100dvh,852px); max-height:max(100dvh,852px); flex-direction:column; overflow:hidden; background:var(--pi-navy); color:#fff; font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; }
  .sd-progress-insights * { box-sizing:border-box; }
  .sd-insights-header { position:relative; z-index:20; flex:none; padding:52px 22px 15px; border-bottom:1px solid rgb(255 255 255 / .05); background:rgb(15 23 42 / .82); backdrop-filter:blur(12px); }
  .sd-insights-header-main { display:flex; align-items:flex-start; justify-content:space-between; gap:15px; }
  .sd-insights-wordmark { width:auto; height:15px; margin-bottom:7px; opacity:.93; }
  .sd-insights-header h1 { margin:0; font-size:25px; font-style:italic; font-weight:950; letter-spacing:-.055em; line-height:.86; text-transform:uppercase; }
  .sd-insights-header h1 span { color:var(--pi-pink); }
  .sd-insights-share { display:grid; width:40px; height:40px; place-items:center; border:1px solid rgb(255 255 255 / .1); border-radius:999px; background:rgb(255 255 255 / .05); color:#fff; text-decoration:none; }
  .sd-insights-kicker { margin:12px 0 0; color:#94a3b8; font-size:9px; font-weight:950; letter-spacing:.18em; text-transform:uppercase; }
  .sd-insights-client { min-height:0; flex:1; overflow-y:auto; padding:14px 22px 124px; scrollbar-width:none; }
  .sd-insights-client::-webkit-scrollbar { display:none; }
  .sd-insights-controls { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px; }
  .sd-insights-control-group { display:flex; gap:5px; }
  .sd-insights-control-group button { min-height:29px; border:1px solid rgb(255 255 255 / .09); border-radius:999px; padding:0 9px; background:rgb(255 255 255 / .04); color:#94a3b8; font-size:7px; font-weight:950; letter-spacing:.08em; text-transform:uppercase; }
  .sd-insights-control-group button[aria-pressed="true"] { border-color:rgb(255 121 218 / .5); background:rgb(255 121 218 / .13); color:var(--pi-pink); }
  .sd-insights-panel { border:1px solid rgb(255 255 255 / .1); border-radius:22px; padding:16px; background:rgb(255 255 255 / .05); backdrop-filter:blur(8px); }
  .sd-insights-panel h2,.sd-insights-section > h2 { margin:0; color:#94a3b8; font-size:9px; font-style:italic; font-weight:950; letter-spacing:.12em; text-transform:uppercase; }
  .sd-insights-chart { display:flex; height:122px; align-items:flex-end; justify-content:space-between; gap:9px; padding:13px 2px 0; }
  .sd-insights-bar { display:grid; min-width:0; flex:1; justify-items:center; gap:6px; }
  .sd-insights-bar-track { display:flex; width:100%; max-width:28px; height:91px; align-items:flex-end; overflow:hidden; border-radius:7px 7px 2px 2px; background:rgb(255 255 255 / .06); }
  .sd-insights-bar-track i { display:block; width:100%; height:max(4px,var(--bar-height)); border-radius:7px 7px 2px 2px; background:color-mix(in srgb,var(--bar-tone,var(--pi-teal)) 72%,transparent); box-shadow:0 0 9px color-mix(in srgb,var(--bar-tone,var(--pi-teal)) 38%,transparent); }
  .sd-insights-bar[data-peak="true"] { --bar-tone:var(--pi-pink); }
  .sd-insights-bar small { color:#64748b; font-size:7px; font-weight:950; text-transform:uppercase; }
  .sd-insights-chart-summary { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:13px; border-top:1px solid rgb(255 255 255 / .07); padding-top:11px; }
  .sd-insights-chart-summary strong { color:var(--pi-teal); font-size:15px; font-style:italic; font-weight:950; }
  .sd-insights-chart-summary p { max-width:210px; margin:0; color:#94a3b8; font-size:8px; line-height:1.4; text-align:right; }
  .sd-insights-split { display:grid; grid-template-columns:1fr 1fr; gap:11px; margin-top:13px; }
  .sd-insights-score,.sd-insights-trajectory { display:flex; min-height:182px; flex-direction:column; align-items:center; justify-content:space-between; text-align:center; }
  .sd-insights-meter { display:grid; width:116px; height:116px; place-items:center; border-radius:999px; background:conic-gradient(var(--pi-pink) 0 var(--meter),rgb(255 255 255 / .06) var(--meter) 100%); }
  .sd-insights-meter-inner { display:grid; width:94px; height:94px; place-content:center; border-radius:999px; background:var(--pi-navy); }
  .sd-insights-meter strong { font-size:23px; font-style:italic; font-weight:950; }
  .sd-insights-meter span { color:var(--pi-pink); font-size:7px; font-weight:950; letter-spacing:.1em; text-transform:uppercase; }
  .sd-insights-score p,.sd-insights-trajectory p { margin:0; color:#64748b; font-size:7px; font-weight:850; line-height:1.35; text-transform:uppercase; }
  .sd-insights-trajectory svg { width:100%; height:88px; overflow:visible; }
  .sd-insights-trajectory polyline { fill:none; stroke:var(--pi-teal); stroke-linecap:round; stroke-linejoin:round; stroke-width:3; }
  .sd-insights-trajectory circle { fill:var(--pi-pink); }
  .sd-insights-trend { color:var(--pi-pink); font-size:8px; font-weight:950; text-transform:uppercase; }
  .sd-insights-section { display:grid; gap:9px; margin-top:18px; }
  .sd-insights-evidence { display:grid; gap:8px; }
  .sd-insights-evidence a { display:flex; min-height:54px; align-items:center; justify-content:space-between; gap:12px; border:1px solid rgb(255 255 255 / .1); border-radius:14px; padding:11px 13px; background:rgb(255 255 255 / .05); color:#fff; text-decoration:none; }
  .sd-insights-evidence a:first-child { border-left:4px solid var(--pi-pink); }
  .sd-insights-evidence strong { display:block; overflow:hidden; font-size:9px; font-style:italic; font-weight:950; text-overflow:ellipsis; text-transform:uppercase; white-space:nowrap; }
  .sd-insights-evidence small { display:block; margin-top:3px; color:#94a3b8; font-size:8px; }
  .sd-insights-evidence b { flex:none; color:var(--pi-teal); font-size:8px; font-weight:950; text-transform:uppercase; }
  .sd-progress-insights > .sd-student-bottom-nav { position:relative; z-index:60; min-height:94px; flex:none; }
  .diana-app-shell:has(.sd-progress-insights) .agent-fab-anchor,.app-command-frame:has(.sd-progress-insights) .diana-mobile-command { display:none!important; }
  .app-command-frame:has(.sd-progress-insights) { padding:0!important; }
  .diana-app:has(.sd-progress-insights) nextjs-portal { display:none!important; }
  .diana-app:has(.sd-progress-insights) .skip-link { transition:none; }
  .diana-app:has(.sd-progress-insights) .skip-link:focus { transform:translateY(0)!important; }
  @media (prefers-reduced-motion:reduce) { .sd-progress-insights * { animation:none!important; scroll-behavior:auto!important; transition:none!important; } }
`;

type AssignmentRow = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
};

type TimeLogRow = {
  assignment_id: string;
  started_at: string;
  ended_at: string | null;
  elapsed_minutes: number | null;
};

type AnalyticsRow = {
  event_name: string;
  feature: string | null;
  route: string | null;
  created_at: string;
};

export default async function InsightsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [assignmentResult, timeLogResult, analyticsResult] = await Promise.all([
    supabase
      .from("assignments")
      .select("id, title, status, created_at, updated_at, submitted_at")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(500),
    supabase
      .from("assignment_time_log")
      .select("assignment_id, started_at, ended_at, elapsed_minutes")
      .eq("owner_id", user.id)
      .order("started_at", { ascending: false })
      .limit(500),
    supabase
      .from("analytics_events")
      .select("event_name, feature, route, created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const assignments = (assignmentResult.data ?? []) as AssignmentRow[];
  const timeLogs = (timeLogResult.data ?? []) as TimeLogRow[];
  const analytics = (analyticsResult.data ?? []) as AnalyticsRow[];
  const evidenceDates = [
    ...assignments.map((row) => row.submitted_at ?? row.updated_at),
    ...timeLogs.map((row) => row.started_at),
    ...analytics.map((row) => row.created_at),
  ].filter(validDate);
  const latestEvidenceTime = Math.max(0, ...evidenceDates.map((value) => new Date(value).getTime()));
  const anchor = new Date(Math.max(Date.now(), latestEvidenceTime));
  const days = buildDailyPoints(anchor, assignments, timeLogs, analytics);
  const trend = weekOverWeek(evidenceDates, anchor);
  const completedCount = assignments.filter((assignment) => ["submitted", "graded"].includes(assignment.status)).length;
  const focusMinutes = days.reduce((sum, day) => sum + day.focusMinutes, 0);
  const activeDays = days.filter((day) => day.focusMinutes + day.workEvents + day.activityEvents > 0).length;
  const evidenceMix = Math.min(100, Math.round((activeDays / 28) * 50 + (Math.min(completedCount, 5) / 5) * 25 + (Math.min(focusMinutes, 600) / 600) * 25));
  const evidenceLinks = buildEvidenceLinks(assignments, timeLogs.length, analytics.length);

  return (
    <ScreenDesignViewport className="sd-progress-insights" aria-label="Progress insights">
      <style>{INSIGHTS_STYLES}</style>
      <header className="sd-insights-header">
        <div className="sd-insights-header-main">
          <div>
            <DianaWordmark className="sd-insights-wordmark" />
            <h1>Season<br /><span>Stats</span></h1>
          </div>
          <Link className="sd-insights-share" href="/portfolio" aria-label="Open portfolio"><Share2 size={18} aria-hidden="true" /></Link>
        </div>
        <p className="sd-insights-kicker">Private learning analytics</p>
      </header>

      <InsightsClient
        days={days}
        evidenceMix={evidenceMix}
        trendLabel={trend.label}
        completedCount={completedCount}
        assignmentCount={assignments.length}
        evidenceLinks={evidenceLinks}
      />
      <StudentBottomNav />
    </ScreenDesignViewport>
  );
}

function buildDailyPoints(
  anchor: Date,
  assignments: AssignmentRow[],
  timeLogs: TimeLogRow[],
  analytics: AnalyticsRow[],
): DailyInsightPoint[] {
  const points = new Map<string, DailyInsightPoint>();
  for (let offset = 27; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate() - offset));
    const key = date.toISOString().slice(0, 10);
    points.set(key, {
      date: key,
      label: new Intl.DateTimeFormat("en-US", { weekday: "narrow", timeZone: "UTC" }).format(date),
      focusMinutes: 0,
      workEvents: 0,
      activityEvents: 0,
    });
  }

  for (const log of timeLogs) {
    const key = validDate(log.started_at) ? log.started_at.slice(0, 10) : "";
    const point = points.get(key);
    if (!point) continue;
    const elapsed = typeof log.elapsed_minutes === "number"
      ? Math.max(0, log.elapsed_minutes)
      : log.ended_at && validDate(log.ended_at)
        ? Math.max(0, Math.round((new Date(log.ended_at).getTime() - new Date(log.started_at).getTime()) / 60_000))
        : 0;
    point.focusMinutes += elapsed;
  }
  for (const assignment of assignments) {
    const evidenceDate = assignment.submitted_at ?? assignment.updated_at;
    const point = points.get(validDate(evidenceDate) ? evidenceDate.slice(0, 10) : "");
    if (point) point.workEvents += 1;
  }
  for (const event of analytics) {
    const point = points.get(validDate(event.created_at) ? event.created_at.slice(0, 10) : "");
    if (point) point.activityEvents += 1;
  }
  return [...points.values()];
}

function buildEvidenceLinks(
  assignments: AssignmentRow[],
  timeLogCount: number,
  analyticsCount: number,
): InsightEvidenceLink[] {
  const assignmentLinks = assignments.slice(0, 2).map((assignment, index) => ({
    href: `/assignments/${assignment.id}`,
    title: assignment.title,
    detail: `${labelize(assignment.status)} assignment evidence`,
    primary: index === 0,
  }));
  if (assignmentLinks.length === 0) {
    assignmentLinks.push({
      href: "/assignments",
      title: "Assignment evidence",
      detail: "No assignment rows are available yet",
      primary: true,
    });
  }
  return [
    ...assignmentLinks,
    {
      href: "/timer",
      title: "Focus sessions",
      detail: `${timeLogCount} saved time log${timeLogCount === 1 ? "" : "s"}`,
      primary: false,
    },
    {
      href: "/assignments",
      title: "Learning activity",
      detail: `${analyticsCount} private activity event${analyticsCount === 1 ? "" : "s"}`,
      primary: false,
    },
  ];
}

function validDate(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime());
}

function labelize(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());
}
