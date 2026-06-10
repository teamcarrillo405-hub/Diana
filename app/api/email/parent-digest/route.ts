import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { buildParentDigestEmail } from "@/lib/email/parent-digest";
import { emailConfigured, sendEmail } from "@/lib/email/resend";
import { growthStory } from "@/lib/portal/growth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Weekly parent digest sender — Vercel cron (Sundays, see vercel.json).
 * Walks students who opted in (notification_preferences.parentDigest),
 * builds the growth story from real activity, sends one calm email.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  if (!emailConfigured()) {
    return NextResponse.json({ error: "Email not configured" }, { status: 500 });
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name, notification_preferences")
    .not("notification_preferences", "is", null)
    .limit(2000);

  const now = new Date();
  const windowDays = 28;
  const windowStartIso = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const weekStartIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const next7Iso = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  let sent = 0;
  for (const profile of profiles ?? []) {
    const prefs = (profile.notification_preferences ?? {}) as {
      parentDigest?: { email?: string; enabled?: boolean };
    };
    const to = prefs.parentDigest?.enabled ? prefs.parentDigest.email : null;
    if (!to || !to.includes("@")) continue;

    const ownerId = profile.user_id as string;
    const [{ data: completed28 }, { data: logs7 }, { count: completedWeek }, { count: upcoming }] =
      await Promise.all([
        supabase
          .from("task_signals")
          .select("occurred_at")
          .eq("owner_id", ownerId)
          .eq("kind", "completed")
          .gte("occurred_at", windowStartIso),
        supabase
          .from("assignment_time_log")
          .select("started_at, ended_at, elapsed_minutes")
          .eq("owner_id", ownerId)
          .gte("started_at", weekStartIso),
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
      ]);

    const minutesThisWeek = (logs7 ?? []).reduce((sum, log) => {
      if (typeof log.elapsed_minutes === "number") return sum + log.elapsed_minutes;
      if (log.ended_at && log.started_at) {
        return (
          sum +
          Math.max(0, Math.round((new Date(log.ended_at).getTime() - new Date(log.started_at).getTime()) / 60000))
        );
      }
      return sum;
    }, 0);

    const story = growthStory({
      completedAt: (completed28 ?? []).map((row) => row.occurred_at as string),
      studyDays: [...new Set((logs7 ?? []).map((row) => String(row.started_at).slice(0, 10)))],
      flashcardReviews: 0,
      submittedCount: 0,
      windowDays,
      now,
    });

    const email = buildParentDigestEmail({
      studentName: (profile.display_name as string) ?? "Your student",
      story,
      stats: {
        completedThisWeek: completedWeek ?? 0,
        minutesThisWeek,
        upcomingNext7Days: upcoming ?? 0,
      },
    });

    const result = await sendEmail({ to, ...email });
    if (result.ok) sent += 1;
  }

  return NextResponse.json({ sent });
}
