import { NextResponse } from "next/server";
import { z } from "zod";
import {
  sanitizeMonitoringRoute,
  sanitizeMonitoringText,
} from "@/lib/monitoring/privacy";
import { createClient } from "@/lib/supabase/server";

const ErrorBody = z.object({
  route: z.string().trim().max(240).nullable().optional(),
  message: z.string().trim().min(1).max(240),
  digest: z.string().trim().max(120).nullable().optional(),
  severity: z.enum(["info", "warning", "error"]).default("error"),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = ErrorBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const safeMessage = sanitizeMonitoringText(parsed.data.message);
  const safeDigest = parsed.data.digest
    ? sanitizeMonitoringText(parsed.data.digest, "").slice(0, 120)
    : "";
  const { error } = await supabase.from("error_events").insert({
    owner_id: user.id,
    route: sanitizeMonitoringRoute(parsed.data.route),
    message: safeDigest ? `${safeMessage} [${safeDigest}]` : safeMessage,
    stack: null,
    severity: parsed.data.severity,
    diagnosis_tags: [],
  });

  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({ ok: true });
}
