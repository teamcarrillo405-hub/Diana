import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {z} from "npm:zod@3.23.8";
import {withStudentSecurity} from "../_shared/student-handler.ts";
import {requireStudentContext} from "../_shared/student-auth.ts";
import {learningAccess,learningBody} from "../_shared/learning/rollout.ts";

const schema=z.object({assignmentId:z.string().uuid(),problemId:z.string().min(1).max(200)}).strict();
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
Deno.serve(withStudentSecurity("learning-session", async request=>{
  if(request.method!=="POST")return json({error:"Method not allowed."},405);
  const parsed=schema.safeParse(await learningBody(request));
  if(!parsed.success)return json({error:"Choose a reviewed question."},400);
  const auth=await requireStudentContext(request,{assignmentId:parsed.data.assignmentId,requireAiGreen:true});
  if(auth instanceof Response)return auth;
  if(!await learningAccess("assessment",auth.ownerId,auth.userClient))return json({error:"Assessment is unavailable."},404);
  const result=await auth.serviceClient.rpc("learning_start_independent",{p_owner:auth.ownerId,p_assignment:parsed.data.assignmentId,p_problem:parsed.data.problemId});
  return result.error?json({error:"Choose a reviewed question you have not attempted yet."},409):json({session:result.data});
}));
