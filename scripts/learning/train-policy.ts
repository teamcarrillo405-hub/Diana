import {readFile,mkdir,writeFile} from "node:fs/promises";
import path from "node:path";
import {trainLearnedPolicy,evaluateLearnedPolicy,learnedPolicyArtifactSchema,type PolicyTrajectory} from "../../lib/learning-engine/learned-policy";
import {calibrateEvaluationV2Evidence,evaluationV2Corpus,validateEvaluationV2Corpus,scoreEvaluationV2Outputs} from "../../lib/learning-engine/evaluation-v2";

async function readRows(file:string):Promise<unknown[]>{
  const text=(await readFile(file,"utf8")).trim();
  if(!text)throw new Error("Input data is empty.");
  return text.startsWith("[")?JSON.parse(text):text.split(/\r?\n/).map(line=>JSON.parse(line));
}
function engineeringTrajectories():PolicyTrajectory[]{
  return (["train","development","test"] as const).flatMap((split,partition)=>Array.from({length:5},(_,family)=>Array.from({length:8},(_,index)=>{
    const id=`engineering-${split}-${family}-${index}`,priorSupport=index%4+1,lowRate=[0.1,0.2,0.27][partition]+family*0.01,highRate=[0.7,0.82,0.9][partition]+family*0.01;
    const rate=index<4?lowRate:highRate,gap=partition*6+family,attempts=6+partition*8+family;
    return {id,provenanceId:id,documentFamily:`engineering-${split}-scenario-${family}`,templateFamily:`engineering-rate-${lowRate.toFixed(2)}-${highRate.toFixed(2)}-gap-${gap}-attempts-${attempts}`,learnerId:`synthetic-${split}-learner-${family}`,
      observedAt:new Date(Date.UTC(2025,partition,1,family,index)).toISOString(),split,state:{confirmed:true,hasEvidence:true,supported:false,hasAssessment:true,priorSupport},
      signals:{independentSuccessRate:rate,independentAttempts:attempts,sessionsSincePractice:gap},targetAction:rate<0.4?"related_example":priorSupport<3?"hint":"independent_attempt",
      provenance:"authored_engineering_fixture",rights:"excluded",containsStudentData:false,consentReceipt:null,humanReview:"pending",reviewerIds:[],
    } satisfies PolicyTrajectory;
  })).flat());
}
async function save(directory:string,name:string,value:unknown){
  await mkdir(directory,{recursive:true});const destination=path.join(directory,name);
  await writeFile(destination,JSON.stringify(value,null,2)+"\n",{flag:"wx"});return destination;
}
async function main(){
  const [command,second,third,fourth]=process.argv.slice(2);
  if(command==="--evaluate"){
    if(!second||!third)throw new Error("Usage: train-policy --evaluate <artifact.json> <trajectories.jsonl> [output-directory]");
    const artifact=learnedPolicyArtifactSchema.parse(JSON.parse(await readFile(second,"utf8"))),report=await evaluateLearnedPolicy(artifact,await readRows(third));
    const file=await save(path.resolve(fourth??"artifacts/learning-engine/research/learned-policy"),`evaluation-${artifact.artifactHash.slice(0,16)}-${report.datasetHash.slice(0,16)}.json`,report);
    console.log(JSON.stringify({file,report},null,2));return;
  }
  if(command==="--evaluate-responses-v2"||command==="--calibrate-v2"){
    if(!second)throw new Error("Usage: train-policy --evaluate-responses-v2 <outputs.jsonl> [output-directory]");
    const raw=await readRows(second),outputs=raw.map(value=>{
      if(!value||typeof value!=="object"||!("caseId"in value)||typeof value.caseId!=="string"||!("output"in value)||typeof value.output!=="string")throw new Error("Each output needs caseId and output strings.");
      return {caseId:value.caseId,output:value.output};
    });
    const cases=evaluationV2Corpus(),report={...scoreEvaluationV2Outputs(cases,outputs),evidenceCalibration:calibrateEvaluationV2Evidence(cases,outputs)},file=await save(path.resolve(third??"artifacts/learning-engine/research/learned-policy"),`evaluation-v2-${Date.now()}.json`,report);
    console.log(JSON.stringify({file,status:report.status,rows:report.rows.length,errors:report.errors},null,2));return;
  }
  if(!command)throw new Error("Usage: train-policy --engineering-demo [output-directory], or train-policy <trajectories.jsonl> <receipts.jsonl> [output-directory]");
  const demo=command==="--engineering-demo";
  if(!demo&&!second)throw new Error("Reviewed training requires a content-bound receipts file.");
  const rows=demo?engineeringTrajectories():await readRows(command),receipts=demo?[]:await readRows(second!);
  const directory=path.resolve((demo?second:third)??"artifacts/learning-engine/research/learned-policy");
  const artifact=await trainLearnedPolicy(rows,receipts),name=`policy-${artifact.artifactHash.slice(0,16)}`;
  const file=await save(directory,name+".json",artifact);
  if(demo)await save(directory,name+"-engineering-trajectories.json",rows);
  const corpus=evaluationV2Corpus(),errors=validateEvaluationV2Corpus(corpus);
  console.log(JSON.stringify({file,eligibility:artifact.eligibility,comparisons:artifact.comparisons,weightsFitted:!!artifact.model,LLMFineTuning:false,learningGainsEstablished:false,
    evaluationV2:{cases:corpus.length,readingSourceFamilies:new Set(corpus.filter(item=>item.subject==="reading").map(item=>item.documentFamily)).size,errors}},null,2));
}
main().catch(error=>{console.error(error instanceof Error?error.message:"Local policy operation could not complete.");process.exitCode=1;});
