import {z} from "zod";
import {structureDocument} from "./curriculum";
import {retrieveCurriculum} from "./retrieval";
import {chooseSupport} from "./learner";
import {checkEquationValue,checkEquivalentExpressions} from "./algebra";
import type {EvaluationCase,ExperimentOutput} from "./experiments";

const fixtureOwner="00000000-0000-4000-8000-000000000001";
const fixtureAssignment="00000000-0000-4000-8000-000000000002";
/** Exercises the real lexical fallback. It does not stand in for hosted semantic retrieval. */
export async function evaluationContext(item:EvaluationCase){
  const document=await structureDocument({documentId:item.documentFamily,ownerId:fixtureOwner,assignmentId:fixtureAssignment,
    classId:null,title:item.documentFamily,edition:"Engineering fixture v1",subject:item.subject==="math"?"math":"reading",instructionRights:"owner_provided"},
    [{page:1,pageLabel:"Fixture source",text:item.source,interpretation:"original"}], {legacy:true});
  const retrieval=retrieveCurriculum(item.prompt,document.chunks,{ownerId:fixtureOwner,assignmentId:fixtureAssignment,classId:null,versionIds:[document.version.id]});
  const studentResponse=item.subject==="math"?"0":"I need help starting.";
  const equation=item.stratum==="linear_equations"?/^Solve (.+)\.$/.exec(item.prompt)?.[1]:null;
  const expression=item.stratum==="polynomials"?/^Expand (.+)\.$/.exec(item.prompt)?.[1]:null;
  const verifier=equation?checkEquationValue(equation,studentResponse):expression?checkEquivalentExpressions(expression,studentResponse):null;
  const support=chooseSupport({confirmed:item.stratum!=="handwriting"&&item.stratum!=="extraction",hasEvidence:retrieval.status==="matched",assessment:verifier,priorSupport:1});
  return {retrievedSource:retrieval.chunks.map(chunk=>chunk.text).join("\n\n"),retrievalMethod:retrieval.method,
    studentResponse,verifier,learnerState:{provenance:"authored_engineering_state",independentCount:0,confidence:"insufficient",support}};
}

const responseSchema=z.object({answer:z.string().max(4000).nullable(),abstain:z.boolean(),feedback:z.string().min(1),quotes:z.array(z.string().min(1).max(4000)).max(10)}).strict();
export function scoreEngineeringOutputs(cases:EvaluationCase[],outputs:ExperimentOutput[]){
  const rows=outputs.map(output=>{
    const item=cases.find(candidate=>candidate.id===output.caseId);
    let raw:unknown;try{raw=JSON.parse(output.output);}catch{raw=null;}
    const parsed=responseSchema.safeParse(raw);
    if(!item||!parsed.success)return {caseId:output.caseId,format:"invalid",mathAnswerProvided:null,mathCorrect:null,abstentionCorrect:null,citationsExact:null,humanReview:"pending"};
    const value=parsed.data;
    const mathAnswerRequired=item.subject==="math"&&item.expected.answer!==null;
    let mathCorrect:boolean|null=mathAnswerRequired?false:null;
    if(item.subject==="math"&&item.expected.answer!==null&&value.answer!==null){
      // Keys enter this post-response scorer only, never retrieval or prompts.
      const units=item.stratum==="geometry_measurement"?"cm^2":item.stratum==="geometry_reasoning"?"degrees":null;
      const expected=units?item.expected.answer.replace(units,"").trim():item.expected.answer;
      const normalizedAnswer=value.answer.replace(/cm²/gu,"cm^2").replace(/°/gu,"degrees");
      const actual=units?normalizedAnswer.replace(units,"").trim():normalizedAnswer;
      const result=checkEquivalentExpressions(expected,actual);
      mathCorrect=(!units||normalizedAnswer.includes(units))&&result.outcome==="supported";
    }
    return {caseId:output.caseId,format:"valid",mathAnswerProvided:mathAnswerRequired?value.answer!==null:null,mathCorrect,abstentionCorrect:value.abstain===item.expected.abstain,
      citationsExact:value.quotes.length?value.quotes.every(quote=>item.source.includes(quote)):null,humanReview:"pending"};
  });
  return {rows,qualification:"engineering_only",readingInterpretationVerified:false,learningGainsEstablished:false};
}
