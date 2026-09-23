"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type DailyInsightPoint = {
  date: string;
  label: string;
  focusMinutes: number;
  workEvents: number;
  activityEvents: number;
};

export type InsightEvidenceLink = {
  href: string;
  title: string;
  detail: string;
  primary: boolean;
};

type Metric = "focus" | "work" | "activity";
type Range = 7 | 28;

type Props = {
  days: DailyInsightPoint[];
  evidenceMix: number;
  trendLabel: string;
  completedCount: number;
  assignmentCount: number;
  evidenceLinks: InsightEvidenceLink[];
};

const METRICS: ReadonlyArray<{ id: Metric; label: string }> = [
  { id: "focus", label: "Focus" },
  { id: "work", label: "Work" },
  { id: "activity", label: "Activity" },
];

export function InsightsClient({
  days,
  evidenceMix,
  trendLabel,
  completedCount,
  assignmentCount,
  evidenceLinks,
}: Props) {
  const [range, setRange] = useState<Range>(7);
  const [metric, setMetric] = useState<Metric>("focus");
  const visiblePoints = useMemo(
    () => range === 7 ? days.slice(-7) : aggregateWeeks(days),
    [days, range],
  );
  const values = visiblePoints.map((point) => valueFor(point, metric));
  const maximum = Math.max(1, ...values);
  const total = values.reduce((sum, value) => sum + value, 0);
  const peak = Math.max(...values, 0);
  const trajectory = trajectoryPoints(values, maximum);
  const metricLabel = METRICS.find((entry) => entry.id === metric)?.label ?? "Activity";

  return (
    <main className="sd-insights-client">
      <div className="sd-insights-controls">
        <div className="sd-insights-control-group" aria-label="Insight range">
          {([7, 28] as const).map((option) => (
            <button type="button" aria-pressed={range === option} onClick={() => setRange(option)} key={option}>{option} days</button>
          ))}
        </div>
        <div className="sd-insights-control-group" aria-label="Insight metric">
          {METRICS.map((option) => (
            <button type="button" aria-pressed={metric === option.id} onClick={() => setMetric(option.id)} key={option.id}>{option.label}</button>
          ))}
        </div>
      </div>

      <section className="sd-insights-panel" aria-label={`${metricLabel} chart for ${range} days`}>
        <h2>{metricLabel} evidence ({range} days)</h2>
        <div className="sd-insights-chart">
          {visiblePoints.map((point) => {
            const value = valueFor(point, metric);
            return (
              <div className="sd-insights-bar" data-peak={value > 0 && value === peak || undefined} key={point.date}>
                <div className="sd-insights-bar-track" title={`${point.label}: ${value}`}><i style={{ "--bar-height": `${Math.round((value / maximum) * 100)}%` } as React.CSSProperties} /></div>
                <small>{point.label}</small>
              </div>
            );
          })}
        </div>
        <div className="sd-insights-chart-summary">
          <strong>{formatTotal(total, metric)}</strong>
          <p>{total === 0 ? "A quiet period so far. Evidence will appear after saved work or activity." : `Evidence activity: ${trendLabel}`}</p>
        </div>
      </section>

      <section className="sd-insights-split">
        <div className="sd-insights-panel sd-insights-score">
          <h2>Evidence mix</h2>
          <div className="sd-insights-meter" style={{ "--meter": `${evidenceMix}%` } as React.CSSProperties} aria-label={`${evidenceMix}% activity mix from saved evidence`}>
            <div className="sd-insights-meter-inner"><strong>{evidenceMix}</strong><span>Evidence</span></div>
          </div>
          <p>Active days, focus minutes, and submitted work. Not a grade.</p>
        </div>
        <div className="sd-insights-panel sd-insights-trajectory">
          <h2>Learning trajectory</h2>
          <svg viewBox="0 0 120 60" role="img" aria-label={`${metricLabel} trajectory`}>
            <polyline points={trajectory} />
            {trajectoryLastPoint(trajectory) ? <circle cx={trajectoryLastPoint(trajectory)?.[0]} cy={trajectoryLastPoint(trajectory)?.[1]} r="3" /> : null}
          </svg>
          <span className="sd-insights-trend">{completedCount} of {assignmentCount} submitted or graded</span>
          <p>Evidence activity: {trendLabel}</p>
        </div>
      </section>

      <section className="sd-insights-section">
        <h2>Underlying evidence</h2>
        <div className="sd-insights-evidence">
          {evidenceLinks.map((evidence, index) => (
            <Link href={evidence.href} aria-label={evidence.primary ? "Open insight detail" : `Open ${evidence.title}`} key={`${evidence.href}-${index}`}>
              <span><strong>{evidence.title}</strong><small>{evidence.detail}</small></span><b>Open</b>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function aggregateWeeks(days: DailyInsightPoint[]): DailyInsightPoint[] {
  const recent = days.slice(-28);
  return [0, 1, 2, 3].map((week) => {
    const group = recent.slice(week * 7, week * 7 + 7);
    return {
      date: group[0]?.date ?? `week-${week + 1}`,
      label: `W${week + 1}`,
      focusMinutes: group.reduce((sum, day) => sum + day.focusMinutes, 0),
      workEvents: group.reduce((sum, day) => sum + day.workEvents, 0),
      activityEvents: group.reduce((sum, day) => sum + day.activityEvents, 0),
    };
  });
}

function valueFor(point: DailyInsightPoint, metric: Metric): number {
  if (metric === "focus") return point.focusMinutes;
  if (metric === "work") return point.workEvents;
  return point.activityEvents;
}

function formatTotal(total: number, metric: Metric): string {
  if (metric === "focus") return `${total} min`;
  return `${total} event${total === 1 ? "" : "s"}`;
}

function trajectoryPoints(values: number[], maximum: number): string {
  if (values.length === 0) return "";
  return values.map((value, index) => {
    const x = values.length === 1 ? 60 : Math.round((index / (values.length - 1)) * 112) + 4;
    const y = 54 - Math.round((Math.max(0, value) / maximum) * 46);
    return `${x},${y}`;
  }).join(" ");
}

function trajectoryLastPoint(value: string): [number, number] | null {
  const last = value.split(" ").at(-1)?.split(",").map(Number);
  return last?.length === 2 && last.every(Number.isFinite) ? [last[0], last[1]] : null;
}
