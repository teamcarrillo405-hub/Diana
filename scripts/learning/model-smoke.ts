import {readFile,writeFile,mkdir} from "node:fs/promises";
import path from "node:path";
import {loadEnvConfig} from "@next/env";
import {createClient} from "@supabase/supabase-js";
import {highSchoolLearningCorpus} from "../../lib/learning-engine/evaluation-corpus";
import {corpusDigest,experimentInput,experimentManifestSchema,experimentOutputSchema,type ExperimentOutput} from "../../lib/learning-engine/experiments";
import {evaluationContext,scoreEngineeringOutputs} from "../../lib/learning-engine/evaluation-pipeline";

async function main(){
  loadEnvConfig(process.cwd());
  const model=process.argv[2];if(!model)throw new Error("Choose the model configured on the experiment service.");
  const directory=path.resolve("artifacts/learning-engine/research/model-smoke",model);
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)throw new Error("Supabase public connection configuration is missing.");
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  // This runner signs in to the existing synthetic fixture only; it cannot enroll or reset users.
  const auth=await client.auth.signInWithPassword({email:process.env.QA_GRAYSON_TEST_EMAIL??"grayson-qa-student@local.test",password:process.env.QA_TEST_PASSWORD??"Diana-QA-Visual-Gate-2026!"});
  if(auth.error||auth.data.user?.id!=="ad37c468-67f5-4b5f-9e28-b5e947a4075c")throw new Error("Synthetic QA operator sign-in could not be verified.");
  const corpus=highSchoolLearningCorpus(),cases=corpus.filter(item=>item.id.endsWith(".01"));
  await mkdir(directory,{recursive:true});
  const manifestPath=path.join(directory,"experiment.json");
  let manifest;
  try{manifest=experimentManifestSchema.parse(JSON.parse(await readFile(manifestPath,"utf8")));}catch(error){
    if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;
    manifest=experimentManifestSchema.parse({id:crypto.randomUUID(),version:"high-school-learning-v1",corpusHash:await corpusDigest(corpus),codeRevision:"research-correction-20260925",model,promptVersion:"synthetic-model-smoke-no-reasoning-v1",arm:"source_baseline",split:"test",maxOutputTokens:2000,maxInputBytes:32000,maxBatchCents:1000,monthlyCapCents:10000,humanReview:"pending"});
    await writeFile(manifestPath,JSON.stringify(manifest,null,2)+"\n",{flag:"wx"});
  }
  if(manifest.model!==model||manifest.corpusHash!==await corpusDigest(corpus))throw new Error("Saved manifest differs from this run.");
  const planPath=path.join(directory,"requests.json");let plan:Record<string,{requestId:string;batchId:string}>;
  try{plan=JSON.parse(await readFile(planPath,"utf8"));}catch(error){
    if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;
    const batchId=crypto.randomUUID();plan=Object.fromEntries(cases.map(item=>[item.id,{requestId:crypto.randomUUID(),batchId}]));
    await writeFile(planPath,JSON.stringify(plan,null,2)+"\n",{flag:"wx"});
  }
  const outputPath=path.join(directory,"outputs.jsonl");
  const saved=await readFile(outputPath,"utf8").catch(error=>{if(error.code==="ENOENT")return "";throw error;});
  const outputs:ExperimentOutput[]=saved.trim()?saved.trim().split(/\r?\n/).map(line=>experimentOutputSchema.parse(JSON.parse(line))):[];
  for(const item of cases){
    if(outputs.some(row=>row.caseId===item.id))continue;
    if(!plan[item.id])throw new Error("Durable request plan is incomplete.");
    const response=await client.functions.invoke("learning-experiment",{body:{...plan[item.id],caseId:item.id,manifest,input:experimentInput(item,manifest,await evaluationContext(item))}});
    if(response.error||!response.data?.ok){
      let reason=response.data?.error??"Experiment request did not complete.";
      if(response.error?.context instanceof Response){const body=await response.error.context.json().catch(()=>null);reason=body?.error??reason;}
      console.log(JSON.stringify({paused:true,caseId:item.id,reason}));break;
    }
    const output=experimentOutputSchema.parse(response.data.result);if(output.model!==model||output.caseId!==item.id||output.manifestId!==manifest.id)throw new Error("Provider output provenance mismatch.");
    outputs.push(output);await writeFile(outputPath,outputs.map(row=>JSON.stringify(row)).join("\n")+"\n");
    console.log(JSON.stringify({model,completed:outputs.length,total:cases.length}));
  }
  const report={model,status:outputs.length===cases.length?"smoke_complete":"incomplete",expected:cases.length,completed:outputs.length,fullCorpusSize:corpus.length,actualCents:outputs.reduce((sum,row)=>sum+row.actualCents,0),scores:scoreEngineeringOutputs(cases,outputs),humanReview:"pending",learningGainsEstablished:false};
  await writeFile(path.join(directory,"summary.json"),JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify(report,null,2));
  await client.auth.signOut({scope:"local"});
  if(outputs.length!==cases.length)process.exitCode=1;
}
main().catch(error=>{console.error(error instanceof Error?error.message:"Model check could not complete.");process.exitCode=1;});
