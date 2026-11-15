import {NextResponse} from "next/server";
import {z} from "zod";
import {createLearningClient,learningAccess} from "@/lib/learning-engine/server";
const schema=z.object({assignmentId:z.string().uuid(),problemId:z.string().min(1).max(200)}).strict();
export async function POST(request:Request){
  const client=await createLearningClient();
  const {data:{user}}=await client.auth.getUser();
  if(!user)return NextResponse.json({error:"Sign in to practice."},{status:401});
  if(!await learningAccess("assessment",user.id))return NextResponse.json({error:"Assessment is unavailable."},{status:404});
  const input=schema.safeParse(await request.json().catch(()=>null));
  if(!input.success)return NextResponse.json({error:"Choose a question."},{status:400});
  const result=await client.functions.invoke("learning-session",{body:input.data});
  if(result.error)return NextResponse.json({error:"Choose a reviewed question you have not attempted yet."},{status:409});
  return NextResponse.json(result.data,{headers:{"Cache-Control":"no-store"}});
}
