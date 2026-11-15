import { readFile,writeFile } from "node:fs/promises";
import { buildTrainingExport,trainingCapability } from "../../lib/learning-engine/training";
import { highSchoolLearningCorpus } from "../../lib/learning-engine/evaluation-corpus";

async function main() {
  const source=process.argv[2];
  const target=process.argv[3];
  const receiptsPath=process.argv[4];
  if(!source || !target || !receiptsPath) throw new Error("Provide reviewed candidate JSONL, output JSONL and evidence receipt JSONL paths.");
  const lines=(await readFile(source,"utf8")).split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line) as unknown);
  const receipts=(await readFile(receiptsPath,"utf8")).split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line) as unknown);
  const result=await buildTrainingExport(lines,highSchoolLearningCorpus(),receipts);
  await writeFile(target+".report.json",JSON.stringify({...result,jsonl:undefined,capability:trainingCapability()},null,2)+"\n");
  if(result.jsonl===null || !result.accepted) throw new Error("Training export blocked. Review the rejection report.");
  await writeFile(target,result.jsonl+"\n");
  console.log("Reviewed data exported. Training remains disabled.");
}
main().catch(error=>{console.error(error instanceof Error?error.message:"Export could not complete.");process.exitCode=1;});
