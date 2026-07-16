import { BookOpenCheck, CalendarDays, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import { gradeInsights, type CourseGradeSnapshot } from "@/lib/grades/insights";
import { fetchCanvasCourseScores, fetchCanvasGrades } from "@/lib/lms/canvas";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CanvasConfig = { base_url: string; token: string; synthetic?: boolean };
type ClassRow = { id: string; name: string; color: string };
type ConceptRow = {
  id: string;
  class_id: string;
  name: string;
  mastery_level: number;
  self_confidence: number | null;
};

type MasteryCard = {
  id: string;
  name: string;
  concepts: ConceptRow[];
  masteryPct: number | null;
  masteredCount: number;
  confidencePct: number | null;
  canvas: CourseGradeSnapshot | null;
};

const MASTERY_STYLES = `
  .sd-mastery-tracker { --mt-navy:#0f172a; --mt-pink:#ff79da; --mt-teal:#2dd4bf; display:flex; height:max(100dvh,852px); max-height:max(100dvh,852px); flex-direction:column; overflow:hidden; background:var(--mt-navy); color:#fff; font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; }
  .sd-mastery-tracker * { box-sizing:border-box; }
  .sd-mastery-header { position:relative; z-index:20; flex:none; padding:54px 24px 16px; border-bottom:1px solid rgb(255 255 255 / .05); background:rgb(15 23 42 / .84); backdrop-filter:blur(12px); }
  .sd-mastery-header-main,.sd-mastery-header-meta,.sd-mastery-card-head,.sd-mastery-card-foot { display:flex; align-items:center; justify-content:space-between; gap:12px; }
  .sd-mastery-wordmark { width:auto; height:22px; margin-bottom:8px; opacity:.92; }
  .sd-mastery-title { margin:0; font-size:25px; font-style:italic; font-weight:950; letter-spacing:-.05em; line-height:.88; text-transform:uppercase; }
  .sd-mastery-title span { color:var(--mt-pink); }
  .sd-mastery-transcript { display:grid; width:40px; height:40px; place-items:center; border:1px solid rgb(255 255 255 / .1); border-radius:999px; background:rgb(255 255 255 / .05); color:#fff; text-decoration:none; }
  .sd-mastery-header-meta { margin-top:15px; color:#94a3b8; font-size:9px; font-weight:900; letter-spacing:.14em; text-transform:uppercase; }
  .sd-mastery-header-meta strong { color:var(--mt-teal); font-size:10px; letter-spacing:.08em; }
  .sd-mastery-scroll { min-height:0; flex:1; overflow-y:auto; padding:24px 24px 128px; scrollbar-width:none; }
  .sd-mastery-scroll::-webkit-scrollbar { display:none; }
  .sd-mastery-list { display:grid; gap:16px; }
  .sd-mastery-card { --accent:var(--mt-teal); display:grid; gap:13px; border:1px solid rgb(255 255 255 / .1); border-left:4px solid var(--accent); border-radius:18px; padding:18px 17px; background:rgb(255 255 255 / .05); backdrop-filter:blur(8px); }
  .sd-mastery-card[data-tone="pink"] { --accent:var(--mt-pink); }
  .sd-mastery-card[data-tone="slate"] { --accent:#64748b; }
  .sd-mastery-card h2 { margin:0; font-size:17px; font-style:italic; font-weight:950; letter-spacing:-.02em; line-height:1; text-transform:uppercase; }
  .sd-mastery-concepts { max-width:235px; margin:5px 0 0; overflow:hidden; color:#94a3b8; font-size:9px; font-weight:800; line-height:1.35; text-overflow:ellipsis; text-transform:uppercase; white-space:nowrap; }
  .sd-mastery-badge { border-radius:5px; padding:5px 8px; background:#fff; box-shadow:0 0 15px rgb(255 255 255 / .22); color:var(--mt-navy); font-size:8px; font-weight:950; letter-spacing:.1em; text-transform:uppercase; }
  .sd-mastery-bars { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; }
  .sd-mastery-bars span { height:6px; border-radius:2px; background:rgb(255 255 255 / .08); }
  .sd-mastery-bars span[data-filled="true"] { background:var(--accent); box-shadow:0 0 8px color-mix(in srgb,var(--accent) 55%,transparent); }
  .sd-mastery-card-foot { color:#64748b; font-size:8px; font-weight:900; letter-spacing:.08em; text-transform:uppercase; }
  .sd-mastery-card-foot strong { color:var(--accent); font-size:10px; }
  .sd-mastery-canvas { margin:0; color:#94a3b8; font-size:9px; font-weight:750; }
  .sd-mastery-detail { display:flex; min-height:40px; align-items:center; justify-content:center; gap:7px; border:1px solid rgb(255 255 255 / .09); border-radius:12px; background:rgb(15 23 42 / .45); color:#fff; font-size:9px; font-style:italic; font-weight:950; letter-spacing:.1em; text-decoration:none; text-transform:uppercase; }
  .sd-mastery-stats { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-top:20px; }
  .sd-mastery-stat { border:1px solid rgb(255 255 255 / .1); border-radius:18px; padding:15px; background:rgb(255 255 255 / .05); text-align:center; }
  .sd-mastery-stat svg { margin-bottom:5px; color:var(--mt-teal); }
  .sd-mastery-stat h2 { margin:0; color:#94a3b8; font-size:8px; font-weight:950; letter-spacing:.14em; text-transform:uppercase; }
  .sd-mastery-stat p { margin:3px 0 0; font-size:20px; font-style:italic; font-weight:950; text-transform:uppercase; }
  .sd-mastery-empty { display:grid; gap:13px; border:1px dashed rgb(255 255 255 / .16); border-radius:22px; padding:24px 20px; background:rgb(255 255 255 / .035); text-align:center; }
  .sd-mastery-empty h2 { margin:0; font-size:19px; font-style:italic; font-weight:950; text-transform:uppercase; }
  .sd-mastery-empty p { margin:0; color:#94a3b8; font-size:11px; line-height:1.5; }
  .sd-mastery-empty a { color:var(--mt-teal); font-size:10px; font-weight:900; text-transform:uppercase; }
  .sd-mastery-note { margin:15px 0 0; color:#64748b; font-size:9px; line-height:1.45; }
  .sd-mastery-tracker > .sd-student-bottom-nav { position:relative; z-index:60; min-height:94px; flex:none; }
  .diana-app-shell:has(.sd-mastery-tracker) .agent-fab-anchor,.app-command-frame:has(.sd-mastery-tracker) .diana-mobile-command { display:none!important; }
  .app-command-frame:has(.sd-mastery-tracker) { padding:0!important; }
  .diana-app:has(.sd-mastery-tracker) nextjs-portal { display:none!important; }
  .diana-app:has(.sd-mastery-tracker) .skip-link { transition:none; }
  .diana-app:has(.sd-mastery-tracker) .skip-link:focus { transform:translateY(0)!important; }
`;

export default async function GradesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [classesResult, conceptsResult, eventsResult, connectionResult] = await Promise.all([
    supabase.from("classes").select("id, name, color").eq("owner_id", user.id).is("archived_at", null).order("name"),
    supabase.from("mastery_concepts").select("id, class_id, name, mastery_level, self_confidence").eq("owner_id", user.id).order("updated_at", { ascending: false }),
    supabase.from("mastery_events").select("id, concept_id").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(500),
    supabase.from("lms_connections").select("config, last_synced_at").eq("owner_id", user.id).eq("provider", "canvas").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const classes = (classesResult.data ?? []) as ClassRow[];
  const concepts = (conceptsResult.data ?? []) as ConceptRow[];
  const config = canvasConfig(connectionResult.data?.config);
  let canvasCourses: CourseGradeSnapshot[] = [];
  let canvasIssue = false;
  if (config) {
    try {
      const [records, scores] = await Promise.all([
        fetchCanvasGrades(config),
        fetchCanvasCourseScores(config),
      ]);
      canvasCourses = gradeInsights(records, scores).courses;
    } catch {
      canvasIssue = true;
    }
  }

  const canvasByName = new Map(canvasCourses.map((course) => [normalizeName(course.courseName), course]));
  const cards: MasteryCard[] = classes
    .map((classRow) => {
      const classConcepts = concepts.filter((concept) => concept.class_id === classRow.id);
      const masteryPct = classConcepts.length ? percent(classConcepts.map((concept) => concept.mastery_level), 4) : null;
      const confidence = classConcepts.flatMap((concept) => concept.self_confidence === null ? [] : [concept.self_confidence]);
      return {
        id: classRow.id,
        name: classRow.name,
        concepts: classConcepts,
        masteryPct,
        masteredCount: classConcepts.filter((concept) => concept.mastery_level >= 3.5).length,
        confidencePct: confidence.length ? percent(confidence, 4) : null,
        canvas: canvasByName.get(normalizeName(classRow.name)) ?? null,
      };
    })
    .filter((card) => card.concepts.length > 0 || card.canvas);

  const hasEvidence = cards.length > 0;
  return (
    <ScreenDesignViewport className="sd-mastery-tracker" aria-label="Mastery tracker">
      <style>{MASTERY_STYLES}</style>
      <header className="sd-mastery-header">
        <div className="sd-mastery-header-main">
          <div>
            <DianaWordmark className="sd-mastery-wordmark" />
            <h1 className="sd-mastery-title">Academic<br /><span>Mastery</span></h1>
          </div>
          <Link className="sd-mastery-transcript" href="/grades/transcript" aria-label="Open mastery transcript"><CalendarDays size={20} aria-hidden="true" /></Link>
        </div>
        <div className="sd-mastery-header-meta"><span>Overall performance</span><strong>Evidence overview</strong></div>
      </header>

      <main className="sd-mastery-scroll">
        {hasEvidence ? (
          <div className="sd-mastery-list">
            {cards.map((card, index) => {
              const filled = card.masteryPct === null ? 0 : Math.round(card.masteryPct / 25);
              const tone = index % 3 === 0 ? "teal" : index % 3 === 1 ? "pink" : "slate";
              return (
                <article className="sd-mastery-card" data-tone={tone} key={card.id}>
                  <div className="sd-mastery-card-head">
                    <div>
                      <h2>{card.name}</h2>
                      <p className="sd-mastery-concepts">{card.concepts.length ? card.concepts.slice(0, 3).map((concept) => concept.name).join(", ") : "Canvas grade evidence"}</p>
                    </div>
                    {card.concepts.length > 0 && card.masteredCount === card.concepts.length ? <span className="sd-mastery-badge">Mastered</span> : null}
                  </div>
                  <div className="sd-mastery-bars" aria-label={card.masteryPct === null ? "No mastery evidence yet" : `${card.masteryPct}% mastery evidence`}>
                    {[1, 2, 3, 4].map((segment) => <span data-filled={segment <= filled} key={segment} />)}
                  </div>
                  <div className="sd-mastery-card-foot">
                    <span>{card.masteredCount} of {card.concepts.length} concepts mastered</span>
                    <strong>{card.masteryPct === null ? "No level" : `${card.masteryPct}%`}</strong>
                  </div>
                  {card.confidencePct !== null ? <p className="sd-mastery-canvas">Self-confidence: {card.confidencePct}%</p> : null}
                  {card.canvas?.currentScorePct !== null && card.canvas?.currentScorePct !== undefined ? <p className="sd-mastery-canvas">Canvas current grade: {Math.round(card.canvas.currentScorePct)}%</p> : null}
                  <Link className="sd-mastery-detail" href={`/classes/${card.id}`}><BookOpenCheck size={14} aria-hidden="true" />Open mastery detail</Link>
                </article>
              );
            })}
          </div>
        ) : (
          <section className="sd-mastery-empty">
            <Sparkles size={26} aria-hidden="true" />
            <h2>Your evidence starts here</h2>
            <p>No mastery concepts or Canvas grades are available yet. Practice and class evidence will appear without inventing a score.</p>
            <Link href="/classes">Open classes</Link>
          </section>
        )}

        <section className="sd-mastery-stats" aria-label="Evidence summary">
          <div className="sd-mastery-stat"><Sparkles size={23} aria-hidden="true" /><h2>Evidence events</h2><p>{eventsResult.data?.length ?? 0}</p></div>
          <div className="sd-mastery-stat"><BookOpenCheck size={23} aria-hidden="true" /><h2>Concepts</h2><p>{concepts.length}</p></div>
        </section>
        {canvasIssue ? <p className="sd-mastery-note">Canvas did not answer just now. Your saved mastery evidence is still shown.</p> : null}
        {!config ? <p className="sd-mastery-note">Mastery evidence is private and owner scoped. <Link href="/settings#connections">Connect Canvas</Link> when useful.</p> : null}
      </main>
      <StudentBottomNav />
    </ScreenDesignViewport>
  );
}

function canvasConfig(value: unknown): CanvasConfig | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<CanvasConfig>;
  if (candidate.synthetic || typeof candidate.base_url !== "string" || typeof candidate.token !== "string") return null;
  return candidate as CanvasConfig;
}

function percent(values: number[], maximum: number): number {
  if (!values.length) return 0;
  const average = values.reduce((sum, value) => sum + Math.max(0, Math.min(maximum, value)), 0) / values.length;
  return Math.round((average / maximum) * 100);
}

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase("en-US").replace(/\s+/gu, " ");
}
