import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {z} from "npm:zod@3.23.8";
import {withStudentSecurity} from "../_shared/student-handler.ts";
import {requireStudentContext} from "../_shared/student-auth.ts";
import {learningAccess,learningBody} from "../_shared/learning/rollout.ts";
import {prepareSourceExercises,PRACTICE_SOURCE_PAGE_SIZE,MAX_PRACTICE_SOURCE_BLOCKS,MAX_PRACTICE_SOURCE_CHARACTERS} from "../_shared/learning/practice-source.ts";

const schema=z.object({assignmentId:z.string().uuid(),versionId:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
Deno.serve(withStudentSecurity("learning-prepare", async request=>{
  if(request.method!=="POST")return json({error:"Method not allowed."},405);
  const input=schema.safeParse(await learningBody(request));
  if(!input.success)return json({error:"Choose a source version."},400);
  const auth=await requireStudentContext(request,{assignmentId:input.data.assignmentId,requireAiGreen:true});
  if(auth instanceof Response)return auth;
  if(!await learningAccess("assessment",auth.ownerId,auth.userClient))return json({error:"Practice is not enabled."},404);
  const document=await auth.userClient.from("learning_documents").select("metadata").eq("id",input.data.versionId)
    .eq("owner_id",auth.ownerId).eq("assignment_id",input.data.assignmentId).maybeSingle();
  if(!document.data)return json({error:"Source not found."},404);
  const subject=z.enum(["math","reading"]).safeParse(document.data.metadata?.subject);
  if(!subject.success)return json({error:"This source needs a supported subject."},422);
  const payloads:unknown[]=[];
  let sourceCharacters=0;
  // Stable ID pagination retrieves the complete bounded source before source-location sorting.
  // Never teach from an arbitrary partial hash window when a document exceeds the cap.
  for(let offset=0;offset<=MAX_PRACTICE_SOURCE_BLOCKS;offset+=PRACTICE_SOURCE_PAGE_SIZE){
    const last=offset===MAX_PRACTICE_SOURCE_BLOCKS?offset:offset+PRACTICE_SOURCE_PAGE_SIZE-1;
    const page=await auth.userClient.from("learning_blocks").select("payload").eq("owner_id",auth.ownerId)
      .eq("version_id",input.data.versionId).order("id").range(offset,last);
    if(page.error)return json({error:"Practice is unavailable."},503);
    const rows=page.data??[];
    sourceCharacters+=rows.reduce((total,row)=>total+(typeof row.payload?.text==="string"?row.payload.text.length:0),0);
    if(payloads.length+rows.length>MAX_PRACTICE_SOURCE_BLOCKS||sourceCharacters>MAX_PRACTICE_SOURCE_CHARACTERS){
      return json({error:"This source exceeds the practice preparation limit. Choose a chapter or a shorter source.",
        truncated:true,sourceTruncated:true,sourceBlockLimit:MAX_PRACTICE_SOURCE_BLOCKS,sourceCharacterLimit:MAX_PRACTICE_SOURCE_CHARACTERS},422);
    }
    payloads.push(...rows.map(row=>row.payload));
    if(rows.length<last-offset+1)break;
  }
  const prepared=prepareSourceExercises(subject.data,payloads);
  const exercises=prepared.exercises.map(exercise=>({...exercise,owner_id:auth.ownerId,
    assignment_id:input.data.assignmentId,version_id:input.data.versionId}));
  if(exercises.length){
    // Existing exercise IDs and saved prompts remain immutable, including legacy reading prompts.
    // Visible excerpt prompts apply to newly stored exercises; historical rows need a separate migration/display policy.
    const saved=await auth.serviceClient.from("learning_exercises").upsert(exercises,{onConflict:"id",ignoreDuplicates:true});
    if(saved.error)return json({error:"Practice could not be saved."},503);
  }
  return json({ok:true,count:exercises.length,reviewed:false,coverage:prepared.coverage});
}));
