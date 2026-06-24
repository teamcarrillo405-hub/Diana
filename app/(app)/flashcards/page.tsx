import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { Brain, ListChecks } from "lucide-react";
import { EmptyStateMark } from "@/components/empty-state-mark";

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
    <div className="diana-page space-y-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-display">Study</h1>
        <Link
          href="/flashcards/new"
          className="nexus-button nexus-button-primary rounded-md px-3 py-1.5 text-sm font-medium"
        >
          + New card
        </Link>
      </header>

      <section className="nexus-panel rounded-2xl border border-subject-ap/25 bg-surface-raised p-4">
        <p className="nexus-kicker text-xs font-medium uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
          Remember bar
        </p>
        <h2 className="mt-1 text-base font-semibold">Quiz first, cards second</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="flex min-w-0 items-start gap-2 rounded-xl border border-border bg-background p-3">
            <Brain size={15} className="mt-0.5 shrink-0 text-indigo-700 dark:text-indigo-300" />
            <p className="text-sm text-muted">Start with the due card so recall stays active.</p>
          </div>
          <div className="flex min-w-0 items-start gap-2 rounded-xl border border-border bg-background p-3">
            <ListChecks size={15} className="mt-0.5 shrink-0 text-indigo-700 dark:text-indigo-300" />
            <p className="text-sm text-muted">New cards should come from notes, readings, or class terms.</p>
          </div>
        </div>
      </section>

      {(due && due.length > 0) ? (
        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
            Due today
          </h2>
          <div className="nexus-panel rounded-2xl border border-accent bg-accent/5 p-5">
            <p className="text-sm">
              {due.length === 1
                ? "1 card to review today."
                : `${due.length} cards to review today.`}
            </p>
            <Link
              href={`/flashcards/${due[0].id}/review`}
              className="nexus-button nexus-button-primary mt-3 inline-block rounded-md px-4 py-2 text-sm font-medium"
            >
              Start review
            </Link>
          </div>
        </section>
      ) : (
        (all && all.length > 0) && (
          <div className="nexus-panel rounded-2xl border border-dashed border-border bg-card p-6 text-center">
            <p className="text-sm">Nothing due right now. Come back tomorrow.</p>
          </div>
        )
      )}

      {upcoming.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
            Coming up
          </h2>
          <ul className="nexus-panel divide-y divide-border rounded-xl border border-border bg-card p-0">
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
        <div className="nexus-panel rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <EmptyStateMark />
          <p className="text-lg font-medium">No cards yet.</p>
          <p className="mt-1 text-sm text-muted">
            Make a card from a note, or add one manually.
          </p>
          <div className="mt-4">
            <Link
              href="/flashcards/new"
              className="nexus-button nexus-button-primary rounded-md px-3 py-2 text-sm"
            >
              Add a card
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
