import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  isAllowedPushEndpoint,
  MAX_PUSH_SUBSCRIPTIONS_PER_OWNER,
  validatePushEndpoint,
} from "@/lib/push/subscription";

export const dynamic = "force-dynamic";

const Endpoint = z.string().url().max(2_048).refine(isAllowedPushEndpoint);
const PushKey = z.string().min(1).max(512).regex(/^[A-Za-z0-9_-]+={0,2}$/u);
const SubscribeInput = z.object({
  endpoint: Endpoint,
  keys: z.object({ p256dh: PushKey, auth: PushKey }),
});
const DeleteInput = z.object({ endpoint: Endpoint });

/** Save this device's Web Push subscription for the signed-in student. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage notifications." }, { status: 401 });

  const parsed = SubscribeInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "That notification subscription is not available." }, { status: 400 });
  if (!await validatePushEndpoint(parsed.data.endpoint)) {
    return NextResponse.json({ error: "That notification subscription is not available." }, { status: 400 });
  }

  const { data: existing, error: existingError } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("owner_id", user.id)
    .eq("endpoint", parsed.data.endpoint)
    .maybeSingle();
  if (existingError) {
    return NextResponse.json({ error: "Notifications could not be checked just now." }, { status: 503 });
  }

  if (!existing) {
    const { count, error: countError } = await supabase
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id);
    if (countError) {
      return NextResponse.json({ error: "Notifications could not be checked just now." }, { status: 503 });
    }
    if ((count ?? 0) >= MAX_PUSH_SUBSCRIPTIONS_PER_OWNER) {
      return NextResponse.json(
        { error: "Notifications are already active on several devices. Turn one off before adding another." },
        { status: 429 },
      );
    }
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      owner_id: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
    },
    { onConflict: "endpoint" },
  );
  if (error) return NextResponse.json({ error: "Notifications could not be saved just now." }, { status: 503 });
  return NextResponse.json({ ok: true });
}

/** Remove a subscription (student turned notifications off on this device). */
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage notifications." }, { status: 401 });

  const parsed = DeleteInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That notification subscription is not available." }, { status: 400 });
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("owner_id", user.id)
    .eq("endpoint", parsed.data.endpoint);
  if (error) {
    return NextResponse.json({ error: "Notifications could not be updated just now." }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
