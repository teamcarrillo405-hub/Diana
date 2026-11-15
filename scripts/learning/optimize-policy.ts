import {readFile,mkdir,writeFile} from "node:fs/promises";
import path from "node:path";
import {createHash} from "node:crypto";
import {optimizeSupportPolicy,type PolicyExample} from "../../lib/learning-engine/support-policy";

async function main(){
  const input=process.argv[2];const directory=path.resolve(process.argv[3]??"artifacts/learning-engine/research/policy");
  if(!input)throw new Error("Pass a reviewed JSONL file, or --engineering-demo.");
  const examples:unknown[]=input==="--engineering-demo"?["train","development","test"].flatMap(split=>Array.from({length:6},(_,priorSupport):PolicyExample=>({
    id:split+priorSupport,family:split+"-family",split:split as PolicyExample["split"],
    state:{confirmed:true,hasEvidence:true,supported:false,hasAssessment:true,priorSupport},
    expected:priorSupport===0?"orient":priorSupport===1?"hint":priorSupport===2?"related_example":"independent_attempt",
    provenance:"authored_engineering_fixture",reviewerIds:[],
  }))):(await readFile(input,"utf8")).trim().split(/\r?\n/).map(line=>JSON.parse(line));
  const report={...optimizeSupportPolicy(examples),inputHash:createHash("sha256").update(JSON.stringify(examples)).digest("hex")};
  await mkdir(directory,{recursive:true});
  await writeFile(path.join(directory,"policy-report.json"),JSON.stringify(report,null,2)+"\n");
  console.log(JSON.stringify(report,null,2));
}
main().catch(error=>{console.error(error instanceof Error?error.message:"Policy evaluation could not complete.");process.exitCode=1;});
