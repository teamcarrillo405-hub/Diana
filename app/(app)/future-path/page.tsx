import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowRight, FileText, GraduationCap, Landmark, Map, ShieldCheck, Sparkles } from "lucide-react";
import type { ElementType } from "react";
import { createClient } from "@/lib/supabase/server";
import { loadProfile } from "@/lib/profile";
import { deriveFuturePath } from "@/lib/future-path/derive";
import { FutureMapVisual } from "@/components/student-portal/future-map-visual";
import { AppTopNav } from "../app-top-nav";
import { EveningPlanning } from "../dashboard/evening-planning";
import { QuestCarousel, type QuestItem } from "../dashboard/quest-carousel";
import { getEventIntentions } from "../dashboard/actions";
import { rankAssignments } from "@/lib/scoring/next-five-minutes";
import { formatDueAt } from "@/lib/format";
import { KIND_LABEL } from "@/lib/checklists/templates";

const SF = "var(--font-display)";
const BODY = "var(--font-body)";

export default async function FuturePathPage() {
  const supabase = await createClient();
  const profile = await loadProfile();
  const { data: { user } } = await supabase.auth.getUser();

  const now = new Date();
  const fourHoursAgoIso = new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString();
  const cookieStore = await cookies();
  const lastShownClassId = cookieStore.get("diana_last_class")?.value ?? null;
  const ACCENT_CYCLE = ["#29d0ff", "#7e5cff", "#ffd24a", "#36e07a", "#f25fb0"];

  const [
    { count: proofCount },
    { count: portfolioItemCount },
    { count: openAssignmentCount },
    { data: assignments },
    { data: signals },
    intentions,
  ] = user
    ? await Promise.all([
        supabase.from("task_signals").select("id", { count: "exact", head: true }).eq("owner_id", user.id).eq("kind", "completed"),
        supabase.from("portfolio_items").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
        supabase.from("assignments").select("id", { count: "exact", head: true }).neq("status", "submitted").neq("status", "graded").neq("status", "abandoned"),
        supabase.from("assignments").select("id, title, due_at, status, estimated_minutes, difficulty, class_id, kind, reading_load, writing_load, classes(name, color)").neq("status", "submitted").neq("status", "graded").neq("status", "abandoned").order("due_at", { ascending: true, nullsFirst: false }),
        supabase.from("task_signals").select("assignment_id, occurred_at").in("kind", ["started", "completed"]).gte("occurred_at", fourHoursAgoIso).order("occurred_at", { ascending: false }),
        getEventIntentions(),
      ])
    : [{ count: 0 }, { count: 0 }, { count: 0 }, { data: [] }, { data: [] }, []];

  const recentSignals = (signals ?? []).filter(
    (s): s is { assignment_id: string; occurred_at: string } => s.assignment_id !== null,
  );
  const ranked = assignments
    ? rankAssignments(
        assignments as Parameters<typeof rankAssignments>[0],
        recentSignals,
        now,
        "medium",
        { diagnoses: profile?.diagnoses ?? [], extra_time_pct: profile?.extra_time_pct ?? 0 },
        lastShownClassId,
      )
    : [];
  const questItems: QuestItem[] = ranked.slice(0, 5).map((a, i) => {
    const aRow = (assignments ?? []).find((x) => x.id === a.id);
    const joined = aRow ? (Array.isArray(aRow.classes) ? aRow.classes[0] : aRow.classes) : null;
    const subject = (joined as { name?: string | null } | null)?.name?.trim() || KIND_LABEL[a.kind as keyof typeof KIND_LABEL] || "Work";
    return {
      n: i + 1,
      subject,
      title: a.title,
      due: a.due_at ? formatDueAt(a.due_at) : "no due date",
      accent: ACCENT_CYCLE[i % ACCENT_CYCLE.length],
      href: `/assignments/${a.id}?focus=next-step`,
    };
  });

  const model = deriveFuturePath({
    schoolYear: profile?.school_year ?? null,
    interests: (profile?.interests ?? []) as string[],
    accommodations: (profile?.accommodations ?? []) as string[],
    proofCount: proofCount ?? 0,
    portfolioItemCount: portfolioItemCount ?? 0,
    openAssignmentCount: openAssignmentCount ?? 0,
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--gl-bg-base)", color: "var(--gl-text-primary)" }}>
      <AppTopNav active="More" />
      <style>{`
        .fp-stage { display: grid; gap: var(--space-13); }
        @media (min-width: 1024px) { .fp-stage { grid-template-columns: 0.7fr 1.3fr; align-items: start; } }
        .fp-lanes { display: grid; gap: var(--space-9); }
        @media (min-width: 1280px) { .fp-lanes { grid-template-columns: 0.88fr 1.12fr; align-items: start; } }
        .fp-cards { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-9); }
        @media (max-width: 640px) { .fp-cards { grid-template-columns: 1fr; } }
        .fp-essay { display: grid; gap: var(--space-13); }
        @media (min-width: 1024px) { .fp-essay { grid-template-columns: 0.72fr 1.28fr; align-items: start; } }
        .fp-steps { display: grid; grid-template-columns: repeat(5, 1fr); gap: var(--space-6); }
        @media (max-width: 640px) { .fp-steps { grid-template-columns: repeat(3, 1fr); } }
      `}</style>
      <div style={{ maxWidth: "var(--layout-max-width)", margin: "0 auto", padding: "var(--space-17) var(--space-17) var(--space-24)", display: "grid", gap: "var(--space-17)" }}>

        {/* Hero */}
        <section className="fp-stage">
          <header style={{ display: "grid", gap: "var(--space-8)" }}>
            <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-gold)", margin: 0, display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <GraduationCap size={13} aria-hidden="true" />
              Future Path
            </p>
            <h1 style={{ fontFamily: SF, fontWeight: "var(--weight-800)", fontSize: "var(--text-50)", lineHeight: "var(--leading-tight)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: 0, maxWidth: "18ch" }}>
              Turn schoolwork into a future story.
            </h1>
            <p style={{ fontFamily: BODY, fontSize: "var(--text-16)", lineHeight: "var(--leading-body)", color: "var(--gl-text-secondary)", maxWidth: "44ch", margin: 0 }}>
              Future Path connects daily work, learning strengths, proof points, applications, scholarships,
              and support planning. A personal map, not a counselor portal.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-6)" }}>
              <Link
                href="/proof"
                style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-5)", padding: "var(--space-9) var(--space-14)", borderRadius: "var(--radius-pill)", background: "var(--gl-gold)", color: "#1a0f00", fontFamily: BODY, fontWeight: "var(--weight-700)", fontSize: "var(--text-13)", textDecoration: "none" }}
              >
                Open Proof Folder
                <ShieldCheck size={14} />
              </Link>
              <Link
                href="/me"
                style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-5)", padding: "var(--space-9) var(--space-14)", borderRadius: "var(--radius-pill)", border: "1px solid var(--gl-border-neutral)", background: "transparent", color: "var(--gl-text-secondary)", fontFamily: BODY, fontWeight: "var(--weight-700)", fontSize: "var(--text-13)", textDecoration: "none" }}
              >
                View My Brain
              </Link>
            </div>
          </header>

          <FutureMapVisual model={model} />
        </section>

        {/* Lanes */}
        <section className="fp-lanes">
          {/* Strengths */}
          <div style={{ borderRadius: "var(--radius-card)", border: "1px solid var(--gl-gold-28)", background: "var(--gl-gold-12)", padding: "var(--space-14)" }}>
            <h2 style={{ fontFamily: SF, fontSize: "var(--text-22)", fontWeight: "var(--weight-800)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: "0 0 var(--space-10)", display: "flex", alignItems: "center", gap: "var(--space-6)" }}>
              <Sparkles size={17} style={{ color: "var(--gl-gold)" }} aria-hidden="true" />
              My strengths
            </h2>
            <div style={{ display: "grid", gap: "var(--space-6)" }}>
              {model.strengths.map((strength) => (
                <p key={strength} style={{ fontFamily: BODY, fontSize: "var(--text-14)", lineHeight: "var(--leading-body)", color: "var(--gl-text-secondary)", margin: 0, paddingLeft: "var(--space-8)", borderLeft: "2px solid var(--gl-gold-28)" }}>
                  {strength}
                </p>
              ))}
            </div>
          </div>

          {/* Future cards grid */}
          <div className="fp-cards">
            <FutureCard icon={Map} title="My college map" body="Grade-based steps from habits and interests to applications and decisions." comingSoon />
            <FutureCard icon={FileText} title="My application builder" body="Activities, essay ideas, recommendation asks, FAFSA, and scholarship tasks." comingSoon />
            <FutureCard icon={ShieldCheck} title="My proof folder" body={`${model.proofCount} completed proof points and ${model.portfolioItemCount} portfolio items can support essays and conversations.`} href="/proof" />
            <FutureCard icon={Landmark} title="My support plan" body="What helps me learn, how I ask for help, and what I need before due dates." href="/me" />
            <FutureCard icon={GraduationCap} title="AP exam prep" body="Track AP exam plans, goal score bands, and practice attempts as exam day approaches." href="/ap" />
          </div>
        </section>

        {/* Essay rule */}
        <section className="fp-essay" style={{ borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", padding: "var(--space-14)" }}>
          <div>
            <h2 style={{ fontFamily: SF, fontSize: "var(--text-22)", fontWeight: "var(--weight-800)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: "0 0 var(--space-6)" }}>College essay rule</h2>
            <p style={{ fontFamily: BODY, fontSize: "var(--text-14)", lineHeight: "var(--leading-body)", color: "var(--gl-text-muted)", margin: 0 }}>
              Diana can help students write better, but only after it captures and preserves the student&apos;s
              original thinking.
            </p>
          </div>
          <div className="fp-steps">
            {["Think", "Outline", "Draft", "Check", "Proof"].map((step, i) => (
              <div key={step} style={{ borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-base)", padding: "var(--space-10) var(--space-12)" }}>
                <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", color: "var(--gl-text-muted)", margin: "0 0 var(--space-3)" }}>{i + 1}</p>
                <p style={{ fontFamily: SF, fontSize: "var(--text-17)", fontWeight: "var(--weight-800)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: 0 }}>{step}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tonight + quest path */}
        <section style={{ display: "grid", gap: "var(--space-12)" }}>
          <EveningPlanning intentions={intentions} />
          {questItems.length > 0 && (
            <div style={{ position: "relative", minHeight: 240 }}>
              <QuestCarousel quests={questItems} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function FutureCard({ icon: Icon, title, body, href, comingSoon = false }: { icon: ElementType; title: string; body: string; href?: string; comingSoon?: boolean }) {
  const cardStyle = { display: "block", borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", padding: "var(--space-14)", textDecoration: "none", transition: "border-color 180ms ease, background 180ms ease" } as const;
  const inner = (
    <>
      <Icon size={19} style={{ color: "var(--gl-gold)" }} aria-hidden="true" />
      <h3 style={{ fontFamily: SF, fontSize: "var(--text-22)", fontWeight: "var(--weight-800)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: "var(--space-10) 0 var(--space-5)" }}>
        {title}
      </h3>
      <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-14)", lineHeight: "var(--leading-body)", color: "var(--gl-text-muted)", margin: "0 0 var(--space-10)" }}>
        {body}
      </p>
      <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-4)", fontFamily: "var(--font-body)", fontWeight: "var(--weight-700)", fontSize: "var(--text-13)", color: comingSoon ? "var(--gl-text-muted)" : "var(--gl-gold)" }}>
        {comingSoon ? "Coming soon" : <>Open <ArrowRight size={13} /></>}
      </span>
    </>
  );
  if (comingSoon || !href) {
    return <div style={{ ...cardStyle, opacity: 0.6 }} aria-disabled="true">{inner}</div>;
  }
  return <Link href={href} style={cardStyle}>{inner}</Link>;
}
