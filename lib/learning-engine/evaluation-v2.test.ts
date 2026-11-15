import {describe,it,expect} from "vitest";
import {highSchoolLearningCorpus} from "./evaluation-corpus";
import {calibrateEvaluationV2Evidence,evaluationV2Corpus,evaluationV2Input,evaluationV2ResponseSchema,scoreEvaluationV2Outputs,validateEvaluationV2Corpus} from "./evaluation-v2";

describe("evaluation v2",()=>{
  it("leaves legacy fixtures unchanged and groups every garden variant into one source family",()=>{
    const legacy=JSON.stringify(highSchoolLearningCorpus()),cases=evaluationV2Corpus();
    expect(JSON.stringify(highSchoolLearningCorpus())).toBe(legacy);
    expect(new Set(cases.filter(item=>item.subject==="reading").map(item=>item.documentFamily)).size).toBe(1);
    expect(validateEvaluationV2Corpus(cases)).toEqual([]);
    const sameSource=cases.filter(item=>item.subject==="reading"&&item.id.endsWith(".01"));
    expect(validateEvaluationV2Corpus(sameSource.map((item,index)=>index?item:{...item,documentFamily:"separate-false-family"})).some(error=>error.includes("inconsistent document families"))).toBe(true);
    expect(validateEvaluationV2Corpus(sameSource.map((item,index)=>index?item:{...item,split:"train"})).some(error=>error.includes("Split leakage"))).toBe(true);
  });
  it("scores a withheld hint separately from an evidence refusal",()=>{
    const item=evaluationV2Corpus()[0],response={responseMode:"hint",evidenceStatus:"sufficient",answerDisclosure:"withheld",answer:null,feedback:"What operation would undo the added value?",quotes:[]};
    const report=scoreEvaluationV2Outputs([item],[{caseId:item.id,output:JSON.stringify(response)}]);
    expect(report.rows[0]).toMatchObject({format:"valid",responseModeAppropriate:true,evidenceStatusCorrect:true,answerDisclosureAppropriate:true,disclosedAnswerCorrect:null,citationsExact:null});
    expect(scoreEvaluationV2Outputs([item],[{caseId:item.id,output:JSON.stringify({...response,evidenceStatus:"missing"})}]).rows[0]).toMatchObject({responseModeAppropriate:true,evidenceStatusCorrect:false});
  });
  it("reports correct but over-disclosed answers independently of tutoring suitability",()=>{
    const item=evaluationV2Corpus()[0];
    const report=scoreEvaluationV2Outputs([item],[{caseId:item.id,output:JSON.stringify({responseMode:"direct_answer",evidenceStatus:"sufficient",answerDisclosure:"complete",answer:item.expected.answer,feedback:"Here is the value.",quotes:[]})}]);
    expect(report.rows[0]).toMatchObject({disclosedAnswerCorrect:true,answerDisclosureAppropriate:false,responseModeAppropriate:false,evidenceStatusCorrect:true});
  });
  it("does not relabel legacy abstention responses or exact quotes as validated interpretation",()=>{
    expect(evaluationV2ResponseSchema.safeParse({answer:null,abstain:true,feedback:"Try this.",quotes:[]}).success).toBe(false);
    const item=evaluationV2Corpus().find(item=>item.subject==="reading")!;
    const report=scoreEvaluationV2Outputs([item],[{caseId:item.id,output:JSON.stringify({responseMode:"hint",evidenceStatus:"sufficient",answerDisclosure:"withheld",answer:null,feedback:"Consider a different interpretation.",quotes:["Students measured rainfall and compared plant growth."]})}]);
    expect(report.rows[0]).toMatchObject({citationsExact:true,interpretationVerified:false,humanReview:"pending"});
    const input=JSON.parse(evaluationV2Input(item));expect(input).not.toHaveProperty("expected");expect(input).not.toHaveProperty("answerKey");
  });
  it("rejects duplicate cases and outputs",()=>{
    const item=evaluationV2Corpus()[0];
    expect(validateEvaluationV2Corpus([item,{...item,id:"another-id"}]).some(error=>error.includes("Duplicate case content"))).toBe(true);
    expect(scoreEvaluationV2Outputs([item],[{caseId:item.id,output:"{}"},{caseId:item.id,output:"{}"}]).status).toBe("invalid");
  });
  it("calibrates explicit status confidence only and reports absent legacy confidence honestly",()=>{
    const cases=evaluationV2Corpus().slice(0,2),base={responseMode:"hint",answerDisclosure:"withheld",answer:null,feedback:"Check the source.",quotes:[]};
    const outputs=cases.map((item,index)=>({caseId:item.id,output:JSON.stringify({...base,evidenceStatus:index?"missing":"sufficient",evidenceConfidence:index?0.9:0.8})}));
    const calibration=calibrateEvaluationV2Evidence(cases,outputs);
    expect(calibration).toMatchObject({eligibleCount:2,referenceLabels:"authored_engineering_fixtures",humanValidated:false});
    expect(calibration.selectedStatusBrier).toBeCloseTo(0.425);
    expect(calibration.expectedCalibrationError).toBeCloseTo(0.55);
    const unavailable=calibrateEvaluationV2Evidence(cases,[{caseId:cases[0].id,output:JSON.stringify({answer:null,abstain:false,feedback:"Try this.",quotes:[]})}]);
    expect(unavailable).toMatchObject({status:"no_eligible_confidence_outputs",eligibleCount:0,invalidFormatCount:1,selectedStatusBrier:null,expectedCalibrationError:null});
  });
});
