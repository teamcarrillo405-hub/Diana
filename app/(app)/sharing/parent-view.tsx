import { createClient } from "@/lib/supabase/server";
import { SharingSection } from "../settings/sharing-section";
import { growthStory } from "@/lib/portal/growth";
import { ParentDigestForm } from "../parent-share/parent-digest-form";
import { loadProfile } from "@/lib/profile";

// Parent tab of /sharing. Read-only effort summary — no grades, assignment
// names, or AI detail. Extracted from the former /parent-share page.
export async function ParentSharingView() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const ownerId = user?.id ?? "";
  const now = new Date();
  const day = now.getUTCDay();
  const daysFromMonday = (day + 6) % 7;
  const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysFromMonday));
  const weekStartIso = weekStart.toISOString();
  const next7Iso = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ count: completedThisWeek }, { count: upcomingNext7Days }, { data: logs }, { data: notes }] = await Promise.all([
    supabase
      .from("task_signals")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", ownerId)
      .eq("kind", "completed")
      .gte("occurred_at", weekStartIso),
    supabase
      .from("assignments")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", ownerId)
      .gte("due_at", now.toISOString())
      .lte("due_at", next7Iso)
      .not("status", "in", "(submitted,graded,abandoned)"),
    supabase
      .from("assignment_time_log")
      .select("started_at, ended_at")
      .eq("owner_id", ownerId)
      .gte("started_at", weekStartIso)
      .not("ended_at", "is", null),
    supabase
      .from("teacher_progress_notes")
      .select("author_name, note_text, created_at")
      .eq("owner_id", ownerId)
      .eq("visible_to_parent", true)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const totalMs = (logs ?? []).reduce((acc, row) => {
    const start = row.started_at ? new Date(row.started_at).getTime() : 0;
    const end = row.ended_at ? new Date(row.ended_at).getTime() : 0;
    return end > start ? acc + (end - start) : acc;
  }, 0);

  // Four-week growth story — trajectory, not snapshot.
  const windowDays = 28;
  const windowStartIso = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: completed28 }, { data: logs28 }, { count: reviews28 }, { count: submitted28 }] =
    await Promise.all([
      supabase
        .from("task_signals")
        .select("occurred_at")
        .eq("owner_id", ownerId)
        .eq("kind", "completed")
        .gte("occurred_at", windowStartIso),
      supabase
        .from("assignment_time_log")
        .select("started_at")
        .eq("owner_id", ownerId)
        .gte("started_at", windowStartIso),
      supabase
        .from("flashcard_reviews")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", ownerId)
        .gte("reviewed_at", windowStartIso),
      supabase
        .from("assignments")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", ownerId)
        .in("status", ["submitted", "graded"])
        .gte("updated_at", windowStartIso),
    ]);
  const story = growthStory({
    completedAt: (completed28 ?? []).map((row) => row.occurred_at as string),
    studyDays: [...new Set((logs28 ?? []).map((row) => String(row.started_at).slice(0, 10)))],
    flashcardReviews: reviews28 ?? 0,
    submittedCount: submitted28 ?? 0,
    windowDays,
    now,
  });

  const profile = await loadProfile();
  const prefs = (profile?.notification_preferences ?? {}) as {
    parentDigest?: { email?: string; enabled?: boolean };
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">Parent portal</p>
        <h2 className="text-display">Read-only weekly summary</h2>
        <p className="text-sm text-muted">
          Parent links show effort, time, upcoming workload, and student-approved progress notes. They do not show assignment names, grades, private notes, or AI interaction details.
        </p>
      </header>

      <section className="space-y-2 rounded-2xl border border-brand/20 bg-brand/5 p-4">
        <h3 className="text-sm font-semibold">{story.headline}</h3>
        <ul className="space-y-1 text-sm text-muted">
          {story.facts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
        <p className="text-xs text-muted">The last four weeks, from real activity — no streaks, no rankings.</p>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <Stat label="Assignments finished this week" value={completedThisWeek ?? 0} />
        <Stat label="Upcoming in the next 7 days" value={upcomingNext7Days ?? 0} />
        <Stat label="Minutes spent studying this week" value={Math.round(totalMs / 60000)} />
      </section>

      <ParentDigestForm
        initialEmail={prefs.parentDigest?.email ?? ""}
        initialEnabled={Boolean(prefs.parentDigest?.enabled)}
      />

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold">Parent-visible progress notes</h3>
        {(notes ?? []).length === 0 ? (
          <p className="text-sm text-muted">No shared progress notes yet.</p>
        ) : (
          <ul className="space-y-2">
            {(notes ?? []).map((note) => (
              <li key={`${note.created_at}-${note.author_name}`} className="rounded-lg border border-border bg-bg p-3 text-sm">
                <p className="font-medium">{note.author_name}</p>
                <p className="text-muted">{note.note_text}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <SharingSection />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-3xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}
