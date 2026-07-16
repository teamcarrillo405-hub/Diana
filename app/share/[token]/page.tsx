import { createServiceClient } from "@/lib/supabase/service";
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
}: {
  params: Promise<Params>;
}) {
  const { token } = await params;
  const supabase = createServiceClient();
  if (!supabase) return <NotActive />;

  const { data: link, error } = await supabase
    .from("share_links")
    .select("id, token, owner_id, share_type, expires_at, revoked_at, created_at")
    .eq("token", token)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !link) return <NotActive />;

  const typedLink = link as ShareLink;
  const ownerId = typedLink.owner_id;

  if (typedLink.share_type === "parent_summary") {
    const summary = await buildParentSummary(supabase, ownerId, typedLink.expires_at);
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
  return (
    <main id="main-content" className="sd-share-inactive">
      <div>
        <span aria-hidden="true">D</span>
        <p>Private student share</p>
        <h1>Shared link unavailable</h1>
        <p>
          This link may have expired or been turned off. Ask the student for a new
          link if they still want to share this information.
        </p>
      </div>
      <style>{`
        .sd-share-inactive { display:grid; min-height:max(100dvh,852px); place-items:center; overflow:hidden; background:radial-gradient(circle at 50% 22%,rgb(116 192 255 / .13),transparent 18rem),#0f172a; padding:32px; color:#f8fafc; }
        .sd-share-inactive > div { display:grid; width:min(100%,340px); justify-items:center; gap:12px; border:1px solid rgb(255 255 255 / .1); border-radius:28px; background:rgb(255 255 255 / .045); padding:36px 24px; text-align:center; box-shadow:0 24px 70px rgb(0 0 0 / .34); }
        .sd-share-inactive span { display:grid; width:58px; height:58px; place-items:center; border-radius:17px; background:linear-gradient(135deg,#74c0ff,#ff79da); color:#0f172a; font:italic 950 30px/1 var(--font-display),Arial,sans-serif; }
        .sd-share-inactive p { margin:0; color:#94a3b8; font-size:11px; line-height:1.55; }
        .sd-share-inactive p:first-of-type { color:#74c0ff; font-size:9px; font-weight:900; letter-spacing:.16em; text-transform:uppercase; }
        .sd-share-inactive h1 { margin:8px 0 0; font:italic 950 34px/.92 var(--font-display),Arial,sans-serif; letter-spacing:-.04em; text-transform:uppercase; }
      `}</style>
    </main>
  );
}

async function buildParentSummary(
  supabase: ServiceClient,
  ownerId: string,
  expiresAt: string,
): Promise<ParentSummary> {
  const now = new Date();
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
  const nowIso = now.toISOString();
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
