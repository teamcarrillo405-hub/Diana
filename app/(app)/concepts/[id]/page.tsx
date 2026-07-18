import Link from "next/link";
import {
  ArrowLeft,
  BookOpenCheck,
  Brain,
  Clock3,
  Network,
  PlayCircle,
  Share2,
  Sparkles,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { SourceMedia } from "@/components/screen-design/source-media";
import { createClient } from "@/lib/supabase/server";

const CONCEPT_STYLES = `
  .sd-concept-dive { --cd-navy:#0f172a; --cd-pink:#ff79da; --cd-blue:#74c0ff; display:flex; height:max(100dvh,852px); max-height:max(100dvh,852px); flex-direction:column; overflow:hidden; background:var(--cd-navy); color:#fff; font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; }
  .sd-concept-dive * { box-sizing:border-box; }
  .sd-concept-header { position:relative; z-index:20; display:flex; flex:none; align-items:center; gap:13px; padding:52px 22px 15px; border-bottom:1px solid rgb(255 255 255 / .05); background:rgb(15 23 42 / .82); backdrop-filter:blur(12px); }
  .sd-concept-header > a { display:grid; width:40px; height:40px; flex:none; place-items:center; border:1px solid rgb(255 255 255 / .08); border-radius:999px; background:rgb(255 255 255 / .07); color:#fff; text-decoration:none; }
  .sd-concept-header-main { min-width:0; flex:1; }
  .sd-concept-wordmark { width:auto; height:14px; margin-bottom:5px; opacity:.94; }
  .sd-concept-header h1 { margin:0; overflow:hidden; font-size:18px; font-style:italic; font-weight:950; letter-spacing:-.035em; line-height:1; text-overflow:ellipsis; text-transform:uppercase; white-space:nowrap; }
  .sd-concept-header p { margin:5px 0 0; overflow:hidden; color:var(--cd-blue); font-size:9px; font-weight:950; letter-spacing:.15em; text-overflow:ellipsis; text-transform:uppercase; white-space:nowrap; }
  .sd-concept-scroll { min-height:0; flex:1; overflow-y:auto; padding:18px 22px 118px; scrollbar-width:none; }
  .sd-concept-scroll::-webkit-scrollbar { display:none; }
  .sd-concept-section { display:grid; gap:11px; margin-bottom:23px; }
  .sd-concept-section > h2 { display:flex; align-items:center; gap:7px; margin:0; color:#cbd5e1; font-size:10px; font-weight:950; letter-spacing:.17em; text-transform:uppercase; }
  .sd-concept-section > h2 svg { color:var(--cd-pink); }
  .sd-concept-summary { border:1px solid rgb(255 255 255 / .1); border-left:4px solid var(--cd-pink); border-radius:17px; padding:17px; background:rgb(255 255 255 / .05); backdrop-filter:blur(10px); }
  .sd-concept-summary strong { display:block; margin-bottom:7px; color:var(--cd-pink); font-size:11px; font-style:italic; font-weight:950; letter-spacing:.06em; text-transform:uppercase; }
  .sd-concept-summary p { margin:0; color:#dbe4f0; font-size:12px; font-weight:650; line-height:1.55; }
  .sd-concept-terms { display:grid; gap:9px; }
  .sd-concept-term { display:grid; grid-template-columns:1fr auto; gap:5px 12px; border:1px solid rgb(255 255 255 / .1); border-radius:13px; padding:13px 14px; background:rgb(255 255 255 / .05); }
  .sd-concept-term h3 { margin:0; font-size:12px; font-style:italic; font-weight:950; text-transform:uppercase; }
  .sd-concept-term strong { color:var(--cd-blue); font-size:12px; font-style:italic; font-weight:950; }
  .sd-concept-term p { grid-column:1 / -1; margin:0; color:#94a3b8; font-size:10px; font-weight:650; line-height:1.4; }
  .sd-concept-film { overflow:hidden; border:1px solid rgb(255 255 255 / .1); border-radius:17px; background:rgb(255 255 255 / .05); }
  .sd-concept-film-visual { position:relative; display:grid; height:157px; place-items:center; overflow:hidden; background:rgb(0 0 0 / .25); }
  .sd-concept-film-visual img { width:100%; height:100%; object-fit:cover; opacity:.62; }
  .sd-concept-film-visual[data-abstract="true"] img { object-fit:contain; }
  .sd-concept-film-visual::after { position:absolute; inset:0; background:repeating-linear-gradient(0deg,rgb(0 0 0 / .16) 0 1px,transparent 1px 3px); content:""; pointer-events:none; }
  .sd-concept-film-visual a { position:absolute; z-index:2; display:grid; place-items:center; color:var(--cd-blue); filter:drop-shadow(0 0 12px rgb(116 192 255 / .5)); }
  .sd-concept-film-copy { padding:14px; }
  .sd-concept-film-copy h3 { margin:0 0 5px; font-size:12px; font-style:italic; font-weight:950; text-transform:uppercase; }
  .sd-concept-film-copy p { margin:0; color:#94a3b8; font-size:10px; font-weight:650; line-height:1.45; }
  .sd-concept-events { display:grid; gap:8px; }
  .sd-concept-event { display:grid; grid-template-columns:auto 1fr; gap:9px; border-top:1px solid rgb(255 255 255 / .08); padding-top:10px; }
  .sd-concept-event svg { color:var(--cd-blue); }
  .sd-concept-event strong { display:block; font-size:10px; text-transform:capitalize; }
  .sd-concept-event p,.sd-concept-event time { margin:3px 0 0; color:#94a3b8; font-size:9px; line-height:1.4; }
  .sd-concept-cta { position:absolute; z-index:50; right:0; bottom:0; left:0; padding:15px 22px max(25px,env(safe-area-inset-bottom)); border-top:1px solid rgb(255 255 255 / .06); background:rgb(15 23 42 / .94); backdrop-filter:blur(14px); }
  .sd-concept-cta a { display:flex; min-height:55px; align-items:center; justify-content:center; gap:9px; border-radius:12px; background:linear-gradient(90deg,var(--cd-pink),var(--cd-blue)); box-shadow:0 12px 30px rgb(255 121 218 / .17); color:var(--cd-navy); font-size:12px; font-style:italic; font-weight:950; letter-spacing:.11em; text-decoration:none; text-transform:uppercase; }
  .sd-concept-empty { margin:0; color:#94a3b8; font-size:10px; line-height:1.5; }
  .diana-app-shell:has(.sd-concept-dive) .agent-fab-anchor,.app-command-frame:has(.sd-concept-dive) .diana-mobile-command { display:none!important; }
  .app-command-frame:has(.sd-concept-dive) { padding:0!important; }
  .diana-app:has(.sd-concept-dive) nextjs-portal { display:none!important; }
  .diana-app:has(.sd-concept-dive) .skip-link { transition:none; }
  .diana-app:has(.sd-concept-dive) .skip-link:focus { transform:translateY(0)!important; }
  @media (prefers-reduced-motion:reduce) { .sd-concept-dive * { scroll-behavior:auto!important; transition:none!important; } }
`;

type ConceptRelation =
  | { name?: string | null }
  | Array<{ name?: string | null }>
  | null;

export default async function ConceptDeepDivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: concept }, { data: events }, { data: cards }] = await Promise.all([
    supabase
      .from("mastery_concepts")
      .select(
        "id, name, mastery_level, self_confidence, last_practiced_at, source, class_id, classes(name)",
      )
      .eq("id", id)
      .eq("owner_id", user.id)
      .maybeSingle(),
    supabase
      .from("mastery_events")
      .select("id, source, rating, delta, evidence_text, created_at")
      .eq("concept_id", id)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("flashcards")
      .select("id, front, due_at, reps")
      .eq("concept_id", id)
      .eq("owner_id", user.id)
      .order("due_at", { ascending: true })
      .limit(8),
  ]);

  if (!concept) notFound();
  const masteryPercent = percentOfFour(concept.mastery_level);
  const confidencePercent =
    concept.self_confidence === null
      ? null
      : percentOfFour(concept.self_confidence);
  const className = relationName(concept.classes as ConceptRelation) ?? "Class concept";
  const latestEvidence = events?.find((event) => event.evidence_text)?.evidence_text;
  const practiceHref = cards?.[0]
    ? `/flashcards/${cards[0].id}/review`
    : `/classes/${concept.class_id}`;
  const isKrebsConcept = /krebs|citric acid|tca cycle/iu.test(concept.name);

  return (
    <ScreenDesignViewport className="sd-concept-dive" aria-label="Concept deep dive">
      <style>{CONCEPT_STYLES}</style>
      <header className="sd-concept-header">
        <Link href="/knowledge-graph" aria-label="Back to knowledge graph">
          <ArrowLeft size={19} aria-hidden="true" />
        </Link>
        <div className="sd-concept-header-main">
          <DianaWordmark className="sd-concept-wordmark" />
          <h1>{concept.name}</h1>
          <p>{className}</p>
        </div>
        <Link href="/portfolio" aria-label="Open portfolio">
          <Share2 size={18} aria-hidden="true" />
        </Link>
      </header>

      <main className="sd-concept-scroll">
        <section className="sd-concept-section">
          <h2><Sparkles size={15} aria-hidden="true" />Evidence summary</h2>
          <div className="sd-concept-summary">
            <strong>{events?.length ? `${events.length} practice event${events.length === 1 ? "" : "s"} recorded` : "Practice can start here"}</strong>
            <p>{latestEvidence ?? "No practice evidence is available yet. Open the class or a linked card to begin a truthful evidence trail."}</p>
          </div>
        </section>

        <section className="sd-concept-section">
          <h2>Key evidence</h2>
          <div className="sd-concept-terms">
            <article className="sd-concept-term">
              <h3>Mastery evidence</h3><strong>{masteryPercent}%</strong>
              <p>Derived from saved mastery events. This is not a class grade.</p>
            </article>
            <article className="sd-concept-term">
              <h3>Self-confidence</h3><strong>{confidencePercent === null ? "Open" : `${confidencePercent}%`}</strong>
              <p>{confidencePercent === null ? "No self-rating is saved for this concept." : "Your saved confidence stays separate from mastery and grades."}</p>
            </article>
          </div>
        </section>

        <section className="sd-concept-section">
          <h2><Brain size={15} aria-hidden="true" />Game film breakdown</h2>
          <div className="sd-concept-film">
            <div className="sd-concept-film-visual" data-abstract={!isKrebsConcept || undefined}>
              <SourceMedia
                assetId={isKrebsConcept ? "krebs-cycle-visual" : "knowledge-graph-base"}
                width={640}
                height={426}
                decorative
                priority
              />
              <Link href="/knowledge-graph" aria-label="Open concept map"><PlayCircle size={54} aria-hidden="true" /></Link>
            </div>
            <div className="sd-concept-film-copy">
              <h3>{concept.name}</h3>
              <p>{concept.last_practiced_at ? `Last practice evidence: ${formatDate(concept.last_practiced_at)}. Open the map to see this concept in its class context.` : "No dated practice evidence is available yet. Open the map to see the class context."}</p>
            </div>
          </div>
        </section>

        <section className="sd-concept-section">
          <h2><Clock3 size={15} aria-hidden="true" />Practice timeline</h2>
          {events?.length ? (
            <div className="sd-concept-events">
              {events.map((event) => (
                <article className="sd-concept-event" key={event.id}>
                  <BookOpenCheck size={15} aria-hidden="true" />
                  <div>
                    <strong>{event.source.replaceAll("_", " ")}</strong>
                    <p>{event.evidence_text ?? "Practice evidence recorded."}</p>
                    <time dateTime={event.created_at}>{formatDate(event.created_at)}</time>
                  </div>
                </article>
              ))}
            </div>
          ) : <p className="sd-concept-empty">A flashcard review or guided class activity will add the first event.</p>}
        </section>
      </main>

      <footer className="sd-concept-cta">
        <Link href={practiceHref} aria-label="Practice this concept">
          <Network size={21} aria-hidden="true" />Practice this concept
        </Link>
      </footer>
    </ScreenDesignViewport>
  );
}

function relationName(value: ConceptRelation): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0]?.name ?? null : value.name ?? null;
}

function percentOfFour(value: number): number {
  return Math.round((Math.max(0, Math.min(4, Number(value))) / 4) * 100);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not recorded";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}
