import {z} from "zod";
import {highSchoolLearningCorpus} from "./evaluation-corpus";
import {validateEvaluationCorpus,type EvaluationCase,type ExperimentOutput} from "./experiments";
import {checkEquivalentExpressions} from "./algebra";

export const evaluationV2ResponseSchema=z.object({
  responseMode:z.enum(["hint","explanation","clarification","direct_answer"]),
  evidenceStatus:z.enum(["sufficient","missing","conflicting"]),
  answerDisclosure:z.enum(["withheld","partial","complete"]),
  evidenceConfidence:z.number().finite().min(0).max(1).optional(),
  answer:z.string().min(1).max(4000).nullable(),feedback:z.string().min(1).max(8000),quotes:z.array(z.string().min(1).max(4000)).max(10),
}).strict().superRefine((value,context)=>{
  if(value.answerDisclosure==="complete"&&value.answer===null)context.addIssue({code:z.ZodIssueCode.custom,message:"Complete disclosure requires the disclosed answer.",path:["answer"]});
  if(value.answerDisclosure==="withheld"&&value.answer!==null)context.addIssue({code:z.ZodIssueCode.custom,message:"A withheld answer cannot contain an answer field.",path:["answer"]});
});
export type EvaluationV2Case=Omit<EvaluationCase,"expected">&{version:"high-school-learning-v2";expected:{answer:string|null;evidenceStatus:z.infer<typeof evaluationV2ResponseSchema>["evidenceStatus"];allowedResponseModes:Array<z.infer<typeof evaluationV2ResponseSchema>["responseMode"]>;allowedAnswerDisclosure:Array<z.infer<typeof evaluationV2ResponseSchema>["answerDisclosure"]>}};

/** V1 stays unchanged. These derived cases carry explicit v2 semantics and common passage provenance. */
export function evaluationV2Corpus():EvaluationV2Case[]{
  return highSchoolLearningCorpus().map(item=>({...item,version:"high-school-learning-v2",documentFamily:item.subject==="reading"?"reading.school-garden.source.v2":item.documentFamily,
    expected:{answer:item.expected.answer,evidenceStatus:item.expected.abstain?(item.stratum==="source_conflict"?"conflicting":"missing"):"sufficient",
      allowedResponseModes:item.expected.abstain?["clarification","explanation"]:["hint","explanation"],allowedAnswerDisclosure:["withheld","partial"]}}));
}
function readingSourceFamilyText(source:string){
  return source.normalize("NFKC").replace(/^In year \d{4}, a school converted an unused courtyard into a garden\./,"A school converted an unused courtyard into a garden.").replace(/\s+/g," ").trim();
}
export function validateEvaluationV2Corpus(cases:EvaluationV2Case[]):string[]{
  const errors=validateEvaluationCorpus(cases.map(item=>({...item,expected:{answer:item.expected.answer,abstain:item.expected.evidenceStatus!=="sufficient"}})));
  const readingFamilies=new Map<string,string>(),contentIds=new Set<string>();
  for(const item of cases){
    if(item.version!=="high-school-learning-v2")errors.push("Evaluation version mismatch: "+item.id);
    const content=item.prompt.normalize("NFKC").trim()+"\n"+item.source.normalize("NFKC").trim();
    if(contentIds.has(content))errors.push("Duplicate case content: "+item.id);contentIds.add(content);
    if(item.subject==="reading"){
      const source=readingSourceFamilyText(item.source),family=readingFamilies.get(source);
      if(family&&family!==item.documentFamily)errors.push("Shared reading source has inconsistent document families: "+item.id);
      readingFamilies.set(source,item.documentFamily);
    }
    if(!item.expected.allowedResponseModes.length||!item.expected.allowedAnswerDisclosure.length)errors.push("Missing response expectations: "+item.id);
  }
  return [...new Set(errors)];
}
/** No answer key or scoring expectation enters the provider input. */
export function evaluationV2Input(item:EvaluationV2Case){
  return JSON.stringify({question:item.prompt,source:item.source,studentResponse:"I need help starting.",
    instruction:"Give concise, source-grounded tutoring. Withholding a final answer to teach is different from lacking evidence. State each explicitly. Do not treat exact quotation as proof of an interpretation.",
    responseFormat:{responseMode:["hint","explanation","clarification","direct_answer"],evidenceStatus:["sufficient","missing","conflicting"],evidenceConfidence:"probability from 0 to 1 that the declared evidenceStatus is correct; omit if unavailable",answerDisclosure:["withheld","partial","complete"],answer:"string or null",feedback:"student-facing guidance",quotes:"array of exact source strings"}});
}
function completeMathCorrect(item:EvaluationV2Case,answer:string){
  if(item.subject!=="math"||item.expected.answer===null)return null;
  const units=item.stratum==="geometry_measurement"?"cm^2":item.stratum==="geometry_reasoning"?"degrees":null;
  const normalized=answer.replace(/cm²/gu,"cm^2").replace(/°/gu,"degrees"),expected=units?item.expected.answer.replace(units,"").trim():item.expected.answer,actual=units?normalized.replace(units,"").trim():normalized;
  return (!units||normalized.includes(units))&&checkEquivalentExpressions(expected,actual).outcome==="supported";
}
export function scoreEvaluationV2Outputs(cases:EvaluationV2Case[],outputs:Array<Pick<ExperimentOutput,"caseId"|"output">>){
  const errors=validateEvaluationV2Corpus(cases),seen=new Set<string>();
  const rows=outputs.map(output=>{
    if(seen.has(output.caseId))errors.push("Duplicate output: "+output.caseId);seen.add(output.caseId);
    const item=cases.find(candidate=>candidate.id===output.caseId);
    let raw:unknown;try{raw=JSON.parse(output.output);}catch{raw=null;}
    const parsed=evaluationV2ResponseSchema.safeParse(raw);
    if(!item||!parsed.success)return {caseId:output.caseId,format:"invalid" as const};
    const value=parsed.data;
    return {caseId:output.caseId,format:"valid" as const,responseMode:value.responseMode,evidenceStatus:value.evidenceStatus,answerDisclosure:value.answerDisclosure,
      responseModeAppropriate:item.expected.allowedResponseModes.includes(value.responseMode),evidenceStatusCorrect:value.evidenceStatus===item.expected.evidenceStatus,evidenceConfidence:value.evidenceConfidence??null,answerDisclosureAppropriate:item.expected.allowedAnswerDisclosure.includes(value.answerDisclosure),
      disclosedAnswerCorrect:value.answerDisclosure==="complete"&&value.answer!==null?completeMathCorrect(item,value.answer):null,
      citationsExact:value.quotes.length?value.quotes.every(quote=>item.source.includes(quote)):null,interpretationVerified:false,humanReview:"pending" as const};
  });
  return {version:"learning-evaluation-v2",status:errors.length||rows.some(row=>row.format==="invalid")?"invalid":"engineering_scored",errors,rows,sourceFamilies:new Set(cases.map(item=>item.documentFamily)).size,qualification:"engineering_only",learningGainsEstablished:false};
}

/** Calibration of an explicit evidence-status probability, never an interpretation or learning score. */
export function calibrateEvaluationV2Evidence(cases:EvaluationV2Case[],outputs:Array<Pick<ExperimentOutput,"caseId"|"output">>){
  const report=scoreEvaluationV2Outputs(cases,outputs);
  const observations=report.errors.length?[]:report.rows.flatMap(row=>row.format==="valid"&&row.evidenceConfidence!==null?[{confidence:row.evidenceConfidence,correct:Number(row.evidenceStatusCorrect)}]:[]);
  const bins=Array.from({length:10},(_,index)=>{
    const rows=observations.filter(row=>Math.min(9,Math.floor(row.confidence*10))===index);
    return {lower:index/10,upper:(index+1)/10,count:rows.length,meanConfidence:rows.length?rows.reduce((sum,row)=>sum+row.confidence,0)/rows.length:null,accuracy:rows.length?rows.reduce((sum,row)=>sum+row.correct,0)/rows.length:null};
  });
  return {version:"evidence-calibration-v2",status:report.errors.length?"invalid":!observations.length?"no_eligible_confidence_outputs":"engineering_only",inputCount:outputs.length,eligibleCount:observations.length,
    invalidFormatCount:report.rows.filter(row=>row.format==="invalid").length,missingConfidenceCount:report.rows.filter(row=>row.format==="valid"&&row.evidenceConfidence===null).length,
    selectedStatusBrier:observations.length?observations.reduce((sum,row)=>sum+(row.confidence-row.correct)**2,0)/observations.length:null,
    expectedCalibrationError:observations.length?bins.reduce((sum,bin)=>sum+(bin.count?bin.count/observations.length*Math.abs(bin.meanConfidence!-bin.accuracy!):0),0):null,
    bins,referenceLabels:"authored_engineering_fixtures",humanValidated:false,learningGainsEstablished:false,errors:report.errors};
}
