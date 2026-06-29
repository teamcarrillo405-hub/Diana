import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight, FileText, NotebookPen, Search, Sparkles, Tags } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { snippetForQuery } from "@/lib/notes/related";
import { NoteSynthesisPanel } from "./note-synthesis-panel";
import {
  NexusArcadeScene,
  NexusEmptyState,
  NexusKicker,
  NexusList,
  NexusMetric,
  NexusPageHeader,
  NexusPageShell,
  NexusPanel,
} from "@/components/nexus/nexus-ui";

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const { q, tag } = await searchParams;
  const search = q?.trim() ?? "";
  const tagFilter = tag?.trim() ?? "";
  const supabase = await createClient();
  let query = supabase
    .from("notes")
    .select("id, title, body_text, transcript_text, updated_at, assignment_id, class_id, source, tags, ai_suggested_tags, classes(id, name)")
    .order("updated_at", { ascending: false });

  if (search) {
    query = query.textSearch("search_vector", search, {
      type: "websearch",
      config: "english",
    });
  }
  if (tagFilter) {
    query = query.contains("tags", [tagFilter]);
  }

  const { data: notes } = await query;
  const noteRows = notes ?? [];
  const totalTags = new Set(noteRows.flatMap((note) => [...(note.tags ?? []), ...(note.ai_suggested_tags ?? [])])).size;
  const classLinked = noteRows.filter((note) => note.class_id).length;
  const latest = noteRows[0] ?? null;

  return (
    <NexusPageShell className="notes-studio-page space-y-8">
      <NexusPageHeader
        eyebrow="Think studio"
        title={<>Capture thoughts before they disappear.</>}
        description="Class notes, voice, and useful fragments become study tools when Grayson is ready."
        actions={
          <Link href="/notes/new" className="nexus-button nexus-button-primary">
            New note
          </Link>
        }
        visual={<NexusArcadeScene />}
        tone="purple"
      />

      <NoteSynthesisPanel />

      <div className="notes-command-grid">
        <NexusPanel className="notes-metrics-panel" tone="purple">
          <NexusMetric label="Notes" value={noteRows.length} detail="captured" tone="cyan" />
          <NexusMetric label="Class-linked" value={classLinked} detail="attached" tone="gold" />
          <NexusMetric label="Tags" value={totalTags} detail="study handles" tone="pink" />
        </NexusPanel>

        {latest ? (
          <NexusPanel className="notes-focus-panel" tone="cyan">
            <NexusKicker>
              <NotebookPen size={14} />
              Latest capture
            </NexusKicker>
            <h2>{latest.title}</h2>
            <p>
              {latest.transcript_text || latest.body_text
                ? (latest.transcript_text || latest.body_text || "").slice(0, 160)
                : "Ready to become outline, cards, or class proof."}
            </p>
            <Link href={`/notes/${latest.id}`} className="notes-focus-action">
              Open note
              <ArrowRight size={15} />
            </Link>
          </NexusPanel>
        ) : null}
      </div>

      <form action="/notes" className="notes-search-panel">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Search notes</span>
          <input
            type="search"
            name="q"
            defaultValue={search}
            className="notes-search-input"
            placeholder="Search notes"
          />
        </label>
        {tagFilter && <input type="hidden" name="tag" value={tagFilter} />}
        <button
          type="submit"
          className="notes-search-button"
        >
          <Search size={14} />
          Search
        </button>
        {(search || tagFilter) && (
          <Link href="/notes" className="notes-search-button notes-search-clear">
            Clear
          </Link>
        )}
      </form>

      {(noteRows.length === 0) ? (
        <NexusEmptyState
          eyebrow={search || tagFilter ? "No match" : "No notes yet"}
          title={search || tagFilter ? "Try a wider search." : "Start the first capture."}
          action={
            <Link href="/notes/new" className="nexus-button nexus-button-primary">
              Start a note
            </Link>
          }
        >
          <p>
            {search || tagFilter
              ? "Try a broader search or clear the filter."
              : "Capture a class - voice or text. Diana saves every 30 seconds."}
          </p>
        </NexusEmptyState>
      ) : (
        <section className="notes-list-section">
          <div className="notes-section-head">
            <div>
              <NexusKicker>
                <FileText size={14} />
                Captures
              </NexusKicker>
              <h2>Notes ready for study.</h2>
            </div>
            <p>Open a note to turn highlighted text into cards, outlines, sources, or class proof.</p>
          </div>
          <NexusList className="notes-list">
          <ul>
          {noteRows.map((n) => (
            <li key={n.id}>
              <Link
                href={`/notes/${n.id}`}
                className="notes-row"
              >
                <div className="notes-row-main">
                  <span className="notes-row-icon">
                    <FileText size={15} />
                  </span>
                  <div>
                    <p>{n.title}</p>
                    <small>
                      {format(new Date(n.updated_at), "EEE MMM d, h:mm a")}
                      {(n as { classes?: { name: string } | null }).classes?.name ? (
                        <> / {(n as { classes?: { name: string } | null }).classes!.name}</>
                      ) : null}
                    </small>
                  </div>
                </div>
                <p className="notes-row-snippet">
                  {search
                    ? snippetForQuery(n.transcript_text || n.body_text || n.title, search)
                    : n.transcript_text || n.body_text || "Empty note"}
                </p>
                <div className="notes-row-meta">
                  {(n as { classes?: { name: string } | null }).classes?.name && (
                    <span>
                      <NotebookPen size={12} />
                      {(n as { classes?: { name: string } | null }).classes!.name}
                    </span>
                  )}
                  {((n.tags ?? []).length > 0 || (n.ai_suggested_tags ?? []).length > 0) ? (
                    <>
                    {[...(n.tags ?? []), ...(n.ai_suggested_tags ?? [])].slice(0, 6).map((noteTag) => (
                      <span key={noteTag}>
                        <Tags size={12} />
                        {noteTag}
                      </span>
                    ))}
                    </>
                  ) : (
                    <span>
                      <Sparkles size={12} />
                      ready
                    </span>
                  )}
                </div>
                <span className="notes-row-open" aria-hidden="true">
                  Open
                  <ArrowRight size={13} />
                </span>
              </Link>
            </li>
          ))}
          </ul>
          </NexusList>
        </section>
      )}
    </NexusPageShell>
  );
}
