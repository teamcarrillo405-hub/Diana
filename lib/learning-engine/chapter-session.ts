import {emptyProblemState,observationHash,problemReadiness,reviseProblemState,type ProblemState,type ProblemObservation} from "./problem-state";
import {loadChapterPractice,CHAPTER_PRACTICE_VERSION} from "./chapter-practice";
import {runLocalTutor,type LocalTutorResult} from "./local-tutor";

export async function chapterExerciseFromId(id:string){
  const prefix=CHAPTER_PRACTICE_VERSION+":";
  if(!id.startsWith(prefix))throw new Error("exercise_unavailable");
  const [chapter,variant]=id.slice(prefix.length).split(":").map(Number);
  const exercise=(await loadChapterPractice(chapter,variant)).find(item=>item.id===id);
  if(!exercise)throw new Error("exercise_unavailable");
  return exercise;
}
export async function startChapterSession(id:string,classId:string,exerciseId:string):Promise<ProblemState>{
  const exercise=await chapterExerciseFromId(exerciseId);
  const prompt:ProblemObservation={id:"prompt",field:"prompt",role:"problem_statement",modality:"typed",provenance:"authored_engineering",text:exercise.prompt};
  // Server-authored prompt is exact. The student confirms their response separately.
  const contentHash=await observationHash(prompt);
  return {...emptyProblemState(id,{classId,assignmentId:null,exerciseId}),exerciseVersionId:exercise.versionId,observations:[{...prompt,contentHash,confirmedHash:contentHash}]};
}
export async function runChapterSession(previous:ProblemState,input:{expectedRevision:number;mode:"hint"|"check"|"related_example";response:string;confirmed:boolean;modality:"typed"|"handwriting"|"voice"}){
  const exercise=await chapterExerciseFromId(previous.scope.exerciseId);
  const original=previous.observations.find(item=>item.id==="prompt");
  if(previous.scope.assignmentId!==null||previous.exerciseVersionId!==exercise.versionId||original?.text!==exercise.prompt||original.role!=="problem_statement"||original.provenance!=="authored_engineering")throw new Error("problem_mismatch");
  const observation:ProblemObservation={id:"response",field:"response",role:input.modality==="voice"?"spoken_reasoning":"student_step",modality:input.modality,provenance:"student_entered",text:input.response};
  const state=await reviseProblemState(previous,{expectedRevision:input.expectedRevision,
    put:input.response.trim()?[observation]:[],remove:!input.response.trim()&&previous.observations.some(item=>item.id==="response")?["response"]:[],
    confirm:input.response.trim()&&input.confirmed?[{id:"response",contentHash:await observationHash(observation)}]:[]});
  const readiness=problemReadiness(state);
  const trustedExercise={id:exercise.id,versionId:exercise.versionId,skillId:exercise.skillId,prompt:exercise.prompt,specification:exercise.specification,reviewed:false,sourceConfirmed:true};
  let feedback:LocalTutorResult;
  if(readiness.status==="conflict"){
    feedback=await runLocalTutor({exercise:trustedExercise,attempt:{problemId:exercise.id,versionId:exercise.versionId,response:input.response,confirmed:false,assistance:"unverified",priorHelpCount:state.supportCount},mode:input.mode});
  }else{
    // Pass only the contract fields. Neither a client-provided key nor a claimed review is accepted.
    feedback=await runLocalTutor({exercise:trustedExercise,
      attempt:{problemId:exercise.id,versionId:exercise.versionId,response:input.response,confirmed:readiness.status==="ready"&&input.confirmed,assistance:state.supportCount?"hinted":"unverified",priorHelpCount:state.supportCount},mode:input.mode});
  }
  if(feedback.assistance!=="unchanged")state.supportCount=Math.min(100,state.supportCount+1);
  return {state,feedback,readiness};
}
