import {NextResponse} from "next/server";
import {z} from "zod";
import {createLearningClient,learningAccess} from "@/lib/learning-engine/server";
import {loadChapterPractice,CHAPTER_PRACTICE_VERSION,CHAPTER_VARIANT_COUNTS} from "@/lib/learning-engine/chapter-practice";
import {loadCurriculumGraph,listChapterSkills,getSkill,selectPrerequisites} from "@/lib/learning-engine/curriculum-graph";
import {chapterExerciseFromId,runChapterSession,startChapterSession} from "@/lib/learning-engine/chapter-session";
import {readProblem,saveProblem} from "@/lib/learning-engine/problem-store";

const schema=z.discriminatedUnion("action",[
  z.object({action:z.literal("start"),id:z.string().uuid(),requestId:z.string().uuid(),classId:z.string().uuid(),exerciseId:z.string().min(1).max(200)}).strict(),
  z.object({action:z.literal("respond"),id:z.string().uuid(),requestId:z.string().uuid(),expectedRevision:z.number().int().positive(),mode:z.enum(["hint","check","related_example"]),response:z.string().max(4000),confirmed:z.boolean(),modality:z.enum(["typed","handwriting","voice"])}).strict(),
]);
const querySchema=z.object({classId:z.string().uuid(),chapter:z.coerce.number().int().min(1).max(9),variant:z.coerce.number().int().min(0).max(10000).default(0)});
async function authorize():Promise<{response:NextResponse}|{client:Awaited<ReturnType<typeof createLearningClient>>;user:{id:string}}>{
  const client=await createLearningClient(),{data:{user}}=await client.auth.getUser();
  if(!user)return {response:NextResponse.json({error:"Sign in to practice."},{status:401})} as const;
  if(!await learningAccess("assessment",user.id))return {response:NextResponse.json({error:"Practice is not enabled for this account."},{status:404})} as const;
  return {client,user} as const;
}
async function ownedClass(client:Awaited<ReturnType<typeof createLearningClient>>,ownerId:string,classId:string){
  const result=await client.from("classes").select("id,ai_mode").eq("id",classId).eq("owner_id",ownerId).maybeSingle();
  return result.data;
}
function failure(error:unknown){
  const conflict=error instanceof Error&&/conflict/.test(error.message);
  return NextResponse.json({error:conflict?"Your saved work changed. Reload practice before continuing.":"Practice is unavailable right now. Your earlier work is still saved."},{status:conflict?409:503});
}
export async function GET(request:Request){
  const access=await authorize();if("response"in access)return access.response;
  const {client,user}=access,parsed=querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if(!parsed.success)return NextResponse.json({error:"Choose a chapter."},{status:400});
  const {classId,chapter,variant}=parsed.data;
  const course=await ownedClass(client,user.id,classId);
  if(!course)return NextResponse.json({error:"Class unavailable."},{status:404});
  if(course.ai_mode!=="green")return NextResponse.json({error:"This class does not allow tutoring practice."},{status:403});
  try{
    const [exercises,graph,recent]=await Promise.all([loadChapterPractice(chapter,variant),loadCurriculumGraph(),client.from("learning_problem_records").select("id").eq("owner_id",user.id).eq("class_id",classId).is("assignment_id",null).like("exercise_id",CHAPTER_PRACTICE_VERSION+":"+chapter+":%").order("updated_at",{ascending:false}).limit(1)]);
    if(recent.error)throw new Error("store_unavailable");
    const session=recent.data?.[0]?await readProblem(client,user.id,recent.data[0].id):null;
    const resumed=session?await chapterExerciseFromId(session.scope.exerciseId):null;
    const present=(item:(typeof exercises)[number])=>({id:item.id,prompt:item.prompt,skillId:item.skillId,versionId:item.versionId,
      title:item.specification.kind==="conic_measure"?(item.specification.measure==="center"?"Find the center":"Find the axis lengths"):
        item.specification.kind==="sinusoid_measure"?(item.specification.measure==="amplitude"?"Find the amplitude":"Find the period"):getSkill(graph,item.skillId)?.title??"Practice",reviewed:false});
    return NextResponse.json({exercises:exercises.map(present),session,resumed:resumed?present(resumed):null,variantCount:CHAPTER_VARIANT_COUNTS[chapter as keyof typeof CHAPTER_VARIANT_COUNTS],
      skills:listChapterSkills(graph,chapter).map(skill=>({id:skill.id,title:skill.title,objective:skill.objective,prerequisites:selectPrerequisites(graph,skill.id).map(item=>({id:item.id,title:item.title})),verification:skill.verification.mode,review:skill.review.status})),
      graphVersion:graph.version,providerRequired:false},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return failure(error);}
}
export async function POST(request:Request){
  const access=await authorize();if("response"in access)return access.response;
  const {client,user}=access,parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:"Check your practice response."},{status:400});
  try{
    const input=parsed.data,previous=await readProblem(client,user.id,input.id,input.action==="respond"?input.expectedRevision:undefined);
    const classId=input.action==="start"?input.classId:previous?.scope.classId;
    if(!classId)return NextResponse.json({error:"Practice unavailable."},{status:404});
    const course=await ownedClass(client,user.id,classId);
    if(!course)return NextResponse.json({error:"Class unavailable."},{status:404});
    if(course.ai_mode!=="green")return NextResponse.json({error:"This class does not allow tutoring practice."},{status:403});
    if(input.action==="start"){
      if(previous){
        if(previous.scope.classId!==classId||previous.scope.exerciseId!==input.exerciseId)return NextResponse.json({error:"Choose a new practice session."},{status:409});
        return NextResponse.json({state:previous});
      }
      const state=await startChapterSession(input.id,classId,input.exerciseId);
      await saveProblem(client,user.id,state,0,input.requestId);
      return NextResponse.json({state});
    }
    if(!previous)return NextResponse.json({error:"Practice unavailable."},{status:404});
    const result=await runChapterSession(previous,input);
    await saveProblem(client,user.id,result.state,previous.revision,input.requestId);
    return NextResponse.json(result);
  }catch(error){return failure(error);}
}
