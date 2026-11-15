import {createHash,createHmac,timingSafeEqual} from "node:crypto";
import {z} from "zod";
import {recognitionEvidenceSchema,recognitionOutputSchema,type RecognitionDraft,type RecognitionEvidence} from "./recognition";

const proofSchema=recognitionEvidenceSchema.extend({ownerId:z.string().min(1).max(200),expiresAt:z.number().int().positive()}).strict();
const lifetimeMs=15*60_000;

/** A separate local secret is required; never use the Supabase service key. */
export function recognitionProofKey(raw:string|undefined){
  return raw&&/^[a-fA-F0-9]{64,128}$/.test(raw)?Buffer.from(raw,"hex"):null;
}
const textHash=(text:string)=>createHash("sha256").update(text,"utf8").digest("hex");
const mac=(payload:string,key:Buffer)=>createHmac("sha256",key).update(payload,"utf8").digest("base64url");

export function signRecognitionDraft(draft:RecognitionDraft,ownerId:string,key:Buffer,now=Date.now()){
  if(!recognitionProofKey(key.toString("hex"))||draft.version!=="recognition-draft-v1"||draft.confirmedHash!==null||
    !draft.text.trim()||draft.text.length>4000||!/^[a-f0-9]{64}$/.test(draft.contentHash))throw new Error("recognition_proof_unavailable");
  const recognition=recognitionOutputSchema.parse(draft.recognition);
  if(recognition.text!==draft.text)throw new Error("recognition_proof_unavailable");
  const payload=proofSchema.parse({version:"recognition-evidence-v1",kind:recognition.kind,
    assetHash:recognition.assetHash,textHash:textHash(draft.text),modelId:recognition.modelId,
    revision:recognition.revision,fileManifestHash:recognition.fileManifestHash,
    issuedAt:now,networkUsed:false,confidence:null,ownerId,expiresAt:now+lifetimeMs});
  const encoded=Buffer.from(JSON.stringify(payload),"utf8").toString("base64url");
  return encoded+"."+mac(encoded,key);
}

export function verifyRecognitionProof(token:string,ownerId:string,text:string,modality:"typed"|"handwriting"|"voice",key:Buffer,now=Date.now()):RecognitionEvidence{
  if(!token||token.length>2000||!key||!recognitionProofKey(key.toString("hex")))throw new Error("recognition_proof_invalid");
  const parts=token.split(".");
  if(parts.length!==2||!parts.every(part=>/^[A-Za-z0-9_-]+$/.test(part)))throw new Error("recognition_proof_invalid");
  const expected=Buffer.from(mac(parts[0],key),"base64url"),provided=Buffer.from(parts[1],"base64url");
  if(provided.length!==expected.length||!timingSafeEqual(provided,expected))throw new Error("recognition_proof_invalid");
  let payload:z.infer<typeof proofSchema>;
  try{payload=proofSchema.parse(JSON.parse(Buffer.from(parts[0],"base64url").toString("utf8")));}
  catch{throw new Error("recognition_proof_invalid");}
  if(payload.ownerId!==ownerId||payload.textHash!==textHash(text)||
    (modality==="voice"?payload.kind!=="speech":modality==="handwriting"?payload.kind!=="handwriting_line":true)||
    payload.issuedAt>now+60_000||payload.expiresAt<=now||payload.expiresAt-payload.issuedAt!==lifetimeMs)
    throw new Error("recognition_proof_invalid");
  const {ownerId:_ownerId,expiresAt:_expiresAt,...evidence}=payload;
  void _ownerId;void _expiresAt;
  return recognitionEvidenceSchema.parse(evidence);
}
