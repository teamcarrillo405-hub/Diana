import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { learningAttemptSchema, assessmentSchema } from "@/lib/learning-engine/contracts";
import { createLearningClient,learningAccess } from "@/lib/learning-engine/server";
import { z } from "zod";

export async function POST(request: Request) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to save an attempt." }, { status: 401 });
  if (!await learningAccess("assessment", user.id)) return NextResponse.json({ error: "Learning assessment is not enabled for this account." }, { status: 404 });
  const parsed = learningAttemptSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "The attempt needs a problem and revision." }, { status: 400 });
  const response = await client.functions.invoke("learning-assess", { body: parsed.data });
  if (response.error) {
    const context: unknown = response.error.context;
    if (context instanceof Response) {
      const body = await context.json().catch(() => ({ error: "The attempt could not be saved." }));
      return NextResponse.json(body, { status: [400,401,403,404,409,422,429].includes(context.status) ? context.status : 503 });
    }
    return NextResponse.json({ error: "The attempt could not be saved. Your draft is still available." }, { status: 503 });
  }
  const result = z.object({ ok: z.literal(true), assessment: assessmentSchema, replayed: z.boolean() }).safeParse(response.data);
  return result.success ? NextResponse.json(result.data, { headers: { "Cache-Control": "no-store" } })
    : NextResponse.json({ error: "The assessment could not be checked." }, { status: 503 });
}

export async function GET(request: Request) {
  const client = await createLearningClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to view attempts." }, { status: 401 });
  if (!await learningAccess("assessment", user.id)) return NextResponse.json({ error: "Learning assessment is not enabled for this account." }, { status: 404 });
  const assignmentId = z.string().uuid().safeParse(new URL(request.url).searchParams.get("assignmentId"));
  if (!assignmentId.success) return NextResponse.json({ error: "Choose an assignment." }, { status: 400 });
  const result = await client.from("learning_attempts").select("id,payload,assessment,created_at").eq("owner_id", user.id)
    .eq("assignment_id", assignmentId.data).order("created_at", { ascending: false }).limit(100);
  return result.error ? NextResponse.json({ error: "Attempts are unavailable." }, { status: 503 })
    : NextResponse.json({ attempts: result.data }, { headers: { "Cache-Control": "no-store" } });
}
