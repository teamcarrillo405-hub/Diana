import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

const EventBody = z.object({
  eventName: z.string().trim().min(2).max(80),
  feature: z.string().trim().max(80).nullable().optional(),
  route: z.string().trim().max(240).nullable().optional(),
  durationMs: z.number().int().min(0).max(24 * 60 * 60 * 1000).nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = EventBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { error } = await supabase.from("analytics_events").insert({
    owner_id: user.id,
    event_name: parsed.data.eventName,
    feature: parsed.data.feature ?? null,
    route: parsed.data.route ?? null,
    duration_ms: parsed.data.durationMs ?? null,
    metadata: (parsed.data.metadata ?? {}) as Json,
  });

  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({ ok: true });
}
