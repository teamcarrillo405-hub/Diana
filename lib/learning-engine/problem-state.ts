import {z} from "zod";
import {recognitionEvidenceSchema} from "./recognition";

export const PROBLEM_STATE_VERSION="problem-state-v1" as const;
const identity=z.string().min(1).max(200);
const hash=z.string().regex(/^[a-f0-9]{64}$/);
const locator=z.object({
  versionId:hash,assetHash:hash.optional(),page:z.number().int().min(1).max(1500),
  regionId:identity.optional(),startOffset:z.number().int().nonnegative(),endOffset:z.number().int().positive(),
}).strict().refine(value=>value.endOffset>value.startOffset,"An observation needs a source span.");
const observationBaseSchema=z.object({
  id:identity,field:identity,
  role:z.enum(["problem_statement","equation","given","student_step","spoken_reasoning","diagram_relation"]),
  modality:z.enum(["typed","pdf_region","handwriting","photo","voice"]),
  provenance:z.enum(["student_entered","native_pdf","machine_interpretation","authored_engineering"]),
  text:z.string().min(1).max(4000),source:locator.optional(),recognitionEvidence:recognitionEvidenceSchema.optional(),
  recognitionProof:z.string().min(1).max(2000).optional(),
}).strict();
function checkObservation(value:z.infer<typeof observationBaseSchema>,context:z.RefinementCtx){
  if(value.modality==="pdf_region"&&!value.source)context.addIssue({code:"custom",message:"A PDF observation needs its source location."});
  if(value.provenance==="native_pdf"&&value.modality!=="pdf_region")context.addIssue({code:"custom",message:"Native PDF provenance requires a PDF region."});
  if(value.recognitionEvidence&&(value.id!=="response"||value.provenance!=="machine_interpretation"||
    (value.modality==="voice"?value.recognitionEvidence.kind!=="speech":value.modality==="handwriting"?value.recognitionEvidence.kind!=="handwriting_line":true)))
    context.addIssue({code:"custom",message:"Recognition evidence needs a matching machine response."});
  if(Boolean(value.recognitionEvidence)!==Boolean(value.recognitionProof))
    context.addIssue({code:"custom",message:"Recognition evidence needs its signed proof."});
}
export const problemObservationSchema=observationBaseSchema.superRefine(checkObservation);
export const problemStateSchema=z.object({
  schemaVersion:z.literal(PROBLEM_STATE_VERSION),id:z.string().uuid(),revision:z.number().int().positive(),
  supportCount:z.number().int().min(0).max(100).default(0),
  exerciseVersionId:hash.nullable().default(null),
  scope:z.object({classId:z.string().uuid(),assignmentId:z.string().uuid().nullable(),exerciseId:identity}).strict(),
  observations:z.array(observationBaseSchema.extend({contentHash:hash,confirmedHash:hash.nullable()}).superRefine(checkObservation)).max(80),
}).strict().superRefine((value,context)=>{
  if(new Set(value.observations.map(item=>item.id)).size!==value.observations.length)context.addIssue({code:"custom",message:"Observation IDs must be unique."});
  for(const item of value.observations)if(item.confirmedHash&&item.confirmedHash!==item.contentHash)context.addIssue({code:"custom",message:"A confirmation belongs to an earlier interpretation."});
});
export const problemPatchSchema=z.object({
  expectedRevision:z.number().int().nonnegative(),
  put:z.array(problemObservationSchema.refine(value=>value.provenance!=="authored_engineering","Authored prompts are loaded from the exercise catalog.")).max(80).default([]),
  remove:z.array(identity).max(80).default([]),
  confirm:z.array(z.object({id:identity,contentHash:hash}).strict()).max(80).default([]),
}).strict();
export type ProblemState=z.infer<typeof problemStateSchema>;
export type ProblemObservation=z.infer<typeof problemObservationSchema>;

export async function observationHash(raw:ProblemObservation){
  const observation=problemObservationSchema.parse(raw);
  if(observation.recognitionEvidence){
    const textBytes=new TextEncoder().encode(observation.text);
    const textDigest=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",textBytes)),value=>value.toString(16).padStart(2,"0")).join("");
    if(textDigest!==observation.recognitionEvidence.textHash)throw new Error("recognition_text_changed");
  }
  // The schema fixes key order. Exact text and location, including modality, bind consent.
  const bytes=new TextEncoder().encode(JSON.stringify(observation));
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),value=>value.toString(16).padStart(2,"0")).join("");
}
export function emptyProblemState(id:string,scope:ProblemState["scope"]):ProblemState{
  return problemStateSchema.parse({schemaVersion:PROBLEM_STATE_VERSION,id,revision:1,scope,observations:[]});
}
export async function reviseProblemState(previous:ProblemState,rawPatch:unknown):Promise<ProblemState>{
  const state=problemStateSchema.parse(previous),patch=problemPatchSchema.parse(rawPatch);
  if(patch.expectedRevision!==state.revision)throw new Error("revision_conflict");
  const touched=[...patch.put.map(item=>item.id),...patch.remove];
  if(new Set(touched).size!==touched.length)throw new Error("duplicate_edit");
  const observations=new Map(state.observations.map(item=>[item.id,item]));
  for(const id of patch.remove){if(!observations.has(id))throw new Error("unknown_observation");observations.delete(id);}
  for(const input of patch.put){
    const contentHash=await observationHash(input),old=observations.get(input.id);
    observations.set(input.id,{...input,contentHash,confirmedHash:old?.contentHash===contentHash?old.confirmedHash:null});
  }
  for(const confirmation of patch.confirm){
    const item=observations.get(confirmation.id);
    if(!item||item.contentHash!==confirmation.contentHash)throw new Error("stale_confirmation");
    observations.set(item.id,{...item,confirmedHash:item.contentHash});
  }
  return problemStateSchema.parse({...state,revision:state.revision+1,observations:[...observations.values()]});
}
export async function validateProblemState(raw:unknown):Promise<ProblemState>{
  const state=problemStateSchema.parse(raw);
  for(const item of state.observations){
    const {contentHash,confirmedHash,...observation}=item;void confirmedHash;
    if(await observationHash(observation)!==contentHash)throw new Error("observation_hash_mismatch");
  }
  return state;
}
export function problemReadiness(state:ProblemState){
  const parsed=problemStateSchema.parse(state),fields=new Map<string,Set<string>>();
  for(const item of parsed.observations){
    // Only observations explicitly assigned to the same semantic field compete.
    // Preserve signs, units, superscripts and punctuation; no guessed equivalence.
    const key=item.role+":"+item.field,values=fields.get(key)??new Set<string>();
    values.add(item.text.trim());fields.set(key,values);
  }
  const conflicts=[...fields].filter(([,values])=>values.size>1).map(([field])=>field);
  const unconfirmed=parsed.observations.filter(item=>item.confirmedHash!==item.contentHash).map(item=>item.id);
  const hasProblem=parsed.observations.some(item=>item.role==="problem_statement");
  return {status:conflicts.length?"conflict":!hasProblem||unconfirmed.length?"needs_confirmation":"ready",
    conflicts,unconfirmed,hasProblem,educatorReviewed:false as const,eligibleForKnowledge:false as const};
}
