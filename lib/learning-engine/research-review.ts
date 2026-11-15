import {z} from "zod";
import {sha256} from "./curriculum";
import {experimentOutputSchema,type EvaluationCase,type ExperimentOutput} from "./experiments";

const digest=z.string().regex(/^[a-f0-9]{64}$/);
export const REVIEW_DIMENSIONS=["correctness","sourceSupport","instructionQuality","appropriateHelp","safety"] as const;
const scoresSchema=z.object({correctness:z.number().int().min(0).max(3),sourceSupport:z.number().int().min(0).max(3),
  instructionQuality:z.number().int().min(0).max(3),appropriateHelp:z.number().int().min(0).max(3),safety:z.number().int().min(0).max(3)}).strict();
export const educatorReviewSchema=z.object({
  packetId:digest,outputHash:digest,reviewerId:z.string().min(1).max(100),rubricVersion:z.literal("educator-rubric-v1"),
  role:z.enum(["rater","adjudicator"]),scores:scoresSchema,notes:z.string().min(10).max(4000),
  reviewedAt:z.string().datetime(),conflictOfInterest:z.boolean(),
}).strict();
export type EducatorReview=z.infer<typeof educatorReviewSchema>;
export type ReviewPacket={id:string;outputHash:string;caseId:string;prompt:string;source:string;response:string;rubricVersion:"educator-rubric-v1"};

/** Operator mapping is separate. Reviewer files contain no model or arm label. */
export async function buildReviewPackets(cases:EvaluationCase[],outputs:ExperimentOutput[],blindSecret:string){
  if(blindSecret.length<32)throw new Error("Use a fresh blinding secret of at least 32 characters.");
  const packets:ReviewPacket[]=[];
  const mapping:Array<{packetId:string;requestId:string;manifestId:string;model:string}>=[];
  const seen=new Set<string>();
  for(const raw of outputs){
    const output=experimentOutputSchema.parse(raw);
    const item=cases.find(candidate=>candidate.id===output.caseId);
    if(!item||seen.has(output.requestId))throw new Error("Unknown case or duplicate output.");
    seen.add(output.requestId);
    const outputHash=await sha256(JSON.stringify(output));
    const id=await sha256(blindSecret+":"+outputHash);
    packets.push({id,outputHash,caseId:item.id,prompt:item.prompt,source:item.source,response:output.output,rubricVersion:"educator-rubric-v1"});
    mapping.push({packetId:id,requestId:output.requestId,manifestId:output.manifestId,model:output.model});
  }
  return {packets:packets.sort((a,b)=>a.id.localeCompare(b.id)),operatorMapping:mapping};
}
export function adjudicatePackets(packets:ReviewPacket[],rawReviews:unknown[],now=Date.now()){
  const reviews=rawReviews.map(review=>educatorReviewSchema.parse(review));
  const errors:string[]=[];
  const identities=new Set<string>();
  for(const review of reviews){
    const packet=packets.find(item=>item.id===review.packetId);
    const identity=review.packetId+":"+review.reviewerId;
    if(!packet||packet.outputHash!==review.outputHash)errors.push("Evidence mismatch: "+review.packetId);
    if(identities.has(identity))errors.push("Repeated reviewer: "+identity);
    identities.add(identity);
    if(review.conflictOfInterest||Date.parse(review.reviewedAt)>now)errors.push("Review is not eligible: "+identity);
  }
  const rows=packets.map(packet=>{
    const eligible=reviews.filter(review=>review.packetId===packet.id&&review.outputHash===packet.outputHash&&!review.conflictOfInterest&&Date.parse(review.reviewedAt)<=now);
    const raters=eligible.filter(review=>review.role==="rater");
    const adjudicators=eligible.filter(review=>review.role==="adjudicator");
    const distinct=new Set(raters.map(review=>review.reviewerId)).size===2;
    const agreed=raters.length===2&&distinct&&REVIEW_DIMENSIONS.every(dimension=>raters[0].scores[dimension]===raters[1].scores[dimension]);
    const resolution=adjudicators.length===1&&raters.length===2&&distinct
      && !raters.some(review=>review.reviewerId===adjudicators[0].reviewerId)
      && raters.every(review=>Date.parse(review.reviewedAt)<=Date.parse(adjudicators[0].reviewedAt))?adjudicators[0]:null;
    return {packetId:packet.id,caseId:packet.caseId,status:agreed?"agreed":resolution?"adjudicated":raters.length===2?"disagreement":"pending",
      scores:agreed?raters[0].scores:resolution?.scores??null};
  });
  return {status:errors.length?"invalid":!packets.length||rows.some(row=>!row.scores)?"incomplete":"review_complete",errors,rows,
    learningGainsEstablished:false,identityQualification:"Reviewer IDs and credentials must be verified by the study operator."};
}

export type PairedScore={caseId:string;documentFamily:string;stratum:string;baseline:number;candidate:number};
/** Resample whole document families, never pretend template variants are independent. */
export function comparePairedScores(rows:PairedScore[],seed=12345){
  if(!rows.length||new Set(rows.map(row=>row.caseId)).size!==rows.length||rows.some(row=>![row.baseline,row.candidate].every(value=>Number.isFinite(value)&&value>=0&&value<=1)))throw new Error("Use unique paired scores in [0,1].");
  const groups=[...new Set(rows.map(row=>row.documentFamily))].map(family=>rows.filter(row=>row.documentFamily===family));
  const mean=(items:PairedScore[])=>items.reduce((sum,row)=>sum+row.candidate-row.baseline,0)/items.length;
  let state=seed>>>0;
  const random=()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};
  const samples=groups.length<5?[]:Array.from({length:2000},()=>mean(Array.from({length:groups.length},()=>groups[Math.floor(random()*groups.length)]).flat())).sort((a,b)=>a-b);
  return {cases:rows.length,documentFamilies:groups.length,meanDifference:mean(rows),
    interval95:samples.length?[samples[49],samples[1949]]:null,method:"paired_document_cluster_bootstrap",seed,
    strata:[...new Set(rows.map(row=>row.stratum))].map(stratum=>({stratum,cases:rows.filter(row=>row.stratum===stratum).length,meanDifference:mean(rows.filter(row=>row.stratum===stratum))})),
    qualification:groups.length<5?"insufficient_document_families":"descriptive_model_comparison",learningGainsEstablished:false};
}
