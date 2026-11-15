import { DianaRecoveryScreen } from "@/components/screen-design/diana-recovery-screen";
import { createServiceClient } from "@/lib/supabase/service";
import { digestShareToken } from "@/lib/sharing/token";
import type {
  ExternalScoutPortfolio,
  ParentSummary,
  ShareLink,
} from "@/lib/sharing/types";

import { ParentSummaryView } from "./parent-summary";
import { TeacherSnapshotView } from "./teacher-snapshot";

export const dynamic = "force-dynamic";

type Params = { token: string };
type ServiceClient = NonNullable<ReturnType<typeof createServiceClient>>;

export default async function SharePage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const query = (await searchParams) ?? {};
  const scenario = typeof query.sdScenario === "string" ? query.sdScenario : null;
  const nowIso =
    process.env.NODE_ENV !== "production" &&
    process.env.QA_CREATE_USER === "true" &&
    scenario
      ? "2026-09-14T16:30:00.000Z"
      : new Date().toISOString();
  const supabase = createServiceClient();
  if (!supabase) return <NotActive />;

  const tokenDigest = digestShareToken(token);

  const digestResult = await supabase
    .from("share_links")
    .select("id, owner_id, share_type, expires_at, revoked_at, created_at")
    .eq("token_digest", tokenDigest)
    .is("revoked_at", null)
    .gt("expires_at", nowIso)
    .maybeSingle();

  const legacyResult = digestResult.data
    ? null
    : await supabase
      .from("share_links")
      .select("id, owner_id, share_type, expires_at, revoked_at, created_at")
      .eq("token", token)
      .is("revoked_at", null)
      .gt("expires_at", nowIso)
      .maybeSingle();

  const link = digestResult.data ?? legacyResult?.data ?? null;
  const error = link ? null : digestResult.error ?? legacyResult?.error ?? null;

  if (error || !link) return <NotActive />;

  const typedLink = link as ShareLink;
  const ownerId = typedLink.owner_id;

  if (typedLink.share_type === "parent_summary") {
    const summary = await buildParentSummary(
      supabase,
      ownerId,
      typedLink.expires_at,
      nowIso,
    );
    return <ParentSummaryView summary={summary} />;
  }

  const portfolio = await buildExternalScoutPortfolio(
    supabase,
    ownerId,
    typedLink.expires_at,
  );
  return <TeacherSnapshotView portfolio={portfolio} />;
}

function NotActive() {
  return <DianaRecoveryScreen eyebrow="Private report" title="Link unavailable" message="This link may have expired or been turned off. Ask the student for a new link." backHref="/" backLabel="Diana home" />;
}

async function buildParentSummary(
  supabase: ServiceClient,
  ownerId: string,
  expiresAt: string,
  nowIso: string,
): Promise<ParentSummary> {
  const now = new Date(nowIso);
  const day = now.getUTCDay();
  const daysFromMonday = (day + 6) % 7;
  const weekStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysFromMonday,
    ),
  );
  const weekStartIso = weekStart.toISOString();
  const next7Iso = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { count: completedThisWeek } = await supabase
    .from("task_signals")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .eq("kind", "completed")
    .gte("occurred_at", weekStartIso);

  const { count: upcomingNext7Days } = await supabase
    .from("assignments")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .gte("due_at", nowIso)
    .lte("due_at", next7Iso)
    .not("status", "in", "(done,submitted,graded)");

  const { data: logs } = await supabase
    .from("assignment_time_log")
    .select("started_at, ended_at")
    .eq("owner_id", ownerId)
    .gte("started_at", weekStartIso)
    .not("ended_at", "is", null);

  const totalMs = (logs ?? []).reduce((acc, log) => {
    const openedAt = log.started_at ? new Date(log.started_at).getTime() : 0;
    const closedAt = log.ended_at ? new Date(log.ended_at).getTime() : 0;
    return closedAt > openedAt ? acc + (closedAt - openedAt) : acc;
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

async function buildExternalScoutPortfolio(
  supabase: ServiceClient,
  ownerId: string,
  expiresAt: string,
): Promise<ExternalScoutPortfolio> {
  const { data: portfolioRows } = await supabase
    .from("portfolios")
    .select("id, title, description")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(1);

  const portfolio = portfolioRows?.[0] ?? null;
  if (!portfolio) {
    return {
      title: "Shared portfolio",
      description: null,
      items: [],
      expiresAt,
    };
  }

  const { data: itemRows } = await supabase
    .from("portfolio_items")
    .select("id, title, reflection_text, position, created_at")
    .eq("owner_id", ownerId)
    .eq("portfolio_id", portfolio.id)
    .order("position")
    .order("created_at", { ascending: false })
    .limit(6);

  return {
    title: portfolio.title,
    description: portfolio.description,
    items: (itemRows ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      reflectionText: item.reflection_text,
    })),
    expiresAt,
  };
}
