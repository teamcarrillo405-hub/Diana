import { describe,it,expect } from "vitest";
import { highSchoolLearningCorpus } from "./evaluation-corpus";
import { experimentInput,validateEvaluationCorpus,summarizeExperiment,type ExperimentManifest } from "./experiments";
import { buildTrainingExport,trainingCapability,type TrainingExample } from "./training";
import {evaluationContext,scoreEngineeringOutputs} from "./evaluation-pipeline";

const manifest:ExperimentManifest={id:"00000000-0000-4000-8000-000000000001",version:"high-school-learning-v1",
  corpusHash:"a".repeat(64),codeRevision:"1234567",model:"test-model",promptVersion:"v1",arm:"source_baseline",
  split:"test",maxOutputTokens:1000,maxInputBytes:32000,maxBatchCents:1000,monthlyCapCents:10000,humanReview:"pending"};
describe("evaluation and training boundaries",()=>{
  it("keeps 480 authored cases separate from completed provider evidence",()=>{
    const cases=highSchoolLearningCorpus();
    expect(cases).toHaveLength(480);
    expect(cases.filter(item=>item.subject==="math")).toHaveLength(180);
    expect(cases.filter(item=>item.subject==="reading")).toHaveLength(180);
    expect(validateEvaluationCorpus(cases)).toEqual([]);
    expect(summarizeExperiment(cases,[],manifest)).toMatchObject({status:"incomplete",completed:0,humanReview:"pending",learningGainsEstablished:false});
    expect(experimentInput(cases[0],manifest)).not.toContain('"expected"');
  });
  it("rejects document and template leakage",()=>{
    const cases=highSchoolLearningCorpus().slice(0,2); cases[1].split="train";
    expect(validateEvaluationCorpus(cases)).toHaveLength(2);
  });
  it("requires real pipeline context and removes only the specified components",async()=>{
    const item=highSchoolLearningCorpus()[0];
    const context=await evaluationContext(item);
    expect(()=>experimentInput(item,{...manifest,arm:"retrieval_adaptive"})).toThrow("requires");
    const adaptive=JSON.parse(experimentInput(item,{...manifest,arm:"retrieval_adaptive"},context));
    const noVerifier=JSON.parse(experimentInput(item,{...manifest,arm:"without_verifier"},context));
    const noState=JSON.parse(experimentInput(item,{...manifest,arm:"without_learner_state"},context));
    expect(adaptive.verifier.outcome).toBe("revise");
    expect(noVerifier.verifier).toBeNull();
    expect(noVerifier.learnerState).toEqual(adaptive.learnerState);
    expect(noState.learnerState).toBeNull();
    expect(noState.verifier).toEqual(adaptive.verifier);
    expect(scoreEngineeringOutputs([item],[]).rows).toEqual([]);
  });
  it("does not export an empty dataset",async()=>{
    expect(await buildTrainingExport([],[])).toMatchObject({status:"blocked",jsonl:null});
  });
  it("blocks unreviewed, private, duplicated and held-out training examples",async()=>{
    const example:TrainingExample={id:"sample",documentFamily:"doc",templateFamily:"template",split:"train",provenanceId:"source",
      rights:"excluded",containsStudentData:true,consentReceipt:null,humanReview:"pending",reviewerId:null,
      messages:[{role:"system",content:"Tutor."},{role:"user",content:"Question."},{role:"assistant",content:"Hint."}]};
    const exported=await buildTrainingExport([example,{...example,id:"copy"}],[{documentFamily:"doc",templateFamily:"heldout"}]);
    expect(exported.jsonl).toBeNull();
    expect(exported.rejected[0].reasons).toEqual(expect.arrayContaining(["held_out_family","training_rights_missing","student_consent_missing","human_review_missing"]));
    expect(exported.rejected[1].reasons).toContain("duplicate");
    expect(trainingCapability().enabled).toBe(false);
  });
});
