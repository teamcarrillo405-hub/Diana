import { NextResponse } from "next/server";
import { z } from "zod";
import { createLearningClient } from "@/lib/learning-engine/server";
import { schedule } from "@/lib/fsrs/fsrs";
import { adjustDueDate, intervalMultiplier } from "@/lib/fsrs/personalize";
import type { Json } from "@/lib/supabase/types";

const base = z.object({ ownerId: z.string().uuid(), eventId: z.string().min(1).max(300) });
const schema = z.discriminatedUnion("kind", [
  base.extend({ kind: z.literal("note"), item: z.object({
    tempId: z.string().min(1).max(200), noteId: z.string().uuid().nullable(),
    title: z.string().min(1).max(200), bodyText: z.string().max(50000),
    classId: z.string().uuid().nullable(), assignmentId: z.string().uuid().nullable(),
    source: z.enum(["manual","voice","audio_upload","doc_upload","lecture"]),
    updatedAt: z.string().datetime(),
  }).strict() }).strict(),
  base.extend({ kind: z.literal("review"), item: z.object({
    tempId: z.string().min(1).max(200), cardId: z.string().uuid(),
    rating: z.union([z.literal(1),z.literal(2),z.literal(3),z.literal(4)]),
    queuedAt: z.string().datetime(),
  }).strict() }).strict(),
]);
export async function POST(request: Request) {
  const client = await createLearningClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to sync." }, { status: 401 });
  const text = await request.text();
  if (text.length > 220000) return NextResponse.json({ error: "This draft is too large to sync." }, { status: 413 });
  let body: unknown; try { body = JSON.parse(text); } catch { body = null; }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "The saved work needs a review." }, { status: 400 });
  if (parsed.data.ownerId !== user.id) return NextResponse.json({ error: "Switch back to the account that saved this work." }, { status: 403 });
  let scheduling: Json | undefined;
  if (parsed.data.kind === "review") {
    const item = parsed.data.item;
    const [card, history] = await Promise.all([
      client.from("flashcards").select("state,stability,difficulty,due_at,reps,lapses,last_review_at").eq("id",item.cardId).eq("owner_id",user.id).maybeSingle(),
      client.from("flashcard_reviews").select("rating,elapsed_days,stability").eq("owner_id",user.id).order("reviewed_at",{ascending:false}).limit(200),
    ]);
    if (card.error || history.error) return NextResponse.json({ error: "Review sync is unavailable." }, { status: 503 });
    if (!card.data) return NextResponse.json({ error: "Card not found." }, { status: 404 });
    const row = card.data;
    const state = z.enum(["new","learning","review","relearning"]).safeParse(row.state);
    const time = new Date(item.queuedAt);
    if (!state.success || time.getTime() > Date.now() + 60000 || Date.now() - time.getTime() > 30*86400000) {
      return NextResponse.json({ status: "needs_confirmation" }, { status: 409 });
    }
    const result = schedule({
      state: state.data, stability: Number(row.stability), difficulty: Number(row.difficulty), dueAt: row.due_at,
      reps: row.reps, lapses: row.lapses, lastReviewAt: row.last_review_at,
    }, item.rating, time);
    result.card.dueAt = adjustDueDate(time,result.card.dueAt,intervalMultiplier(history.data.map((event) => ({
      rating: Number(event.rating), elapsed_days: Number(event.elapsed_days), stability: Number(event.stability),
    }))));
    scheduling = JSON.parse(JSON.stringify({ ...result, baseReps: row.reps, baseLastReviewAt: row.last_review_at })) as Json;
  }
  const synced = await client.rpc("apply_offline_event", {
    p_owner: user.id, p_event: JSON.parse(JSON.stringify(parsed.data)) as Json, ...(scheduling ? { p_schedule: scheduling } : {}),
  });
  if (synced.error) return NextResponse.json({ error: "Sync is paused. Your saved work remains on this device." }, { status: 503 });
  const result = z.object({ status: z.enum(["applied","conflict","needs_confirmation"]) }).passthrough().safeParse(synced.data);
  return result.success ? NextResponse.json(result.data, { status: result.data.status === "applied" ? 200 : 409, headers: { "Cache-Control":"no-store" } })
    : NextResponse.json({ error: "Sync could not be checked." }, { status: 503 });
}
