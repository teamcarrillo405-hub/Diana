import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { retrieveForAssignment,learningAccess } from "@/lib/learning-engine/server";

const inputSchema = z.object({
  assignmentId: z.string().uuid(), query: z.string().min(1).max(1000),
  versionIds: z.array(z.string().regex(/^[a-f0-9]{64}$/)).max(12).optional(),
}).strict();
export async function POST(request: Request) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to use your material." }, { status: 401 });
  if (!await learningAccess("retrieval", user.id)) return NextResponse.json({ error: "Learning retrieval is not enabled for this account." }, { status: 404 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Add a question and assignment." }, { status: 400 });
  const assignment = await client.from("assignments").select("id,class_id").eq("id", parsed.data.assignmentId).eq("owner_id", user.id).maybeSingle();
  if (!assignment.data) return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  const result = await retrieveForAssignment({ ...parsed.data, ownerId: user.id, classId: assignment.data.class_id });
  if (result.status === "source_conflict") return NextResponse.json({ ...result, error: "Choose one edition of each material before searching." },
    { status: 409, headers: { "Cache-Control": "private, no-store" } });
  return NextResponse.json(result, { status: result.status === "index_unavailable" ? 503 : 200, headers: { "Cache-Control": "private, no-store" } });
}
