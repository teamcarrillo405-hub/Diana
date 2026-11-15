import {describe,it,expect} from "vitest";
import {emptyProblemState,observationHash,problemReadiness,reviseProblemState,validateProblemState,type ProblemObservation} from "./problem-state";
import {validateProblemSources} from "./problem-sources";

const blank=()=>emptyProblemState("00000000-0000-4000-8000-000000000041",{classId:"00000000-0000-4000-8000-000000000042",assignmentId:"00000000-0000-4000-8000-000000000043",exerciseId:"source-check"});
const observation:ProblemObservation={id:"problem",field:"prompt",role:"problem_statement",modality:"pdf_region",provenance:"native_pdf",text:"x + 2 = 7",source:{versionId:"a".repeat(64),assetHash:"b".repeat(64),page:1,regionId:"line-1",startOffset:0,endOffset:9}};
const authorizedSource={id:"a".repeat(64),assetHash:"b".repeat(64),pages:[{page:1,pageLabel:"1",text:"x + 2 = 7\nAnother line",interpretation:"original",regions:[{id:"line-1",kind:"equation",box:{x:0,y:0,width:0.5,height:0.1},startOffset:0,endOffset:9,provenance:"native_pdf",confirmed:false}]}]};
async function confirmed(item=observation){return reviseProblemState(blank(),{expectedRevision:1,put:[item],confirm:[{id:item.id,contentHash:await observationHash(item)}]});}

describe("problem record adversarial boundaries",()=>{
  it("does not treat a self-computed hash as authorization to an unseen document",async()=>{
    const forged=await confirmed({...observation,source:{...observation.source!,versionId:"c".repeat(64)}});
    // Hash integrity alone is not source authority. Callers must enforce both checks.
    expect(await validateProblemState(forged)).toEqual(forged);
    expect(problemReadiness(forged).eligibleForKnowledge).toBe(false);
    expect(()=>validateProblemSources(forged,[authorizedSource])).toThrow("source_unavailable");
  });
  it("rejects changed asset bytes and a named region that no longer contains the span",async()=>{
    const state=await confirmed();
    expect(()=>validateProblemSources(state,[{...authorizedSource,assetHash:"c".repeat(64)}])).toThrow("source_asset_changed");
    const moved={...authorizedSource,pages:[{...authorizedSource.pages[0],regions:[{...authorizedSource.pages[0].regions[0],endOffset:5}]}]};
    expect(()=>validateProblemSources(state,[moved])).toThrow("source_region_changed");
  });
  it("does not transfer a confirmation to another observation or allow scope mutation in a patch",async()=>{
    const state=await confirmed(),original=state.observations[0];
    await expect(validateProblemState({...state,observations:[{...original,id:"another-observation"}]})).rejects.toThrow("observation_hash_mismatch");
    await expect(reviseProblemState(state,{expectedRevision:state.revision,scope:{...state.scope,classId:"00000000-0000-4000-8000-000000000044"},put:[]})).rejects.toThrow();
  });
  it("cannot relabel a handwriting interpretation as native PDF text",async()=>{
    await expect(reviseProblemState(blank(),{expectedRevision:1,put:[{...observation,modality:"handwriting"}]})).rejects.toThrow("Native PDF provenance");
  });
});
