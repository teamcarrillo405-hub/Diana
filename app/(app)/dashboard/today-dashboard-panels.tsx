import type { CSSProperties } from "react";
import { Award, CheckCircle2, Clock3, Play, Send, Sparkles } from "lucide-react";
import Link from "next/link";

import type {
  LobbyAchievement,
  LobbyDeadlineItem,
  LobbyPlanItem,
  LobbyStudyProgress,
  LobbySubjectOverview,
} from "@/lib/dashboard/lobby-view";

const toneColors = {
  violet: "#8b67ff",
  blue: "#5d9bff",
  mint: "#45d698",
  amber: "#efb44c",
} as const;

function minutesLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining === 0 ? `${hours} hr` : `${hours} hr ${remaining} min`;
}

export function StudyProgressCard({
  progress,
}: {
  progress: LobbyStudyProgress;
}) {
  const ringStyle = { "--study-progress": `${progress.percent}%` } as CSSProperties;

  return (
    <section className="today-study-progress-card today-dashboard-panel" aria-labelledby="study-progress-title">
      <header className="today-dashboard-panel-heading">
        <div>
          <p>Weekly goal</p>
          <h2 id="study-progress-title">Study Progress</h2>
        </div>
        <span>{progress.completedAssignments} of {progress.totalAssignments || 0}</span>
      </header>
      <div className="today-study-progress-main">
        <div className="today-study-progress-ring" style={ringStyle} role="img" aria-label={`${progress.percent}% of this week's assignments complete`}>
          <div>
            <strong>{progress.percent}%</strong>
            <span>complete</span>
          </div>
        </div>
        <div className="today-study-progress-facts">
          <strong>{progress.completedAssignments} assignments</strong>
          <span>finished this week</span>
          <strong>{minutesLabel(progress.completedMinutes)}</strong>
          <span>of {minutesLabel(progress.plannedMinutes)} planned</span>
        </div>
      </div>
      <div className="today-study-progress-chart" role="img" aria-label="Planned study time by day, with completed time highlighted">
        {progress.days.map((day) => (
          <div className="today-study-progress-day" key={day.label}>
            <div className="today-study-progress-bar" style={{ "--planned-height": `${Math.max(8, day.plannedPercent)}%`, "--completed-height": `${day.completedPercent}%` } as CSSProperties}>
              <span />
            </div>
            <span>{day.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TodaysPlanCard({
  items,
}: {
  items: readonly LobbyPlanItem[];
}) {
  return (
    <section className="today-plan-card today-dashboard-panel" aria-labelledby="today-plan-title">
      <header className="today-dashboard-panel-heading">
        <div>
          <p>Just for today</p>
          <h2 id="today-plan-title">Today&apos;s Plan</h2>
        </div>
        <Clock3 size={19} aria-hidden="true" />
      </header>
      {items.length > 0 ? (
        <ol className="today-plan-list">
          {items.map((item) => (
            <li key={item.id} className={item.isPriority ? "today-plan-item is-priority" : "today-plan-item"}>
              <span className="today-plan-marker" aria-hidden="true" />
              <div className="today-plan-copy">
                <strong>{item.title}</strong>
                <span>{item.className} · {item.estimateLabel}</span>
              </div>
              {item.isPriority ? (
                <Link href={item.href} className="today-plan-start" aria-label={`Start ${item.title}`}>
                  <Play size={15} fill="currentColor" aria-hidden="true" />
                  <span>Start</span>
                </Link>
              ) : (
                <span className="today-plan-due">{item.dueLabel}</span>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <div className="today-panel-empty">
          <CheckCircle2 size={24} aria-hidden="true" />
          <p>Nothing is scheduled for today.</p>
          <Link href="/assignments">View all work</Link>
        </div>
      )}
    </section>
  );
}

export function UpcomingDeadlinesCard({
  items,
}: {
  items: readonly LobbyDeadlineItem[];
}) {
  return (
    <section className="today-deadlines-card today-dashboard-panel" aria-labelledby="upcoming-deadlines-title">
      <header className="today-dashboard-panel-heading">
        <div>
          <p>Next seven days</p>
          <h2 id="upcoming-deadlines-title">Upcoming due dates</h2>
        </div>
        <Link href="/assignments" className="today-panel-link">All work</Link>
      </header>
      {items.length > 0 ? (
        <ul className="today-deadlines-list">
          {items.map((item) => (
            <li key={`${item.kind}-${item.id}`}>
              <Link href={item.href} className="today-deadline-item">
                <span className="today-deadline-dot" style={{ backgroundColor: toneColors[item.tone] }} aria-hidden="true" />
                <span className="today-deadline-copy">
                  <strong>{item.title}</strong>
                  <span>{item.className}</span>
                </span>
                <span className={`today-deadline-label is-${item.kind}`}>{item.dueLabel}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="today-panel-empty">
          <CheckCircle2 size={24} aria-hidden="true" />
          <p>No due dates in the next seven days.</p>
        </div>
      )}
    </section>
  );
}

export function SubjectOverviewCard({
  overview,
}: {
  overview: LobbySubjectOverview;
}) {
  const segments = overview.subjects.length > 0
    ? overview.subjects.reduce<{ value: string[]; cursor: number }>((result, subject) => {
      const start = result.cursor;
      const end = start + subject.share;
      result.value.push(`${toneColors[subject.color]} ${start}% ${end}%`);
      return { value: result.value, cursor: end };
    }, { value: [], cursor: 0 }).value.join(", ")
    : "rgb(255 255 255 / 0.18) 0 100%";

  return (
    <section className="today-subject-overview-card today-dashboard-panel" aria-labelledby="subject-overview-title">
      <header className="today-dashboard-panel-heading">
        <div>
          <p>This week</p>
          <h2 id="subject-overview-title">Subject Overview</h2>
        </div>
      </header>
      {overview.subjects.length > 0 ? (
        <div className="today-subject-overview-content">
          <div className="today-subject-donut" style={{ background: `conic-gradient(${segments})` }} role="img" aria-label={`${minutesLabel(overview.totalMinutes)} of planned work across subjects`}>
            <div>
              <strong>{minutesLabel(overview.totalMinutes)}</strong>
              <span>planned</span>
            </div>
          </div>
          <ul className="today-subject-legend">
            {overview.subjects.map((subject) => (
              <li key={subject.name}>
                <span style={{ backgroundColor: toneColors[subject.color] }} aria-hidden="true" />
                <strong>{subject.name}</strong>
                <small>{subject.share}%</small>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="today-panel-empty">
          <Sparkles size={24} aria-hidden="true" />
          <p>Add assignments with an estimate to see your subject mix.</p>
        </div>
      )}
    </section>
  );
}

function achievementIcon(key: LobbyAchievement["key"]) {
  if (key === "submitted") return Send;
  if (key === "planned_time") return CheckCircle2;
  return Award;
}

export function AchievementsCard({
  achievements,
}: {
  achievements: readonly LobbyAchievement[];
}) {
  return (
    <section className="today-achievements-card today-dashboard-panel" aria-labelledby="achievements-title">
      <header className="today-dashboard-panel-heading">
        <div>
          <p>Milestones</p>
          <h2 id="achievements-title">Achievements</h2>
        </div>
      </header>
      <ul className="today-achievements-list">
        {achievements.map((achievement) => {
          const Icon = achievementIcon(achievement.key);
          return (
            <li key={achievement.key} data-tone={achievement.tone}>
              <span className="today-achievement-icon" aria-hidden="true"><Icon size={19} /></span>
              <span className="today-achievement-copy">
                <strong>{achievement.label}</strong>
                <small>{achievement.detail}</small>
              </span>
              <strong className="today-achievement-value">{achievement.key === "planned_time" ? minutesLabel(achievement.value) : achievement.value}</strong>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
