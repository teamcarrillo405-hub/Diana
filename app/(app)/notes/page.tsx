import Link from "next/link";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { snippetForQuery } from "@/lib/notes/related";
import { NoteSynthesisPanel } from "./note-synthesis-panel";

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
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Notes</h1>
        <Link
          href="/notes/new"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white"
        >
          + New note
        </Link>
      </header>

      <NoteSynthesisPanel />

      <form action="/notes" className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 sm:flex-row">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Search notes</span>
          <input
            type="search"
            name="q"
            defaultValue={search}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm"
            placeholder="Search notes"
          />
        </label>
        {tagFilter && <input type="hidden" name="tag" value={tagFilter} />}
        <button
          type="submit"
          className="rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-border/30"
        >
          Search
        </button>
        {(search || tagFilter) && (
          <Link href="/notes" className="rounded-md border border-border bg-card px-3 py-2 text-center text-sm hover:bg-border/30">
            Clear
          </Link>
        )}
      </form>

      {(!notes || notes.length === 0) ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-lg font-medium">{search || tagFilter ? "No matching notes." : "No notes yet."}</p>
          <p className="mt-1 text-sm text-muted">
            {search || tagFilter
              ? "Try a broader search or clear the filter."
              : "Capture a class - voice or text. Diana saves every 30 seconds."}
          </p>
          <div className="mt-4">
            <Link
              href="/notes/new"
              className="rounded-md bg-accent px-3 py-2 text-sm text-white"
            >
              Start a note
            </Link>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {notes.map((n) => (
            <li key={n.id}>
              <Link
                href={`/notes/${n.id}`}
                className="block px-4 py-3 hover:bg-border/30"
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
