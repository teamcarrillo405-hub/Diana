import Link from "next/link";
import { ArrowRight, ArrowUpRight, BarChart3, BookOpen, LineChart, Sparkles, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fetchCanvasCourseScores, fetchCanvasGrades } from "@/lib/lms/canvas";
import { gradeInsights, type GradeInsights } from "@/lib/grades/insights";
import {
  NexusArcadeScene,
  NexusEmptyState,
  NexusKicker,
  NexusList,
  NexusMetric,
  NexusPageHeader,
  NexusPageShell,
  NexusPanel,
} from "@/components/nexus/nexus-ui";

export const dynamic = "force-dynamic";

type CanvasConfig = { base_url: string; token: string };

const gradePreviewSignals = [
  {
    course: "Biology",
    score: 84,
    tone: "cyan",
    signal: "Lab concepts are the fastest lift.",
    nextMove: "Review the cell transport notes before the quiz check.",
    proof: "Recent quiz pattern + one open lab concept",
    bars: [82, 76, 84, 88],
  },
  {
    course: "English 9",
    score: 91,
    tone: "gold",
    signal: "Strong base. Add one clean quote.",
    nextMove: "Finish the essay evidence pass after Biology.",
    proof: "Writing scores are stable; evidence is the lever",
    bars: [88, 92, 90, 91],
  },
  {
    course: "Algebra I",
    score: 87,
    tone: "pink",
    signal: "Keep the practice rhythm steady.",
    nextMove: "Do six graphing problems before the test prep set.",
    proof: "Practice scores predict the next assessment",
    bars: [81, 86, 83, 87],
  },
] as const;

export default async function GradesPage() {
  const supabase = await createClient();
  const { data: connections } = await supabase
    .from("lms_connections")
    .select("id, provider, config")
    .eq("provider", "canvas")
    .order("created_at", { ascending: false })
    .limit(1);

  const config = (connections?.[0]?.config ?? null) as CanvasConfig | null;

  if (!config?.base_url || !config?.token) {
    return (
      <NexusPageShell className="space-y-8">
        <Header />
        <DisconnectedGrades />
      </NexusPageShell>
    );
  }

  let insights: GradeInsights | null = null;
  let loadIssue = false;
  try {
    const [records, courseScores] = await Promise.all([
      fetchCanvasGrades(config),
      fetchCanvasCourseScores(config),
    ]);
    insights = gradeInsights(records, courseScores);
  } catch {
    loadIssue = true;
  }

  if (loadIssue || !insights) {
    return (
      <NexusPageShell className="space-y-8">
        <Header />
        <NexusPanel className="p-5" tone="gold">
          <p className="text-sm text-muted">
            Canvas did not answer just now. Your grades are safe. Try again in a bit, or check the connection in{" "}
            <Link href="/imports" className="text-accent underline underline-offset-2 decoration-accent/50 hover:decoration-accent">
              Imports
            </Link>
            .
          </p>
        </NexusPanel>
      </NexusPageShell>
    );
  }

  const topRecovery = insights.recovery[0] ?? null;

  return (
    <NexusPageShell className="space-y-8">
      <Header />

      <div className="nexus-grid">
        <NexusPanel className="grid gap-4 p-5 sm:grid-cols-3" tone="purple">
          <NexusMetric label="Classes" value={insights.courses.length} detail="from Canvas" tone="cyan" />
          <NexusMetric label="Wins" value={insights.wins.length} detail="already working" tone="gold" />
          <NexusMetric label="Moves" value={insights.recovery.length} detail="can help most" tone="pink" />
        </NexusPanel>

        {topRecovery ? (
          <NexusPanel className="p-5" tone="cyan">
            <NexusKicker>
              <Target size={14} />
              Best grade move
            </NexusKicker>
            <h2 className="mt-4 text-2xl font-black leading-tight">{topRecovery.title}</h2>
            <p className="mt-2 text-sm text-muted">{topRecovery.courseName}</p>
            <p className="mt-3 text-sm leading-6 text-muted">{topRecovery.reason}</p>
          </NexusPanel>
        ) : null}
      </div>

      {insights.wins.length > 0 && (
        <NexusPanel className="space-y-3 p-4" tone="gold">
          <NexusKicker>
            <Sparkles size={14} />
            Already going well
          </NexusKicker>
          <ul className="space-y-1 text-sm">
            {insights.wins.map((win) => (
              <li key={win}>{win}</li>
            ))}
          </ul>
        </NexusPanel>
      )}

      {insights.recovery.length > 0 && (
        <section className="space-y-3">
          <NexusKicker>
            <Target size={14} />
            Moves that help most
          </NexusKicker>
          <NexusList>
            <ol>
              {insights.recovery.map((move) => (
                <li key={`${move.courseName}-${move.title}`} className="px-4 py-4">
                  <p className="text-sm font-black">
                    {move.title} <span className="font-normal text-muted">/ {move.courseName}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted">{move.reason}</p>
                </li>
              ))}
            </ol>
          </NexusList>
        </section>
      )}

      <section className="space-y-3">
        <NexusKicker>By class</NexusKicker>
        <div className="nexus-grid">
          {insights.courses.map((course) => (
            <NexusPanel key={course.courseId} className="p-4" tone="blue">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-black">{course.courseName}</p>
                {course.currentScorePct != null && (
                  <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-sm font-black tabular-nums text-brand">
                    {Math.round(course.currentScorePct)}%
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs leading-5 text-muted">
                {course.gradedCount} graded
                {course.notTurnedInCount > 0 && <> / {course.notTurnedInCount} still open</>}
                {course.trend === "rising" && (
                  <>
                    {" "}
                    / trending up <ArrowUpRight size={11} className="inline" />
                  </>
                )}
                {course.trend === "steady" && <> / holding steady</>}
                {course.trend === "settling" && <> / recent scores dipped, one good turn-in can reset it</>}
              </p>
            </NexusPanel>
          ))}
          {insights.courses.length === 0 && (
            <GradeSignalPreview mode="connected-empty" />
          )}
        </div>
      </section>

      <p className="text-xs text-muted">
        Read-only and private: Diana pulls your own scores from Canvas to suggest next moves. Nothing here is shared,
        ranked, or sent anywhere.
      </p>
    </NexusPageShell>
  );
}

function DisconnectedGrades() {
  return (
    <div className="grades-empty-stack">
      <NexusEmptyState
        eyebrow="No grade source"
        title="Connect Canvas when you are ready."
        action={
          <Link href="/imports" className="nexus-button nexus-button-primary">
            Connect Canvas
          </Link>
        }
      >
        <p>Diana turns scores into one clear move. It does not rank, shame, or turn grades into a scoreboard.</p>
      </NexusEmptyState>

      <GradeSignalPreview mode="disconnected" />
    </div>
  );
}

function GradeSignalPreview({ mode }: { mode: "disconnected" | "connected-empty" }) {
  return (
    <section className="grades-signal-section">
      <div className="grades-section-head">
        <div>
          <NexusKicker tone="pink">
            <LineChart size={14} />
            Grade signal preview
          </NexusKicker>
          <h2>{mode === "disconnected" ? "What Diana will watch for" : "No Canvas grades yet"}</h2>
        </div>
        <p>
          The goal is not more data on screen. The goal is the one class move that can change the week.
        </p>
      </div>

      <div className="grades-signal-layout">
        <NexusPanel className="grades-priority-card" tone="cyan">
          <NexusKicker tone="cyan">
            <Target size={14} />
            Diana pick
          </NexusKicker>
          <h3>Biology first, then English evidence.</h3>
          <p>
            Biology has the best score movement from a short study block. English stays strong with one quote pass.
          </p>
          <Link href="/assignments" className="grades-priority-action">
            Open next moves <ArrowRight size={15} />
          </Link>
        </NexusPanel>

        <div className="grades-signal-list">
          {gradePreviewSignals.map((signal) => (
            <GradePreviewCard key={signal.course} signal={signal} />
          ))}
        </div>
      </div>
    </section>
  );
}

function GradePreviewCard({ signal }: { signal: (typeof gradePreviewSignals)[number] }) {
  return (
    <article className={`grades-signal-card nexus-tone-${signal.tone}`}>
      <div className="grades-card-top">
        <div>
          <span>Class signal</span>
          <strong>{signal.course}</strong>
        </div>
        <b>{signal.score}%</b>
      </div>

      <div className="grades-mini-bars" aria-hidden="true">
        {signal.bars.map((bar, index) => (
          <i key={`${signal.course}-${index}`} style={{ height: `${bar}%` }} />
        ))}
      </div>

      <p className="grades-signal-line">{signal.signal}</p>
      <div className="grades-next-move">
        <span>
          <BookOpen size={13} />
          Next move
        </span>
        <p>{signal.nextMove}</p>
      </div>
      <small>{signal.proof}</small>
    </article>
  );
}

function Header() {
  return (
    <NexusPageHeader
      eyebrow={
        <>
          <BarChart3 size={14} />
          Grade signal
        </>
      }
      title={<>Scores should point to the next move.</>}
      description="Not a scoreboard. Diana reads Canvas grades and finds the move that helps most."
      visual={<NexusArcadeScene />}
      tone="pink"
    />
  );
}
