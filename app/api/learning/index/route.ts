import {NextResponse} from "next/server";
import {z} from "zod";
import {createLearningClient,learningAccess} from "@/lib/learning-engine/server";

const schema=z.object({assignmentId:z.string().uuid(),versionId:z.string().regex(/^[a-f0-9]{64}$/),requestId:z.string().uuid().optional()}).strict();
async function handle(request:Request){
  const client=await createLearningClient();
  const {data:{user}}=await client.auth.getUser();
  if(!user)return NextResponse.json({error:"Sign in to prepare search."},{status:401});
  if(!await learningAccess("retrieval",user.id))return NextResponse.json({error:"Source search is unavailable."},{status:404});
  const parsed=schema.safeParse(request.method==="GET"?Object.fromEntries(new URL(request.url).searchParams):await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:"Choose material."},{status:400});
  const input=parsed.data;
  const document=await client.from("learning_documents").select("id").eq("id",input.versionId).eq("assignment_id",input.assignmentId).eq("owner_id",user.id).maybeSingle();
  if(document.error)return NextResponse.json({error:"Material is unavailable."},{status:503});
  if(!document.data)return NextResponse.json({error:"Material not found."},{status:404});
  if(request.method==="POST"){
    if(!input.requestId)return NextResponse.json({error:"A request ID is required."},{status:400});
    const result=await client.functions.invoke("learning-embed",{body:{...input,operation:"index"}});
    if(result.error||!result.data?.ok)return NextResponse.json({error:"Search indexing is paused. Your source is saved."},{status:503});
  }
  const count=await client.from("learning_chunks").select("id",{count:"exact",head:true})
    .eq("version_id",input.versionId).eq("owner_id",user.id).is("embedding",null);
  return count.error?NextResponse.json({error:"Search status is unavailable."},{status:503})
    :NextResponse.json({remaining:count.count??0},{headers:{"Cache-Control":"no-store"}});
}
export const GET=handle;
export const POST=handle;
