import {describe,it,expect} from "vitest";
import {validateModelComparison} from "./model-comparison";
import {corpusDigest,type EvaluationCase} from "./experiments";
const cases:EvaluationCase[]=[{id:"test-one",subject:"reading",stratum:"reading",documentFamily:"document-test",templateFamily:"template-test",split:"test",prompt:"Compare the evidence.",source:"An original fixture.",expected:{answer:null,abstain:false},provenance:"authored_engineering_fixture",humanReviewed:false}];
async function runs(){return Promise.all([1,2].map(async number=>{
  const manifest={id:`00000000-0000-4000-8000-00000000000${number}`,version:"high-school-learning-v1",corpusHash:await corpusDigest(cases),codeRevision:"test-code-v1",model:"fixture-model-"+number,promptVersion:"fixture-prompt-v1",arm:"source_baseline",split:"test",maxOutputTokens:1000,maxInputBytes:32000,maxBatchCents:1000,monthlyCapCents:10000,humanReview:"pending"};
  const requestId=`00000000-0000-4000-8000-00000000001${number}`;
  return {manifest,requests:{"test-one":{requestId,batchId:`00000000-0000-4000-8000-00000000002${number}`}},outputs:[{caseId:"test-one",manifestId:manifest.id,requestId,model:manifest.model,output:"Test fixture only",startedAt:"2026-09-26T00:00:00Z",completedAt:"2026-09-26T00:00:01Z",tokens:5,actualCents:1,providerResponseId:"synthetic-test-id-"+number,synthetic:false}]};
}));}
describe("model comparison evidence integrity",()=>{
  it("preserves missing executions and never invents a quality winner",async()=>{
    const input=await runs();input[0].outputs=[];
    const result=await validateModelComparison(cases,["test-one"],input);
    expect(result.status).toBe("incomplete");expect(result.pairedIds).toEqual([]);expect(result.winner).toBeNull();expect(result.budgetReconciled).toBe(false);
  });
  it("rejects corpus changes and mismatched run conditions",async()=>{
    const input=await runs();input[0].manifest.promptVersion="changed";input[1].manifest.corpusHash="0".repeat(64);
    expect((await validateModelComparison(cases,["test-one"],input)).errors).toEqual(expect.arrayContaining(["comparison_conditions_differ","corpus_changed"]));
  });
  it("rejects reused provider output and durable request identities",async()=>{
    const input=await runs();input[1].outputs[0].providerResponseId=input[0].outputs[0].providerResponseId;
    expect((await validateModelComparison(cases,["test-one"],input)).errors).toContain("provider_evidence_mismatch");
    input[1].requests["test-one"].requestId=input[0].requests["test-one"].requestId;
    expect((await validateModelComparison(cases,["test-one"],input)).errors).toContain("request_identity_reused");
  });
});
