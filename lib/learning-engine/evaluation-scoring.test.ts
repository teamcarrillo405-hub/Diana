import {it,expect} from "vitest";
import {highSchoolLearningCorpus} from "./evaluation-corpus";
import {scoreEngineeringOutputs} from "./evaluation-pipeline";
import type {ExperimentOutput} from "./experiments";
it("keeps missing answers and absent quotes visible instead of counting them as passes",()=>{
  const item=highSchoolLearningCorpus().find(item=>item.stratum==="geometry_measurement")!;
  const output={caseId:item.id,output:JSON.stringify({answer:null,abstain:false,feedback:"Try the formula.",quotes:[]})} as ExperimentOutput;
  const score=scoreEngineeringOutputs([item],[output]).rows[0];
  expect(score.mathCorrect).toBe(false);expect(score.mathAnswerProvided).toBe(false);expect(score.citationsExact).toBe(null);
  output.output=JSON.stringify({answer:"6 cm²",abstain:false,feedback:"Compare the units.",quotes:[item.source]});
  expect(scoreEngineeringOutputs([item],[output]).rows[0].mathCorrect).toBe(true);
});
