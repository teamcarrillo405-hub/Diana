import {NextResponse} from "next/server";
import {z} from "zod";
import {createClient} from "@/lib/supabase/server";

const querySchema=z.object({assignmentId:z.string().uuid(),sourceId:z.string().uuid()});
const allowedTypes=new Set(["application/pdf","image/png","image/jpeg","image/webp"]);

/** Read-only original file access. AI rollout flags never hide a student's own files. */
export async function GET(request:Request){
  const client=await createClient();
  const {data:{user}}=await client.auth.getUser();
  if(!user)return NextResponse.json({error:"Sign in to view the source."},{status:401});
  const query=querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if(!query.success)return NextResponse.json({error:"Choose an attached file."},{status:400});
  const {assignmentId,sourceId}=query.data;
  const assignment=await client.from("assignments").select("class_id").eq("id",assignmentId).eq("owner_id",user.id).maybeSingle();
  if(!assignment.data)return NextResponse.json({error:"Material is unavailable."},{status:404});
  if(assignment.data.class_id){
    const course=await client.from("classes").select("id").eq("id",assignment.data.class_id).eq("owner_id",user.id).maybeSingle();
    if(!course.data)return NextResponse.json({error:"Material is unavailable."},{status:404});
  }
  const source=await client.from("assignment_sources").select("storage_key,mime_type").eq("id",sourceId).eq("assignment_id",assignmentId).eq("owner_id",user.id).maybeSingle();
  const key=source.data?.storage_key;
  const mime=source.data?.mime_type;
  if(!key?.startsWith(user.id+"/")||!mime||!allowedTypes.has(mime))return NextResponse.json({error:"Original file is unavailable."},{status:404});
  const file=await client.storage.from("note-docs").download(key);
  if(file.error||!file.data||file.data.size>30_000_000)return NextResponse.json({error:"Original file is unavailable."},{status:503});
  return new Response(await file.data.arrayBuffer(),{headers:{"Content-Type":mime,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
