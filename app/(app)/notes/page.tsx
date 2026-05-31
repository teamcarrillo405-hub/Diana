import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";

export default async function NotesPage() {
  const supabase = await createClient();
  const { data: notes } = await supabase
    .from("notes")
    .select("id, title, body_text, transcript_text, updated_at, assignment_id, class_id, classes(id, name)")
    .order("updated_at", { ascending: false });

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

      {(!notes || notes.length === 0) ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-lg font-medium">No notes yet.</p>
          <p className="mt-1 text-sm text-muted">
            Capture a class — voice or text. Diana saves every 30 seconds.
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
                      · {(n as { classes?: { name: string } | null }).classes!.name}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 line-clamp-1 text-xs text-muted">
                  {n.transcript_text || n.body_text || "Empty note"}
                </p>
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
