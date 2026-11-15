import { z } from "zod";
import { courseContentHash } from "./course-framework";

const digest=z.string().regex(/^[a-f0-9]{64}$/);
export const recognitionModelSchema=z.object({
  version:z.literal("local-recognition-v1"),kind:z.enum(["handwriting_line","speech"]),modelId:z.string().min(1).max(200),
  revision:z.string().regex(/^[a-f0-9]{40}$/),fileManifestHash:digest,approvedBy:z.string().min(1).max(200),
  approvalReference:z.string().min(1).max(200),approvedAt:z.string().datetime(),expiresAt:z.string().datetime(),enabled:z.boolean(),
}).strict();
export const recognitionOutputSchema=z.object({
  version:z.literal("local-recognition-v1"),kind:z.enum(["handwriting_line","speech"]),assetHash:digest,
  modelId:z.string().min(1).max(200),revision:z.string().regex(/^[a-f0-9]{40}$/),fileManifestHash:digest,
  text:z.string().max(4000),elapsedMs:z.number().finite().nonnegative(),
  device:z.literal("cpu"),confidence:z.null(),networkUsed:z.literal(false),
}).strict();
export const recognitionEvidenceSchema=z.object({
  version:z.literal("recognition-evidence-v1"),kind:z.enum(["speech","handwriting_line"]),
  assetHash:digest,textHash:digest,modelId:z.string().min(1).max(200),
  revision:z.string().regex(/^[a-f0-9]{40}$/),fileManifestHash:digest,
  issuedAt:z.number().int().positive(),networkUsed:z.literal(false),confidence:z.null(),
}).strict();
export type RecognitionEvidence=z.infer<typeof recognitionEvidenceSchema>;
export type RecognitionModel=z.infer<typeof recognitionModelSchema>;
export type RecognitionOutput=z.infer<typeof recognitionOutputSchema>;
export type RecognitionDraft={version:"recognition-draft-v1";contentHash:string;recognition:RecognitionOutput;text:string;confirmedHash:string|null};

export function recognitionAvailability(raw:unknown,kind:RecognitionModel["kind"],now=Date.now()){
  const parsed=recognitionModelSchema.safeParse(raw);
  if(!parsed.success||!parsed.data.enabled)return {available:false as const,reason:"model_unavailable"};
  const model=parsed.data;
  if(model.kind!==kind||Date.parse(model.approvedAt)>now||Date.parse(model.expiresAt)<=now)return {available:false as const,reason:"model_approval_unavailable"};
  return {available:true as const,model};
}
/** Output confidence is deliberately unknown until a separate calibration study exists. */
export async function prepareRecognitionDraft(raw:unknown,model:RecognitionModel,assetHash:string,now=Date.now()):Promise<RecognitionDraft>{
  const output=recognitionOutputSchema.parse(raw),status=recognitionAvailability(model,output.kind,now);
  if(!status.available||output.assetHash!==assetHash||output.modelId!==model.modelId||output.revision!==model.revision||output.fileManifestHash!==model.fileManifestHash)throw new Error("recognition_evidence_changed");
  if(!output.text.trim())throw new Error("recognition_no_text");
  const contentHash=await courseContentHash({recognition:output,text:output.text});
  return {version:"recognition-draft-v1",contentHash,recognition:output,text:output.text,confirmedHash:null};
}
export async function reviseRecognitionDraft(draft:RecognitionDraft,text:string){
  if(text.length>4000)throw new Error("recognition_text_bound");
  await validateRecognitionDraft(draft);
  const contentHash=await courseContentHash({recognition:draft.recognition,text});
  return {...draft,text,contentHash,confirmedHash:contentHash===draft.contentHash?draft.confirmedHash:null};
}
async function validateRecognitionDraft(draft:RecognitionDraft){
  recognitionOutputSchema.parse(draft.recognition);
  if(draft.version!=="recognition-draft-v1"||draft.text.length>4000||await courseContentHash({recognition:draft.recognition,text:draft.text})!==draft.contentHash)throw new Error("recognition_draft_changed");
}
export async function confirmRecognitionDraft(draft:RecognitionDraft,expectedHash:string){
  await validateRecognitionDraft(draft);
  if(expectedHash!==draft.contentHash||!draft.text.trim())throw new Error("recognition_confirmation_changed");
  return {...draft,confirmedHash:expectedHash};
}
export async function confirmedRecognitionText(draft:RecognitionDraft){
  await validateRecognitionDraft(draft);
  if(draft.confirmedHash!==draft.contentHash)throw new Error("recognition_confirmation_required");
  return {text:draft.text,modality:draft.recognition.kind==="speech"?"voice" as const:"handwriting" as const,
    provenance:"machine_interpretation" as const,assetHash:draft.recognition.assetHash,engineVersion:draft.recognition.modelId+"@"+draft.recognition.revision,
    eligibleForKnowledge:false as const,trainingEligible:false as const};
}
