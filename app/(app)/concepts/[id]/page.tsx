import Link from "next/link";
import { ArrowLeft, Brain, Clock3, Network } from "lucide-react";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { PageShell } from "../../page-shell";

export default async function ConceptDeepDivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: concept }, { data: events }, { data: cards }] = await Promise.all([
    supabase.from("mastery_concepts").select("id, name, mastery_level, self_confidence, last_practiced_at, source, class_id, classes(name)").eq("id", id).maybeSingle(),
    supabase.from("mastery_events").select("id, source, rating, delta, evidence_text, created_at").eq("concept_id", id).order("created_at", { ascending: false }).limit(20),
    supabase.from("flashcards").select("id, front, back, due_at, reps").eq("concept_id", id).order("due_at", { ascending: true }).limit(12),
  ]);

  if (!concept) notFound();
  const level = Number(concept.mastery_level);
  const percent = Math.round((level / 4) * 100);
  const className = relationName(concept.classes) || "Class concept";

  return (
    <PageShell active="More" eyebrow={className} title={concept.name} subtitle="A source-grounded view of what you have practiced and the next useful review." icon={Network} action={<Link href="/knowledge-graph" className="sd-button"><ArrowLeft size={16} aria-hidden="true" />Map</Link>}>
      <section className="sd-grid sd-grid-3">
        <div className="sd-panel sd-metric"><span className="sd-metric-label">Practice coverage</span><strong className="sd-metric-value">{percent}%</strong><div className="sd-progress"><span style={{ width: `${percent}%` }} /></div></div>
        <div className="sd-panel sd-metric"><span className="sd-metric-label">Practice events</span><strong className="sd-metric-value">{events?.length ?? 0}</strong><small className="sd-subtitle">Evidence, not a score.</small></div>
        <div className="sd-panel sd-metric"><span className="sd-metric-label">Linked cards</span><strong className="sd-metric-value">{cards?.length ?? 0}</strong><small className="sd-subtitle">Ready for retrieval.</small></div>
      </section>

      <div className="sd-grid sd-grid-2" style={{ marginTop: "1rem" }}>
        <section className="sd-panel sd-panel-pad sd-grid">
          <h2 className="sd-section-title">Game film</h2>
          {(events ?? []).length ? events!.map((event) => (
            <article className="sd-concept-event" key={event.id}>
              <Clock3 size={16} aria-hidden="true" />
              <div><strong>{event.source.replaceAll("_", " ")}</strong><p>{event.evidence_text || "Practice recorded."}</p><small>{formatDate(event.created_at)}</small></div>
            </article>
          )) : <p className="sd-subtitle">No practice evidence yet. A flashcard review or guided quiz will start this timeline.</p>}
        </section>

        <section className="sd-panel sd-panel-pad sd-grid">
          <h2 className="sd-section-title">Practice cards</h2>
          {(cards ?? []).length ? cards!.map((card) => (
            <Link href={`/flashcards/${card.id}/review`} className="sd-search-result" key={card.id}>
              <span className="sd-class-icon"><Brain size={17} aria-hidden="true" /></span>
              <span><strong>{card.front}</strong><small>{card.reps ? `${card.reps} reviews` : "Ready for first review"}</small></span>
            </Link>
          )) : <p className="sd-subtitle">Create a card from a note or assignment to practice this concept.</p>}
        </section>
      </div>
    </PageShell>
  );
}

function relationName(value: { name?: string | null } | Array<{ name?: string | null }> | null): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0]?.name ?? null : value.name ?? null;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
