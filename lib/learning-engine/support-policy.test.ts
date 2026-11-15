import {describe,it,expect} from "vitest";
import {optimizeSupportPolicy,policyAction,type PolicyExample} from "./support-policy";
const state={confirmed:true,hasEvidence:true,supported:false,hasAssessment:true,priorSupport:2};
const examples=():PolicyExample[]=>["train","development","test"].map(split=>({id:split,family:split,split:split as PolicyExample["split"],state,expected:"related_example",provenance:"authored_engineering_fixture",reviewerIds:[]}));
describe("bounded policy optimization",()=>{
  it("cannot replace confirmation and evidence gates",()=>{
    for(const policy of [{id:"early",version:"support-policy-v1" as const,exampleAt:1,resetAt:2},{id:"late",version:"support-policy-v1" as const,exampleAt:3,resetAt:5}]){
      expect(policyAction({...state,confirmed:false},policy)).toBe("clarify");
      expect(policyAction({...state,hasEvidence:false},policy)).toBe("clarify");
    }
  });
  it("keeps the current policy for synthetic ties and rejects split leakage",()=>{
    const result=optimizeSupportPolicy(examples());expect(result.selected.id).toBe("current-ladder");
    expect(result.status).toBe("keep_current_policy");expect(result.modelWeightsChanged).toBe(false);
    const mixed=examples();mixed[2].family="train";expect(()=>optimizeSupportPolicy(mixed)).toThrow("crosses partitions");
  });
  it("does not choose the policy that best fits held-out test labels",()=>{
    const first=examples();first[0].expected="hint";first[1].expected="hint";
    expect(optimizeSupportPolicy(first).selected.exampleAt).toBe(3);
    first[2].expected="independent_attempt";
    expect(optimizeSupportPolicy(first).selected.exampleAt).toBe(3);
  });
});
