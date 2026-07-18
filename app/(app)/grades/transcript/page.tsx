import { FileDown, Plus, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { fetchCanvasGrades } from "@/lib/lms/canvas";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CanvasConfig = { base_url: string; token: string; synthetic?: boolean };
type ClassRow = { id: string; name: string };
type ConceptRow = { class_id: string; mastery_level: number };
type PerformanceRow = {
  id: string;
  name: string;
  percent: number;
  kind: "mastery evidence" | "recorded grade";
};

const TRANSCRIPT_STYLES = `
  .sd-mastery-transcript-view { --tr-navy:#0f172a; --tr-blue:#74c0ff; --tr-pink:#ff79da; display:flex; height:max(100dvh,852px); max-height:max(100dvh,852px); flex-direction:column; overflow:hidden; background:var(--tr-navy); color:#fff; font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; }
  .sd-mastery-transcript-view * { box-sizing:border-box; }
  .sd-transcript-header { position:relative; z-index:20; display:flex; flex:none; align-items:center; justify-content:space-between; gap:15px; padding:54px 24px 16px; border-bottom:1px solid rgb(255 255 255 / .05); }
  .sd-transcript-header h1 { margin:0; font-size:23px; font-style:italic; font-weight:950; letter-spacing:-.045em; text-transform:uppercase; }
  .sd-transcript-header p { margin:4px 0 0; color:#94a3b8; font-size:9px; font-weight:900; letter-spacing:.18em; text-transform:uppercase; }
  .sd-transcript-close { display:grid; width:40px; height:40px; place-items:center; border:1px solid rgb(255 255 255 / .1); border-radius:999px; background:rgb(255 255 255 / .05); color:#fff; text-decoration:none; }
  .sd-transcript-scroll { min-height:0; flex:1; overflow-y:auto; padding:24px 24px 130px; scrollbar-width:none; }
  .sd-transcript-scroll::-webkit-scrollbar { display:none; }
  .sd-transcript-paper { min-height:555px; border-radius:26px; padding:22px; background:#f8fafc; box-shadow:0 20px 40px rgb(0 0 0 / .2); color:var(--tr-navy); }
  .sd-transcript-identity { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; padding-bottom:15px; border-bottom:2px solid rgb(15 23 42 / .1); }
  .sd-transcript-identity small { display:block; color:#94a3b8; font-size:8px; font-weight:950; letter-spacing:.09em; text-transform:uppercase; }
  .sd-transcript-identity h2 { margin:5px 0 4px; color:var(--tr-navy); font-size:19px; font-style:italic; font-weight:950; line-height:1; text-transform:uppercase; }
  .sd-transcript-identity p { margin:0; color:#64748b; font-size:8px; font-weight:800; text-transform:uppercase; }
  .sd-transcript-wordmark { width:auto; height:20px; filter:brightness(0); opacity:.72; }
  .sd-transcript-metrics { display:grid; grid-template-columns:1fr 1fr; gap:13px; margin-top:23px; }
  .sd-transcript-metric { border-radius:15px; padding:14px; background:rgb(15 23 42 / .05); }
  .sd-transcript-metric span { display:block; color:#94a3b8; font-size:7px; font-weight:950; text-transform:uppercase; }
  .sd-transcript-metric strong { display:block; margin-top:3px; color:var(--tr-blue); font-size:23px; font-style:italic; font-weight:950; }
  .sd-transcript-metric:nth-child(2) strong { color:var(--tr-pink); }
  .sd-transcript-performance { margin-top:25px; }
  .sd-transcript-performance > h2 { margin:0 0 14px; padding-bottom:8px; border-bottom:1px solid rgb(15 23 42 / .1); font-size:9px; font-weight:950; letter-spacing:.14em; text-transform:uppercase; }
  .sd-transcript-rows { display:grid; gap:17px; }
  .sd-transcript-row-head { display:flex; align-items:flex-end; justify-content:space-between; gap:10px; }
  .sd-transcript-row-head h3 { margin:0; max-width:170px; color:var(--tr-navy); font-size:11px; font-style:italic; font-weight:950; line-height:1.1; text-transform:uppercase; }
  .sd-transcript-row-head strong { color:var(--tr-blue); font-size:8px; font-weight:950; text-align:right; text-transform:uppercase; }
  .sd-transcript-row:nth-child(even) .sd-transcript-row-head strong { color:var(--tr-pink); }
  .sd-transcript-bar { height:4px; margin-top:7px; overflow:hidden; background:#e2e8f0; }
  .sd-transcript-bar span { display:block; height:100%; border-radius:2px; background:var(--tr-blue); }
  .sd-transcript-row:nth-child(even) .sd-transcript-bar span { background:var(--tr-pink); }
  .sd-transcript-empty { margin:0; color:#64748b; font-size:10px; line-height:1.5; }
  .sd-transcript-proof { display:flex; flex-direction:column; align-items:center; gap:8px; margin-top:28px; padding-top:17px; border-top:1px solid rgb(15 23 42 / .1); }
  .sd-transcript-proof-icon { display:grid; width:46px; height:46px; place-items:center; border-radius:999px; background:rgb(15 23 42 / .07); color:var(--tr-blue); }
  .sd-transcript-proof p { margin:0; color:#94a3b8; font-size:7px; font-weight:850; letter-spacing:.09em; line-height:1.5; text-align:center; text-transform:uppercase; }
  .sd-transcript-issue { margin:14px 0 0; color:#64748b; font-size:8px; line-height:1.45; text-align:center; }
  .sd-transcript-add { position:absolute; z-index:50; right:24px; bottom:117px; display:grid; width:62px; height:62px; place-items:center; border-radius:16px; background:linear-gradient(135deg,var(--tr-blue),var(--tr-pink)); box-shadow:0 10px 30px rgb(45 212 191 / .26); color:var(--tr-navy); text-decoration:none; }
  .sd-transcript-footer { position:relative; z-index:55; flex:none; padding:18px 24px 38px; background:var(--tr-navy); }
  .sd-transcript-export { display:flex; min-height:55px; align-items:center; justify-content:center; gap:10px; border-radius:15px; background:#fff; box-shadow:0 0 30px rgb(255 255 255 / .14); color:var(--tr-navy); font-size:12px; font-style:italic; font-weight:950; letter-spacing:.08em; text-decoration:none; text-transform:uppercase; }
  .diana-app-shell:has(.sd-mastery-transcript-view) .agent-fab-anchor,.app-command-frame:has(.sd-mastery-transcript-view) .diana-mobile-command { display:none!important; }
  .app-command-frame:has(.sd-mastery-transcript-view) { padding:0!important; }
  .diana-app:has(.sd-mastery-transcript-view) nextjs-portal { display:none!important; }
  .diana-app:has(.sd-mastery-transcript-view) .skip-link { transition:none; }
  .diana-app:has(.sd-mastery-transcript-view) .skip-link:focus { transform:translateY(0)!important; }
`;

export default async function TranscriptPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileResult, classesResult, conceptsResult, eventsResult, connectionResult] = await Promise.all([
    supabase.from("profiles").select("display_name, school_year").eq("user_id", user.id).maybeSingle(),
    supabase.from("classes").select("id, name").eq("owner_id", user.id).is("archived_at", null).order("name"),
    supabase.from("mastery_concepts").select("id, class_id, mastery_level").eq("owner_id", user.id).order("updated_at", { ascending: false }),
    supabase.from("mastery_events").select("id, concept_id").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(500),
    supabase.from("lms_connections").select("config").eq("owner_id", user.id).eq("provider", "canvas").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const classes = (classesResult.data ?? []) as ClassRow[];
  const concepts = (conceptsResult.data ?? []) as ConceptRow[];
  const config = canvasConfig(connectionResult.data?.config);
  let records: Awaited<ReturnType<typeof fetchCanvasGrades>> = [];
  let canvasIssue = false;
  if (config) {
    try {
      records = await fetchCanvasGrades(config);
    } catch {
      canvasIssue = true;
    }
  }

  const rows: PerformanceRow[] = classes.flatMap((classRow) => {
    const levels = concepts.filter((concept) => concept.class_id === classRow.id).map((concept) => concept.mastery_level);
    return levels.length ? [{ id: classRow.id, name: classRow.name, percent: masteryPercent(levels), kind: "mastery evidence" as const }] : [];
  });
  const localNames = new Set(rows.map((row) => normalizeName(row.name)));
  for (const [courseId, courseRecords] of groupGrades(records)) {
    const name = courseRecords[0]?.courseName;
    if (!name || localNames.has(normalizeName(name))) continue;
    const graded = courseRecords.filter((record) => record.score !== null && record.pointsPossible !== null && record.pointsPossible > 0 && !record.excused);
    const earned = graded.reduce((sum, record) => sum + (record.score ?? 0), 0);
    const possible = graded.reduce((sum, record) => sum + (record.pointsPossible ?? 0), 0);
    if (possible > 0) rows.push({ id: `canvas-${courseId}`, name, percent: Math.round((earned / possible) * 100), kind: "recorded grade" });
  }

  const profile = profileResult.data;
  const displayName = profile?.display_name?.trim() || "Student";
  const schoolLabel = profile?.school_year ? `Grade ${profile.school_year} · private student record` : "Private student record";
  const gradedCount = records.filter((record) => record.score !== null && record.pointsPossible !== null && record.pointsPossible > 0).length;

  return (
    <ScreenDesignViewport className="sd-mastery-transcript-view" aria-label="Mastery transcript">
      <style>{TRANSCRIPT_STYLES}</style>
      <header className="sd-transcript-header">
        <div><h1>Academic transcript</h1><p>Owner-scoped evidence</p></div>
        <Link className="sd-transcript-close" href="/grades" aria-label="Back to mastery"><X size={20} aria-hidden="true" /></Link>
      </header>

      <main className="sd-transcript-scroll">
        <article className="sd-transcript-paper">
          <div className="sd-transcript-identity">
            <div><small>Student identification</small><h2>{displayName}</h2><p>{schoolLabel}</p></div>
            <DianaWordmark className="sd-transcript-wordmark" />
          </div>

          <section className="sd-transcript-metrics" aria-label="Transcript evidence totals">
            <div className="sd-transcript-metric"><span>Concept evidence</span><strong>{eventsResult.data?.length ?? 0}</strong></div>
            <div className="sd-transcript-metric"><span>Recorded grades</span><strong>{gradedCount}</strong></div>
          </section>

          <section className="sd-transcript-performance">
            <h2>Subject performance</h2>
            {rows.length ? (
              <div className="sd-transcript-rows">
                {rows.map((row) => (
                  <div className="sd-transcript-row" key={row.id}>
                    <div className="sd-transcript-row-head"><h3>{row.name}</h3><strong>{row.percent}% {row.kind}</strong></div>
                    <div className="sd-transcript-bar" aria-label={`${row.name}: ${row.percent}% ${row.kind}`}><span style={{ width: `${row.percent}%` }} /></div>
                  </div>
                ))}
              </div>
            ) : <p className="sd-transcript-empty">No mastery or grade evidence is available yet. This record will not invent academic results.</p>}
          </section>

          <div className="sd-transcript-proof">
            <span className="sd-transcript-proof-icon"><ShieldCheck size={23} aria-hidden="true" /></span>
            <p>Built from your private mastery and LMS evidence<br />Review before choosing an export</p>
          </div>
          {canvasIssue ? <p className="sd-transcript-issue">Canvas did not answer just now. Saved mastery evidence remains available.</p> : null}
        </article>
      </main>

      <Link className="sd-transcript-add" href="/classes" aria-label="Open classes"><Plus size={29} aria-hidden="true" /></Link>
      <footer className="sd-transcript-footer">
        <Link className="sd-transcript-export" href="/export?category=mastery_concepts"><FileDown size={20} aria-hidden="true" />Export transcript</Link>
      </footer>
    </ScreenDesignViewport>
  );
}

function canvasConfig(value: unknown): CanvasConfig | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<CanvasConfig>;
  if (candidate.synthetic || typeof candidate.base_url !== "string" || typeof candidate.token !== "string") return null;
  return candidate as CanvasConfig;
}

function masteryPercent(levels: number[]): number {
  const average = levels.reduce((sum, level) => sum + Math.max(0, Math.min(4, level)), 0) / levels.length;
  return Math.round((average / 4) * 100);
}

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase("en-US").replace(/\s+/gu, " ");
}

function groupGrades(records: Awaited<ReturnType<typeof fetchCanvasGrades>>) {
  const groups = new Map<string, typeof records>();
  for (const record of records) groups.set(record.courseId, [...(groups.get(record.courseId) ?? []), record]);
  return groups;
}
