import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";

export default async function FlashcardsPage() {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data: due } = await supabase
    .from("flashcards")
    .select("id, front, due_at, state, reps")
    .lte("due_at", nowIso)
    .order("due_at", { ascending: true });

  const { data: all } = await supabase
    .from("flashcards")
    .select("id, front, due_at, state, reps")
    .order("due_at", { ascending: true });

  const upcoming = (all ?? []).filter((c) => c.due_at > nowIso);

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Study</h1>
        <Link
          href="/flashcards/new"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white"
        >
          + New card
        </Link>
      </header>

      {(due && due.length > 0) ? (
        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
            Due today
          </h2>
          <div className="rounded-2xl border border-accent bg-accent/5 p-5">
            <p className="text-sm">
              {due.length === 1
                ? "1 card to review today."
                : `${due.length} cards to review today.`}
            </p>
            <Link
              href={`/flashcards/${due[0].id}/review`}
              className="mt-3 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-white"
            >
              Start review
            </Link>
          </div>
        </section>
      ) : (
        (all && all.length > 0) && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
            <p className="text-sm">Nothing due right now. Come back tomorrow.</p>
          </div>
        )
      )}

      {upcoming.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
            Coming up
          </h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {upcoming.slice(0, 25).map((c) => (
              <li key={c.id} className="px-4 py-3">
                <p className="truncate text-sm">{c.front}</p>
                <p className="mt-0.5 text-xs text-muted">
                  Next: {format(new Date(c.due_at), "EEE MMM d")}  ·  {c.state}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(!all || all.length === 0) && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-lg font-medium">No cards yet.</p>
          <p className="mt-1 text-sm text-muted">
            Make a card from a note, or add one manually.
          </p>
          <div className="mt-4">
            <Link
              href="/flashcards/new"
              className="rounded-md bg-accent px-3 py-2 text-sm text-white"
            >
              Add a card
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
