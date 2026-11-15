import { NextResponse } from "next/server";
import { z } from "zod";
import { createLearningClient,learningAccess } from "@/lib/learning-engine/server";
import { documentVersionSchema, type SourcePage } from "@/lib/learning-engine/contracts";
import { structureDocument } from "@/lib/learning-engine/curriculum";
import type { Json } from "@/lib/supabase/types";
import { sourcePageSchema, extractionQuality, correctRegion } from "@/lib/learning-engine/source-layout";

const confirmationSchema = z.object({
  versionId: z.string().regex(/^[a-f0-9]{64}$/),
  pages: z.array(z.object({ page: z.number().int().min(1).max(1500), text: z.string().min(1).max(250000) }).strict()).min(1).max(10).optional(),
  region:z.object({page:z.number().int().positive(),id:z.string().min(1).max(100),text:z.string().min(1).max(12000)}).strict().optional(),
}).strict().refine(value=>!!value.pages!==!!value.region,"Choose page or region confirmation.");
const pagesSchema = z.array(sourcePageSchema);

export async function GET(request: Request) {
  const client = await createLearningClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to view material." },{status:401});
  if (!await learningAccess("retrieval",user.id)) return NextResponse.json({error:"Learning indexing is not enabled for this account."},{status:404});
  const assignmentId = z.string().uuid().safeParse(new URL(request.url).searchParams.get("assignmentId"));
  if (!assignmentId.success) return NextResponse.json({error:"Choose an assignment."},{status:400});
  const pinned=new URL(request.url).searchParams.get("versionId");
  if(pinned&&!z.string().regex(/^[a-f0-9]{64}$/).safeParse(pinned).success)return NextResponse.json({error:"Choose a source version."},{status:400});
  const rows = await client.from("learning_documents").select("id,metadata,pages,created_at").eq("owner_id",user.id)
    .eq("assignment_id",assignmentId.data).order("created_at",{ascending:false}).limit(25);
  if(pinned&&!rows.error&&!rows.data.some(row=>row.id===pinned)){
    const saved=await client.from("learning_documents").select("id,metadata,pages,created_at").eq("owner_id",user.id).eq("assignment_id",assignmentId.data).eq("id",pinned).maybeSingle();
    if(saved.error)return NextResponse.json({error:"Material is unavailable."},{status:503});
    if(saved.data)rows.data.push(saved.data);
  }
  return rows.error ? NextResponse.json({error:"Material is unavailable."},{status:503})
    : NextResponse.json({documents:rows.data.map(row=>({...row,quality:extractionQuality(pagesSchema.parse(row.pages))}))},{headers:{"Cache-Control":"no-store"}});
}

export async function POST(request: Request) {
  const client = await createLearningClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({error:"Sign in to confirm material."},{status:401});
  if (!await learningAccess("retrieval",user.id)) return NextResponse.json({error:"Learning indexing is not enabled for this account."},{status:404});
  const text = await request.text();
  if (text.length>3_000_000) return NextResponse.json({error:"Review up to ten pages at a time."},{status:413});
  let raw: unknown; try {raw=JSON.parse(text);} catch {raw=null;}
  const parsed=confirmationSchema.safeParse(raw);
  if (!parsed.success || (parsed.data.pages && new Set(parsed.data.pages.map((page)=>page.page)).size!==parsed.data.pages.length)) {
    return NextResponse.json({error:"Choose distinct pages to confirm."},{status:400});
  }
  const saved=await client.from("learning_documents").select("*").eq("id",parsed.data.versionId).eq("owner_id",user.id).maybeSingle();
  if (!saved.data) return NextResponse.json({error:"Source version not found."},{status:404});
  const version=documentVersionSchema.parse(saved.data.metadata);
  const oldPages=pagesSchema.parse(saved.data.pages);
  const correctedPages=parsed.data.pages??[];
  const correctedRegion=parsed.data.region;
  if (correctedPages.some((page)=>!oldPages.some((old)=>old.page===page.page)) || (correctedRegion&&!oldPages.some(page=>page.page===correctedRegion.page&&page.regions?.some(region=>region.id===correctedRegion.id)))) return NextResponse.json({error:"A page or region is outside this source."},{status:400});
  const pages: SourcePage[]=oldPages.map((page)=>{
    if(correctedRegion?.page===page.page)return correctRegion(page,correctedRegion.id,correctedRegion.text);
    const corrected=correctedPages.find((item)=>item.page===page.page);
    // Editing full-page text invalidates old region offsets. Keep unchanged
    // geometry only when the text is identical, marking it explicitly confirmed.
    return corrected ? {...page,text:corrected.text,interpretation:"confirmed",regions:corrected.text===page.text?page.regions?.map(region=>({...region,confirmed:true})):undefined} : page;
  });
  const document=await structureDocument({
    ownerId:version.ownerId,assignmentId:version.assignmentId,classId:version.classId,
    documentId:version.documentId,title:version.title,edition:version.edition,subject:version.subject,
    instructionRights:version.instructionRights,parentVersionId:version.id,trainingPermission:"excluded",
    ...(version.sourceAssetHash?{sourceAssetHash:version.sourceAssetHash}:{}),
  },pages);
  const result=await client.rpc("learning_store_document",{p_document:JSON.parse(JSON.stringify(document)) as Json});
  if (result.error) return NextResponse.json({error:"The confirmed version could not be saved."},{status:503});
  return NextResponse.json({ok:true,versionId:document.version.id,chunkCount:document.chunks.length},{headers:{"Cache-Control":"no-store"}});
}
