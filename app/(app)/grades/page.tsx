import Link from "next/link";
import { ArrowUpRight, BarChart3, Sparkles, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fetchCanvasCourseScores, fetchCanvasGrades } from "@/lib/lms/canvas";
import { gradeInsights, type GradeInsights } from "@/lib/grades/insights";
import { EmptyStateMark } from "@/components/empty-state-mark";

export const dynamic = "force-dynamic";

type CanvasConfig = { base_url: string; token: string };

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
      <div className="space-y-6">
        <Header />
        <div className="rounded-3xl border border-dashed border-border bg-surface-raised p-8 text-center">
          <EmptyStateMark />
          <p className="text-lg font-medium">No grade source connected yet.</p>
          <p className="mt-1 text-sm text-muted">
            Connect Canvas and Diana turns your scores into one clear next move — never a scoreboard.
          </p>
          <div className="mt-4">
            <Link
              href="/imports"
              className="touch-target inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong"
            >
              Connect Canvas
            </Link>
          </div>
        </div>
      </div>
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
      <div className="space-y-6">
        <Header />
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted">
          Canvas didn&apos;t answer just now. Your grades are safe — try again in a bit, or check the
          connection in <Link href="/imports" className="text-accent underline-offset-2 hover:underline">Imports</Link>.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header />

      {insights.wins.length > 0 && (
        <section className="space-y-2 rounded-2xl border border-ok/25 bg-ok/5 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles size={15} className="text-ok" /> Already going well
          </h2>
          <ul className="space-y-1 text-sm">
            {insights.wins.map((win) => (
              <li key={win}>{win}</li>
            ))}
          </ul>
        </section>
      )}

      {insights.recovery.length > 0 && (
        <section className="space-y-3 rounded-2xl border border-brand/25 bg-brand/5 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Target size={15} className="text-brand" /> Moves that help the most
          </h2>
          <ol className="space-y-2">
            {insights.recovery.map((move) => (
              <li key={`${move.courseName}-${move.title}`} className="rounded-xl border border-border bg-card p-3">
                <p className="text-sm font-medium">
                  {move.title} <span className="font-normal text-muted">· {move.courseName}</span>
                </p>
                <p className="mt-0.5 text-xs text-muted">{move.reason}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">By class</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {insights.courses.map((course) => (
            <div key={course.courseId} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-semibold">{course.courseName}</p>
                {course.currentScorePct != null && (
                  <span className="shrink-0 rounded-full bg-brand/10 px-2.5 py-0.5 text-sm font-semibold text-brand-strong dark:text-brand">
                    {Math.round(course.currentScorePct)}%
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-muted">
                {course.gradedCount} graded
                {course.notTurnedInCount > 0 && <> · {course.notTurnedInCount} still open</>}
                {course.trend === "rising" && <> · trending up <ArrowUpRight size={11} className="inline" /></>}
                {course.trend === "steady" && <> · holding steady</>}
                {course.trend === "settling" && <> · recent scores dipped — one good turn-in resets it</>}
              </p>
            </div>
          ))}
          {insights.courses.length === 0 && (
            <p className="text-sm text-muted">No graded work has come through from Canvas yet.</p>
          )}
        </div>
      </section>

      <p className="text-xs text-muted">
        Read-only and private: Diana pulls your own scores from Canvas to suggest next moves. Nothing
        here is shared, ranked, or sent anywhere.
      </p>
    </div>
  );
}

function Header() {
  return (
    <header className="space-y-1">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-strong dark:text-brand">
        <BarChart3 size={14} /> Grades
      </p>
      <h1 className="text-2xl font-bold">What your scores say to do next.</h1>
      <p className="text-sm text-muted">
        Not a scoreboard — Diana reads your Canvas grades and finds the one move that helps most.
      </p>
    </header>
  );
}
