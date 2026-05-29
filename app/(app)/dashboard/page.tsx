import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { rankAssignments } from "@/lib/scoring/next-five-minutes";
import { loadProfile } from "@/lib/profile";
import { EnergyPicker } from "./energy-picker";
import { TimeBar } from "./time-bar";
import { TimeBudget } from "./time-budget";
import { formatDueAt } from "@/lib/format";
import { KIND_LABEL } from "@/lib/checklists/templates";
import { TtsButton } from "@/components/tts-button";
import { computeNightBudget } from "@/lib/time-budget/compute";
import { DueCards } from "./due-cards";
import { TokenBudgetBanner } from "./token-budget-banner";
import { ReadingLoadToggle, ReadingLoadBadge } from "./reading-load-toggle";
import { StartSessionButton } from "./start-session-button";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ energy?: "low" | "medium" | "high"; view?: "reading-load" }>;
}) {
  const supabase = await createClient();
  const profile = await loadProfile();
  const energy = (await searchParams).energy ?? "medium";
  const view = (await searchParams).view;
  const isReadingLoadView = view === "reading-load";

  const { data: assignments } = await supabase
    .from("assignments")
    .select("id, title, due_at, created_at, status, estimated_minutes, difficulty, class_id, kind, reading_load, writing_load")
    .neq("status", "submitted")
    .neq("status", "graded")
    .neq("status", "abandoned")
    .order("due_at", { ascending: true, nullsFirst: false });

  // GAP-08: scorer recency. Pull the latest 'started'/'completed' signals in
  // the last 4 hours so rankAssignments can apply the momentum bump per task.
  const fourHoursAgoIso = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
  const { data: signals } = await supabase
    .from("task_signals")
    .select("assignment_id, occurred_at")
    .in("kind", ["started", "completed"])
    .gte("occurred_at", fourHoursAgoIso)
    .order("occurred_at", { ascending: false });

  const recentSignals = (signals ?? [])
    .filter((s): s is { assignment_id: string; occurred_at: string } => s.assignment_id !== null);

  // F12: due flashcards for dashboard tile (calm framing — never "you're behind")
  const { data: dueCards } = await supabase
    .from("flashcards")
    .select("id")
    .lte("due_at", new Date().toISOString())
    .order("due_at", { ascending: true });
  const dueCount = dueCards?.length ?? 0;
  const firstDueId = dueCards?.[0]?.id ?? null;

  const ranked = rankAssignments(
    assignments ?? [],
    recentSignals,
    new Date(),
    energy,
    {
      diagnoses: profile?.diagnoses ?? [],
      extra_time_pct: profile?.extra_time_pct ?? 0,
    },
  );
  const top = ranked[0];
  const rest = isReadingLoadView
    ? [...ranked]
        .filter((a) => a.id !== top?.id)
        .sort((a, b) => (b.reading_load ?? 0) - (a.reading_load ?? 0))
        .slice(0, 5)
    : ranked.slice(1, 4);

  const budget = computeNightBudget(
    (assignments ?? []).map((a) => ({
      id:                a.id,
      title:             a.title,
      classId:           a.class_id,
      kind:              a.kind,
      estimated_minutes: a.estimated_minutes,
      reading_load:      a.reading_load,
      due_at:            a.due_at,
      status:            a.status,
    })),
    {
      diagnoses:      profile?.diagnoses ?? [],
      extra_time_pct: profile?.extra_time_pct ?? 0,
    },
  );

  const ttsOn = profile?.tts_enabled;

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">
          Hi {profile?.display_name || "there"}.
        </h1>
        <p className="text-muted">Pick the next 5 minutes.</p>
      </header>

      {profile && <TokenBudgetBanner profile={profile} />}

      <EnergyPicker current={energy} />
      <ReadingLoadToggle active={isReadingLoadView} />

      {!top ? (
        <EmptyState />
      ) : (
        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
            Right now
          </h2>
          <div className="rounded-2xl border border-accent bg-accent/5 p-5">
            <div className="flex items-start justify-between gap-3">
              <Link href={`/assignments/${top.id}`} className="min-w-0 flex-1">
                <p className="text-lg font-semibold">{top.title}</p>
                <p className="mt-1 text-sm text-muted">
                  {KIND_LABEL[top.kind]}
                  {top.effective_minutes != null &&
                    ` · ~${top.effective_minutes} min for you`}
                </p>
                {top.due_at && (
                  <div className="mt-3">
                    <TimeBar
                      dueAt={top.due_at}
                      createdAt={
                        (assignments ?? []).find((a) => a.id === top.id)?.created_at ?? undefined
                      }
                      status={top.status as import("@/lib/supabase/types").AssignmentStatus}
                      assignmentId={top.id}
                    />
                  </div>
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
              </Link>
              <Link
                href={`/assignments/${top.id}`}
                className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white"
              >
                Start
              </Link>
            </div>
            {ttsOn && (
              <div className="mt-3">
                <TtsButton text={`${top.title}. ${KIND_LABEL[top.kind]}. ${top.due_at ? formatDueAt(top.due_at) : ""}.`} />
              </div>
            )}
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted">
            {isReadingLoadView ? "By reading load" : "Also on deck"}
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
                    <p className="text-xs text-muted">
                      {KIND_LABEL[a.kind]}
                      {a.due_at && ` · ${formatDueAt(a.due_at)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {isReadingLoadView && <ReadingLoadBadge load={a.reading_load} />}
                    <span className="text-xs text-muted">{a.reasons[0] ?? ""}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <DueCards count={dueCount} firstCardId={firstDueId} />

      <TimeBudget totalMinutes={budget.totalMinutes} items={budget.items} />

      <div className="flex flex-wrap gap-2 pt-2">
        <StartSessionButton />
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
