import {NextResponse} from "next/server";
import {z} from "zod";
import {createLearningClient,learningAccess} from "@/lib/learning-engine/server";
import {prepareSourceExercises} from "@/supabase/functions/_shared/learning/practice-source";

const schema=z.object({assignmentId:z.string().uuid(),versionId:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
export async function POST(request:Request){
  const client=await createLearningClient();
  const {data:{user}}=await client.auth.getUser();
  if(!user)return NextResponse.json({error:"Sign in to practice."},{status:401});
  if(!await learningAccess("assessment",user.id))return NextResponse.json({error:"Practice is not enabled for this account."},{status:404});
  const input=schema.safeParse(await request.json().catch(()=>null));
  if(!input.success)return NextResponse.json({error:"Choose source material."},{status:400});
  const prepared=await client.functions.invoke("learning-prepare",{body:input.data});
  if(prepared.error){
    const context=prepared.error.context;
    if(context instanceof Response&&context.status===422){
      const details=z.object({sourceTruncated:z.literal(true)}).safeParse(await context.json().catch(()=>null));
      if(details.success)return NextResponse.json({error:"Choose a chapter or a shorter source to prepare practice.",sourceTruncated:true},{status:422});
    }
    return NextResponse.json({error:"Practice is unavailable right now."},{status:503});
  }
  const exercises=await client.rpc("learning_list_exercises",{p_assignment:input.data.assignmentId,p_versions:[input.data.versionId]});
  if(exercises.error)return NextResponse.json({error:"Practice could not load."},{status:503});
  const blocks=exercises.data.length?await client.from("learning_blocks").select("id,payload").eq("owner_id",user.id)
    .eq("version_id",input.data.versionId).in("id",[...new Set(exercises.data.map(item=>item.id.slice(0,64)))]):{data:[],error:null};
  if(blocks.error)return NextResponse.json({error:"Question order is unavailable."},{status:503});
  const ordered=exercises.data.map(item=>{
    const payload=blocks.data?.find(block=>block.id===item.id.slice(0,64))?.payload;
    const block=z.object({problemNumber:z.string().nullable(),location:z.object({page:z.number()})}).safeParse(payload);
    // Attach the original excerpt to legacy auto-generated reading prompts at display time.
    // Reviewed educator prompts and immutable stored exercise records are preserved.
    const visiblePrompt=!item.reviewed&&item.skill_id.startsWith("reading.")
      ?prepareSourceExercises("reading",[payload]).exercises.find(exercise=>exercise.id===item.id)?.prompt??item.prompt:item.prompt;
    return {...item,prompt:visiblePrompt,pageNumber:block.success?block.data.location.page:1,label:block.success&&block.data.problemNumber
      ?"Problem "+block.data.problemNumber:item.skill_id.replace(/^reading\./,"").replaceAll("_"," ")};
  }).sort((a,b)=>a.pageNumber-b.pageNumber||a.label.localeCompare(b.label,undefined,{numeric:true}));
  const coverage=z.object({exerciseLimitReached:z.boolean(),exerciseLimit:z.number().int().positive(),scope:z.enum(["one_reading_excerpt","supported_equation_values"])}).safeParse(prepared.data?.coverage);
  return NextResponse.json({ok:true,exercises:ordered,...(coverage.success?{coverage:coverage.data}:{})},{headers:{"Cache-Control":"no-store"}});
}
