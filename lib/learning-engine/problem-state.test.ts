import {describe,it,expect} from "vitest";
import {emptyProblemState,observationHash,problemReadiness,reviseProblemState,validateProblemState,type ProblemObservation} from "./problem-state";
const initial=()=>emptyProblemState("00000000-0000-4000-8000-000000000001",{classId:"00000000-0000-4000-8000-000000000002",assignmentId:null,exerciseId:"practice-1"});
const observation:ProblemObservation={id:"prompt",field:"prompt",role:"problem_statement",modality:"typed",provenance:"student_entered",text:"Solve 2x + 1 = 5."};
describe("content-bound multimodal state",()=>{
  it("requires confirmation even for a student transcription and clears it after changes",async()=>{
    const hash=await observationHash(observation);
    const ready=await reviseProblemState(initial(),{expectedRevision:1,put:[observation],confirm:[{id:"prompt",contentHash:hash}]});
    expect(problemReadiness(ready).status).toBe("ready");
    const changed=await reviseProblemState(ready,{expectedRevision:2,put:[{...observation,text:"Solve 2x - 1 = 5."}]});
    expect(problemReadiness(changed).status).toBe("needs_confirmation");
    await expect(reviseProblemState(changed,{expectedRevision:3,confirm:[{id:"prompt",contentHash:hash}]})).rejects.toThrow("stale_confirmation");
    expect(ready.observations[0].text).toBe(observation.text);
  });
  it("blocks contradictory photo and voice readings even when both are confirmed",async()=>{
    const left:ProblemObservation={...observation,modality:"photo",provenance:"machine_interpretation",text:"x² = 9"};
    const right:ProblemObservation={...observation,id:"voice",modality:"voice",text:"x2 = 9"};
    const state=await reviseProblemState(initial(),{expectedRevision:1,put:[left,right],confirm:await Promise.all([left,right].map(async item=>({id:item.id,contentHash:await observationHash(item)})))});
    expect(problemReadiness(state).status).toBe("conflict");
    const resolved=await reviseProblemState(state,{expectedRevision:2,remove:["voice"]});
    expect(problemReadiness(resolved).status).toBe("ready");
    expect(problemReadiness(resolved).eligibleForKnowledge).toBe(false);
  });
  it("binds the original asset location and rejects tampering and stale writers",async()=>{
    const pdf:ProblemObservation={...observation,modality:"pdf_region",provenance:"native_pdf",source:{versionId:"a".repeat(64),page:1,startOffset:0,endOffset:20}};
    const state=await reviseProblemState(initial(),{expectedRevision:1,put:[pdf]});
    await expect(validateProblemState({...state,observations:[{...state.observations[0],source:{...pdf.source,page:2}}]})).rejects.toThrow("observation_hash_mismatch");
    await expect(reviseProblemState(state,{expectedRevision:1,put:[]})).rejects.toThrow("revision_conflict");
    expect(await validateProblemState(state)).toEqual(state);
  });
  it("does not treat an empty state or source-free PDF as interpretable",async()=>{
    expect(problemReadiness(initial()).status).toBe("needs_confirmation");
    await expect(reviseProblemState(initial(),{expectedRevision:1,put:[{...observation,modality:"pdf_region"}]})).rejects.toThrow();
    await expect(reviseProblemState(initial(),{expectedRevision:1,put:[observation,observation]})).rejects.toThrow("duplicate_edit");
  });
  it("persists source and model identity with machine text and rejects later text edits under that identity",async()=>{
    const text="A spoken explanation",digest=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text))),value=>value.toString(16).padStart(2,"0")).join("");
    const response:ProblemObservation={id:"response",field:"response",role:"spoken_reasoning",modality:"voice",provenance:"machine_interpretation",text,
      recognitionEvidence:{version:"recognition-evidence-v1",kind:"speech",assetHash:"a".repeat(64),textHash:digest,modelId:"fixture/speech",revision:"b".repeat(40),fileManifestHash:"c".repeat(64),issuedAt:1,networkUsed:false,confidence:null},recognitionProof:"synthetic.proof"};
    const state=await reviseProblemState(initial(),{expectedRevision:1,put:[response]});
    expect((await validateProblemState(state)).observations[0].recognitionEvidence?.assetHash).toBe("a".repeat(64));
    await expect(reviseProblemState(state,{expectedRevision:2,put:[{...response,text:"A changed explanation"}]})).rejects.toThrow("recognition_text_changed");
    await expect(reviseProblemState(state,{expectedRevision:2,put:[{...response,modality:"handwriting"}]})).rejects.toThrow();
  });
});
