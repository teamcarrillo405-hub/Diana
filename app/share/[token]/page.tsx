import { createServiceClient } from "@/lib/supabase/service";
import { ParentSummaryView } from "./parent-summary";
import { TeacherSnapshotView } from "./teacher-snapshot";
import type {
  ShareLink,
  ParentSummary,
  TeacherSnapshot,
  TeacherClassRow,
} from "@/lib/sharing/types";

export const dynamic = "force-dynamic";

type Params = { token: string };

export default async function SharePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { token } = await params;
  const supabase = createServiceClient();

  // D-15 — missing env → calm fallback (treat as not active)
  if (!supabase) return <NotActive />;

  // D-06 — token lookup with ALL three conditions enforced server-side
  const { data: link, error } = await supabase
    .from("share_links")
    .select("id, token, owner_id, share_type, expires_at, revoked_at, created_at")
    .eq("token", token)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !link) return <NotActive />;

  const typedLink = link as ShareLink;
  // D-07 — owner ID comes from the row, NEVER from query params
  const ownerId = typedLink.owner_id;

  if (typedLink.share_type === "parent_summary") {
    const summary = await buildParentSummary(supabase, ownerId, typedLink.expires_at);
    return <ParentSummaryView summary={summary} />;
  }

  const snapshot = await buildTeacherSnapshot(supabase, ownerId, typedLink.expires_at);
  return <TeacherSnapshotView snapshot={snapshot} />;
}

function NotActive() {
  return (
    <main id="main-content" className="app-field grid min-h-dvh place-items-center p-8">
      <div className="diana-panel max-w-md p-6 text-center">
        <h1 className="text-lg font-semibold">This link is no longer active</h1>
        <p className="mt-2 text-sm text-muted">
          The student who shared this with you may have revoked it, or it may have
          reached the end of its 7-day window. Ask them for a new link if you need
          one.
        </p>
      </div>
    </main>
  );
}

async function buildParentSummary(
  supabase: NonNullable<ReturnType<typeof createServiceClient>>,
  ownerId: string,
  expiresAt: string,
): Promise<ParentSummary> {
  // D-08 — week start: Monday 00:00 UTC for simplicity (timezone refinement deferred)
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun .. 6=Sat
  const daysFromMonday = (day + 6) % 7;
  const weekStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysFromMonday,
    ),
  );
  const weekStartIso = weekStart.toISOString();
  const nowIso = now.toISOString();
  const next7Iso = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // D-09 — completed this week from task_signals (uses occurred_at column)
  const { count: completedThisWeek } = await supabase
    .from("task_signals")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .eq("kind", "completed")
    .gte("occurred_at", weekStartIso);

  // Upcoming next 7 days: assignments with due_at in the window AND not yet done/submitted/graded
  const { count: upcomingNext7Days } = await supabase
    .from("assignments")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .gte("due_at", nowIso)
    .lte("due_at", next7Iso)
    .not("status", "in", "(done,submitted,graded)");

  // D-10 — study time from assignment_time_log (closed sessions only, uses started_at/ended_at)
  const { data: logs } = await supabase
    .from("assignment_time_log")
    .select("started_at, ended_at")
    .eq("owner_id", ownerId)
    .gte("started_at", weekStartIso)
    .not("ended_at", "is", null);

  const totalMs = (logs ?? []).reduce((acc, l) => {
    const o = l.started_at ? new Date(l.started_at).getTime() : 0;
    const c = l.ended_at ? new Date(l.ended_at).getTime() : 0;
    return c > o ? acc + (c - o) : acc;
  }, 0);

  const { data: masteryRows } = await supabase
    .from("mastery_concepts")
    .select("name, mastery_level")
    .eq("owner_id", ownerId)
    .order("mastery_level", { ascending: true })
    .limit(5);

  const { data: progressRows } = await supabase
    .from("teacher_progress_notes")
    .select("author_name, note_text, created_at")
    .eq("owner_id", ownerId)
    .eq("visible_to_parent", true)
    .order("created_at", { ascending: false })
    .limit(5);

  return {
    completedThisWeek: completedThisWeek ?? 0,
    upcomingNext7Days: upcomingNext7Days ?? 0,
    studyMinutesThisWeek: Math.round(totalMs / 60000),
    masteryConcepts: (masteryRows ?? []).map((row) => ({
      name: row.name,
      level: Number(row.mastery_level ?? 0),
    })),
    progressNotes: (progressRows ?? []).map((row) => ({
      authorName: row.author_name,
      noteText: row.note_text,
      createdAt: row.created_at,
    })),
    weekStartIso,
    expiresAt,
  };
}

async function buildTeacherSnapshot(
  supabase: NonNullable<ReturnType<typeof createServiceClient>>,
  ownerId: string,
  expiresAt: string,
): Promise<TeacherSnapshot> {
  const { data: classRows } = await supabase
    .from("classes")
    .select("name, ai_mode")
    .eq("owner_id", ownerId)
    .order("name");

  // profiles uses user_id as the FK column (not id)
  const { data: profile } = await supabase
    .from("profiles")
    .select("reading_font, diagnoses, extra_time_pct")
    .eq("user_id", ownerId)
    .maybeSingle();

  // D-11 — dyslexia derived from diagnoses array (not disability_flags)
  const dyslexia = Array.isArray(profile?.diagnoses)
    ? (profile?.diagnoses as string[]).includes("dyslexia")
    : false;

  const classes: TeacherClassRow[] = (classRows ?? []).map((c) => ({
    name: c.name ?? "Class",
    aiMode: (c.ai_mode as "red" | "yellow" | "green") ?? "green",
  }));

  return {
    classes,
    readingFont: profile?.reading_font ?? "system",
    extendedReadingTime: dyslexia,
    extraTimePct: profile?.extra_time_pct ?? 0,
    expiresAt,
  };
}
