import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight, FileText, Plus, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { loadProfile } from "@/lib/profile";
import { snippetForQuery } from "@/lib/notes/related";
import { NoteSynthesisPanel } from "./note-synthesis-panel";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import { StudentDesktopNav } from "@/components/screen-design/student-desktop-nav";

const SF = "var(--font-display)";
const BODY = "var(--font-body)";

const NOTES_STYLES = `
  .diana-app-shell:has(.sd-notes-home) .agent-fab-anchor { display:none!important; }
  .sd-notes-home { min-height:100dvh!important; background:linear-gradient(rgb(214 218 214 / .84),rgb(214 218 214 / .9)),url("/images/classes-high-tech-classroom.png") center/cover fixed!important; color:#182126!important; font-family:var(--font-lexend),Lexend,system-ui,sans-serif!important; }
  .sd-notes-home > .sd-notes-content { width:calc(100% - (2 * clamp(24px,3.5vw,72px)))!important; max-width:1680px!important; min-height:calc(100dvh - 94px); margin:0 auto!important; padding:clamp(34px,4vw,64px) 0 clamp(52px,6vw,96px)!important; }
  .sd-notes-home .sd-notes-heading { width:min(100%,1240px); margin-inline:auto; }
  .sd-notes-home .sd-notes-heading :is(p,h1) { color:#182126!important; font-family:var(--font-lexend),Lexend,sans-serif!important; font-style:normal!important; letter-spacing:0!important; text-transform:none!important; }
  .sd-notes-home .sd-notes-heading p { color:#53615c!important; font-size:16px!important; line-height:1.6!important; }
  .sd-notes-home .sd-notes-heading h1 { max-width:24ch!important; font-size:clamp(30px,3.4vw,46px)!important; font-weight:620!important; line-height:1.12!important; }
  .diana-app .sd-notes-home .sd-notes-primary-action,.diana-app .sd-notes-home button[type="submit"] { border:1px solid #c6d23f!important; border-radius:8px!important; background:#e8f56b!important; color:#141d20!important; font-family:var(--font-lexend),Lexend,sans-serif!important; font-weight:600!important; text-decoration:none!important; }
  .sd-notes-home .sd-notes-list-section { width:min(100%,1240px); margin-inline:auto; padding:clamp(20px,2.2vw,30px)!important; }
  .sd-notes-home .sd-notes-list a { border:1px solid rgb(255 255 255 / .76)!important; border-radius:10px!important; background:linear-gradient(135deg,rgb(248 250 247 / .7),rgb(238 244 238 / .46))!important; box-shadow:inset 0 1px 0 rgb(255 255 255 / .72),0 12px 28px rgb(24 33 38 / .10)!important; backdrop-filter:blur(20px)!important; }
  .sd-notes-home .sd-notes-list-section :is(p,h2,span) { color:#182126!important; font-family:var(--font-lexend),Lexend,sans-serif!important; font-style:normal!important; letter-spacing:0!important; text-transform:none!important; }
  .sd-notes-home .sd-notes-list-section p { color:#53615c!important; }
  .sd-notes-home .sd-notes-search { width:min(100%,1240px); margin-inline:auto; }
  .sd-notes-home .sd-notes-search input { border:1px solid rgb(24 33 38 / .22)!important; border-radius:8px!important; background:rgb(255 255 255 / .68)!important; color:#182126!important; font-family:var(--font-lexend),Lexend,sans-serif!important; }
  .diana-app .sd-notes-home .sd-notes-search button,.diana-app .sd-notes-home .sd-notes-search a { border:1px solid rgb(24 33 38 / .22)!important; border-radius:8px!important; background:rgb(255 255 255 / .5)!important; color:#182126!important; font-family:var(--font-lexend),Lexend,sans-serif!important; }
  .sd-notes-home .sd-notes-list a { color:#182126!important; }
  .sd-notes-home .sd-notes-list a * { color:inherit!important; font-family:var(--font-lexend),Lexend,sans-serif!important; letter-spacing:0!important; text-transform:none!important; }
  .sd-notes-home .sd-notes-synthesis { width:min(100%,1240px); margin:clamp(18px,2vw,28px) auto 0!important; }
  .sd-notes-home .sd-notes-synthesis > section { border:1px solid rgb(255 255 255 / .76)!important; border-radius:12px 20px 12px 20px!important; background:linear-gradient(135deg,rgb(248 250 247 / .7),rgb(238 244 238 / .46))!important; color:#182126!important; box-shadow:inset 0 1px 0 rgb(255 255 255 / .72),0 14px 34px rgb(24 33 38 / .12)!important; backdrop-filter:blur(24px) saturate(1.04)!important; padding:clamp(20px,2.2vw,30px)!important; }
  .sd-notes-home .sd-notes-synthesis :is(p,h2,span) { color:#182126!important; font-family:var(--font-lexend),Lexend,sans-serif!important; font-style:normal!important; letter-spacing:0!important; text-transform:none!important; }
  .sd-notes-home .sd-notes-synthesis input { border:1px solid rgb(24 33 38 / .22)!important; border-radius:8px!important; background:rgb(255 255 255 / .7)!important; color:#182126!important; }
  .sd-notes-home .sd-notes-synthesis > section > div:nth-of-type(2) { border-color:rgb(24 33 38 / .16)!important; background:rgb(255 255 255 / .34)!important; }
  .sd-notes-home .sd-notes-synthesis svg { color:#182126!important; }
  .diana-app .sd-notes-home .sd-notes-synthesis button { border:1px solid #c6d23f!important; border-radius:8px!important; background:#e8f56b!important; color:#141d20!important; font-family:var(--font-lexend),Lexend,sans-serif!important; }
  .sd-notes-home .sd-notes-chat { display:grid; gap:16px; }
  .sd-notes-home .sd-notes-chat-head { display:grid; gap:5px; }
  .sd-notes-home .sd-notes-chat-head h2 { margin:0; color:#182126; font-size:22px; font-weight:620; line-height:1.2; }
  .sd-notes-home .sd-notes-chat-head p { margin:0; color:#53615c; font-size:14px; line-height:1.55; }
  .sd-notes-home .sd-notes-chat-history { display:grid; gap:12px; min-height:104px; }
  .sd-notes-home .sd-notes-chat-turn { max-width:min(92%,760px); border:1px solid rgb(24 33 38 / .18); border-radius:12px; padding:14px 16px; color:#182126; font-size:16px; line-height:1.6; white-space:pre-wrap; }
  .sd-notes-home .sd-notes-chat-turn--student { justify-self:end; background:rgb(24 33 38 / .9); color:#fff; }
  .sd-notes-home .sd-notes-chat-turn--diana { background:rgb(255 255 255 / .52); box-shadow:inset 0 1px 0 rgb(255 255 255 / .64); }
  .sd-notes-home .sd-notes-chat-composer { display:grid; gap:10px; border:1px solid rgb(24 33 38 / .22); border-radius:12px; background:rgb(255 255 255 / .52); padding:12px; }
  .sd-notes-home .sd-notes-chat-composer textarea { width:100%; min-height:54px; resize:vertical; border:0; outline:0; background:transparent; color:#182126; font:400 16px/1.55 var(--font-lexend),Lexend,sans-serif; }
  .sd-notes-home .sd-notes-chat-actions { display:flex; justify-content:flex-end; gap:10px; }
  .sd-notes-home .sd-notes-list a { padding:14px 18px!important; }
  .sd-notes-home .sd-notes-list a > div { min-width:0!important; }
  .sd-notes-home .sd-notes-list a > div > div { margin-bottom:4px!important; }
  .sd-notes-home .sd-notes-list a p { margin-bottom:6px!important; }
  @media (min-width:901px) { .sd-notes-home > .sd-student-bottom-nav { display:none!important; } }
  @media (max-width:900px) { .sd-notes-home > .sd-notes-content { width:calc(100% - 32px)!important; min-height:calc(100dvh - 152px); margin:0 auto 92px!important; padding:28px 0 36px!important; } .sd-notes-home .sd-notes-synthesis { width:100%; } }
`;

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string; classId?: string }>;
}) {
  const { q, tag, classId } = await searchParams;
  const search = q?.trim() ?? "";
  const tagFilter = tag?.trim() ?? "";
  const isGeneralScope = classId === "general";
  const selectedClassId = classId && !isGeneralScope ? classId : null;
  const supabase = await createClient();
  const profile = await loadProfile();

  let query = supabase
    .from("notes")
    .select("id, title, body_text, transcript_text, updated_at, assignment_id, class_id, source, tags, ai_suggested_tags, classes(id, name)")
    .order("updated_at", { ascending: false });

  if (search) {
    query = query.textSearch("search_vector", search, { type: "websearch", config: "english" });
  }
  if (tagFilter) {
    query = query.contains("tags", [tagFilter]);
  }
  if (selectedClassId) {
    query = query.eq("class_id", selectedClassId);
  } else if (isGeneralScope) {
    query = query.is("class_id", null);
  }

  const [{ data: notes }, { data: classes }] = await Promise.all([
    query,
    supabase.from("classes").select("id, name").order("name", { ascending: true }),
  ]);
  // QA seed records preserve teacher and student context for automated flows,
  // but they are not student notes and should never appear in Notes Studio.
  const noteRows = (notes ?? []).filter((note) => !((note.tags ?? []).includes("grayson-demo")));
  const classRows = (classes ?? []) as Array<{ id: string; name: string }>;
  const selectedClass = selectedClassId ? classRows.find((candidate) => candidate.id === selectedClassId) ?? null : null;
  const notesScopeLabel = isGeneralScope ? "General notes" : selectedClass ? `${selectedClass.name} notes` : "All notes";
  const notesStudioTitle = selectedClass ? selectedClass.name : isGeneralScope ? "General notes" : "All notes";
  const scopedNotesHref = isGeneralScope ? "/notes?classId=general" : selectedClassId ? `/notes?classId=${selectedClassId}` : "/notes";
  const createNoteHref = selectedClassId ? `/notes/new?class=${selectedClassId}` : "/notes/new";
  return (
    <div className="sd-notes-home diana-current-page" style={{ minHeight: "100vh", background: "var(--gl-bg-base)", color: "var(--gl-text-primary)" }}>
      <style>{NOTES_STYLES}</style>
      <StudentDesktopNav
        active="More"
        displayName={profile?.display_name}
        photoUrl={profile?.photo_url}
        photoOffsetX={profile?.photo_offset_x}
        photoOffsetY={profile?.photo_offset_y}
      />
      <div className="sd-notes-content" style={{ maxWidth: "var(--layout-max-width)", margin: "0 auto", padding: "var(--space-17) var(--space-17) var(--space-24)", display: "grid", gap: "var(--space-15)" }}>

        {/* Header */}
        <header className="sd-notes-heading">
          <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-purple-light)", margin: "0 0 var(--space-6)" }}>
            Notes Studio
          </p>
          <h1 style={{ fontFamily: SF, fontWeight: "var(--weight-800)", fontSize: "var(--text-50)", lineHeight: "var(--leading-tight)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: "0 0 var(--space-8)", maxWidth: "18ch" }}>
            {notesStudioTitle}
          </h1>
          <Link
            href={createNoteHref}
            className="sd-notes-primary-action"
            style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-5)", padding: "var(--space-9) var(--space-14)", borderRadius: "var(--radius-pill)", background: "var(--gl-purple)", color: "#fff", fontFamily: BODY, fontWeight: "var(--weight-700)", fontSize: "var(--text-13)", textDecoration: "none" }}
          >
            <Plus size={14} />
            New note
          </Link>
        </header>

        {/* Search */}
        <form className="sd-notes-search" action="/notes" style={{ display: "flex", gap: "var(--space-6)", flexWrap: "wrap" }}>
          <label style={{ minWidth: 0, flex: 1 }}>
            <span className="sr-only">Search notes</span>
            <input
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Search notes"
              style={{ width: "100%", padding: "var(--space-8) var(--space-12)", borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", color: "var(--gl-text-primary)", fontFamily: BODY, fontSize: "var(--text-14)", outline: "none", boxSizing: "border-box" }}
            />
          </label>
          <label>
            <span className="sr-only">Notes location</span>
            <select
              name="classId"
              defaultValue={isGeneralScope ? "general" : selectedClassId ?? ""}
              aria-label="Notes location"
              style={{ minHeight: 44, padding: "0 var(--space-10)", borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", color: "var(--gl-text-primary)", fontFamily: BODY, fontSize: "var(--text-13)" }}
            >
              <option value="">All notes</option>
              {classRows.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
              <option value="general">General notes</option>
            </select>
          </label>
          {tagFilter && <input type="hidden" name="tag" value={tagFilter} />}
          <button
            type="submit"
            style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-8) var(--space-14)", borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", color: "var(--gl-text-secondary)", fontFamily: BODY, fontWeight: "var(--weight-600)", fontSize: "var(--text-13)", cursor: "pointer" }}
          >
            <Search size={13} />
            Search
          </button>
          {(search || tagFilter || selectedClassId || isGeneralScope) && (
            <Link
              href={scopedNotesHref}
              style={{ display: "inline-flex", alignItems: "center", padding: "var(--space-8) var(--space-14)", borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "transparent", color: "var(--gl-text-muted)", fontFamily: BODY, fontSize: "var(--text-13)", textDecoration: "none" }}
            >
              Clear
            </Link>
          )}
        </form>

        <div className="sd-notes-synthesis">
          <NoteSynthesisPanel classId={selectedClassId} generalOnly={isGeneralScope} scopeLabel={notesScopeLabel} />
        </div>

        {noteRows.length === 0 ? null : (
          <section className="sd-notes-list-section" style={{ display: "grid", gap: "var(--space-9)" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "var(--space-12)", flexWrap: "wrap" }}>
              <div>
                <p style={{ fontFamily: BODY, fontSize: "var(--text-11)", fontWeight: "var(--weight-700)", letterSpacing: "var(--tracking-20)", textTransform: "uppercase", color: "var(--gl-purple-light)", margin: "0 0 var(--space-3)", display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  <FileText size={13} aria-hidden="true" /> Captures
                </p>
                <h2 style={{ fontFamily: SF, fontSize: "var(--text-34)", fontWeight: "var(--weight-800)", textTransform: "uppercase", color: "var(--gl-text-primary)", margin: 0 }}>
                  {selectedClass ? `${selectedClass.name} notes` : "Notes"}
                </h2>
              </div>
              <p style={{ fontFamily: BODY, fontSize: "var(--text-13)", color: "var(--gl-text-muted)", maxWidth: "36ch", textAlign: "right" }}>
                Open a note to turn highlighted text into cards, outlines, sources, or class proof.
              </p>
            </div>
            <ul className="sd-notes-list" style={{ display: "grid", gap: "var(--space-4)", listStyle: "none", padding: 0, margin: 0 }}>
              {noteRows.map((n) => {
                const cls = (n as { classes?: { name: string } | null }).classes;
                return (
                  <li key={n.id}>
                    <Link
                      href={`/notes/${n.id}`}
                      style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-8)", padding: "var(--space-8) var(--space-10)", borderRadius: "var(--radius-card)", border: "1px solid var(--gl-border-neutral)", background: "var(--gl-bg-card)", textDecoration: "none" }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-5)", marginBottom: "var(--space-2)" }}>
                          <FileText size={13} style={{ color: "var(--gl-purple-light)", flexShrink: 0 }} />
                          <p style={{ fontFamily: BODY, fontWeight: "var(--weight-700)", fontSize: "var(--text-15)", color: "var(--gl-text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {n.title}
                          </p>
                        </div>
                        <p style={{ fontFamily: BODY, fontSize: "var(--text-12)", color: "var(--gl-text-muted)", margin: "0 0 var(--space-5)" }}>
                          {format(new Date(n.updated_at), "EEE MMM d, h:mm a")}
                          {cls?.name ? ` / ${cls.name}` : null}
                        </p>
                        <p style={{ fontFamily: BODY, fontSize: "var(--text-13)", color: "var(--gl-text-secondary)", margin: "0 0 var(--space-6)", overflow: "hidden", maxHeight: "2.8em" }}>
                          {search
                            ? snippetForQuery(n.transcript_text || n.body_text || n.title, search)
                            : n.transcript_text || n.body_text || "Empty note"}
                        </p>
                      </div>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-3)", fontFamily: BODY, fontWeight: "var(--weight-700)", fontSize: "var(--text-12)", color: "var(--gl-purple-light)", whiteSpace: "nowrap", flexShrink: 0 }} aria-hidden="true">
                        Open <ArrowRight size={12} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
      <StudentBottomNav />
    </div>
  );
}
