import {NextResponse} from "next/server";
import {z} from "zod";
import {createLearningClient,learningAccess} from "@/lib/learning-engine/server";
import {emptyProblemState,problemPatchSchema,problemReadiness,reviseProblemState} from "@/lib/learning-engine/problem-state";
import {readProblem,saveProblem} from "@/lib/learning-engine/problem-store";

const requestSchema=z.discriminatedUnion("action",[
  z.object({action:z.literal("create"),id:z.string().uuid(),requestId:z.string().uuid(),classId:z.string().uuid(),assignmentId:z.string().uuid(),exerciseId:z.string().min(1).max(200)}).strict(),
  z.object({action:z.literal("revise"),id:z.string().uuid(),requestId:z.string().uuid(),patch:problemPatchSchema}).strict(),
]);
function errorResponse(error:unknown){
  const code=error instanceof Error?error.message:"unavailable";
  return NextResponse.json({error:code==="revision_conflict"?"This record changed. Reload it before saving.":code==="stale_confirmation"?"Review the current text before confirming it.":"The problem record could not be saved."},{status:/conflict|confirmation/.test(code)?409:422});
}
export async function GET(request:Request){
  const client=await createLearningClient(),{data:{user}}=await client.auth.getUser();
  if(!user)return NextResponse.json({error:"Sign in to open your work."},{status:401});
  if(!await learningAccess("assessment",user.id))return NextResponse.json({error:"Practice is not enabled."},{status:404});
  const params=new URL(request.url).searchParams;
  if(!params.has("id")){
    const scope=z.object({assignmentId:z.string().uuid(),exerciseId:z.string().min(1).max(200)}).safeParse(Object.fromEntries(params));
    if(!scope.success)return NextResponse.json({error:"Choose a problem record."},{status:400});
    try{
      const latest=await client.from("learning_problem_records").select("id").eq("owner_id",user.id).eq("assignment_id",scope.data.assignmentId).eq("exercise_id",scope.data.exerciseId).order("updated_at",{ascending:false}).limit(1);
      if(latest.error)throw new Error("store_unavailable");
      const state=latest.data?.[0]?await readProblem(client,user.id,latest.data[0].id):null;
      return NextResponse.json({state},{headers:{"Cache-Control":"no-store"}});
    }catch(error){return errorResponse(error);}
  }
  const id=z.string().uuid().safeParse(params.get("id"));
  if(!id.success)return NextResponse.json({error:"Choose a problem record."},{status:400});
  try{const state=await readProblem(client,user.id,id.data);return state?NextResponse.json({state,readiness:problemReadiness(state)},{headers:{"Cache-Control":"no-store"}}):NextResponse.json({error:"Record unavailable."},{status:404});}catch(error){return errorResponse(error);}
}
export async function POST(request:Request){
  const client=await createLearningClient(),{data:{user}}=await client.auth.getUser();
  if(!user)return NextResponse.json({error:"Sign in to save your work."},{status:401});
  if(!await learningAccess("assessment",user.id))return NextResponse.json({error:"Practice is not enabled."},{status:404});
  const parsed=requestSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:"Check the problem record."},{status:400});
  try{
    const input=parsed.data;
    if(input.action==="create"){
      const assignment=await client.from("assignments").select("id").eq("id",input.assignmentId).eq("class_id",input.classId).eq("owner_id",user.id).maybeSingle();
      if(!assignment.data)return NextResponse.json({error:"Assignment unavailable."},{status:404});
      const existing=await readProblem(client,user.id,input.id);
      if(existing){
        if(existing.scope.classId!==input.classId||existing.scope.assignmentId!==input.assignmentId||existing.scope.exerciseId!==input.exerciseId)return NextResponse.json({error:"Choose a new problem record."},{status:409});
        return NextResponse.json({state:existing,readiness:problemReadiness(existing)});
      }
      const state=emptyProblemState(input.id,{classId:input.classId,assignmentId:input.assignmentId,exerciseId:input.exerciseId});
      await saveProblem(client,user.id,state,0,input.requestId);
      return NextResponse.json({state,readiness:problemReadiness(state)});
    }
    const previous=await readProblem(client,user.id,input.id,input.patch.expectedRevision);
    if(!previous)return NextResponse.json({error:"Record unavailable."},{status:404});
    const state=await reviseProblemState(previous,input.patch);
    await saveProblem(client,user.id,state,previous.revision,input.requestId);
    return NextResponse.json({state,readiness:problemReadiness(state)});
  }catch(error){return errorResponse(error);}
}
