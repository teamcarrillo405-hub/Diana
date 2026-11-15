import {describe,it,expect,vi} from "vitest";
vi.mock("server-only",()=>({}));
import {decisionFromPolicyBundle,policyActivationSchema,operationalPolicyDecision} from "./policy-runtime";
import {trainLearnedPolicy,EMPTY_POLICY_SIGNALS,type PolicyTrajectory} from "./learned-policy";
const now=Date.parse("2026-09-26T01:00:00Z"),state={confirmed:true,hasEvidence:true,supported:false,hasAssessment:true,priorSupport:1};
const activation={version:"policy-activation-v1",status:"active",artifactFile:"model.json",examplesFile:"examples.json",receiptsFile:"receipts.json",approvedArtifactHash:"a".repeat(64),approvedBy:"synthetic-test-operator",approvalEvidenceRef:"synthetic-test-only",approvedAt:"2026-09-26T00:00:00Z",expiresAt:"2026-09-27T00:00:00Z"};
describe("private policy deployment boundary",()=>{
  it("keeps the baseline when absent, disabled, expired or unavailable",async()=>{
    vi.stubEnv("DIANA_LEARNED_POLICY_DIRECTORY","");
    expect((await operationalPolicyDecision(state,EMPTY_POLICY_SIGNALS)).reason).toBe("not_configured");vi.unstubAllEnvs();
    expect((await decisionFromPolicyBundle(state,EMPTY_POLICY_SIGNALS,async()=>({...activation,status:"disabled"}),now)).reason).toBe("disabled");
    expect((await decisionFromPolicyBundle(state,EMPTY_POLICY_SIGNALS,async()=>activation,now+2*86400000)).reason).toBe("expired");
    expect((await decisionFromPolicyBundle(state,EMPTY_POLICY_SIGNALS,async()=>{throw new Error("offline");},now)).action).toBe("hint");
    expect(()=>policyActivationSchema.parse({...activation,artifactFile:"../public/model.json"})).toThrow();
  });
  it("does not activate a real fitted engineering artifact and observes a changed switch",async()=>{
    const rows:PolicyTrajectory[]=(["train","development","test"] as const).map((split,index)=>({id:split,provenanceId:split,documentFamily:split,templateFamily:split,learnerId:split,observedAt:new Date(Date.UTC(2025,index,1)).toISOString(),split,state:{...state,priorSupport:index+1},signals:{...EMPTY_POLICY_SIGNALS,independentAttempts:index},targetAction:"related_example",provenance:"authored_engineering_fixture",rights:"excluded",containsStudentData:false,consentReceipt:null,humanReview:"pending",reviewerIds:[]}));
    const artifact=await trainLearnedPolicy(rows,[],{now:now-10000000});
    const files:Record<string,unknown>={"activation.json":{...activation,approvedArtifactHash:artifact.artifactHash},"model.json":artifact,"examples.json":rows,"receipts.json":[]};
    const read=vi.fn(async(name:string)=>files[name]);
    expect((await decisionFromPolicyBundle(state,EMPTY_POLICY_SIGNALS,read,now)).source).toBe("baseline");
    expect(read).toHaveBeenCalledWith("receipts.json");
    let reads=0;
    expect((await decisionFromPolicyBundle(state,EMPTY_POLICY_SIGNALS,async name=>name==="activation.json"&&++reads>1?{...activation,status:"disabled"}:files[name],now)).reason).toBe("disabled");
  });
});
