import {z} from "zod";
import {corpusDigest,experimentManifestSchema,experimentOutputSchema,validateEvaluationCorpus,type EvaluationCase} from "./experiments";
import {courseContentHash} from "./course-framework";
const requestSchema=z.object({requestId:z.string().uuid(),batchId:z.string().uuid()}).strict();
export const comparisonRunSchema=z.object({manifest:experimentManifestSchema,requests:z.record(z.string(),requestSchema),outputs:z.array(experimentOutputSchema).max(5000)}).strict();

/** Saved provider evidence is checked without rerunning a model or filling missing outputs. */
export async function validateModelComparison(corpus:EvaluationCase[],caseIds:string[],rawRuns:unknown[]){
  const errors=validateEvaluationCorpus(corpus),runs=rawRuns.map(value=>comparisonRunSchema.parse(value)),digest=await corpusDigest(corpus);
  if(runs.length<2||runs.length>10||!caseIds.length||new Set(caseIds).size!==caseIds.length||caseIds.some(id=>!corpus.some(item=>item.id===id&&item.split==="test")))errors.push("invalid_comparison_selection");
  if(new Set(runs.map(run=>run.manifest.id)).size!==runs.length)errors.push("duplicate_experiment_manifest");
  const requestIds=new Set<string>(),providerIds=new Set<string>();
  const comparator=runs[0]?.manifest;
  const summaries=runs.map(run=>{
    const manifest=run.manifest;
    if(manifest.corpusHash!==digest)errors.push("corpus_changed");
    if(comparator&&["codeRevision","promptVersion","arm","maxOutputTokens","maxInputBytes"].some(key=>manifest[key as keyof typeof manifest]!==comparator[key as keyof typeof manifest]))errors.push("comparison_conditions_differ");
    if(Object.keys(run.requests).length!==caseIds.length||caseIds.some(id=>!run.requests[id]))errors.push("request_plan_changed");
    for(const request of Object.values(run.requests)){if(requestIds.has(request.requestId))errors.push("request_identity_reused");requestIds.add(request.requestId);}
    const completed=new Set<string>();
    for(const output of run.outputs){
      if(!caseIds.includes(output.caseId)||output.manifestId!==manifest.id||output.model!==manifest.model||run.requests[output.caseId]?.requestId!==output.requestId||completed.has(output.caseId)||providerIds.has(output.providerResponseId))errors.push("provider_evidence_mismatch");
      completed.add(output.caseId);providerIds.add(output.providerResponseId);
    }
    const accountedCents=run.outputs.reduce((sum,row)=>sum+row.actualCents,0);
    const batches=new Map<string,number>();
    for(const output of run.outputs){const batch=run.requests[output.caseId]?.batchId??"unknown";batches.set(batch,(batches.get(batch)??0)+output.actualCents);}
    if([...batches.values()].some(cost=>cost>manifest.maxBatchCents))errors.push("recorded_batch_cost_exceeds_cap");
    return {manifestId:manifest.id,model:manifest.model,expected:caseIds.length,completed:completed.size,missing:caseIds.filter(id=>!completed.has(id)),accountedCents};
  });
  const pairedIds=caseIds.filter(id=>runs.every(run=>run.outputs.some(output=>output.caseId===id)));
  return {version:"model-comparison-v1",comparisonHash:await courseContentHash({corpusHash:digest,caseIds,runs}),status:errors.length?"invalid":summaries.some(row=>row.missing.length)?"incomplete":"engineering_complete",errors:[...new Set(errors)],runs:summaries,pairedIds,
    winner:null,qualityRankingEstablished:false,learningGainsEstablished:false,
    budgetReconciled:false,qualification:"Output costs exclude unresolved reservations. A ledger and provider reconciliation are required; this integrity report does not rank teaching quality."};
}
