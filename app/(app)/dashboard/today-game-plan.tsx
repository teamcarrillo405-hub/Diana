import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, Clock3, Search, Sparkles } from "lucide-react";

import { AppTopNav } from "../app-top-nav";

export type TodayClass = {
  id: string;
  name: string;
  activeCount: number;
  completionPercent: number;
  tone: "blue" | "pink" | "teal" | "amber";
};

export type TodayMetrics = {
  focusMinutes: number;
  activeTasks: number;
  completedTasks: number;
  classCount: number;
};

export type NextMove = {
  className: string | null;
  title: string;
  estMin: number;
};

const TONE_COLOR = {
  blue: "var(--diana-blue)",
  pink: "var(--diana-pink)",
  teal: "var(--diana-teal)",
  amber: "var(--diana-amber)",
};

export function TodayGamePlan({
  studentName,
  focusHref,
  nextMove,
  metrics,
  classes,
}: {
  studentName: string;
  focusHref: string;
  nextMove: NextMove | null;
  metrics: TodayMetrics;
  classes: TodayClass[];
}) {
  const firstName = studentName.trim().split(/\s+/)[0] || "there";

  return (
    <div className="sd-page">
      <AppTopNav active="Today" />
      <div className="sd-container sd-today-layout">
        <header className="sd-today-head">
          <div>
            <p className="sd-kicker">Welcome back, {firstName}</p>
            <h1 className="sd-title">Today&apos;s <span className="sd-title-accent">game plan</span></h1>
          </div>
          <Link href="/search" className="sd-nav-icon" aria-label="Search">
            <Search size={18} aria-hidden="true" />
          </Link>
        </header>

        <section className="sd-panel sd-panel-raised sd-coach-card" aria-labelledby="coach-note-title">
          <div className="sd-coach-icon" aria-hidden="true"><Sparkles size={22} /></div>
          <div>
            <p className="sd-kicker" id="coach-note-title">Coach Diana</p>
            <p className="sd-coach-copy">
              {nextMove
                ? `Your clearest next move is ${nextMove.title}. Start with ${nextMove.estMin} focused minutes, then check what changed.`
                : "Your board is clear. Add a task or choose a class to set the next useful move."}
            </p>
          </div>
          <Link href={focusHref} className="sd-button sd-button-primary">
            {nextMove ? "Start now" : "Add work"}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>

        <section className="sd-grid sd-grid-4" aria-label="Today summary">
          <Metric icon={<Clock3 size={16} />} label="Focus this week" value={`${metrics.focusMinutes}m`} tone="blue" />
          <Metric icon={<BookOpen size={16} />} label="Active classes" value={String(metrics.classCount)} tone="pink" />
          <Metric icon={<CalendarDays size={16} />} label="Open work" value={String(metrics.activeTasks)} tone="amber" />
          <Metric icon={<CheckCircle2 size={16} />} label="Finished this week" value={String(metrics.completedTasks)} tone="teal" />
        </section>

        <section className="sd-grid" aria-labelledby="active-classes-title">
          <div className="sd-section-head">
            <h2 className="sd-section-title" id="active-classes-title">Active classes</h2>
            <Link href="/classes">View all</Link>
          </div>
          {classes.length ? (
            <div className="sd-grid sd-grid-2">
              {classes.map((classItem) => {
                const tone = TONE_COLOR[classItem.tone];
                return (
                  <Link key={classItem.id} href={`/classes/${classItem.id}`} className="sd-panel sd-class-card" style={{ "--sd-class-tone": tone } as React.CSSProperties}>
                    <div className="sd-class-icon" aria-hidden="true"><BookOpen size={20} /></div>
                    <div className="sd-class-body">
                      <h3>{classItem.name}</h3>
                      <p>{classItem.activeCount ? `${classItem.activeCount} open ${classItem.activeCount === 1 ? "item" : "items"}` : "Ready for review"}</p>
                      <div className="sd-progress" aria-label={`${classItem.completionPercent}% complete`}>
                        <span style={{ width: `${classItem.completionPercent}%` }} />
                      </div>
                    </div>
                    <strong>{classItem.completionPercent}%</strong>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="sd-panel sd-panel-pad">
              <p className="sd-subtitle">Add your first class to connect assignments, notes, study tools, and progress.</p>
              <Link href="/classes" className="sd-button" style={{ marginTop: "1rem" }}>Add a class</Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Metric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: keyof typeof TONE_COLOR }) {
  return (
    <article className="sd-panel sd-metric" style={{ "--sd-metric-tone": TONE_COLOR[tone] } as React.CSSProperties}>
      <span className="sd-metric-icon" aria-hidden="true">{icon}</span>
      <span className="sd-metric-label">{label}</span>
      <strong className="sd-metric-value">{value}</strong>
    </article>
  );
}
