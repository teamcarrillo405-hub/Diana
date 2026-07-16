import Link from "next/link";
import { BookOpen, CircleHelp, Network, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { SourceMedia } from "@/components/screen-design/source-media";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import { createClient } from "@/lib/supabase/server";

const GRAPH_STYLES = `
  .sd-knowledge-graph { --kg-navy:#0f172a; --kg-pink:#ff79da; --kg-teal:#2dd4bf; display:flex; height:max(100dvh,852px); max-height:max(100dvh,852px); flex-direction:column; overflow:hidden; background:var(--kg-navy); color:#fff; font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; }
  .sd-knowledge-graph * { box-sizing:border-box; }
  .sd-graph-header { position:relative; z-index:20; flex:none; padding:52px 22px 16px; border-bottom:1px solid rgb(255 255 255 / .05); background:rgb(15 23 42 / .82); backdrop-filter:blur(12px); }
  .sd-graph-header-top { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; }
  .sd-graph-wordmark { width:auto; height:15px; margin-bottom:7px; opacity:.93; }
  .sd-graph-header h1 { margin:0; font-size:25px; font-style:italic; font-weight:950; letter-spacing:-.055em; line-height:.86; text-transform:uppercase; }
  .sd-graph-header h1 span { color:var(--kg-pink); }
  .sd-graph-state { border:1px solid rgb(255 121 218 / .3); border-radius:999px; padding:7px 10px; background:rgb(255 121 218 / .12); color:var(--kg-pink); font-size:8px; font-weight:950; letter-spacing:.1em; text-transform:uppercase; }
  .sd-graph-header p { margin:10px 0 0; color:#94a3b8; font-size:10px; font-weight:650; }
  .sd-graph-scroll { min-height:0; flex:1; overflow-y:auto; padding:0 22px 124px; scrollbar-width:none; }
  .sd-graph-scroll::-webkit-scrollbar { display:none; }
  .sd-graph-stage-wrap { position:relative; margin:18px 0 19px; }
  .sd-graph-stage { position:relative; width:100%; height:330px; overflow:auto hidden; border-radius:28px; background:radial-gradient(circle at center,rgb(45 212 191 / .1),transparent 67%); outline-offset:3px; scrollbar-width:none; touch-action:pan-x; }
  .sd-graph-stage::-webkit-scrollbar { display:none; }
  .sd-graph-canvas { position:relative; width:max(100%,480px); height:330px; }
  .sd-graph-canvas > img { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; opacity:.7; }
  .sd-graph-node { position:absolute; z-index:3; left:var(--node-x); top:var(--node-y); display:grid; min-width:112px; max-width:150px; gap:2px; transform:translate(-50%,-50%); border:1px solid var(--node-tone,var(--kg-pink)); border-radius:12px; padding:8px 9px; background:rgb(15 23 42 / .88); box-shadow:0 0 15px color-mix(in srgb,var(--node-tone,var(--kg-pink)) 32%,transparent); color:#fff; text-decoration:none; }
  .sd-graph-node[data-tone="teal"] { --node-tone:var(--kg-teal); }
  .sd-graph-node strong { overflow:hidden; font-size:8px; font-weight:950; letter-spacing:.03em; line-height:1.2; text-overflow:ellipsis; text-transform:uppercase; white-space:nowrap; }
  .sd-graph-node small { color:var(--node-tone,var(--kg-pink)); font-size:8px; font-weight:900; }
  .sd-graph-node:focus-visible { outline:3px solid #fff; outline-offset:3px; }
  .sd-graph-help { position:absolute; right:8px; bottom:8px; z-index:4; display:flex; align-items:center; gap:5px; border-radius:999px; padding:6px 8px; background:rgb(15 23 42 / .85); color:#cbd5e1; font-size:7px; font-weight:850; letter-spacing:.07em; text-transform:uppercase; pointer-events:none; }
  .sd-graph-section { display:grid; gap:10px; margin-bottom:18px; }
  .sd-graph-section > h2 { display:flex; align-items:center; gap:7px; margin:0; color:#cbd5e1; font-size:10px; font-weight:950; letter-spacing:.16em; text-transform:uppercase; }
  .sd-graph-section > h2 svg { color:var(--kg-pink); }
  .sd-graph-focus-list { display:grid; gap:9px; }
  .sd-graph-focus { display:grid; grid-template-columns:1fr auto; gap:5px 12px; border:1px solid rgb(255 255 255 / .1); border-left:4px solid var(--focus-tone,var(--kg-pink)); border-radius:13px; padding:13px 14px; background:rgb(255 255 255 / .05); color:#fff; text-decoration:none; }
  .sd-graph-focus[data-tone="teal"] { --focus-tone:var(--kg-teal); }
  .sd-graph-focus strong { overflow:hidden; font-size:11px; font-style:italic; font-weight:950; text-overflow:ellipsis; text-transform:uppercase; white-space:nowrap; }
  .sd-graph-focus span { color:var(--focus-tone,var(--kg-pink)); font-size:8px; font-weight:950; letter-spacing:.06em; text-transform:uppercase; }
  .sd-graph-focus p { grid-column:1 / -1; margin:0; color:#94a3b8; font-size:9px; line-height:1.45; }
  .sd-graph-classes { display:grid; gap:8px; }
  .sd-graph-classes details { border:1px solid rgb(255 255 255 / .09); border-radius:13px; padding:0 13px; background:rgb(255 255 255 / .04); }
  .sd-graph-classes summary { display:flex; min-height:42px; cursor:pointer; list-style:none; align-items:center; justify-content:space-between; gap:10px; font-size:10px; font-weight:950; text-transform:uppercase; }
  .sd-graph-classes summary::-webkit-details-marker { display:none; }
  .sd-graph-classes summary span { color:var(--kg-teal); font-size:8px; }
  .sd-graph-class-links { display:grid; gap:7px; padding:0 0 12px; }
  .sd-graph-class-links a { display:flex; align-items:center; justify-content:space-between; gap:10px; border-top:1px solid rgb(255 255 255 / .07); padding-top:8px; color:#cbd5e1; font-size:9px; text-decoration:none; }
  .sd-graph-class-links a small { color:#64748b; }
  .sd-graph-empty { display:grid; gap:13px; margin-top:18px; border:1px dashed rgb(255 255 255 / .16); border-radius:22px; padding:22px 18px; background:rgb(255 255 255 / .035); text-align:center; }
  .sd-graph-empty img { width:100%; height:180px; object-fit:contain; opacity:.58; }
  .sd-graph-empty h2,.sd-graph-empty p { margin:0; }
  .sd-graph-empty h2 { font-size:18px; font-style:italic; font-weight:950; text-transform:uppercase; }
  .sd-graph-empty p { color:#94a3b8; font-size:10px; line-height:1.5; }
  .sd-graph-empty a { color:var(--kg-teal); font-size:10px; font-weight:950; text-transform:uppercase; }
  .sd-knowledge-graph > .sd-student-bottom-nav { position:relative; z-index:60; min-height:94px; flex:none; }
  .diana-app-shell:has(.sd-knowledge-graph) .agent-fab-anchor,.app-command-frame:has(.sd-knowledge-graph) .diana-mobile-command { display:none!important; }
  .app-command-frame:has(.sd-knowledge-graph) { padding:0!important; }
  .diana-app:has(.sd-knowledge-graph) nextjs-portal { display:none!important; }
  .diana-app:has(.sd-knowledge-graph) .skip-link { transition:none; }
  .diana-app:has(.sd-knowledge-graph) .skip-link:focus { transform:translateY(0)!important; }
  @media (prefers-reduced-motion:reduce) { .sd-knowledge-graph * { animation:none!important; scroll-behavior:auto!important; transition:none!important; } }
`;

type ConceptRow = {
  id: string;
  name: string;
  mastery_level: number;
  last_practiced_at: string | null;
  class_id: string;
  classes: { name?: string | null } | Array<{ name?: string | null }> | null;
};

const NODE_POSITIONS = [
  [24, 26], [52, 17], [76, 34], [35, 55], [64, 63],
  [18, 76], [48, 84], [82, 77], [91, 53], [8, 45],
] as const;

export default async function KnowledgeGraphPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("mastery_concepts")
    .select("id, name, mastery_level, last_practiced_at, class_id, classes(name)")
    .eq("owner_id", user.id)
    .order("mastery_level", { ascending: true })
    .order("updated_at", { ascending: false });

  const concepts = (data ?? []) as ConceptRow[];
  const conceptIds = concepts.map((concept) => concept.id);
  const { data: events } = conceptIds.length
    ? await supabase
        .from("mastery_events")
        .select("concept_id, created_at")
        .eq("owner_id", user.id)
        .in("concept_id", conceptIds)
        .order("created_at", { ascending: false })
        .limit(500)
    : { data: [] as Array<{ concept_id: string; created_at: string }> };
  const evidenceCount = new Map<string, number>();
  for (const event of events ?? []) {
    evidenceCount.set(event.concept_id, (evidenceCount.get(event.concept_id) ?? 0) + 1);
  }
  const groups = new Map<string, ConceptRow[]>();
  for (const concept of concepts) {
    const name = relationName(concept.classes) ?? "Other concepts";
    groups.set(name, [...(groups.get(name) ?? []), concept]);
  }
  const focusConcepts = concepts.slice(0, 2);

  return (
    <ScreenDesignViewport className="sd-knowledge-graph" aria-label="Knowledge graph">
      <style>{GRAPH_STYLES}</style>
      <header className="sd-graph-header">
        <div className="sd-graph-header-top">
          <div>
            <DianaWordmark className="sd-graph-wordmark" />
            <h1>Diana<br /><span>Edge</span></h1>
          </div>
          <span className="sd-graph-state">Evidence mapped</span>
        </div>
        <p>Visualizing the concepts supported by your private learning evidence.</p>
      </header>

      <main className="sd-graph-scroll">
        {concepts.length ? (
          <>
            <div className="sd-graph-stage-wrap">
              <div
                className="sd-graph-stage"
                tabIndex={0}
                role="region"
                aria-label="Knowledge graph canvas. Swipe or use arrow keys to pan, then tab to open concept nodes."
              >
                <div className="sd-graph-canvas">
                  <SourceMedia assetId="knowledge-graph-base" width={512} height={512} decorative priority />
                  {concepts.slice(0, NODE_POSITIONS.length).map((concept, index) => {
                    const position = NODE_POSITIONS[index] ?? NODE_POSITIONS[0];
                    const practicePercent = percentOfFour(concept.mastery_level);
                    return (
                      <Link
                        href={`/concepts/${concept.id}`}
                        className="sd-graph-node"
                        data-tone={index % 2 ? "teal" : "pink"}
                        aria-label={index === 0 ? "Open concept" : `Open ${concept.name}`}
                        style={{ "--node-x": `${position[0]}%`, "--node-y": `${position[1]}%` } as React.CSSProperties}
                        key={concept.id}
                      >
                        <strong>{concept.name}</strong>
                        <small>{practicePercent}% evidence</small>
                      </Link>
                    );
                  })}
                </div>
              </div>
              <span className="sd-graph-help"><CircleHelp size={11} aria-hidden="true" />Pan or tab</span>
            </div>

            <section className="sd-graph-section">
              <h2><Sparkles size={14} aria-hidden="true" />Learning focus</h2>
              <div className="sd-graph-focus-list">
                {focusConcepts.map((concept, index) => (
                  <Link className="sd-graph-focus" data-tone={index % 2 ? "teal" : "pink"} href={`/concepts/${concept.id}`} key={concept.id}>
                    <strong>{relationName(concept.classes) ?? "Class"}: {concept.name}</strong>
                    <span>{percentOfFour(concept.mastery_level)}% evidence</span>
                    <p>{evidenceCount.get(concept.id) ? `${evidenceCount.get(concept.id)} saved practice event${evidenceCount.get(concept.id) === 1 ? "" : "s"}. Open the concept for the source timeline.` : "No event details are saved yet. Open the concept when you are ready to practice."}</p>
                  </Link>
                ))}
              </div>
            </section>

            <section className="sd-graph-section">
              <h2><BookOpen size={14} aria-hidden="true" />Class connections</h2>
              <div className="sd-graph-classes">
                {[...groups.entries()].map(([className, classConcepts], index) => (
                  <details key={className} open={index === 0}>
                    <summary>{className}<span>{classConcepts.length} concept{classConcepts.length === 1 ? "" : "s"}</span></summary>
                    <div className="sd-graph-class-links">
                      {classConcepts.map((concept) => (
                        <Link href={`/concepts/${concept.id}`} key={concept.id}>
                          <span>{concept.name}</span><small>{evidenceCount.get(concept.id) ?? 0} events</small>
                        </Link>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section className="sd-graph-empty">
            <SourceMedia assetId="knowledge-graph-base" width={512} height={512} decorative priority />
            <Network size={24} aria-hidden="true" />
            <h2>Your map starts with practice</h2>
            <p>No owner-scoped concept evidence is available yet. A class review or flashcard practice can add the first real node.</p>
            <Link href="/classes">Open classes</Link>
          </section>
        )}
      </main>
      <StudentBottomNav />
    </ScreenDesignViewport>
  );
}

function relationName(value: ConceptRow["classes"]): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0]?.name ?? null : value.name ?? null;
}

function percentOfFour(value: number): number {
  return Math.round((Math.max(0, Math.min(4, Number(value))) / 4) * 100);
}
