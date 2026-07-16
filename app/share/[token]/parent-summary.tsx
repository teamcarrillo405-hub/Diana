"use client";

import {
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  Printer,
  Share2,
} from "lucide-react";

import { DianaMascotMark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import type { ParentSummary } from "@/lib/sharing/types";

const REPORT_STYLES = `
  .diana-app:has(.sd-scout-report) nextjs-portal { display:none !important; }
  .sd-scout-report { min-height:max(100dvh,852px); overflow:hidden; background:#0f172a; color:#fff; font-family:var(--font-body),Arial,sans-serif; }
  .sd-scout-report-shell { position:relative; display:flex; height:max(100dvh,852px); flex-direction:column; overflow:hidden; }
  .sd-scout-report-header { flex:0 0 auto; border-bottom:1px solid rgb(255 255 255 / .06); padding:48px 32px 24px; }
  .sd-scout-report-kicker-row { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:18px; }
  .sd-scout-report-kicker { border-radius:999px; background:rgb(255 255 255 / .09); padding:6px 11px; color:#fff; font-size:8px; font-weight:950; letter-spacing:.14em; text-transform:uppercase; }
  .sd-scout-report-open { display:grid; width:34px; height:34px; place-items:center; border:1px solid rgb(255 255 255 / .1); border-radius:50%; color:#94a3b8; text-decoration:none; }
  .sd-scout-report-open svg { width:17px; height:17px; }
  .sd-scout-report-title-row { display:flex; align-items:end; justify-content:space-between; gap:18px; }
  .sd-scout-report-title-row > div:first-child { min-width:0; }
  .sd-scout-report-title-row h1 { margin:0; font:italic 950 25px/.95 var(--font-display),Arial,sans-serif; letter-spacing:-.04em; text-transform:uppercase; }
  .sd-scout-report-title-row p { margin:7px 0 0; color:#94a3b8; font-size:9px; font-weight:800; letter-spacing:.05em; text-transform:uppercase; }
  .sd-scout-report-week { display:grid; flex:0 0 auto; justify-items:end; gap:4px; text-align:right; }
  .sd-scout-report-week span { color:#74c0ff; font-size:8px; font-weight:950; letter-spacing:.08em; text-transform:uppercase; }
  .sd-scout-report-week strong { font:italic 950 18px/1 var(--font-display),Arial,sans-serif; text-transform:uppercase; }
  .sd-scout-report-scroll { display:grid; flex:1 1 auto; align-content:start; gap:26px; min-height:0; overflow-y:auto; padding:22px 24px 126px; scrollbar-width:none; }
  .sd-scout-report-stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:9px; }
  .sd-scout-report-stat { display:grid; min-width:0; min-height:105px; align-content:center; justify-items:center; gap:5px; border:1px solid rgb(255 255 255 / .08); border-radius:16px; background:rgb(255 255 255 / .025); padding:12px 7px; text-align:center; }
  .sd-scout-report-stat[data-tone="blue"] { border-left:2px solid #74c0ff; }
  .sd-scout-report-stat > span { color:#64748b; font-size:7px; font-weight:950; letter-spacing:.12em; text-transform:uppercase; }
  .sd-scout-report-stat strong { color:#fff; font:italic 950 20px/1 var(--font-display),Arial,sans-serif; }
  .sd-scout-report-stat[data-tone="blue"] strong { color:#74c0ff; }
  .sd-scout-report-stat small { color:#64748b; font-size:6px; font-weight:850; line-height:1.25; text-transform:uppercase; }
  .sd-scout-report-section { display:grid; gap:12px; scroll-margin-top:20px; }
  .sd-scout-report-section > h2 { margin:0; color:#94a3b8; font:italic 950 11px/1 var(--font-display),Arial,sans-serif; letter-spacing:.14em; text-transform:uppercase; }
  .sd-scout-report-insight { position:relative; min-height:154px; overflow:hidden; border-radius:24px; background:rgb(255 255 255 / .045); padding:22px; }
  .sd-scout-report-mascot { position:absolute; right:-20px; bottom:-24px; width:125px; height:125px; opacity:.11; transform:rotate(10deg); }
  .sd-scout-report-insight > div { position:relative; z-index:2; display:grid; max-width:235px; gap:13px; }
  .sd-scout-report-insight p { margin:0; color:#cbd5e1; font-size:12px; font-style:italic; line-height:1.55; }
  .sd-scout-report-insight strong { color:#ff79da; font-size:8px; font-weight:950; letter-spacing:.1em; text-transform:uppercase; }
  .sd-scout-report-achievements { display:grid; gap:10px; }
  .sd-scout-report-achievement { display:grid; grid-template-columns:40px minmax(0,1fr) auto; align-items:center; gap:12px; border:1px solid rgb(255 255 255 / .09); border-radius:15px; background:rgb(255 255 255 / .04); padding:12px; }
  .sd-scout-report-achievement > span { display:grid; width:40px; height:40px; place-items:center; border-radius:50%; background:rgb(45 212 191 / .1); color:#2dd4bf; }
  .sd-scout-report-achievement[data-tone="blue"] > span { background:rgb(116 192 255 / .1); color:#74c0ff; }
  .sd-scout-report-achievement svg { width:18px; height:18px; }
  .sd-scout-report-achievement h3 { margin:0; font:italic 950 11px/1 var(--font-display),Arial,sans-serif; text-transform:uppercase; }
  .sd-scout-report-achievement p { margin:4px 0 0; color:#94a3b8; font-size:8px; font-weight:800; text-transform:uppercase; }
  .sd-scout-report-achievement > strong { color:#64748b; font-size:8px; font-weight:900; text-align:right; text-transform:uppercase; }
  .sd-scout-report-confidence { display:grid; gap:8px; }
  .sd-scout-report-confidence li { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:12px; border-bottom:1px solid rgb(255 255 255 / .06); padding:8px 2px; color:#cbd5e1; font-size:10px; }
  .sd-scout-report-confidence span:last-child { color:#74c0ff; font-weight:900; }
  .sd-scout-report-footer { position:absolute; z-index:30; right:0; bottom:0; left:0; display:grid; gap:7px; border-top:1px solid rgb(255 255 255 / .06); background:rgb(15 23 42 / .95); padding:14px 24px 22px; backdrop-filter:blur(18px); }
  .sd-scout-report-print { display:flex !important; width:100% !important; min-height:49px !important; align-items:center; justify-content:center; gap:8px; border:0 !important; border-radius:15px !important; background:#fff !important; color:#0f172a !important; padding:0 16px !important; clip-path:none !important; box-shadow:none !important; font:italic 950 11px/1 var(--font-display),Arial,sans-serif !important; letter-spacing:.1em; text-transform:uppercase; }
  .sd-scout-report-print svg { width:17px; }
  .sd-scout-report-footer p { margin:0; color:#64748b; font-size:7px; text-align:center; }
  @media print { .skip-link,.sd-scout-report-open,.sd-scout-report-footer { display:none !important; } .sd-scout-report-shell,.sd-scout-report-scroll { height:auto; overflow:visible; } .sd-scout-report-scroll { padding-bottom:24px; } }
`;

const formatStudyTime = (minutes: number) => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
};

const masteryPercent = (summary: ParentSummary) => {
  if (summary.masteryConcepts.length === 0) return null;
  const average =
    summary.masteryConcepts.reduce((sum, concept) => sum + concept.level, 0) /
    summary.masteryConcepts.length;
  return Math.round((Math.max(0, Math.min(4, average)) / 4) * 100);
};

export function ParentSummaryView({ summary }: { summary: ParentSummary }) {
  const expiresLabel = new Date(summary.expiresAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const weekStartLabel = new Date(summary.weekStartIso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const mastery = masteryPercent(summary);
  const insight = summary.progressNotes[0];

  return (
    <ScreenDesignViewport className="sd-scout-report sd-public-share-screen">
      <style>{REPORT_STYLES}</style>
      <main id="main-content" className="sd-scout-report-shell">
        <header className="sd-scout-report-header">
          <div className="sd-scout-report-kicker-row">
            <span className="sd-scout-report-kicker">Academic report</span>
            <a
              href="#report-details"
              className="sd-scout-report-open"
              aria-label="Open shared report section"
            >
              <Share2 aria-hidden="true" />
            </a>
          </div>
          <div className="sd-scout-report-title-row">
            <div>
              <h1>Shared progress report</h1>
              <p>Student-approved weekly snapshot</p>
            </div>
            <div className="sd-scout-report-week">
              <span>Week from</span>
              <strong>{weekStartLabel}</strong>
            </div>
          </div>
        </header>

        <div className="sd-scout-report-scroll">
          <section className="sd-scout-report-stats" aria-label="Report summary">
            <StatCard
              label="Sessions"
              value={String(summary.completedThisWeek).padStart(2, "0")}
              detail="Work completed"
            />
            <StatCard
              label="Mastery"
              value={mastery === null ? "—" : `${mastery}%`}
              detail="Concept confidence"
              tone="blue"
            />
            <StatCard
              label="Study time"
              value={formatStudyTime(summary.studyMinutesThisWeek)}
              detail="This week"
            />
          </section>

          <section id="report-details" className="sd-scout-report-section">
            <h2>Tutor insights</h2>
            <div className="sd-scout-report-insight">
              <DianaMascotMark className="sd-scout-report-mascot" decorative />
              <div>
                <p>
                  {insight?.noteText ??
                    "This private report includes the student-approved activity and confidence summary for the current week."}
                </p>
                <strong>
                  {insight ? `Shared by ${insight.authorName}` : "Scoped report summary"}
                </strong>
              </div>
            </div>
          </section>

          <section className="sd-scout-report-section">
            <h2>Recent achievements</h2>
            <div className="sd-scout-report-achievements">
              <Achievement
                icon={<CheckCircle2 aria-hidden="true" />}
                title="Completed work"
                detail="Student activity this week"
                value={`${summary.completedThisWeek} items`}
              />
              <Achievement
                icon={<CalendarClock aria-hidden="true" />}
                title="Upcoming plan"
                detail="Next seven days"
                value={`${summary.upcomingNext7Days} items`}
                tone="blue"
              />
            </div>
          </section>

          {summary.masteryConcepts.length > 0 ? (
            <section className="sd-scout-report-section">
              <h2>Concept confidence</h2>
              <ul className="sd-scout-report-confidence">
                {summary.masteryConcepts.map((concept) => (
                  <li key={concept.name}>
                    <span>{concept.name}</span>
                    <span>{concept.level.toFixed(0)} of 4</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="sd-scout-report-achievement" data-tone="blue">
            <span><BrainCircuit aria-hidden="true" /></span>
            <div>
              <h3>Private by design</h3>
              <p>Only approved aggregate report fields</p>
            </div>
            <strong>Expires {expiresLabel}</strong>
          </section>
        </div>

        <footer className="sd-scout-report-footer">
          <button className="sd-scout-report-print" type="button" onClick={() => window.print()}>
            <Printer aria-hidden="true" />
            Print report
          </button>
          <p>Printing uses only the report already loaded through this private link.</p>
        </footer>
      </main>
    </ScreenDesignViewport>
  );
}

function StatCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "blue";
}) {
  return (
    <div className="sd-scout-report-stat" data-tone={tone}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function Achievement({
  icon,
  title,
  detail,
  value,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  value: string;
  tone?: "blue";
}) {
  return (
    <article className="sd-scout-report-achievement" data-tone={tone}>
      <span>{icon}</span>
      <div>
        <h3>{title}</h3>
        <p>{detail}</p>
      </div>
      <strong>{value}</strong>
    </article>
  );
}
