import { z } from "zod";
import { sha256 } from "./curriculum";

export const trainingExampleSchema = z.object({
  id: z.string().min(1).max(200), documentFamily: z.string().min(1).max(200), templateFamily: z.string().min(1).max(200),
  split: z.enum(["train","development","test"]), provenanceId: z.string().min(1).max(200),
  rights: z.enum(["excluded","licensed_for_training","public_domain","explicit_owner_consent"]),
  containsStudentData: z.boolean(), consentReceipt: z.string().max(200).nullable(),
  humanReview: z.enum(["pending","approved","rejected"]),
  reviewerId: z.string().max(200).nullable(),
  sourceText: z.string().min(1).max(12000).optional(),
  messages: z.array(z.object({ role: z.enum(["system","user","assistant"]), content: z.string().min(1).max(12000) }).strict()).min(3).max(20),
}).strict();
export type TrainingExample = z.infer<typeof trainingExampleSchema>;
export const trainingReceiptSchema=z.object({
  id:z.string().min(1),exampleId:z.string().min(1),contentHash:z.string().regex(/^[a-f0-9]{64}$/),
  scope:z.enum(["training_rights","student_consent","educator_review"]),issuedBy:z.string().min(1),
  issuedAt:z.string().datetime(),expiresAt:z.string().datetime().nullable(),revokedAt:z.string().datetime().nullable(),
}).strict();
export type TrainingReceipt=z.infer<typeof trainingReceiptSchema>;
export async function trainingContentHash(example:TrainingExample){return sha256(JSON.stringify({provenanceId:example.provenanceId,sourceText:example.sourceText,messages:example.messages}));}

export async function buildTrainingExport(raw: unknown[], heldOut: Array<{documentFamily:string;templateFamily:string}>, rawReceipts:unknown[]=[], now=Date.now()) {
  const accepted: TrainingExample[] = [];
  const rejected: Array<{id:string;reasons:string[]}> = [];
  if(!raw.length)rejected.push({id:"dataset",reasons:["empty_dataset"]});
  const hashes=new Set<string>();
  const ids=new Set<string>();
  const receipts=rawReceipts.map(receipt=>trainingReceiptSchema.parse(receipt));
  if(new Set(receipts.map(receipt=>receipt.id)).size!==receipts.length)throw new Error("Duplicate evidence receipt.");
  for (const value of raw) {
    const parsed=trainingExampleSchema.safeParse(value);
    if (!parsed.success) { rejected.push({id:"invalid",reasons:["invalid_schema"]}); continue; }
    const example=parsed.data;
    const reasons:string[]=[];
    const normalized=example.messages.map((message)=>message.role+":"+message.content.normalize("NFKC").toLowerCase().replace(/\s+/g," ").trim()).join("\n");
    const hash=await sha256(normalized);
    const contentHash=await trainingContentHash(example);
    const validReceipts=receipts.filter(receipt=>receipt.exampleId===example.id&&receipt.contentHash===contentHash&&!receipt.revokedAt
      &&Date.parse(receipt.issuedAt)<=now&&(!receipt.expiresAt||Date.parse(receipt.expiresAt)>now));
    if (ids.has(example.id) || hashes.has(hash)) reasons.push("duplicate");
    ids.add(example.id); hashes.add(hash);
    if (example.split!=="train") reasons.push("held_out_partition");
    if (heldOut.some((item)=>item.documentFamily===example.documentFamily || item.templateFamily===example.templateFamily)) reasons.push("held_out_family");
    if (example.rights==="excluded") reasons.push("training_rights_missing");
    if (example.containsStudentData && (example.rights!=="explicit_owner_consent" || !example.consentReceipt)) reasons.push("student_consent_missing");
    if (example.humanReview!=="approved" || !example.reviewerId) reasons.push("human_review_missing");
    if(!validReceipts.some(receipt=>receipt.scope==="training_rights"))reasons.push("rights_evidence_missing");
    if(!validReceipts.some(receipt=>receipt.scope==="educator_review"&&receipt.issuedBy===example.reviewerId))reasons.push("review_evidence_missing");
    if(example.containsStudentData&&!validReceipts.some(receipt=>receipt.scope==="student_consent"&&receipt.id===example.consentReceipt))reasons.push("consent_evidence_missing");
    if (example.messages.at(-1)?.role!=="assistant" || example.messages[0]?.role!=="system") reasons.push("conversation_shape");
    if (reasons.length) rejected.push({id:example.id,reasons}); else accepted.push(example);
  }
  // Do not partially export an unclean candidate set. Operators resolve rejects first.
  const jsonl=rejected.length ? null : accepted.map((example)=>JSON.stringify({messages:example.messages})).join("\n");
  return {status:rejected.length ? "blocked" as const : "ready_for_capability_review" as const,
    accepted:accepted.length,rejected,jsonl,hash:jsonl===null ? null : await sha256(jsonl)};
}

/** There is deliberately no training HTTP call behind a configuration toggle. */
export function trainingCapability(): {enabled:false;reason:string} {
  return {enabled:false,reason:"OpenAI documentation checked 2026-09-25 says its fine-tuning platform is winding down and closed to new users. Account eligibility, current availability, reviewed data and separate run authorization must be verified before any training route is implemented."};
}
