import { NextResponse } from "next/server";
import {
  buildParentDigestEmail,
  parentDigestIdempotencyKey,
  parentDigestRecipient,
} from "@/lib/email/parent-digest";
import { emailConfigured, sendEmail } from "@/lib/email/resend";
import { runObservedCronJob, type CronRunOutcome } from "@/lib/operations/cron-run";
import { growthStory } from "@/lib/portal/growth";
import { hasValidCronBearer } from "@/lib/security/cron-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_PARENT_DIGEST_RECIPIENTS = 300;

/**
 * Weekly parent digest sender — Vercel cron (Sundays, see vercel.json).
 * Walks students who opted in (notification_preferences.parentDigest),
 * builds the growth story from real activity, sends one calm email.
 */
export async function GET(request: Request) {
  if (!hasValidCronBearer(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Authorization required." }, { status: 401 });
  }

  const supabase = createServiceClient();
  return runObservedCronJob({
    routeName: "/api/email/parent-digest",
    jobName: "parent-digest",
    serviceClient: supabase,
    execute: () => runParentDigest(supabase),
    summarize: summarizeParentDigestRun,
  });
}

async function runParentDigest(supabase: ReturnType<typeof createServiceClient>) {
  if (!emailConfigured()) {
    return NextResponse.json({ error: "Email delivery is not configured." }, { status: 503 });
  }

  if (!supabase) {
    return NextResponse.json({ error: "Digest service is not configured." }, { status: 503 });
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("user_id, display_name, notification_preferences")
    .contains("notification_preferences", { parentDigest: { enabled: true } })
    .order("user_id", { ascending: true })
    .limit(MAX_PARENT_DIGEST_RECIPIENTS + 1);
  if (profilesError) {
    return NextResponse.json({ error: "Digest recipients could not be loaded." }, { status: 503 });
  }
  if ((profiles?.length ?? 0) > MAX_PARENT_DIGEST_RECIPIENTS) {
    return NextResponse.json({ error: "Digest recipient scope is temporarily too large." }, { status: 503 });
  }

  const now = new Date();
  const windowDays = 28;
  const windowStartIso = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const weekStartIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const next7Iso = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  let sent = 0;
  let failed = 0;
  for (const profile of profiles ?? []) {
    const recipient = parentDigestRecipient(profile);
    if (!recipient) {
      failed += 1;
      continue;
    }

    const ownerId = recipient.ownerId;
    const [completedResult, logsResult, completedWeekResult, upcomingResult] =
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
    if (
      completedResult.error ||
      logsResult.error ||
      completedWeekResult.error ||
      upcomingResult.error
    ) {
      failed += 1;
      continue;
    }

    const completed28 = completedResult.data;
    const logs7 = logsResult.data;
    const completedWeek = completedWeekResult.count;
    const upcoming = upcomingResult.count;

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
      studentName: recipient.studentName,
      story,
      stats: {
        completedThisWeek: completedWeek ?? 0,
        minutesThisWeek,
        upcomingNext7Days: upcoming ?? 0,
      },
    });

    const result = await sendEmail({
      to: recipient.email,
      ...email,
      idempotencyKey: parentDigestIdempotencyKey(ownerId, now),
    });
    if (result.ok) sent += 1;
    else failed += 1;
  }

  return NextResponse.json(
    { ok: failed === 0, sent, failed },
    { status: failed === 0 ? 200 : 503 },
  );
}

function summarizeParentDigestRun(response: Response, body: unknown): CronRunOutcome {
  const result = asRecord(body);
  const sent = Number(result.sent) || 0;
  const failed = Number(result.failed) || 0;
  return {
    processed: sent + failed,
    succeeded: sent,
    failed,
    retryCount: response.ok ? 0 : Math.max(1, failed),
    errorCode: response.ok ? null : "parent_digest_failed",
    errorSummary: response.ok ? null : "Parent digest delivery did not complete successfully.",
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}
