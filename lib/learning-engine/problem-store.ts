import "server-only";
import type {Json} from "@/lib/supabase/types";
import {createLearningClient} from "./server";
import {documentVersionSchema} from "./contracts";
import {validateProblemState,type ProblemState} from "./problem-state";
import {validateProblemSources} from "./problem-sources";

type Client=Awaited<ReturnType<typeof createLearningClient>>;
export async function readProblem(client:Client,ownerId:string,id:string,revision?:number){
  const record=await client.from("learning_problem_records").select("class_id,assignment_id,exercise_id,current_revision").eq("owner_id",ownerId).eq("id",id).maybeSingle();
  if(record.error)throw new Error("store_unavailable");
  if(!record.data)return null;
  const selectedRevision=revision??record.data.current_revision;
  if(selectedRevision>record.data.current_revision||selectedRevision<1)throw new Error("revision_conflict");
  const snapshot=await client.from("learning_problem_revisions").select("state").eq("owner_id",ownerId).eq("record_id",id).eq("revision",selectedRevision).maybeSingle();
  if(snapshot.error||!snapshot.data)throw new Error("store_unavailable");
  const state=await validateProblemState(snapshot.data.state);
  if(state.id!==id||state.scope.classId!==record.data.class_id||state.scope.assignmentId!==record.data.assignment_id||state.scope.exerciseId!==record.data.exercise_id||state.revision!==selectedRevision)throw new Error("state_scope_mismatch");
  await validateStoredSources(client,ownerId,state);
  return state;
}
async function validateStoredSources(client:Client,ownerId:string,state:ProblemState){
  const versions=[...new Set(state.observations.flatMap(item=>item.source?[item.source.versionId]:[]))];
  if(versions.length){
    const result=await client.from("learning_documents").select("id,assignment_id,class_id,metadata,pages").eq("owner_id",ownerId).in("id",versions);
    if(result.error)throw new Error("source_unavailable");
    const sources=(result.data??[]).filter(item=>state.scope.assignmentId?item.assignment_id===state.scope.assignmentId:item.class_id===state.scope.classId).map(item=>({id:item.id,pages:item.pages,assetHash:documentVersionSchema.parse(item.metadata).sourceAssetHash}));
    validateProblemSources(state,sources);
  }
}
export async function saveProblem(client:Client,ownerId:string,state:ProblemState,expectedRevision:number,requestId:string){
  await validateProblemState(state);
  await validateStoredSources(client,ownerId,state);
  const result=await client.rpc("learning_save_problem",{p_id:state.id,p_class:state.scope.classId,p_assignment:state.scope.assignmentId,p_exercise:state.scope.exerciseId,p_expected:expectedRevision,p_request:requestId,p_state:JSON.parse(JSON.stringify(state)) as Json});
  if(result.error){
    if(/revision_conflict|request_conflict/.test(result.error.message))throw new Error("revision_conflict");
    throw new Error("store_unavailable");
  }
}
