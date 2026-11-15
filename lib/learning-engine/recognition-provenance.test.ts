import {describe,expect,it} from "vitest";
import {recognitionProofKey,signRecognitionDraft,verifyRecognitionProof} from "./recognition-provenance";
import type {RecognitionDraft} from "./recognition";

const now=Date.parse("2026-09-26T12:00:00Z"),key=recognitionProofKey("12".repeat(32))!;
const draft:RecognitionDraft={version:"recognition-draft-v1",contentHash:"a".repeat(64),text:"three times x equals nine",confirmedHash:null,
  recognition:{version:"local-recognition-v1",kind:"speech",assetHash:"b".repeat(64),modelId:"fixture/whisper-small",revision:"c".repeat(40),
    fileManifestHash:"d".repeat(64),text:"three times x equals nine",elapsedMs:42,device:"cpu",confidence:null,networkUsed:false}};

describe("local recognition provenance proof",()=>{
  it("binds an exact transcript, student, modality, asset and model files",()=>{
    const proof=signRecognitionDraft(draft,"student-1",key,now);
    expect(verifyRecognitionProof(proof,"student-1",draft.text,"voice",key,now+1000)).toMatchObject({
      assetHash:draft.recognition.assetHash,textHash:expect.stringMatching(/^[a-f0-9]{64}$/),modelId:draft.recognition.modelId,
      fileManifestHash:draft.recognition.fileManifestHash,kind:"speech"});
    for(const [owner,text,modality] of [["student-2",draft.text,"voice"],["student-1","three times x equals eight","voice"],["student-1",draft.text,"handwriting"]] as const)
      expect(()=>verifyRecognitionProof(proof,owner,text,modality,key,now+1000)).toThrow("recognition_proof_invalid");
  });
  it("rejects tampered, expired, unconfirmed-key and network claims",()=>{
    const proof=signRecognitionDraft(draft,"student-1",key,now);
    expect(()=>verifyRecognitionProof(proof.slice(0,-2)+"xx","student-1",draft.text,"voice",key,now)).toThrow("recognition_proof_invalid");
    expect(()=>verifyRecognitionProof(proof,"student-1",draft.text,"voice",key,now+15*60_000)).toThrow("recognition_proof_invalid");
    expect(recognitionProofKey("not-a-key")).toBeNull();
    expect(()=>signRecognitionDraft({...draft,recognition:{...draft.recognition,networkUsed:true as false}},"student-1",key,now)).toThrow();
  });
});
