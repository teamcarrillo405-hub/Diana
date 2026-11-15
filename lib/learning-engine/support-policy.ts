import {z} from "zod";

export const supportPolicySchema=z.object({
  id:z.string().min(1).max(80),version:z.literal("support-policy-v1"),
  exampleAt:z.number().int().min(1).max(3),resetAt:z.number().int().min(2).max(5),
}).strict().refine(value=>value.resetAt>value.exampleAt,"A fresh attempt must follow the example.");
export type SupportPolicy=z.infer<typeof supportPolicySchema>;
export const DEFAULT_SUPPORT_POLICY:SupportPolicy={id:"current-ladder",version:"support-policy-v1",exampleAt:2,resetAt:3};
export const supportStateSchema=z.object({confirmed:z.boolean(),hasEvidence:z.boolean(),supported:z.boolean(),hasAssessment:z.boolean(),priorSupport:z.number().int().min(0).max(100)}).strict();
export type SupportState=z.infer<typeof supportStateSchema>;
export const supportActionSchema=z.enum(["clarify","orient","hint","related_example","independent_attempt"]);

/** Tune bounded help timing only; evidence and confirmation gates cannot be optimized away. */
export function policyAction(state:SupportState,policy:SupportPolicy=DEFAULT_SUPPORT_POLICY):z.infer<typeof supportActionSchema>{
  const parsed=supportPolicySchema.parse(policy);
  if(!state.confirmed||!state.hasEvidence)return "clarify";
  if(state.supported)return "independent_attempt";
  if(!state.hasAssessment||state.priorSupport===0)return "orient";
  if(state.priorSupport>=parsed.resetAt)return "independent_attempt";
  if(state.priorSupport>=parsed.exampleAt)return "related_example";
  return "hint";
}

export const policyExampleSchema=z.object({
  id:z.string().min(1),family:z.string().min(1),split:z.enum(["train","development","test"]),
  state:supportStateSchema,expected:supportActionSchema,
  provenance:z.enum(["authored_engineering_fixture","educator_reviewed"]),reviewerIds:z.array(z.string().min(1)).max(10),
}).strict();
export type PolicyExample=z.infer<typeof policyExampleSchema>;

export function optimizeSupportPolicy(raw:unknown[]){
  const examples=raw.map(value=>policyExampleSchema.parse(value));
  if(!examples.length||examples.length>10000)throw new Error("Supply 1–10,000 policy examples.");
  const ids=new Set<string>();const families=new Map<string,string>();
  for(const item of examples){
    if(ids.has(item.id))throw new Error("Duplicate policy example.");ids.add(item.id);
    if(families.has(item.family)&&families.get(item.family)!==item.split)throw new Error("Policy family crosses partitions.");
    families.set(item.family,item.split);
    const forced=!item.state.confirmed||!item.state.hasEvidence?"clarify":item.state.supported?"independent_attempt":null;
    if(forced&&item.expected!==forced)throw new Error("An example conflicts with a fixed evidence gate.");
  }
  const partitions={train:examples.filter(x=>x.split==="train"),development:examples.filter(x=>x.split==="development"),test:examples.filter(x=>x.split==="test")};
  if(Object.values(partitions).some(items=>!items.length))throw new Error("Separate train, development and test examples are required.");
  const score=(policy:SupportPolicy,items:PolicyExample[])=>items.filter(item=>policyAction(item.state,policy)===item.expected).length/items.length;
  const candidates=[DEFAULT_SUPPORT_POLICY,...[[1,2],[2,4],[3,4]].map(([exampleAt,resetAt])=>({id:`example-${exampleAt}-reset-${resetAt}`,version:"support-policy-v1" as const,exampleAt,resetAt}))];
  const ranked=candidates.map(policy=>({policy,train:score(policy,partitions.train),development:score(policy,partitions.development)}))
    .sort((a,b)=>b.development-a.development||b.train-a.train||Number(b.policy.id===DEFAULT_SUPPORT_POLICY.id)-Number(a.policy.id===DEFAULT_SUPPORT_POLICY.id));
  const selected=ranked[0];
  // The test partition is inspected only after selection, never used to choose a candidate.
  const heldOut={baseline:score(DEFAULT_SUPPORT_POLICY,partitions.test),candidate:score(selected.policy,partitions.test),families:new Set(partitions.test.map(item=>item.family)).size};
  const reviewed=examples.every(item=>item.provenance==="educator_reviewed"&&new Set(item.reviewerIds).size>=2);
  const reasons=[...(!reviewed?["Educator review is incomplete."]:[]),...(heldOut.families<5?["At least five held-out families are required."]:[]),...(heldOut.candidate<=heldOut.baseline?["No held-out improvement over the current policy."]:[])];
  return {version:"support-policy-optimization-v1",selected:selected.policy,candidates:ranked,heldOut,
    status:reasons.length?"keep_current_policy":"ready_for_operator_review",reasons,
    deployed:false,modelWeightsChanged:false,learningGainsEstablished:false};
}
