import {NextResponse} from "next/server";
import {z} from "zod";
import {createLearningClient,learningAccess} from "@/lib/learning-engine/server";
import {blockSchema,documentVersionSchema} from "@/lib/learning-engine/contracts";
import {sourcePageSchema} from "@/lib/learning-engine/source-layout";
import {problemSpecificationSchema} from "@/lib/learning-engine/problem-specification";
import {emptyProblemState,observationHash,problemReadiness,reviseProblemState,type ProblemObservation} from "@/lib/learning-engine/problem-state";
import {readProblem,saveProblem} from "@/lib/learning-engine/problem-store";
import {runLocalTutor,type LocalTutorInput} from "@/lib/learning-engine/local-tutor";
import {observeLocalTutorShadow} from "@/lib/learning-engine/capability-shadow";
import {effectiveAiMode} from "@/supabase/functions/_shared/auth-policy";
import {recordAssignmentAssistance,type StudyBuddyAssistanceClient} from "@/lib/learning-engine/study-buddy-assistance";

const schema=z.object({recordId:z.string().uuid(),requestId:z.string().uuid(),expectedRevision:z.number().int().min(0).max(9999),assignmentId:z.string().uuid(),exerciseId:z.string().min(1).max(200),versionId:z.string().regex(/^[a-f0-9]{64}$/),mode:z.enum(["hint","related_example"]),response:z.string().max(4000),confirmed:z.boolean(),modality:z.enum(["typed","handwriting","voice"])}).strict();
export async function POST(request:Request){
  const client=await createLearningClient(),{data:{user}}=await client.auth.getUser();
  if(!user)return NextResponse.json({error:"Sign in to ask for help."},{status:401});
  if(!await learningAccess("assessment",user.id))return NextResponse.json({error:"Practice is not enabled."},{status:404});
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:"Check your question and response."},{status:400});
  const input=parsed.data;
  const assignment=await client.from("assignments").select("class_id,ai_mode_override").eq("id",input.assignmentId).eq("owner_id",user.id).maybeSingle();
  if(!assignment.data?.class_id)return NextResponse.json({error:"Assignment unavailable."},{status:404});
  const course=await client.from("classes").select("ai_mode").eq("id",assignment.data.class_id).eq("owner_id",user.id).maybeSingle();
  if(!course.data)return NextResponse.json({error:"Class unavailable."},{status:404});
  if(effectiveAiMode(assignment.data.ai_mode_override,course.data.ai_mode)!=="green")return NextResponse.json({error:"This assignment does not allow tutoring help."},{status:403});
  try{
    const [listed,source,block]=await Promise.all([
      client.rpc("learning_list_exercises",{p_assignment:input.assignmentId,p_versions:[input.versionId]}),
      client.from("learning_documents").select("metadata,pages").eq("id",input.versionId).eq("owner_id",user.id).eq("assignment_id",input.assignmentId).maybeSingle(),
      client.from("learning_blocks").select("payload").eq("id",input.exerciseId.slice(0,64)).eq("version_id",input.versionId).eq("owner_id",user.id).maybeSingle(),
    ]);
    const exercise=listed.data?.find(item=>item.id===input.exerciseId&&item.version_id===input.versionId);
    if(listed.error||source.error||!source.data||!exercise)return NextResponse.json({error:"Open the current source question."},{status:404});
    const check=z.discriminatedUnion("kind",[
      z.object({kind:z.literal("equation_value"),reference:z.string()}),z.object({kind:z.literal("reading"),rubric:z.array(z.string())}),
    ]).safeParse(exercise.practice_check);
    if(!check.success)return NextResponse.json({error:"This question needs an educator-selected method."},{status:422});
    const specification=problemSpecificationSchema.parse(check.data.kind==="equation_value"?{kind:"equation_value",equation:check.data.reference,variable:"x",solutionSetComplete:false}:check.data);
    const metadata=documentVersionSchema.parse(source.data.metadata),pages=sourcePageSchema.array().parse(source.data.pages),sourceBlock=blockSchema.safeParse(block.data?.payload);
    const base=input.expectedRevision>0?await readProblem(client,user.id,input.recordId,input.expectedRevision):emptyProblemState(input.recordId,{classId:assignment.data.class_id,assignmentId:input.assignmentId,exerciseId:input.exerciseId});
    if(!base||base.scope.assignmentId!==input.assignmentId||base.scope.exerciseId!==input.exerciseId||base.scope.classId!==assignment.data.class_id||(base.exerciseVersionId&&base.exerciseVersionId!==input.versionId))return NextResponse.json({error:"Open the current problem record."},{status:409});
    base.exerciseVersionId=input.versionId;
    const prompt:ProblemObservation={id:"prompt",field:"prompt",role:"problem_statement",modality:"typed",provenance:"machine_interpretation",text:exercise.prompt.slice(0,4000)};
    const put:ProblemObservation[]=[prompt];
    if(sourceBlock.success&&sourceBlock.data.text.length<=4000){
      const item=sourceBlock.data,sourcePage=pages.find(page=>page.page===item.location.page);
      put.push({id:"source",field:"source",role:"given",modality:"pdf_region",provenance:sourcePage?.interpretation==="original"?"native_pdf":"machine_interpretation",text:item.text,
        source:{versionId:input.versionId,...(metadata.sourceAssetHash?{assetHash:metadata.sourceAssetHash}:{}),page:item.location.page,startOffset:item.location.startOffset,endOffset:item.location.endOffset}});
    }
    if(input.response.trim())put.push({id:"response",field:"response",role:input.modality==="voice"?"spoken_reasoning":"student_step",modality:input.modality,provenance:"student_entered",text:input.response});
    const state=await reviseProblemState(base,{expectedRevision:base.revision,put,
      remove:!input.response.trim()&&base.observations.some(item=>item.id==="response")?["response"]:[],
      confirm:input.confirmed?await Promise.all(put.map(async item=>({id:item.id,contentHash:await observationHash(item)}))):[]});
    // First help request creates revision one atomically; retries derive identical state.
    state.revision=input.expectedRevision+1;
    const relevantPage=sourceBlock.success?sourceBlock.data.location.page:pages[0]?.page;
    const sourcePages=pages.filter(page=>page.page===relevantPage&&page.text.length<=20000).slice(0,1);
    const ready=problemReadiness(state);
    const tutorInput:LocalTutorInput={exercise:{id:exercise.id,versionId:exercise.version_id,skillId:exercise.skill_id,prompt:exercise.prompt,specification,reviewed:exercise.reviewed,sourceConfirmed:sourcePages.length>0&&sourcePages.every(page=>page.interpretation!=="model_extraction")},
      attempt:{problemId:exercise.id,versionId:exercise.version_id,response:input.response,confirmed:input.confirmed&&ready.status==="ready",assistance:"unverified",priorHelpCount:state.supportCount},mode:input.mode,sourcePages:sourcePages.map(({page,text,interpretation})=>({page,text,interpretation}))};
    const feedback=await runLocalTutor(tutorInput);
    if(feedback.assistance!=="unchanged"){
      await recordAssignmentAssistance(client as unknown as StudyBuddyAssistanceClient,
        {ownerId:user.id,assignmentId:input.assignmentId,requestId:input.requestId,selectedProblemId:null,
          channel:"local",kind:input.mode==="related_example"?"example":"hint"},
        JSON.parse(JSON.stringify({route:"learning/tutor",input,tutorInput,sourceVersion:metadata})));
      state.supportCount=Math.min(100,state.supportCount+1);
    }
    await saveProblem(client,user.id,state,input.expectedRevision,input.requestId);
    await observeLocalTutorShadow(tutorInput,state,metadata,feedback);
    return NextResponse.json({state,feedback},{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    const conflict=error instanceof Error&&/conflict/.test(error.message);
    return NextResponse.json({error:conflict?"This work changed. Reload the material before continuing.":"Local help could not load. Try opening the source again."},{status:conflict?409:503});
  }
}
