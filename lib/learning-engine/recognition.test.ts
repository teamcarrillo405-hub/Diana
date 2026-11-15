import {describe,expect,it} from "vitest";
import {recognitionAvailability,prepareRecognitionDraft,reviseRecognitionDraft,confirmRecognitionDraft,confirmedRecognitionText,type RecognitionModel} from "./recognition";
const now=Date.parse("2026-09-26T12:00:00Z"),model:RecognitionModel={version:"local-recognition-v1",kind:"speech",modelId:"test-only/speech-fixture",revision:"1".repeat(40),fileManifestHash:"2".repeat(64),approvedBy:"test-operator",approvalReference:"synthetic-only",approvedAt:"2026-09-20T00:00:00Z",expiresAt:"2026-10-01T00:00:00Z",enabled:true};
const output={version:"local-recognition-v1",kind:"speech",assetHash:"3".repeat(64),modelId:model.modelId,revision:model.revision,fileManifestHash:model.fileManifestHash,text:"3x + 5 = 20",elapsedMs:42,device:"cpu",confidence:null,networkUsed:false};
describe("local recognition confirmation boundary",()=>{
  it("keeps missing, disabled, expired and mismatched models unavailable",()=>{
    expect(recognitionAvailability(null,"speech",now).available).toBe(false);
    expect(recognitionAvailability({...model,enabled:false},"speech",now).available).toBe(false);
    expect(recognitionAvailability({...model,expiresAt:"2026-09-01T00:00:00Z"},"speech",now).available).toBe(false);
    expect(recognitionAvailability(model,"handwriting_line",now).available).toBe(false);
  });
  it("never silently confirms recognized output",async()=>{
    const draft=await prepareRecognitionDraft(output,model,output.assetHash,now);
    await expect(confirmedRecognitionText(draft)).rejects.toThrow("confirmation_required");
    const confirmed=await confirmRecognitionDraft(draft,draft.contentHash);
    expect(await confirmedRecognitionText(confirmed)).toMatchObject({text:output.text,provenance:"machine_interpretation",eligibleForKnowledge:false,trainingEligible:false});
  });
  it("invalidates confirmation after edits including mathematical signs",async()=>{
    const draft=await prepareRecognitionDraft(output,model,output.assetHash,now),confirmed=await confirmRecognitionDraft(draft,draft.contentHash);
    const edited=await reviseRecognitionDraft(confirmed,"3x - 5 = 20");expect(edited.confirmedHash).toBeNull();
    await expect(confirmRecognitionDraft(edited,draft.contentHash)).rejects.toThrow("confirmation_changed");
  });
  it("rejects changed assets, weights, confidence claims and network fallback",async()=>{
    await expect(prepareRecognitionDraft(output,model,"4".repeat(64),now)).rejects.toThrow("evidence_changed");
    await expect(prepareRecognitionDraft({...output,revision:"5".repeat(40)},model,output.assetHash,now)).rejects.toThrow("evidence_changed");
    await expect(prepareRecognitionDraft({...output,confidence:0.9},model,output.assetHash,now)).rejects.toThrow();
    await expect(prepareRecognitionDraft({...output,networkUsed:true},model,output.assetHash,now)).rejects.toThrow();
    await expect(prepareRecognitionDraft({...output,text:""},model,output.assetHash,now)).rejects.toThrow("no_text");
  });
});
