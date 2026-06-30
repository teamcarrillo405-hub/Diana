import Link from "next/link";
import { ArrowRight, ArrowUpRight, BarChart3, BookOpen, LineChart, Sparkles, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fetchCanvasCourseScores, fetchCanvasGrades } from "@/lib/lms/canvas";
import { gradeInsights, type GradeInsights } from "@/lib/grades/insights";
import { AppTopNav } from "../app-top-nav";

export const dynamic = "force-dynamic";

const SF = "var(--font-display)";
const BODY = "var(--font-body)";

type CanvasConfig = { base_url: string; token: string };

const gradePreviewSignals = [
  {
    course: "Biology",
    score: 84,
    tone: "cyan" as const,
    accent: "var(--gl-cyan)",
    borderColor: "var(--gl-border-cyan)",
    bg: "var(--gl-cyan-10)",
    signal: "Lab concepts are the fastest lift.",
    nextMove: "Review the cell transport notes before the quiz check.",
    proof: "Recent quiz pattern + one open lab concept",
    bars: [82, 76, 84, 88],
  },
  {
    course: "English 9",
    score: 91,
    tone: "gold" as const,
    accent: "var(--gl-gold)",
    borderColor: "var(--gl-gold-28)",
    bg: "var(--gl-gold-10)",
    signal: "Strong base. Add one clean quote.",
    nextMove: "Finish the essay evidence pass after Biology.",
    proof: "Writing scores are stable; evidence is the lever",
    bars: [88, 92, 90, 91],
  },
  {
    course: "Algebra I",
    score: 87,
    tone: "pink" as const,
    accent: "#f25fb0",
    borderColor: "rgba(242,95,176,.28)",
    bg: "rgba(242,95,176,.08)",
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
      <div style={{ minHeight: "100vh", background: "var(--gl-bg-base)", color: "var(--gl-text-primary)" }}>
        <AppTopNav active="More" />
        <div style={{ maxWidth: "var(--layout-max-width)", margin: "0 auto", padding: "var(--space-17) var(--space-17) var(--space-24)", display: "grid", gap: "var(--space-17)" }}>
          <GradeHero />
          <DisconnectedGrades />
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
      <div style={{ minHeight: "100vh", background: "var(--gl-bg-base)", color: "var(--gl-text-primary)" }}>
        <AppTopNav active="More" />
        <div style={{ maxWidth: "var(--layout-max-width)", margin: "0 auto", padding: "var(--space-17) var(--space-17) var(--space-24)", display: "grid", gap: "var(--space-17)" }}>
          <GradeHero />
          <div style={{ borderRadius: "var(--radius-card)", border: "1px solid var(--gl-gold-28)", background: "var(--gl-gold-10)", padding: "var(--space-14)" }}>
            <p style={{ fontFamily: BODY, fontSize: "var(--text-14)", color: "var(--gl-text-secondary)", margin: 0 }}>
              Canvas did not answer just now. Your grades are safe. Try again in a bit, or check the connection in{" "}
              <Link href="/imports" style={{ color: "var(--gl-gold)", textDecoration: "underline" }}>
                Imports
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  const topRecovery = insights.recovery[0] ?? null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--gl-bg-base)", color: "var(--gl-text-primary)" }}>
      <AppTopNav active="More" />
      <style>{`
        .gr-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-9); }
        @media (max-width: 640px) { .gr-metrics { grid-template-columns: 1fr; } }
        .gr-top { display: grid; gap: var(--space-9); }
        @media (min-width: 1024px) { .gr-top { grid-template-columns: 1fr 1fr; } }
        .gr-courses { display: grid; gap: var(--space-9); grid-template-columns: 1fr 1fr; }
        @media (max-width: 640px) { .gr-courses { grid-template-columns: 1fr; } }
      `}</style>
      <div style={{ maxWidth: "var(--layout-max-width)", margin: "0 auto", padding: "var(--space-17) var(--space-17) var(--space-24)", display: "grid", gap: "var(--space-17)" }}>
        <GradeHero />

        {/* Metrics */}
        <div className="gr-metrics">
          {[
            { label: "Classes", value: insights.courses.length, detail: "from Canvas" },
            { label: "Wins", value: insights.wins.length, detail: "already working" },
            { label: "Moves", value: insights.recovery.length, detail: "can help most" },
          ].map((m) => (
            <div key={m.label} style={{ borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", padding: "var(--space-12)" }}>
              <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-text-muted)", margin: "0 0 var(--space-4)" }}>{m.label}</p>
              <p style={{ fontFamily: SF, fontWeight: "var(--weight-800)", fontSize: "var(--text-36)", lineHeight: 1, color: "var(--gl-text-primary)", margin: "0 0 var(--space-2)" }}>{m.value}</p>
              <p style={{ fontFamily: BODY, fontSize: "var(--text-12)", color: "var(--gl-text-muted)", margin: 0 }}>{m.detail}</p>
            </div>
          ))}
        </div>

        {/* Top panels */}
        <div className="gr-top">
          {topRecovery && (
            <div style={{ borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-cyan)", background: "var(--gl-cyan-10)", padding: "var(--space-14)", display: "grid", gap: "var(--space-8)" }}>
              <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-cyan)", margin: 0, display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <Target size={13} />
                Best grade move
              </p>
              <h2 style={{ fontFamily: SF, fontWeight: "var(--weight-800)", fontSize: "var(--text-28)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: 0 }}>{topRecovery.title}</h2>
              <p style={{ fontFamily: BODY, fontSize: "var(--text-13)", color: "var(--gl-text-muted)", margin: 0 }}>{topRecovery.courseName}</p>
              <p style={{ fontFamily: BODY, fontSize: "var(--text-14)", lineHeight: "var(--leading-body)", color: "var(--gl-text-secondary)", margin: 0 }}>{topRecovery.reason}</p>
            </div>
          )}
          {insights.wins.length > 0 && (
            <div style={{ borderRadius: "var(--radius-card)", border: "1px solid var(--gl-gold-28)", background: "var(--gl-gold-10)", padding: "var(--space-14)", display: "grid", gap: "var(--space-8)" }}>
              <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-gold)", margin: 0, display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <Sparkles size={13} />
                Already going well
              </p>
              <ul style={{ display: "grid", gap: "var(--space-5)", margin: 0, padding: 0, listStyle: "none" }}>
                {insights.wins.map((win) => (
                  <li key={win} style={{ fontFamily: BODY, fontSize: "var(--text-14)", color: "var(--gl-text-secondary)", paddingLeft: "var(--space-8)", borderLeft: "2px solid var(--gl-gold-28)" }}>{win}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Recovery moves */}
        {insights.recovery.length > 0 && (
          <section style={{ display: "grid", gap: "var(--space-9)" }}>
            <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-text-muted)", margin: 0, display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <Target size={13} />
              Moves that help most
            </p>
            <ol style={{ display: "grid", gap: "var(--space-4)", margin: 0, padding: 0, listStyle: "none" }}>
              {insights.recovery.map((move) => (
                <li key={`${move.courseName}-${move.title}`} style={{ borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", padding: "var(--space-10) var(--space-12)" }}>
                  <p style={{ fontFamily: BODY, fontWeight: "var(--weight-700)", fontSize: "var(--text-14)", color: "var(--gl-text-primary)", margin: 0 }}>
                    {move.title} <span style={{ fontWeight: 400, color: "var(--gl-text-muted)" }}>/ {move.courseName}</span>
                  </p>
                  <p style={{ fontFamily: BODY, fontSize: "var(--text-12)", color: "var(--gl-text-muted)", margin: "var(--space-2) 0 0" }}>{move.reason}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* By class */}
        <section style={{ display: "grid", gap: "var(--space-9)" }}>
          <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-text-muted)", margin: 0 }}>By class</p>
          <div className="gr-courses">
            {insights.courses.map((course) => (
              <div key={course.courseId} style={{ borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", padding: "var(--space-12)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-6)", marginBottom: "var(--space-6)" }}>
                  <p style={{ fontFamily: BODY, fontWeight: "var(--weight-700)", fontSize: "var(--text-14)", color: "var(--gl-text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{course.courseName}</p>
                  {course.currentScorePct != null && (
                    <span style={{ flexShrink: 0, borderRadius: "var(--radius-pill)", border: "1px solid var(--gl-border-neutral)", padding: "2px var(--space-8)", fontFamily: SF, fontWeight: "var(--weight-800)", fontSize: "var(--text-14)", color: "var(--gl-cyan)" }}>
                      {Math.round(course.currentScorePct)}%
                    </span>
                  )}
                </div>
                <p style={{ fontFamily: BODY, fontSize: "var(--text-12)", lineHeight: "var(--leading-body)", color: "var(--gl-text-muted)", margin: 0 }}>
                  {course.gradedCount} graded
                  {course.notTurnedInCount > 0 && <> / {course.notTurnedInCount} still open</>}
                  {course.trend === "rising" && <> / trending up <ArrowUpRight size={11} style={{ display: "inline" }} /></>}
                  {course.trend === "steady" && <> / holding steady</>}
                  {course.trend === "settling" && <> / recent scores dipped, one good turn-in can reset it</>}
                </p>
              </div>
            ))}
            {insights.courses.length === 0 && <GradeSignalPreview mode="connected-empty" />}
          </div>
        </section>

        <p style={{ fontFamily: BODY, fontSize: "var(--text-12)", color: "var(--gl-text-muted)", margin: 0 }}>
          Read-only and private: Diana pulls your own scores from Canvas to suggest next moves. Nothing here is shared, ranked, or sent anywhere.
        </p>
      </div>
    </div>
  );
}

function GradeHero() {
  return (
    <header style={{ display: "grid", gap: "var(--space-8)" }}>
      <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "#f25fb0", margin: 0, display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <BarChart3 size={13} aria-hidden="true" />
        Grade signal
      </p>
      <h1 style={{ fontFamily: SF, fontWeight: "var(--weight-800)", fontSize: "var(--text-50)", lineHeight: "var(--leading-tight)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: 0, maxWidth: "22ch" }}>
        Scores should point to the next move.
      </h1>
      <p style={{ fontFamily: BODY, fontSize: "var(--text-16)", lineHeight: "var(--leading-body)", color: "var(--gl-text-secondary)", maxWidth: "44ch", margin: 0 }}>
        Not a scoreboard. Diana reads Canvas grades and finds the move that helps most.
      </p>
    </header>
  );
}

function DisconnectedGrades() {
  return (
    <div style={{ display: "grid", gap: "var(--space-17)" }}>
      <div style={{ borderRadius: "var(--radius-card)", border: "1px dashed var(--gl-border-neutral)", padding: "var(--space-20)", display: "grid", gap: "var(--space-8)", textAlign: "center" }}>
        <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-gold)", margin: 0 }}>No grade source</p>
        <p style={{ fontFamily: SF, fontWeight: "var(--weight-800)", fontSize: "var(--text-28)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: 0 }}>Connect Canvas when you are ready.</p>
        <p style={{ fontFamily: BODY, fontSize: "var(--text-14)", color: "var(--gl-text-secondary)", margin: 0 }}>Diana turns scores into one clear move. It does not rank, shame, or turn grades into a scoreboard.</p>
        <div>
          <Link
            href="/imports"
            style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-5)", padding: "var(--space-9) var(--space-14)", borderRadius: "var(--radius-pill)", background: "var(--gl-cyan)", color: "#04080f", fontFamily: BODY, fontWeight: "var(--weight-700)", fontSize: "var(--text-13)", textDecoration: "none" }}
          >
            Connect Canvas
          </Link>
        </div>
      </div>
      <GradeSignalPreview mode="disconnected" />
    </div>
  );
}

function GradeSignalPreview({ mode }: { mode: "disconnected" | "connected-empty" }) {
  return (
    <section style={{ display: "grid", gap: "var(--space-14)" }}>
      <div style={{ display: "grid", gap: "var(--space-8)" }}>
        <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "#f25fb0", margin: 0, display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <LineChart size={13} />
          Grade signal preview
        </p>
        <h2 style={{ fontFamily: SF, fontWeight: "var(--weight-800)", fontSize: "var(--text-36)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: 0 }}>
          {mode === "disconnected" ? "What Diana will watch for" : "No Canvas grades yet"}
        </h2>
        <p style={{ fontFamily: BODY, fontSize: "var(--text-14)", color: "var(--gl-text-secondary)", margin: 0 }}>
          The goal is not more data on screen. The goal is the one class move that can change the week.
        </p>
      </div>

      <div style={{ borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-cyan)", background: "var(--gl-cyan-10)", padding: "var(--space-14)", display: "grid", gap: "var(--space-8)" }}>
        <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-cyan)", margin: 0, display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <Target size={13} />
          Diana pick
        </p>
        <h3 style={{ fontFamily: SF, fontWeight: "var(--weight-800)", fontSize: "var(--text-28)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: 0 }}>Biology first, then English evidence.</h3>
        <p style={{ fontFamily: BODY, fontSize: "var(--text-14)", color: "var(--gl-text-secondary)", margin: 0 }}>
          Biology has the best score movement from a short study block. English stays strong with one quote pass.
        </p>
        <Link
          href="/assignments"
          style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-5)", padding: "var(--space-9) var(--space-14)", borderRadius: "var(--radius-pill)", background: "var(--gl-cyan)", color: "#04080f", fontFamily: BODY, fontWeight: "var(--weight-700)", fontSize: "var(--text-13)", textDecoration: "none", width: "fit-content" }}
        >
          Open next moves <ArrowRight size={13} />
        </Link>
      </div>

      <div style={{ display: "grid", gap: "var(--space-9)" }}>
        {gradePreviewSignals.map((signal) => (
          <GradePreviewCard key={signal.course} signal={signal} />
        ))}
      </div>
    </section>
  );
}

function GradePreviewCard({ signal }: { signal: (typeof gradePreviewSignals)[number] }) {
  return (
    <article style={{ borderRadius: "var(--radius-card)", border: `1px solid ${signal.borderColor}`, background: signal.bg, padding: "var(--space-14)", display: "grid", gap: "var(--space-9)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-8)" }}>
        <div>
          <p style={{ fontFamily: BODY, fontSize: "var(--text-10)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-12)", textTransform: "uppercase", color: "var(--gl-text-muted)", margin: "0 0 var(--space-2)" }}>Class signal</p>
          <strong style={{ fontFamily: SF, fontWeight: "var(--weight-800)", fontSize: "var(--text-22)", textTransform: "uppercase", color: "var(--gl-text-primary)" }}>{signal.course}</strong>
        </div>
        <span style={{ fontFamily: SF, fontWeight: "var(--weight-800)", fontSize: "var(--text-28)", color: signal.accent }}>{signal.score}%</span>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-3)", height: 40 }} aria-hidden="true">
        {signal.bars.map((bar, i) => (
          <div key={i} style={{ flex: 1, height: `${bar}%`, borderRadius: 2, background: signal.accent, opacity: 0.6 }} />
        ))}
      </div>

      <p style={{ fontFamily: BODY, fontWeight: "var(--weight-700)", fontSize: "var(--text-14)", color: "var(--gl-text-primary)", margin: 0 }}>{signal.signal}</p>
      <div style={{ display: "grid", gap: "var(--space-4)", borderTop: "1px solid var(--gl-border-neutral)", paddingTop: "var(--space-8)" }}>
        <p style={{ fontFamily: BODY, fontSize: "var(--text-10)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-12)", textTransform: "uppercase", color: "var(--gl-text-muted)", margin: 0, display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <BookOpen size={11} /> Next move
        </p>
        <p style={{ fontFamily: BODY, fontSize: "var(--text-13)", color: "var(--gl-text-secondary)", margin: 0 }}>{signal.nextMove}</p>
      </div>
      <small style={{ fontFamily: BODY, fontSize: "var(--text-11)", color: "var(--gl-text-muted)", margin: 0 }}>{signal.proof}</small>
    </article>
  );
}
