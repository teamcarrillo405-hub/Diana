import Link from "next/link";
import { Network } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { PageShell } from "../page-shell";

type ConceptRow = {
  id: string;
  name: string;
  mastery_level: number;
  last_practiced_at: string | null;
  class_id: string;
  classes: { name?: string | null } | Array<{ name?: string | null }> | null;
};

export default async function KnowledgeGraphPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mastery_concepts")
    .select("id, name, mastery_level, last_practiced_at, class_id, classes(name)")
    .order("mastery_level", { ascending: true })
    .order("updated_at", { ascending: false });

  const concepts = (data ?? []) as ConceptRow[];
  const groups = new Map<string, ConceptRow[]>();
  for (const concept of concepts) {
    const name = relationName(concept.classes) || "Other concepts";
    groups.set(name, [...(groups.get(name) ?? []), concept]);
  }

  return (
    <PageShell active="More" eyebrow="Learning map" title="Knowledge graph" subtitle="Concepts connect back to your real classes and practice. Open a node to see the evidence behind it." icon={Network}>
      {groups.size ? (
        <div className="sd-graph" role="list">
          {[...groups.entries()].map(([className, classConcepts]) => (
            <section className="sd-panel sd-panel-pad sd-graph-cluster" key={className} role="listitem">
              <div className="sd-section-head">
                <h2 className="sd-section-title">{className}</h2>
                <span className="sd-chip">{classConcepts.length} concepts</span>
              </div>
              <div className="sd-graph-nodes">
                {classConcepts.map((concept) => {
                  const percent = Math.round((Number(concept.mastery_level) / 4) * 100);
                  return (
                    <Link href={`/concepts/${concept.id}`} className="sd-graph-node" key={concept.id} style={{ "--sd-concept-level": `${percent}%` } as React.CSSProperties}>
                      <span aria-hidden="true"><Network size={17} /></span>
                      <strong>{concept.name}</strong>
                      <small>{percent}% practiced</small>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="sd-panel sd-panel-pad">
          <h2 className="sd-section-title">Your map starts with practice</h2>
          <p className="sd-subtitle">Review a flashcard or open a class mastery panel. Diana will connect the concepts as evidence appears.</p>
          <Link href="/classes" className="sd-button" style={{ marginTop: "1rem" }}>Open classes</Link>
        </div>
      )}
    </PageShell>
  );
}

function relationName(value: ConceptRow["classes"]): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0]?.name ?? null : value.name ?? null;
}
