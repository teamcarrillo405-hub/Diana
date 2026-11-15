import "server-only";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { learnedPolicyArtifactSchema, learnedPolicyDecision, type PolicySignals } from "./learned-policy";
import { policyAction, supportStateSchema, type SupportState } from "./support-policy";

const filename=z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}\.json$/);
export const policyActivationSchema=z.object({
  version:z.literal("policy-activation-v1"), status:z.enum(["active","disabled"]),
  artifactFile:filename,examplesFile:filename,receiptsFile:filename,
  approvedArtifactHash:z.string().regex(/^[a-f0-9]{64}$/),approvedBy:z.string().trim().min(3).max(200),
  approvalEvidenceRef:z.string().trim().min(3).max(300),approvedAt:z.string().datetime(),expiresAt:z.string().datetime(),
}).strict();
export type PolicyRuntimeResult={action:ReturnType<typeof policyAction>;source:"baseline"|"fixed_constraint"|"reviewed_learned_policy";artifactHash:string|null;reason:"not_configured"|"disabled"|"expired"|"unavailable"|"authorization_not_satisfied"|"current_authorization"};
type Reader=(name:string)=>Promise<unknown>;
/** The reader is private server storage. Client requests can never choose a bundle or approval. */
export async function decisionFromPolicyBundle(state:SupportState,signals:PolicySignals,read:Reader,now=Date.now()):Promise<PolicyRuntimeResult>{
  supportStateSchema.parse(state);
  const baseline=(reason:PolicyRuntimeResult["reason"]):PolicyRuntimeResult=>({action:policyAction(state),source:"baseline",artifactHash:null,reason});
  try {
    const activation=policyActivationSchema.parse(await read("activation.json"));
    if(activation.status!=="active")return baseline("disabled");
    if(Date.parse(activation.approvedAt)>now||Date.parse(activation.expiresAt)<=now||Date.parse(activation.expiresAt)<=Date.parse(activation.approvedAt))return baseline("expired");
    const [artifactRaw,examples,receipts]=await Promise.all([read(activation.artifactFile),read(activation.examplesFile),read(activation.receiptsFile)]);
    const artifact=learnedPolicyArtifactSchema.parse(artifactRaw);
    if(!Array.isArray(examples)||!Array.isArray(receipts))return baseline("unavailable");
    // Read the switch again: a replacement/rollback during IO must not return a stale candidate.
    const fresh=policyActivationSchema.parse(await read("activation.json"));
    if(JSON.stringify(fresh)!==JSON.stringify(activation))return baseline("disabled");
    const result=await learnedPolicyDecision(state,signals,artifact,{...activation,examples,receipts,now});
    return {...result,artifactHash:result.source==="reviewed_learned_policy"?artifact.artifactHash:null,reason:result.source==="reviewed_learned_policy"?"current_authorization":"authorization_not_satisfied"};
  }catch{return baseline("unavailable");}
}
export async function privatePolicyReader(directory:string):Promise<Reader>{
  const root=await realpath(directory);
  const publicRoot=path.resolve(process.cwd(),"public"),relative=path.relative(publicRoot,root);
  if(relative===""||(!relative.startsWith(".."+path.sep)&&relative!==".."&&!path.isAbsolute(relative)))throw new Error("policy_bundle_must_be_private");
  return async(name:string)=>{
    filename.parse(name);
    const target=await realpath(path.join(root,name));
    if(path.dirname(target)!==root)throw new Error("policy_path_outside_bundle");
    const info=await stat(target);
    if(!info.isFile()||info.size>5_000_000)throw new Error("policy_file_exceeds_limit");
    return JSON.parse(await readFile(target,"utf8")) as unknown;
  };
}
export async function operationalPolicyDecision(state:SupportState,signals:PolicySignals):Promise<PolicyRuntimeResult>{
  const directory=process.env.DIANA_LEARNED_POLICY_DIRECTORY;
  if(!directory)return {action:policyAction(state),source:"baseline",artifactHash:null,reason:"not_configured"};
  try{return await decisionFromPolicyBundle(state,signals,await privatePolicyReader(directory));}
  catch{return {action:policyAction(state),source:"baseline",artifactHash:null,reason:"unavailable"};}
}
