import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { rankAssignments } from "@/lib/scoring/next-five-minutes";
import { EnergyPicker } from "./energy-picker";
import { formatDueAt } from "@/lib/format";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ energy?: "low" | "medium" | "high" }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const energy = (await searchParams).energy ?? "medium";

  const { data: assignments } = await supabase
    .from("assignments")
    .select("id, title, due_at, status, estimated_minutes, difficulty, class_id")
    .neq("status", "submitted")
    .neq("status", "graded")
    .neq("status", "abandoned")
    .order("due_at", { ascending: true, nullsFirst: false });

  const ranked = rankAssignments(assignments ?? [], new Date(), energy);
  const top = ranked[0];
  const rest = ranked.slice(1, 4);

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", user!.id)
    .single();

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">
          Hi {profile?.display_name || "there"}.
        </h1>
        <p className="text-muted">Pick the next 5 minutes.</p>
      </header>

      <EnergyPicker current={energy} />

      {!top ? (
        <EmptyState />
      ) : (
        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
            Right now
          </h2>
          <Link
            href={`/assignments/${top.id}`}
            className="block rounded-2xl border border-accent bg-accent/5 p-5 transition hover:bg-accent/10"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-lg font-semibold">{top.title}</p>
                {top.due_at && (
                  <p className="mt-1 text-sm text-muted">{formatDueAt(top.due_at)}</p>
                )}
                {top.reasons.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {top.reasons.map((r) => (
                      <li
                        key={r}
                        className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent"
                      >
                        {r}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <span className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white">
                Start
              </span>
            </div>
          </Link>
        </section>
      )}

      {rest.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
            Also on deck
          </h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {rest.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/assignments/${a.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-border/30"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.title}</p>
                    {a.due_at && (
                      <p className="text-xs text-muted">{formatDueAt(a.due_at)}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted">{a.reasons[0] ?? ""}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="pt-2">
        <Link
          href="/assignments/new"
          className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-4 py-2 text-sm hover:bg-border/30"
        >
          + Add an assignment
        </Link>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
      <p className="text-lg font-medium">Nothing on deck.</p>
      <p className="mt-1 text-sm text-muted">
        Add an assignment to get started. Or add a class first so it has somewhere to live.
      </p>
      <div className="mt-4 flex justify-center gap-2">
        <Link
          href="/classes"
          className="rounded-md border border-border px-3 py-2 text-sm hover:bg-border/30"
        >
          Set up a class
        </Link>
        <Link
          href="/assignments/new"
          className="rounded-md bg-accent px-3 py-2 text-sm text-white hover:opacity-90"
        >
          Add an assignment
        </Link>
      </div>
    </div>
  );
}
