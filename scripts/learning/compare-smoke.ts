import {readFile,writeFile} from "node:fs/promises";
import path from "node:path";
import {highSchoolLearningCorpus} from "../../lib/learning-engine/evaluation-corpus";
import {experimentOutputSchema} from "../../lib/learning-engine/experiments";
import {scoreEngineeringOutputs} from "../../lib/learning-engine/evaluation-pipeline";
import {validateModelComparison} from "../../lib/learning-engine/model-comparison";

async function main(){
  const root=path.resolve("artifacts/learning-engine/research/model-smoke"),cases=highSchoolLearningCorpus().filter(item=>item.id.endsWith(".01"));
  const models=await Promise.all(["gpt-5.6-luna","gpt-5.6-terra"].map(async model=>{
    const outputs=(await readFile(path.join(root,model,"outputs.jsonl"),"utf8")).trim().split(/\r?\n/).map(line=>experimentOutputSchema.parse(JSON.parse(line)));
    const manifest=JSON.parse(await readFile(path.join(root,model,"experiment.json"),"utf8")),requests=JSON.parse(await readFile(path.join(root,model,"requests.json"),"utf8"));
    const summary={model,status:outputs.length===cases.length?"smoke_complete":"incomplete",expected:cases.length,completed:outputs.length,fullCorpusSize:480,actualCents:outputs.reduce((sum,row)=>sum+row.actualCents,0),scores:scoreEngineeringOutputs(cases,outputs),humanReview:"pending",learningGainsEstablished:false};
    return {...summary,run:{manifest,requests,outputs}};
  }));
  const paired=cases.filter(item=>models.every(model=>model.scores.rows.some(row=>row.caseId===item.id))).map(item=>item.id);
  const integrity=await validateModelComparison(highSchoolLearningCorpus(),cases.map(item=>item.id),models.map(item=>item.run));
  const report={integrity,models:models.map(model=>({model:model.model,status:model.status,completed:model.completed,expected:model.expected,accountedCents:model.actualCents,
    pairedCases:paired.length,pairedStructuredOutputs:model.scores.rows.filter(row=>paired.includes(row.caseId)&&row.format==="valid").length,
    mathAnswersProvided:model.scores.rows.filter(row=>row.mathAnswerProvided===true).length,mathKeyMatches:model.scores.rows.filter(row=>row.mathCorrect===true).length})),
    pairedIds:paired,winner:null,qualityRankingEstablished:false,learningGainsEstablished:false,
    limitations:["One authored case per stratum, one sample per model; no educator ratings.","Luna stopped when moderation became unavailable. Its unresolved request retains its budget reservation.","The existing tutor policy often withholds final answers. Answer-key accuracy and abstention therefore do not measure tutoring quality; these results cannot rank the models.","Empty quote lists are not counted as exact-citation passes.","Source-baseline arm only. This is not a retrieval or policy ablation study."]};
  const filename=path.join(root,`comparison-${Date.now()}.json`);
  await writeFile(filename,JSON.stringify(report,null,2)+"\n",{flag:"wx"});console.log(JSON.stringify({status:integrity.status,pairedCases:paired.length,accountedCents:models.reduce((sum,item)=>sum+item.actualCents,0),report:filename},null,2));
  if(integrity.status==="invalid")process.exitCode=1;
}
main().catch(error=>{console.error(error instanceof Error?error.message:"Comparison could not complete.");process.exitCode=1;});
