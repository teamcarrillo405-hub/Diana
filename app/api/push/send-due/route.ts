import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { buildDailyDigest } from "@/lib/push/digest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily push digest sender — invoked by Vercel cron (see vercel.json).
 * Service role: walks every subscribed student, builds at most one calm
 * notification each, and prunes dead subscriptions (410/404).
 * Protected by CRON_SECRET; Vercel cron sends it as a bearer token.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublic || !vapidPrivate) {
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:support@diana.app", vapidPublic, vapidPrivate);

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("id, owner_id, endpoint, p256dh, auth");
  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, owners: 0 });
  }

  const owners = [...new Set(subscriptions.map((s) => s.owner_id as string))];
  const now = new Date();
  const horizon = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString();

  let sent = 0;
  for (const ownerId of owners) {
    const { data: assignments } = await supabase
      .from("assignments")
      .select("title, kind, due_at")
      .eq("owner_id", ownerId)
      .not("due_at", "is", null)
      .gte("due_at", new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString())
      .lte("due_at", horizon)
      .not("status", "in", "(submitted,graded,abandoned)")
      .limit(30);

    const digest = buildDailyDigest(assignments ?? [], now);
    if (!digest) continue;

    const payload = JSON.stringify(digest);
    for (const sub of subscriptions.filter((s) => s.owner_id === ownerId)) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint as string, keys: { p256dh: sub.p256dh as string, auth: sub.auth as string } },
          payload,
        );
        sent += 1;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }
  }

  return NextResponse.json({ sent, owners: owners.length });
}
