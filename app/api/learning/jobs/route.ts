import {NextResponse} from "next/server";
import {z} from "zod";
import {createLearningClient,learningAccess} from "@/lib/learning-engine/server";
import {advancePdf} from "@/lib/learning-engine/ingestion";
export const runtime="nodejs";
export const maxDuration=60;
export async function GET(request:Request){
  const client=await createLearningClient(),{data:{user}}=await client.auth.getUser();
  if(!user)return NextResponse.json({error:"Sign in to view preparation."},{status:401});
  if(!await learningAccess("retrieval",user.id))return NextResponse.json({error:"Preparation is unavailable."},{status:404});
  const input=z.object({assignmentId:z.string().uuid()}).strict().safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if(!input.success)return NextResponse.json({error:"Choose your material."},{status:400});
  const assignment=await client.from("assignments").select("id").eq("id",input.data.assignmentId).eq("owner_id",user.id).maybeSingle();
  if(assignment.error)return NextResponse.json({error:"Preparation could not load."},{status:503});
  if(!assignment.data)return NextResponse.json({error:"Material unavailable."},{status:404});
  const result=await client.from("learning_ingestion_jobs").select("id,source_id,subject,state,cursor,total_pages,version_id,attempts,error_code,lease_until,updated_at").eq("owner_id",user.id).eq("assignment_id",input.data.assignmentId).order("updated_at",{ascending:false}).limit(25);
  if(result.error)return NextResponse.json({error:"Preparation could not load."},{status:503});
  return NextResponse.json({jobs:result.data,limit:25},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(request:Request){
  const client=await createLearningClient();
  const {data:{user}}=await client.auth.getUser();
  if(!user)return NextResponse.json({error:"Sign in to prepare material."},{status:401});
  if(!await learningAccess("retrieval",user.id))return NextResponse.json({error:"Material preparation is not enabled."},{status:404});
  const input=z.object({jobId:z.string().uuid()}).strict().safeParse(await request.json().catch(()=>null));
  if(!input.success)return NextResponse.json({error:"Choose a preparation job."},{status:400});
  try{return NextResponse.json(await advancePdf(input.data.jobId,user.id),{headers:{"Cache-Control":"no-store"}});}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Preparation paused."},{status:503});}
}
