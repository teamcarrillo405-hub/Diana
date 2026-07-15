import { Suspense } from "react";
import Link from "next/link";
import { Activity, FileText, Images, LockKeyhole, ShieldCheck, Trophy, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { computeXp } from "@/lib/gamification/xp";
import { weekOverWeek } from "@/lib/insights/week-over-week";
import { ProofConstellation, ProofReceiptVisual } from "@/components/student-portal/proof-receipt-visual";
import { AppTopNav } from "../app-top-nav";
import { DoneToday } from "../dashboard/done-today";
import { GradeMoveCard } from "../dashboard/grade-move-card";

const SF = "var(--font-display)";
const BODY = "var(--font-body)";

type AuthorshipRow = {
  id: string;
  actor: "student" | "diana" | "system";
  event_type: string;
  created_at: string;
};

type WinRow = {
  id: string | number;
  occurred_at: string;
  assignments?: { title?: string | null; kind?: string | null } | Array<{ title?: string | null; kind?: string | null }> | null;
};

type ArtifactRow = {
  id: string;
  title: string;
  artifact_type: string;
  source_anchor_count: number;
  created_at: string;
};

type PortfolioRow = {
  id: string;
  title: string;
  description: string | null;
  portfolio_items?: Array<{ id: string; title: string; reflection_text: string | null; created_at: string }> | null;
};

export default async function ProofPage({ searchParams }: { searchParams: Promise<{ celebrate?: string }> }) {
  const { celebrate } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--gl-bg-base)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: BODY, fontSize: "var(--text-14)", color: "var(--gl-text-muted)" }}>Sign in to see your proof folder.</p>
      </div>
    );
  }

  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const windowStartIso = new Date(now.getTime() - 120 * 86_400_000).toISOString();

  const [
    { data: authorship },
    { data: artifacts },
    { data: wins },
    { data: portfolios },
    { data: doneToday },
    { data: completionsWindow },
    { data: studyLogsWindow },
    { count: reviewsWindow },
    { count: notesWindow },
  ] = await Promise.all([
    supabase.from("authorship_log").select("id, actor, event_type, created_at").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(8),
    supabase.from("study_artifacts").select("id, title, artifact_type, source_anchor_count, created_at").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(4),
    supabase.from("task_signals").select("id, occurred_at, assignments(title, kind)").eq("owner_id", user.id).eq("kind", "completed").order("occurred_at", { ascending: false }).limit(5),
    supabase.from("portfolios").select("id, title, description, portfolio_items(id, title, reflection_text, created_at)").eq("owner_id", user.id).order("updated_at", { ascending: false }).limit(3),
    supabase.from("task_signals").select("id").eq("owner_id", user.id).eq("kind", "completed").gte("occurred_at", todayStart.toISOString()),
    supabase.from("task_signals").select("occurred_at").eq("owner_id", user.id).eq("kind", "completed").gte("occurred_at", windowStartIso),
    supabase.from("assignment_time_log").select("started_at").eq("owner_id", user.id).gte("started_at", windowStartIso),
    supabase.from("flashcard_reviews").select("id", { count: "exact", head: true }).eq("owner_id", user.id).gte("reviewed_at", windowStartIso),
    supabase.from("notes").select("id", { count: "exact", head: true }).eq("owner_id", user.id).gte("created_at", windowStartIso),
  ]);

  const completionDates = (completionsWindow ?? []).map((row) => row.occurred_at as string);
  const studyDayKeys = [...new Set((studyLogsWindow ?? []).map((row) => String(row.started_at).slice(0, 10)))];
  const xp = computeXp(
    { completionDates, studyDayKeys, flashcardReviews: reviewsWindow ?? 0, notesCreated: notesWindow ?? 0 },
    now,
  );
  const wow = weekOverWeek(completionDates, now);

  const receiptRows = (authorship ?? []) as AuthorshipRow[];
  const artifactRows = (artifacts ?? []) as ArtifactRow[];
  const winRows = (wins ?? []) as WinRow[];
  const portfolioRows = (portfolios ?? []) as PortfolioRow[];
  const portfolioItemCount = portfolioRows.reduce((sum, p) => sum + (p.portfolio_items?.length ?? 0), 0);
  const doneTodayCount = doneToday?.length ?? 0;

  const actorColor: Record<string, string> = {
    student: "var(--gl-cyan)",
    diana: "var(--gl-purple-light)",
    system: "var(--gl-text-muted)",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--gl-bg-base)", color: "var(--gl-text-primary)" }}>
      <AppTopNav active="More" />
      <style>{`
        .pf-stage { display: grid; gap: var(--space-13); }
        @media (min-width: 1024px) { .pf-stage { grid-template-columns: 0.74fr 1.26fr; } }
        .pf-receipt { display: grid; gap: var(--space-9); }
        @media (min-width: 1280px) { .pf-receipt { grid-template-columns: 1.1fr 0.9fr; } }
        .pf-mid { display: grid; gap: var(--space-9); }
        @media (min-width: 1280px) { .pf-mid { grid-template-columns: 1.1fr 0.9fr; } }
        .pf-bottom { display: grid; gap: var(--space-9); }
        @media (min-width: 1024px) { .pf-bottom { grid-template-columns: 1fr 1fr; } }
      `}</style>
      <div style={{ maxWidth: "var(--layout-max-width)", margin: "0 auto", padding: "var(--space-17) var(--space-17) var(--space-24)", display: "grid", gap: "var(--space-17)" }}>

        {celebrate === "latest" && winRows.length > 0 ? (
          <section className="sd-panel sd-panel-raised sd-celebration" aria-labelledby="milestone-title">
            <Trophy size={30} aria-hidden="true" />
            <div><p className="sd-kicker">Milestone recorded</p><h2 id="milestone-title">Done, with dignity</h2><p>{winTitle(winRows[0])} is now part of your private proof folder.</p></div>
            <Link href="/portfolio" className="sd-button">Add to portfolio</Link>
          </section>
        ) : null}

        {/* Hero */}
        <section className="pf-stage">
          <header style={{ display: "grid", gap: "var(--space-8)" }}>
            <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-green)", margin: 0, display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <ShieldCheck size={13} aria-hidden="true" />
              Proof Folder
            </p>
            <h1 style={{ fontFamily: SF, fontWeight: "var(--weight-800)", fontSize: "var(--text-50)", lineHeight: "var(--leading-tight)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: 0, maxWidth: "18ch" }}>
              Keep track of what is yours.
            </h1>
            <p style={{ fontFamily: BODY, fontSize: "var(--text-16)", lineHeight: "var(--leading-body)", color: "var(--gl-text-secondary)", maxWidth: "44ch", margin: 0 }}>
              Proof Folder collects rough thoughts, Diana help, source anchors, study artifacts, and wins so
              students can explain their work without giving away their voice.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-6)" }}>
              <Link
                href="/portfolio"
                style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-5)", padding: "var(--space-9) var(--space-14)", borderRadius: "var(--radius-pill)", background: "var(--gl-green)", color: "#06210f", fontFamily: BODY, fontWeight: "var(--weight-700)", fontSize: "var(--text-13)", textDecoration: "none" }}
              >
                Add work sample
                <Images size={15} />
              </Link>
              <Link
                href="/settings/ai-history"
                style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-5)", padding: "var(--space-9) var(--space-14)", borderRadius: "var(--radius-pill)", border: "1px solid var(--gl-border-neutral)", background: "transparent", color: "var(--gl-text-secondary)", fontFamily: BODY, fontWeight: "var(--weight-700)", fontSize: "var(--text-13)", textDecoration: "none" }}
              >
                View AI receipts
              </Link>
            </div>
          </header>

          <div className="pf-receipt">
            <ProofReceiptVisual receipts={receiptRows.length} artifacts={artifactRows.length} portfolioItems={portfolioItemCount} />
            <div style={{ borderRadius: "var(--radius-card)", border: "1px solid var(--gl-green-22)", background: "var(--gl-green-12)", padding: "var(--space-14)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
              <ProofConstellation points={winRows.length + portfolioItemCount} />
              <h2 style={{ fontFamily: SF, fontSize: "var(--text-22)", fontWeight: "var(--weight-800)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: 0 }}>
                Private proof grows quietly.
              </h2>
              <p style={{ fontFamily: BODY, fontSize: "var(--text-14)", lineHeight: "var(--leading-body)", color: "var(--gl-text-secondary)", margin: 0 }}>
                Every saved win becomes raw material for essays, teacher conversations, scholarships, and support plans.
              </p>
            </div>
          </div>
        </section>

        {/* Momentum: real XP, level, recent activity, and week-over-week */}
        <section style={{ display: "grid", gap: "var(--space-9)" }}>
          <style>{`.pf-momentum{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-9);}@media(max-width:760px){.pf-momentum{grid-template-columns:1fr;}}`}</style>
          <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-green)", margin: 0, display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <Zap size={13} />
            Momentum
          </p>
          <div className="pf-momentum">
            {/* XP + level */}
            <div style={{ borderRadius: "var(--radius-card)", border: "1px solid var(--gl-green-22)", background: "var(--gl-green-12)", padding: "var(--space-14)", display: "grid", gap: "var(--space-6)" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--space-6)" }}>
                <span style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-16)", textTransform: "uppercase", color: "var(--gl-text-muted)" }}>Level {xp.level}</span>
                <span style={{ fontFamily: BODY, fontSize: "var(--text-11)", color: "var(--gl-text-muted)" }}>{xp.totalXp.toLocaleString()} XP</span>
              </div>
              <div style={{ position: "relative", height: 8, borderRadius: 4, background: "var(--gl-green-22)", overflow: "hidden" }}>
                <span style={{ position: "absolute", inset: 0, width: `${xp.pctToNext}%`, background: "var(--gl-green)", borderRadius: 4 }} />
              </div>
              <p style={{ fontFamily: BODY, fontSize: "var(--text-12)", color: "var(--gl-text-secondary)", margin: 0 }}>
                {xp.xpForNextLevel - xp.xpIntoLevel} XP to level {xp.level + 1}
              </p>
            </div>
            {/* Neutral seven-day activity count */}
            <div style={{ borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", padding: "var(--space-14)", display: "grid", gap: "var(--space-4)", alignContent: "start" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-16)", textTransform: "uppercase", color: "var(--gl-gold)" }}>
                <Activity size={13} /> Recent activity
              </span>
              <p style={{ fontFamily: SF, fontWeight: "var(--weight-800)", fontSize: "var(--text-36)", lineHeight: 1, color: "var(--gl-text-primary)", margin: 0 }}>
                {xp.recentActiveDays} <span style={{ fontSize: "var(--text-14)", color: "var(--gl-text-muted)" }}>day{xp.recentActiveDays === 1 ? "" : "s"}</span>
              </p>
              <p style={{ fontFamily: BODY, fontSize: "var(--text-12)", color: "var(--gl-text-secondary)", margin: 0 }}>
                {xp.recentActiveDays === 0 ? "No recent activity yet. Start when you are ready." : "Days with study activity in the last week."}
              </p>
            </div>
            {/* Week over week */}
            <div style={{ borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", padding: "var(--space-14)", display: "grid", gap: "var(--space-4)", alignContent: "start" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-16)", textTransform: "uppercase", color: "var(--gl-cyan)" }}>
                {wow.direction === "down" ? <TrendingDown size={13} /> : <TrendingUp size={13} />} This week
              </span>
              <p style={{ fontFamily: SF, fontWeight: "var(--weight-800)", fontSize: "var(--text-36)", lineHeight: 1, color: "var(--gl-text-primary)", margin: 0 }}>
                {wow.thisWeek} <span style={{ fontSize: "var(--text-14)", color: "var(--gl-text-muted)" }}>vs {wow.lastWeek} last</span>
              </p>
              <p style={{ fontFamily: BODY, fontSize: "var(--text-12)", color: "var(--gl-text-secondary)", margin: 0 }}>{wow.label}</p>
            </div>
          </div>
        </section>

        {/* Today's proof — done count + grade move */}
        <section style={{ display: "grid", gap: "var(--space-9)" }}>
          <DoneToday count={doneTodayCount} />
          <Suspense fallback={null}>
            <GradeMoveCard />
          </Suspense>
        </section>

        {/* Authorship trail + sidebar */}
        <section className="pf-mid">
          <div style={{ borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", padding: "var(--space-14)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-8)", marginBottom: "var(--space-12)" }}>
              <h2 style={{ fontFamily: SF, fontSize: "var(--text-22)", fontWeight: "var(--weight-800)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: 0 }}>
                Recent authorship trail
              </h2>
              <span style={{ borderRadius: "var(--radius-pill)", border: "1px solid var(--gl-border-neutral)", padding: "var(--space-2) var(--space-8)", fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", color: "var(--gl-text-muted)", letterSpacing: "var(--tracking-12)", whiteSpace: "nowrap" }}>
                Student-owned
              </span>
            </div>
            <div style={{ display: "grid", gap: "var(--space-9)" }}>
              {receiptRows.length === 0 ? (
                <EmptyProofLine body="Use voice, study help, or assignment checks and Diana will start building receipts here." />
              ) : (
                receiptRows.map((row) => (
                  <div key={row.id} style={{ display: "grid", gridTemplateColumns: "7rem 1fr", gap: "var(--space-8)", paddingBottom: "var(--space-9)", borderBottom: "1px solid var(--gl-border-neutral)" }}>
                    <span style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: actorColor[row.actor] ?? "var(--gl-text-muted)" }}>
                      {row.actor}
                    </span>
                    <div>
                      <p style={{ fontFamily: BODY, fontWeight: "var(--weight-700)", fontSize: "var(--text-14)", color: "var(--gl-text-primary)", margin: 0 }}>{formatEvent(row.event_type)}</p>
                      <p style={{ fontFamily: BODY, fontSize: "var(--text-12)", color: "var(--gl-text-muted)", margin: "var(--space-2) 0 0" }}>{new Date(row.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <aside style={{ display: "grid", gap: "var(--space-9)", alignContent: "start" }}>
            <ProofColumn icon={FileText} title="What Diana can show" lines={[
              "Your original notes or voice capture",
              "The structure Diana helped create",
              "Rubric and source checks",
              "The final choices the student confirmed",
            ]} />
            <ProofColumn icon={LockKeyhole} title="What stays protected" lines={[
              "Private readiness details",
              "Unshared support notes",
              "Drafts until the student chooses to export",
            ]} />
          </aside>
        </section>

        {/* Wins + artifacts */}
        <section className="pf-bottom">
          <ProofList
            title="Recent wins"
            empty="Completed work will appear here as proof points for essays, conferences, and support conversations."
            items={winRows.map((win) => {
              const assignment = Array.isArray(win.assignments) ? win.assignments[0] : win.assignments;
              return { id: String(win.id), title: assignment?.title ?? "Completed schoolwork", meta: new Date(win.occurred_at).toLocaleDateString() };
            })}
          />
          <ProofList
            title="Source-backed study artifacts"
            empty="Study guides, practice sets, and cards with source anchors will appear here."
            items={artifactRows.map((a) => ({ id: a.id, title: a.title, meta: `${a.artifact_type.replace(/_/g, " ")} · ${a.source_anchor_count} sources` }))}
          />
        </section>
      </div>
    </div>
  );
}

function winTitle(win: WinRow): string {
  const assignment = Array.isArray(win.assignments) ? win.assignments[0] : win.assignments;
  return assignment?.title || "Completed work";
}

function ProofColumn({ icon: Icon, title, lines }: { icon: typeof FileText; title: string; lines: string[] }) {
  return (
    <div style={{ borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", padding: "var(--space-14)" }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-18)", fontWeight: "var(--weight-800)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: "0 0 var(--space-9)", display: "flex", alignItems: "center", gap: "var(--space-6)" }}>
        <Icon size={16} style={{ color: "var(--gl-green)" }} />
        {title}
      </h2>
      <ul style={{ display: "grid", gap: "var(--space-5)", padding: 0, margin: 0, listStyle: "none" }}>
        {lines.map((line) => (
          <li key={line} style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-14)", lineHeight: "var(--leading-body)", color: "var(--gl-text-muted)", paddingLeft: "var(--space-8)", borderLeft: "2px solid var(--gl-green-22)" }}>
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProofList({ title, items, empty }: { title: string; items: Array<{ id: string; title: string; meta: string }>; empty: string }) {
  return (
    <section style={{ borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", padding: "var(--space-14)" }}>
      <h2 style={{ fontFamily: SF, fontSize: "var(--text-22)", fontWeight: "var(--weight-800)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: "0 0 var(--space-10)" }}>
        {title}
      </h2>
      <div style={{ display: "grid", gap: "var(--space-6)" }}>
        {items.length === 0 ? (
          <EmptyProofLine body={empty} />
        ) : (
          items.map((item) => (
            <div key={item.id} style={{ borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-base)", padding: "var(--space-10) var(--space-12)" }}>
              <p style={{ fontFamily: BODY, fontWeight: "var(--weight-700)", fontSize: "var(--text-14)", color: "var(--gl-text-primary)", margin: 0 }}>{item.title}</p>
              <p style={{ fontFamily: BODY, fontSize: "var(--text-12)", color: "var(--gl-text-muted)", margin: "var(--space-2) 0 0" }}>{item.meta}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function EmptyProofLine({ body }: { body: string }) {
  return (
    <div style={{ borderRadius: "var(--radius-card)", border: "1px dashed var(--gl-border-neutral)", background: "transparent", padding: "var(--space-12)", fontFamily: BODY, fontSize: "var(--text-14)", lineHeight: "var(--leading-body)", color: "var(--gl-text-muted)" }}>
      {body}
    </div>
  );
}

function formatEvent(eventType: string) {
  return eventType.replace(/_/g, " ");
}
