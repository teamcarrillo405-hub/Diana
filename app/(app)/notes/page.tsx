import Link from "next/link";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { snippetForQuery } from "@/lib/notes/related";
import { NoteSynthesisPanel } from "./note-synthesis-panel";
import { EmptyStateMark } from "@/components/empty-state-mark";

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

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-violet-700 dark:text-violet-300">
            Notes studio
          </p>
          <h1 className="mt-1 text-3xl font-bold leading-tight">Notes</h1>
          <p className="mt-1 text-sm text-muted">Capture class thinking, then turn useful pieces into study tools.</p>
        </div>
        <Link
          href="/notes/new"
          className="touch-target inline-flex w-full items-center justify-center rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong sm:w-auto"
        >
          New note
        </Link>
      </header>

      <NoteSynthesisPanel />

      <form action="/notes" className="flex flex-col gap-2 rounded-2xl border border-border bg-surface-raised p-4 sm:flex-row">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Search notes</span>
          <input
            type="search"
            name="q"
            defaultValue={search}
            className="touch-target w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            placeholder="Search notes"
          />
        </label>
        {tagFilter && <input type="hidden" name="tag" value={tagFilter} />}
        <button
          type="submit"
          className="touch-target rounded-xl border border-border bg-surface px-3 py-2 text-sm hover:bg-surface-soft"
        >
          Search
        </button>
        {(search || tagFilter) && (
          <Link href="/notes" className="touch-target inline-flex items-center justify-center rounded-xl border border-border bg-surface px-3 py-2 text-center text-sm hover:bg-surface-soft">
            Clear
          </Link>
        )}
      </form>

      {(!notes || notes.length === 0) ? (
        <div className="rounded-3xl border border-dashed border-border bg-surface-raised p-8 text-center">
          <EmptyStateMark />
          <p className="text-lg font-medium">{search || tagFilter ? "No matching notes." : "No notes yet."}</p>
          <p className="mt-1 text-sm text-muted">
            {search || tagFilter
              ? "Try a broader search or clear the filter."
              : "Capture a class - voice or text. Diana saves every 30 seconds."}
          </p>
          <div className="mt-4">
            <Link
              href="/notes/new"
              className="touch-target inline-flex items-center justify-center rounded-xl bg-brand px-3 py-2 text-sm text-white hover:bg-brand-strong"
            >
              Start a note
            </Link>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface-raised">
          {notes.map((n) => (
            <li key={n.id}>
              <Link
                href={`/notes/${n.id}`}
                className="block min-w-0 px-4 py-3 hover:bg-surface-soft"
              >
                <div className="flex items-baseline gap-2">
                  <p className="truncate font-medium">{n.title}</p>
                  {(n as { classes?: { name: string } | null }).classes?.name && (
                    <span className="shrink-0 text-xs text-muted">
                      - {(n as { classes?: { name: string } | null }).classes!.name}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                  {search
                    ? snippetForQuery(n.transcript_text || n.body_text || n.title, search)
                    : n.transcript_text || n.body_text || "Empty note"}
                </p>
                {((n.tags ?? []).length > 0 || (n.ai_suggested_tags ?? []).length > 0) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[...(n.tags ?? []), ...(n.ai_suggested_tags ?? [])].slice(0, 6).map((noteTag) => (
                      <span key={noteTag} className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
                        {noteTag}
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-1 text-xs text-muted">
                  {format(new Date(n.updated_at), "EEE MMM d, h:mm a")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
