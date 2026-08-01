import { NextResponse } from "next/server";
import webpush from "web-push";
import { runObservedCronJob, type CronRunOutcome } from "@/lib/operations/cron-run";
import { buildDailyDigest } from "@/lib/push/digest";
import { dailyPushTopic, sendPushWithRetry } from "@/lib/push/delivery";
import { validatePushEndpoint } from "@/lib/push/subscription";
import { hasValidCronBearer } from "@/lib/security/cron-auth";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_PUSH_SUBSCRIPTIONS_PER_RUN = 1_000;
const MAX_PUSH_OWNERS_PER_RUN = 300;

/**
 * Daily push digest sender — invoked by Vercel cron (see vercel.json).
 * Service role: walks every subscribed student, builds at most one calm
 * notification each, and prunes dead subscriptions (410/404).
 * Protected by CRON_SECRET; Vercel cron sends it as a bearer token.
 */
export async function GET(request: Request) {
  if (!hasValidCronBearer(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Authorization required." }, { status: 401 });
  }

  const supabase = createServiceClient();
  return runObservedCronJob({
    routeName: "/api/push/send-due",
    jobName: "push-send-due",
    serviceClient: supabase,
    execute: () => runDuePush(supabase),
    summarize: summarizeDuePushRun,
  });
}

async function runDuePush(supabase: ReturnType<typeof createServiceClient>) {
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublic || !vapidPrivate) {
    return NextResponse.json({ error: "Push delivery is not configured." }, { status: 503 });
  }
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:support@diana.app", vapidPublic, vapidPrivate);
  } catch {
    return NextResponse.json({ error: "Push delivery is not configured." }, { status: 503 });
  }

  if (!supabase) {
    return NextResponse.json({ error: "Push service is not configured." }, { status: 503 });
  }

  const { data: subscriptions, error: subscriptionsError } = await supabase
    .from("push_subscriptions")
    .select("id, owner_id, endpoint, p256dh, auth")
    .order("owner_id", { ascending: true })
    .order("id", { ascending: true })
    .limit(MAX_PUSH_SUBSCRIPTIONS_PER_RUN + 1);
  if (subscriptionsError) {
    return NextResponse.json({ error: "Push recipients could not be loaded." }, { status: 503 });
  }
  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, owners: 0, failed: 0 });
  }
  if (subscriptions.length > MAX_PUSH_SUBSCRIPTIONS_PER_RUN) {
    return NextResponse.json({ error: "Push recipient scope is temporarily too large." }, { status: 503 });
  }

  const owners = [...new Set(subscriptions.map((s) => s.owner_id as string))];
  if (owners.length > MAX_PUSH_OWNERS_PER_RUN) {
    return NextResponse.json({ error: "Push owner scope is temporarily too large." }, { status: 503 });
  }
  const now = new Date();
  const horizon = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString();
  const topic = dailyPushTopic(now);
  const validatedOrigins = new Map<string, Promise<boolean>>();

  let sent = 0;
  let failed = 0;
  for (const ownerId of owners) {
    const { data: assignments, error: assignmentsError } = await supabase
      .from("assignments")
      .select("title, kind, due_at")
      .eq("owner_id", ownerId)
      .not("due_at", "is", null)
      .gte("due_at", new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString())
      .lte("due_at", horizon)
      .not("status", "in", "(submitted,graded,abandoned)")
      .limit(30);
    if (assignmentsError) {
      failed += subscriptions.filter((subscription) => subscription.owner_id === ownerId).length;
      continue;
    }

    const digest = buildDailyDigest(assignments ?? [], now);
    if (!digest) continue;

    const payload = JSON.stringify(digest);
    for (const sub of subscriptions.filter((s) => s.owner_id === ownerId)) {
      let origin: string;
      try {
        origin = new URL(sub.endpoint as string).origin;
      } catch {
        failed += 1;
        continue;
      }
      const endpointIsSafe = validatedOrigins.get(origin) ?? validatePushEndpoint(sub.endpoint as string);
      validatedOrigins.set(origin, endpointIsSafe);
      if (!await endpointIsSafe) {
        failed += 1;
        continue;
      }

      const result = await sendPushWithRetry({
        send: (subscription, message, options) => webpush.sendNotification(subscription, message, options),
        subscription: {
          endpoint: sub.endpoint as string,
          keys: { p256dh: sub.p256dh as string, auth: sub.auth as string },
        },
        payload,
        topic,
      });
      if (result.ok) {
        sent += 1;
        continue;
      }

      failed += 1;
      if (result.expired) {
        const { error: deleteError } = await supabase
          .from("push_subscriptions")
          .delete()
          .eq("id", sub.id)
          .eq("owner_id", ownerId);
        if (deleteError) failed += 1;
      }
    }
  }

  return NextResponse.json(
    { ok: failed === 0, sent, owners: owners.length, failed },
    { status: failed === 0 ? 200 : 503 },
  );
}

function summarizeDuePushRun(response: Response, body: unknown): CronRunOutcome {
  const result = asRecord(body);
  const sent = Number(result.sent) || 0;
  const failed = Number(result.failed) || 0;
  return {
    processed: sent + failed,
    succeeded: sent,
    failed,
    retryCount: response.ok ? 0 : Math.max(1, failed),
    errorCode: response.ok ? null : "push_send_due_failed",
    errorSummary: response.ok ? null : "Scheduled push delivery did not complete successfully.",
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}
