import { NextResponse } from "next/server";
import { z } from "zod";
import { anonymizedDiagnosisTags } from "@/lib/platform/analytics";
import { createClient } from "@/lib/supabase/server";

const ErrorBody = z.object({
  route: z.string().trim().max(240).nullable().optional(),
  message: z.string().trim().min(1).max(2000),
  stack: z.string().trim().max(4000).nullable().optional(),
  severity: z.enum(["info", "warning", "error"]).default("error"),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = ErrorBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("diagnoses")
    .eq("user_id", user.id)
    .maybeSingle();

  const diagnosisTags = anonymizedDiagnosisTags(profile?.diagnoses ?? []);
  const { error } = await supabase.from("error_events").insert({
    owner_id: user.id,
    route: parsed.data.route ?? null,
    message: parsed.data.message,
    stack: parsed.data.stack ?? null,
    severity: parsed.data.severity,
    diagnosis_tags: diagnosisTags,
  });

  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({ ok: true, diagnosisTags });
}
