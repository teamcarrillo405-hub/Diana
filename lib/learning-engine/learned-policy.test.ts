import {describe,it,expect,vi} from "vitest";
import {EMPTY_POLICY_SIGNALS,trainLearnedPolicy,evaluateLearnedPolicy,validatePolicyDataset,policyTrajectoryContentHash,predictLearnedPolicyCandidate,learnedPolicyDecision,type PolicyTrajectory,type LearnedPolicyArtifact} from "./learned-policy";
import type {TrainingReceipt} from "./training";

const now=Date.parse("2026-09-25T00:00:00Z");
// Fabricated unit-test records and receipts exercise gates; they are never human evidence.
function examples():PolicyTrajectory[]{
  return (["train","development","test"] as const).flatMap((split,splitIndex)=>Array.from({length:5},(_,family)=>Array.from({length:8},(_,index)=>{
    const priorSupport=index%4+1,rate=index<4?[0.1,0.2,0.27][splitIndex]+family*0.01:[0.7,0.82,0.9][splitIndex]+family*0.01,id=`${split}-${family}-${index}`;
    return {id,provenanceId:"unit-event-"+id,documentFamily:`${split}-book-${family}`,templateFamily:`${split}-template-${family}`,learnerId:`${split}-learner-${family}`,
      observedAt:new Date(Date.UTC(2025,splitIndex,1,family,index)).toISOString(),split,state:{confirmed:true,hasEvidence:true,supported:false,hasAssessment:true,priorSupport},
      signals:{independentSuccessRate:rate,independentAttempts:6+splitIndex*8+family,sessionsSincePractice:splitIndex*6+family},targetAction:rate<0.4?"related_example":priorSupport<3?"hint":"independent_attempt",
      provenance:"authored_engineering_fixture",rights:"excluded",containsStudentData:false,consentReceipt:null,humanReview:"pending",reviewerIds:[],
    } satisfies PolicyTrajectory;
  })).flat());
}
async function reviewed(){
  const rows=examples().map((item):PolicyTrajectory=>({...item,provenance:"reviewed_trajectory",rights:"explicit_owner_consent",containsStudentData:true,consentReceipt:"consent-"+item.id,humanReview:"approved",reviewerIds:["unit-reviewer-1","unit-reviewer-2"]}));
  const receipts:TrainingReceipt[]=[];
  for(const row of rows){
    const contentHash=await policyTrajectoryContentHash(row);
    for(const [scope,issuer,id] of [["training_rights","unit-rights","rights-"+row.id],["student_consent","unit-consent",row.consentReceipt!],["educator_review","unit-reviewer-1","review-1-"+row.id],["educator_review","unit-reviewer-2","review-2-"+row.id]] as const){
      receipts.push({id,exampleId:row.id,contentHash,scope,issuedBy:issuer,issuedAt:"2025-04-01T00:00:00Z",expiresAt:null,revokedAt:null});
    }
  }
  return {rows,receipts};
}

describe("local learned support policy",()=>{
  it("fits numeric weights locally while engineering artifacts remain ineligible",async()=>{
    const request=vi.spyOn(globalThis,"fetch").mockRejectedValue(new Error("No provider permitted"));
    try{
      const artifact=await trainLearnedPolicy(examples(),[],{now});
      expect(artifact.model?.weights.flat().some(value=>Math.abs(value)>0.001)).toBe(true);
      expect(artifact).toMatchObject({eligibility:{status:"engineering_demonstration",eligibleForOperatorReview:false},automaticallyPromoted:false,deployed:false,llmWeightsChanged:false,learningGainsEstablished:false});
      expect(artifact.modelHash).toMatch(/^[a-f0-9]{64}$/);
      expect(artifact.comparisons.find(item=>item.split==="test")?.accuracyDifference).toBeGreaterThan(0);
      expect(request).not.toHaveBeenCalled();
    }finally{request.mockRestore();}
  });
  it("never uses development or test labels to fit weights or select a policy",async()=>{
    const rows=examples(),original=await trainLearnedPolicy(rows,[],{now});
    const changed=await trainLearnedPolicy(rows.map(item=>item.split==="train"?item:{...item,targetAction:item.targetAction==="hint"?"independent_attempt":"hint"}),[],{now});
    expect(changed.model).toEqual(original.model);
    expect(changed.modelHash).toBe(original.modelHash);
    expect(changed.trainingDatasetHash).toBe(original.trainingDatasetHash);
    expect(changed.datasetHash).not.toBe(original.datasetHash);
    expect(changed.comparisons.find(item=>item.split==="test")?.candidate.accuracy).not.toBe(original.comparisons.find(item=>item.split==="test")?.candidate.accuracy);
    expect(changed.training).toMatchObject({fitSplit:"train",developmentUsage:"report_only",testUsage:"report_only",parameterSelection:"fixed_before_fit"});
  });
  it("keeps evidence, confirmation and support limits outside fitted weights",async()=>{
    const artifact=await trainLearnedPolicy(examples(),[],{now}),state=examples()[0].state;
    expect(predictLearnedPolicyCandidate({...state,confirmed:false},EMPTY_POLICY_SIGNALS,artifact)).toBe("clarify");
    expect(predictLearnedPolicyCandidate({...state,hasEvidence:false},EMPTY_POLICY_SIGNALS,artifact)).toBe("clarify");
    expect(predictLearnedPolicyCandidate({...state,supported:true},EMPTY_POLICY_SIGNALS,artifact)).toBe("independent_attempt");
    expect(predictLearnedPolicyCandidate({...state,priorSupport:5},EMPTY_POLICY_SIGNALS,artifact)).toBe("independent_attempt");
    expect(predictLearnedPolicyCandidate({...state,hasAssessment:false},EMPTY_POLICY_SIGNALS,artifact)).toBe("orient");
    expect((await learnedPolicyDecision(state,EMPTY_POLICY_SIGNALS,artifact)).source).toBe("baseline");
  });
  it.each(["training_rights","student_consent","educator_review"] as const)("blocks fitting after a %s receipt is revoked",async scope=>{
    const {rows,receipts}=await reviewed(),receipt=receipts.find(item=>item.scope===scope)!;
    const revoked=receipts.map(item=>item.id===receipt.id?{...item,revokedAt:"2026-09-24T00:00:00Z"}:item);
    const artifact=await trainLearnedPolicy(rows,revoked,{now});
    expect(artifact.model).toBeNull();
    expect(artifact.eligibility.status).toBe("blocked_data");
    expect(artifact.eligibility.reasons).toContain(receipt.exampleId+":"+scope+"_revoked");
  });
  it("binds receipts to trajectory content rather than transferable approval IDs",async()=>{
    const {rows,receipts}=await reviewed();rows[0]={...rows[0],signals:{...rows[0].signals,independentAttempts:9}};
    const artifact=await trainLearnedPolicy(rows,receipts,{now});
    expect(artifact.eligibility.status).toBe("blocked_data");
    expect(artifact.eligibility.reasons).toContain(rows[0].id+":educator_review_missing");
  });
  it("requires explicit matching operator approval and fresh unrevoked receipts at activation",async()=>{
    const {rows,receipts}=await reviewed(),artifact=await trainLearnedPolicy(rows,receipts,{now});
    expect(artifact.eligibility.status).toBe("ready_for_operator_review");
    const authorization={approvedArtifactHash:artifact.artifactHash,approvedBy:"unit-operator",approvedAt:"2026-09-25T00:00:00Z",examples:rows,receipts,now};
    const row=rows[0];
    expect((await learnedPolicyDecision(row.state,row.signals,artifact)).source).toBe("baseline");
    expect((await learnedPolicyDecision(row.state,row.signals,artifact,authorization)).source).toBe("reviewed_learned_policy");
    const revoked=receipts.map(item=>item.id===row.consentReceipt?{...item,revokedAt:"2026-09-25T00:00:00Z"}:item);
    expect((await learnedPolicyDecision(row.state,row.signals,artifact,{...authorization,receipts:revoked})).source).toBe("baseline");
    const tampered=JSON.parse(JSON.stringify(artifact)) as LearnedPolicyArtifact;tampered.model!.weights[0][0]+=1;
    expect((await learnedPolicyDecision(row.state,row.signals,tampered,authorization)).source).toBe("baseline");
    await expect(evaluateLearnedPolicy(tampered,rows)).rejects.toThrow("artifact hash mismatch");
  });
  it("rejects duplicate trajectories and leakage by source, template, learner or time",()=>{
    const rows=examples();
    expect(()=>validatePolicyDataset([...rows,{...rows[0],id:"copy"}])).toThrow("Duplicate");
    const renamed=rows.map(item=>({...item})),target=renamed.find(item=>item.split==="test")!;
    target.state={...rows[0].state};target.signals={...rows[0].signals};target.targetAction=rows[0].targetAction;
    expect(()=>validatePolicyDataset(renamed)).toThrow("Duplicate normalized policy input and target");
    for(const key of ["documentFamily","templateFamily","learnerId"] as const){
      const altered=rows.map(item=>({...item}));altered.find(item=>item.split==="test")![key]=rows[0][key];
      expect(()=>validatePolicyDataset(altered)).toThrow("split leakage");
    }
    const altered=rows.map(item=>({...item}));altered.find(item=>item.split==="development")!.observedAt=rows[0].observedAt;
    expect(()=>validatePolicyDataset(altered)).toThrow("chronological");
    expect(()=>validatePolicyDataset(rows.map((item,index)=>index?item:{...item,state:{...item.state,confirmed:false}}))).toThrow("fixed policy constraints");
  });
});
