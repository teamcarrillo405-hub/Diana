import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { loadAssignmentHomeworkKernel } from "@/lib/assignment-help/server-understanding";
import { indexAssignmentSource,learningAccess } from "@/lib/learning-engine/server";
import {enqueuePdf} from "@/lib/learning-engine/ingestion";
import {documentSubjectSchema} from "@/lib/learning-engine/contracts";

const inputSchema = z.object({ assignmentId: z.string().uuid(), sourceId: z.union([z.string().uuid(),z.literal("assignment-directions"),z.literal("assignment-rubric"),z.literal("assignment-problems")]), subject: documentSubjectSchema }).strict();
export async function POST(request: Request) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to add material." }, { status: 401 });
  if (!await learningAccess("retrieval", user.id)) return NextResponse.json({ error: "Learning indexing is not enabled for this account." }, { status: 404 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose an assignment and source." }, { status: 400 });
  const kernel = await loadAssignmentHomeworkKernel({ supabase: client, ownerId: user.id, assignmentId: parsed.data.assignmentId });
  if (!kernel) return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  try {
    if(z.string().uuid().safeParse(parsed.data.sourceId).success){
      const source=await client.from("assignment_sources").select("mime_type").eq("id",parsed.data.sourceId).eq("owner_id",user.id).eq("assignment_id",parsed.data.assignmentId).maybeSingle();
      if(source.error)return NextResponse.json({error:"Source access could not be checked."},{status:503});
      if(!source.data)return NextResponse.json({error:"Source not found."},{status:404});
      if(source.data?.mime_type==="application/pdf")return NextResponse.json({ok:true,...await enqueuePdf({ownerId:user.id,...parsed.data})},{headers:{"Cache-Control":"no-store"}});
    }
    const indexed = await indexAssignmentSource({ ownerId: user.id, kernel, ...parsed.data });
    // Text preparation uses local indexing. Hosted semantic indexing is a separate explicit action.
    return NextResponse.json({ ok: true, ...indexed, semanticIndex: { status: "not_requested", requested: false } },
      { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The source could not be indexed." }, { status: 503 });
  }
}
export const runtime = "nodejs";
