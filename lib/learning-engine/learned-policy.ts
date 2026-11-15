import {z} from "zod";
import {sha256} from "./curriculum";
import {policyAction,supportActionSchema,supportStateSchema,type SupportState} from "./support-policy";
import {trainingReceiptSchema,type TrainingReceipt} from "./training";

export const POLICY_ACTIONS=["hint","related_example","independent_attempt"] as const;
export const POLICY_FEATURES=["bias","prior_support","prior_support_squared","independent_success_rate","success_rate_unknown","independent_attempt_count","sessions_since_practice"] as const;
export const policySignalsSchema=z.object({independentSuccessRate:z.number().finite().min(0).max(1).nullable(),independentAttempts:z.number().int().min(0).max(10000),sessionsSincePractice:z.number().int().min(0).max(365)}).strict();
export type PolicySignals=z.infer<typeof policySignalsSchema>;
export const EMPTY_POLICY_SIGNALS:PolicySignals={independentSuccessRate:null,independentAttempts:0,sessionsSincePractice:0};
export const policyTrajectorySchema=z.object({
  id:z.string().min(1).max(200),provenanceId:z.string().min(1).max(200),documentFamily:z.string().min(1).max(200),templateFamily:z.string().min(1).max(200),learnerId:z.string().min(1).max(200),
  observedAt:z.string().datetime(),split:z.enum(["train","development","test"]),state:supportStateSchema,signals:policySignalsSchema,targetAction:supportActionSchema,
  provenance:z.enum(["authored_engineering_fixture","reviewed_trajectory"]),rights:z.enum(["excluded","licensed_for_training","public_domain","explicit_owner_consent"]),
  containsStudentData:z.boolean(),consentReceipt:z.string().min(1).max(200).nullable(),humanReview:z.enum(["pending","approved","rejected"]),reviewerIds:z.array(z.string().min(1).max(200)).max(10),
}).strict();
export type PolicyTrajectory=z.infer<typeof policyTrajectorySchema>;
export const policyTrainingParametersSchema=z.object({epochs:z.number().int().min(1).max(2000),learningRate:z.number().finite().min(0.0001).max(1),l2:z.number().finite().min(0).max(10)}).strict();
export const DEFAULT_POLICY_TRAINING_PARAMETERS={epochs:600,learningRate:0.3,l2:0.01};
type Action=z.infer<typeof supportActionSchema>;

/** These constraints are applied before both baseline and learned decisions. They are never fitted. */
export function fixedPolicyAction(state:SupportState):Action|null{
  supportStateSchema.parse(state);
  if(!state.confirmed||!state.hasEvidence)return "clarify";
  if(state.supported)return "independent_attempt";
  if(!state.hasAssessment||state.priorSupport===0)return "orient";
  if(state.priorSupport>=5)return "independent_attempt";
  return null;
}
function features(state:SupportState,signals:PolicySignals){
  policySignalsSchema.parse(signals);
  const prior=Math.min(state.priorSupport,5)/5;
  return [1,prior,prior*prior,signals.independentSuccessRate??0.5,signals.independentSuccessRate===null?1:0,Math.min(signals.independentAttempts,50)/50,Math.min(signals.sessionsSincePractice,30)/30];
}
function canonical(value:unknown):string{
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  if(value!==null&&typeof value==="object")return "{"+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>JSON.stringify(key)+":"+canonical(item)).join(",")+"}";
  return JSON.stringify(value);
}
export async function policyTrajectoryContentHash(raw:PolicyTrajectory){return sha256(canonical(policyTrajectorySchema.parse(raw)));}
const ordered=(examples:PolicyTrajectory[])=>[...examples].sort((a,b)=>a.id.localeCompare(b.id));
const datasetHash=(examples:PolicyTrajectory[])=>sha256(canonical(ordered(examples)));

/** One learner, source family and template family can occur in exactly one chronological partition. */
export function validatePolicyDataset(raw:unknown[]):PolicyTrajectory[]{
  if(!raw.length||raw.length>10000)throw new Error("Supply 1–10,000 policy trajectories.");
  const examples=raw.map(value=>policyTrajectorySchema.parse(value));
  const ids=new Set<string>(),provenance=new Set<string>(),content=new Set<string>(),partitions=new Map<string,string>(),inputPartitions=new Map<string,string>();
  for(const item of examples){
    const {id:discardedId,...rest}=item;void discardedId;
    const fingerprint=canonical(rest);
    if(ids.has(item.id)||provenance.has(item.provenanceId)||content.has(fingerprint))throw new Error("Duplicate policy trajectory.");
    ids.add(item.id);provenance.add(item.provenanceId);content.add(fingerprint);
    const normalizedInput=canonical({confirmed:item.state.confirmed,hasEvidence:item.state.hasEvidence,supported:item.state.supported,hasAssessment:item.state.hasAssessment,features:features(item.state,item.signals),target:item.targetAction});
    if(inputPartitions.has(normalizedInput)&&inputPartitions.get(normalizedInput)!==item.split)throw new Error("Duplicate normalized policy input and target crosses partitions.");
    inputPartitions.set(normalizedInput,item.split);
    for(const key of ["document:"+item.documentFamily,"template:"+item.templateFamily,"learner:"+item.learnerId]){
      if(partitions.has(key)&&partitions.get(key)!==item.split)throw new Error("Policy split leakage: "+key);
      partitions.set(key,item.split);
    }
    const forced=fixedPolicyAction(item.state);
    if((forced&&item.targetAction!==forced)||(!forced&&!POLICY_ACTIONS.some(action=>action===item.targetAction)))throw new Error("Trajectory conflicts with fixed policy constraints.");
  }
  const splitTimes=["train","development","test"].map(split=>examples.filter(item=>item.split===split).map(item=>Date.parse(item.observedAt)));
  if(splitTimes.some(times=>!times.length))throw new Error("Separate train, development and test trajectories are required.");
  if(Math.max(...splitTimes[0])>=Math.min(...splitTimes[1])||Math.max(...splitTimes[1])>=Math.min(...splitTimes[2]))throw new Error("Policy time partitions must be strictly chronological.");
  return ordered(examples);
}

const metricSchema=z.object({count:z.number().int().nonnegative(),families:z.number().int().nonnegative(),learners:z.number().int().nonnegative(),accuracy:z.number().min(0).max(1),learnableCount:z.number().int().nonnegative(),learnableAccuracy:z.number().min(0).max(1).nullable(),meanLogLoss:z.number().finite().nonnegative().nullable()}).strict();
const weightsSchema=z.array(z.array(z.number().finite()).length(POLICY_FEATURES.length)).length(POLICY_ACTIONS.length);
const modelSchema=z.object({kind:z.literal("regularized_multinomial_logistic_regression"),actions:z.tuple([z.literal("hint"),z.literal("related_example"),z.literal("independent_attempt")]),features:z.array(z.string()).length(POLICY_FEATURES.length),weights:weightsSchema}).strict();
export const learnedPolicyArtifactSchema=z.object({
  version:z.literal("diana-learned-support-policy-v1"),artifactHash:z.string().regex(/^[a-f0-9]{64}$/),createdAt:z.string().datetime(),datasetHash:z.string().regex(/^[a-f0-9]{64}$/),trainingDatasetHash:z.string().regex(/^[a-f0-9]{64}$/),receiptHash:z.string().regex(/^[a-f0-9]{64}$/),modelHash:z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  parameters:policyTrainingParametersSchema,model:modelSchema.nullable(),training:z.object({fitSplit:z.literal("train"),parameterSelection:z.literal("fixed_before_fit"),developmentUsage:z.literal("report_only"),testUsage:z.literal("report_only"),learnableExamples:z.number().int().nonnegative()}).strict(),
  comparisons:z.array(z.object({split:z.enum(["train","development","test"]),baseline:metricSchema,candidate:metricSchema,accuracyDifference:z.number().finite()}).strict()).max(3),
  eligibility:z.object({status:z.enum(["blocked_data","engineering_demonstration","needs_more_evidence","ready_for_operator_review"]),eligibleForOperatorReview:z.boolean(),reasons:z.array(z.string())}).strict(),
  authorization:z.object({checkedAt:z.string().datetime(),receiptIds:z.array(z.string()),externalEvidenceVerified:z.literal(false),requiresCurrentReceiptRecheck:z.literal(true)}).strict(),
  automaticallyPromoted:z.literal(false),deployed:z.literal(false),llmWeightsChanged:z.literal(false),learningGainsEstablished:z.literal(false),
}).strict();
export type LearnedPolicyArtifact=z.infer<typeof learnedPolicyArtifactSchema>;

function probabilities(weights:number[][],vector:number[]){
  const logits=weights.map(row=>row.reduce((sum,weight,index)=>sum+weight*vector[index],0)),peak=Math.max(...logits);
  const exponentials=logits.map(value=>Math.exp(value-peak)),sum=exponentials.reduce((a,b)=>a+b,0);
  return exponentials.map(value=>value/sum);
}
function fit(examples:PolicyTrajectory[],parameters:z.infer<typeof policyTrainingParametersSchema>){
  const usable=examples.filter(item=>fixedPolicyAction(item.state)===null);
  if(!usable.length)return null;
  const weights=POLICY_ACTIONS.map(()=>POLICY_FEATURES.map(()=>0));
  for(let epoch=0;epoch<parameters.epochs;epoch++){
    const gradients=weights.map(row=>row.map(()=>0));
    for(const item of usable){
      const vector=features(item.state,item.signals),prediction=probabilities(weights,vector);
      for(let action=0;action<weights.length;action++)for(let feature=0;feature<vector.length;feature++)gradients[action][feature]+=(prediction[action]-Number(POLICY_ACTIONS[action]===item.targetAction))*vector[feature]/usable.length;
    }
    for(let action=0;action<weights.length;action++)for(let feature=0;feature<weights[action].length;feature++)weights[action][feature]-=parameters.learningRate*(gradients[action][feature]+(feature?parameters.l2*weights[action][feature]:0));
  }
  return modelSchema.parse({kind:"regularized_multinomial_logistic_regression",actions:[...POLICY_ACTIONS],features:[...POLICY_FEATURES],weights});
}
function candidateAction(state:SupportState,signals:PolicySignals,model:z.infer<typeof modelSchema>):Action{
  const forced=fixedPolicyAction(state);if(forced)return forced;
  const scores=probabilities(model.weights,features(state,signals));
  return POLICY_ACTIONS[scores.indexOf(Math.max(...scores))];
}
function metrics(examples:PolicyTrajectory[],model:z.infer<typeof modelSchema>|null){
  const learnable=examples.filter(item=>fixedPolicyAction(item.state)===null);
  const correct=(item:PolicyTrajectory)=>(model?candidateAction(item.state,item.signals,model):fixedPolicyAction(item.state)??policyAction(item.state))===item.targetAction;
  return {count:examples.length,families:new Set(examples.map(item=>item.documentFamily)).size,learners:new Set(examples.map(item=>item.learnerId)).size,accuracy:examples.filter(correct).length/examples.length,
    learnableCount:learnable.length,learnableAccuracy:learnable.length?learnable.filter(correct).length/learnable.length:null,
    meanLogLoss:model&&learnable.length?learnable.reduce((sum,item)=>sum-Math.log(Math.max(1e-12,probabilities(model.weights,features(item.state,item.signals))[POLICY_ACTIONS.findIndex(action=>action===item.targetAction)])),0)/learnable.length:null};
}

async function authorizationReasons(examples:PolicyTrajectory[],receipts:TrainingReceipt[],now:number){
  const reasons:string[]=[];
  const allEngineering=examples.every(item=>item.provenance==="authored_engineering_fixture");
  if(!allEngineering&&examples.some(item=>item.provenance==="authored_engineering_fixture"))reasons.push("mixed_engineering_and_reviewed_data");
  for(const item of examples){
    if(item.provenance==="authored_engineering_fixture"){
      if(item.containsStudentData)reasons.push(item.id+":engineering_fixture_contains_student_data");
      continue;
    }
    const hash=await policyTrajectoryContentHash(item),bound=receipts.filter(receipt=>receipt.exampleId===item.id&&receipt.contentHash===hash);
    const valid=bound.filter(receipt=>!receipt.revokedAt&&Date.parse(receipt.issuedAt)<=now&&(!receipt.expiresAt||Date.parse(receipt.expiresAt)>now));
    for(const receipt of bound)if(receipt.revokedAt)reasons.push(item.id+":"+receipt.scope+"_revoked");
    if(item.rights==="excluded"||!valid.some(receipt=>receipt.scope==="training_rights"))reasons.push(item.id+":training_rights_missing");
    const reviewers=[...new Set(item.reviewerIds)];
    if(item.humanReview!=="approved"||reviewers.length<2||reviewers.some(reviewer=>!valid.some(receipt=>receipt.scope==="educator_review"&&receipt.issuedBy===reviewer)))reasons.push(item.id+":educator_review_missing");
    if(item.containsStudentData&&(item.rights!=="explicit_owner_consent"||!item.consentReceipt||!valid.some(receipt=>receipt.scope==="student_consent"&&receipt.id===item.consentReceipt)))reasons.push(item.id+":student_consent_missing");
  }
  return [...new Set(reasons)];
}

export async function trainLearnedPolicy(rawExamples:unknown[],rawReceipts:unknown[]=[],options:{now?:number;parameters?:z.infer<typeof policyTrainingParametersSchema>}={}):Promise<LearnedPolicyArtifact>{
  const examples=validatePolicyDataset(rawExamples),receipts=rawReceipts.map(value=>trainingReceiptSchema.parse(value));
  if(new Set(receipts.map(item=>item.id)).size!==receipts.length)throw new Error("Duplicate training receipt.");
  const now=options.now??Date.now(),createdAt=new Date(now).toISOString();
  if(examples.some(item=>Date.parse(item.observedAt)>now))throw new Error("Trajectory observation is in the future.");
  const parameters=policyTrainingParametersSchema.parse(options.parameters??DEFAULT_POLICY_TRAINING_PARAMETERS),train=examples.filter(item=>item.split==="train");
  const reasons=await authorizationReasons(examples,receipts,now),blocked=reasons.length>0;
  // Only training rows reach the optimizer. Development and test are observed after fitting.
  const model=blocked?null:fit(train,parameters);
  if(!blocked&&!model)reasons.push("no_learnable_training_examples");
  const comparisons=model?(["train","development","test"] as const).map(split=>{
    const rows=examples.filter(item=>item.split===split),baseline=metrics(rows,null),candidate=metrics(rows,model);
    return {split,baseline,candidate,accuracyDifference:candidate.accuracy-baseline.accuracy};
  }):[];
  const engineering=examples.some(item=>item.provenance==="authored_engineering_fixture");
  if(engineering)reasons.push("engineering_examples_are_not_educator_or_learning_evidence");
  const test=comparisons.find(item=>item.split==="test"),development=comparisons.find(item=>item.split==="development");
  if(model){
    if(!test||test.candidate.families<5||test.candidate.learners<5)reasons.push("insufficient_held_out_families_or_learners");
    if(!test||test.accuracyDifference<=0)reasons.push("no_held_out_improvement_over_baseline");
    if(!development||development.accuracyDifference<0)reasons.push("development_regression");
    if(train.some(item=>item.provenance==="reviewed_trajectory")&&new Set(train.map(item=>item.targetAction).filter(action=>POLICY_ACTIONS.some(candidate=>candidate===action))).size<POLICY_ACTIONS.length)reasons.push("training_action_coverage_incomplete");
  }
  const body={version:"diana-learned-support-policy-v1" as const,createdAt,datasetHash:await datasetHash(examples),trainingDatasetHash:await datasetHash(train),receiptHash:await sha256(canonical([...receipts].sort((a,b)=>a.id.localeCompare(b.id)))),modelHash:model?await sha256(canonical({model,parameters})):null,parameters,model,
    training:{fitSplit:"train" as const,parameterSelection:"fixed_before_fit" as const,developmentUsage:"report_only" as const,testUsage:"report_only" as const,learnableExamples:model?train.filter(item=>fixedPolicyAction(item.state)===null).length:0},comparisons,
    eligibility:{status:blocked?"blocked_data" as const:engineering?"engineering_demonstration" as const:reasons.length?"needs_more_evidence" as const:"ready_for_operator_review" as const,eligibleForOperatorReview:!reasons.length,reasons},
    authorization:{checkedAt:createdAt,receiptIds:receipts.map(item=>item.id),externalEvidenceVerified:false as const,requiresCurrentReceiptRecheck:true as const},automaticallyPromoted:false as const,deployed:false as const,llmWeightsChanged:false as const,learningGainsEstablished:false as const};
  return learnedPolicyArtifactSchema.parse({...body,artifactHash:await sha256(canonical(body))});
}

/** Offline inspection only. A candidate prediction does not activate the candidate. */
export function predictLearnedPolicyCandidate(state:SupportState,signals:PolicySignals,rawArtifact:LearnedPolicyArtifact):Action{
  const artifact=learnedPolicyArtifactSchema.parse(rawArtifact);
  if(!artifact.model)throw new Error("Policy artifact has no fitted model.");
  if(artifact.model.features.join("|")!==POLICY_FEATURES.join("|"))throw new Error("Policy feature version mismatch.");
  return candidateAction(state,signals,artifact.model);
}
export async function evaluateLearnedPolicy(rawArtifact:LearnedPolicyArtifact,rawExamples:unknown[]){
  const artifact=learnedPolicyArtifactSchema.parse(rawArtifact),examples=validatePolicyDataset(rawExamples);
  if(!artifact.model)throw new Error("Policy artifact has no fitted model.");
  const {artifactHash,...body}=artifact;
  if(await sha256(canonical(body))!==artifactHash||await sha256(canonical({model:artifact.model,parameters:artifact.parameters}))!==artifact.modelHash)throw new Error("Policy artifact hash mismatch.");
  if(artifact.model.features.join("|")!==POLICY_FEATURES.join("|"))throw new Error("Policy feature version mismatch.");
  return {version:"learned-policy-evaluation-v1",artifactHash:artifact.artifactHash,datasetHash:await datasetHash(examples),splits:(["train","development","test"] as const).map(split=>({split,baseline:metrics(examples.filter(item=>item.split===split),null),candidate:metrics(examples.filter(item=>item.split===split),artifact.model)})),learningGainsEstablished:false};
}

/** An operator approval alone cannot authorize stale or revoked trajectory evidence. No automatic activation. */
export async function learnedPolicyDecision(state:SupportState,signals:PolicySignals,rawArtifact:LearnedPolicyArtifact,authorization?:{approvedArtifactHash:string;approvedBy:string;approvedAt:string;examples:unknown[];receipts:unknown[];now?:number}){
  const forced=fixedPolicyAction(state);
  if(forced)return {action:forced,source:"fixed_constraint" as const};
  const baseline={action:policyAction(state),source:"baseline" as const};
  const parsed=learnedPolicyArtifactSchema.safeParse(rawArtifact);
  if(!parsed.success||!authorization||!authorization.approvedBy.trim())return baseline;
  const artifact=parsed.data,{artifactHash,...body}=artifact,now=authorization.now??Date.now();
  if(!artifact.eligibility.eligibleForOperatorReview||!artifact.model||authorization.approvedArtifactHash!==artifactHash||await sha256(canonical(body))!==artifactHash
    ||!Number.isFinite(Date.parse(authorization.approvedAt))||Date.parse(authorization.approvedAt)<Date.parse(artifact.createdAt)||Date.parse(authorization.approvedAt)>now)return baseline;
  try{
    const examples=validatePolicyDataset(authorization.examples),receipts=authorization.receipts.map(value=>trainingReceiptSchema.parse(value));
    if(new Set(receipts.map(item=>item.id)).size!==receipts.length||await datasetHash(examples)!==artifact.datasetHash||examples.some(item=>item.provenance!=="reviewed_trajectory")||(await authorizationReasons(examples,receipts,now)).length)return baseline;
    return {action:predictLearnedPolicyCandidate(state,signals,artifact),source:"reviewed_learned_policy" as const};
  }catch{return baseline;}
}
