import {z} from "zod";
import {sha256} from "./curriculum";
export const studyProtocolSchema=z.object({
  id:z.string().uuid(),version:z.literal("learning-study-v1"),registeredAt:z.string().datetime(),
  primaryOutcome:z.literal("delayed_independent_transfer"),
  retentionWindowDays:z.tuple([z.number().int().min(1).max(90),z.number().int().min(2).max(180)]),
  minimumPerArm:z.number().int().min(20).max(10000),
  plannedParticipants:z.number().int().min(40).max(20000),
  assessmentVersion:z.string().min(1),allocationSeedCommitment:z.string().regex(/^[a-f0-9]{64}$/),
  educatorApprovalId:z.string().min(1),consentProtocolId:z.string().min(1),
}).strict().refine(value=>value.retentionWindowDays[1]>value.retentionWindowDays[0]&&value.plannedParticipants>=2*value.minimumPerArm,"Study bounds are inconsistent");
export type StudyProtocol=z.infer<typeof studyProtocolSchema>;
export const studyParticipantSchema=z.object({
  id:z.string().uuid(),stratum:z.string().min(1).max(100),consentReceipt:z.string().min(1).max(200),
  enrolledAt:z.string().datetime(),withdrawn:z.boolean(),
}).strict();
export type StudyParticipant=z.infer<typeof studyParticipantSchema>;
export type StudyAllocation={participantId:string;arm:"baseline"|"adaptive";stratum:string;protocolHash:string};
/** Freeze roster + protocol before allocation. Never reallocate an existing study. */
export async function allocateStudy(rawProtocol:StudyProtocol,rawParticipants:StudyParticipant[],secret:string){
  const protocol=studyProtocolSchema.parse(rawProtocol),participants=rawParticipants.map(value=>studyParticipantSchema.parse(value));
  if(secret.length<32||await sha256(secret)!==protocol.allocationSeedCommitment)throw new Error("Allocation seed does not match the preregistered commitment.");
  if(new Set(participants.map(value=>value.id)).size!==participants.length||participants.length>protocol.plannedParticipants)throw new Error("Roster contains duplicate or excess participants.");
  if(participants.some(value=>Date.parse(value.enrolledAt)<Date.parse(protocol.registeredAt)||value.withdrawn))throw new Error("Roster includes ineligible enrollment.");
  const protocolHash=await sha256(JSON.stringify(protocol));
  const allocation:StudyAllocation[]=[];
  for(const stratum of [...new Set(participants.map(value=>value.stratum))].sort()){
    const ordered=await Promise.all(participants.filter(value=>value.stratum===stratum).map(async value=>({value,sort:await sha256(secret+":"+value.id)})));
    ordered.sort((a,b)=>a.sort.localeCompare(b.sort));
    const firstBaseline=parseInt((await sha256(secret+":arm:"+stratum)).slice(0,8),16)%2===0;
    ordered.forEach((item,index)=>allocation.push({participantId:item.value.id,stratum,protocolHash,arm:(index%2===0)===firstBaseline?"baseline":"adaptive"}));
  }
  return {protocolHash,rosterHash:await sha256(JSON.stringify([...participants].sort((a,b)=>a.id.localeCompare(b.id)))),allocation};
}
export const studyOutcomeSchema=z.object({
  participantId:z.string().uuid(),assessmentVersion:z.string().min(1),sessionId:z.string().uuid(),
  practiceEndedAt:z.string().datetime(),assessedAt:z.string().datetime(),score:z.number().finite().min(0).max(1),
  assistance:z.enum(["independent","hinted","unknown"]),reviewerId:z.string().min(1),
  isTransferTask:z.boolean(),referenceReviewed:z.boolean(),
}).strict();
export async function summarizeStudy(protocol:StudyProtocol,allocation:StudyAllocation[],participants:StudyParticipant[],rawOutcomes:unknown[]){
  studyProtocolSchema.parse(protocol);
  const outcomes=rawOutcomes.map(value=>studyOutcomeSchema.parse(value));
  const errors:string[]=[];
  const protocolHash=await sha256(JSON.stringify(studyProtocolSchema.parse(protocol)));
  if(allocation.some(value=>value.protocolHash!==protocolHash))errors.push("Allocation protocol mismatch");
  participants.forEach(value=>studyParticipantSchema.parse(value));
  if(new Set(participants.map(value=>value.id)).size!==participants.length)errors.push("Duplicate participant");
  if(allocation.some(value=>!participants.some(participant=>participant.id===value.participantId&&participant.stratum===value.stratum)))errors.push("Allocation roster mismatch");
  if(new Set(allocation.map(value=>value.participantId)).size!==allocation.length)errors.push("Duplicate allocation");
  if(new Set(outcomes.map(value=>value.participantId)).size!==outcomes.length)errors.push("Repeated primary outcome");
  if(new Set(outcomes.map(value=>value.sessionId)).size!==outcomes.length)errors.push("Repeated assessment session");
  if(outcomes.some(value=>!allocation.some(item=>item.participantId===value.participantId)))errors.push("Unallocated outcome");
  const rows=allocation.map(item=>{
    const participant=participants.find(value=>value.id===item.participantId);
    const outcome=outcomes.find(value=>value.participantId===item.participantId);
    const days=outcome?(Date.parse(outcome.assessedAt)-Date.parse(outcome.practiceEndedAt))/86400000:null;
    const eligible=!!participant&&!participant.withdrawn&&!!outcome&&outcome.assistance==="independent"&&outcome.referenceReviewed&&outcome.isTransferTask
      &&outcome.assessmentVersion===protocol.assessmentVersion&&Date.parse(outcome.practiceEndedAt)>=Date.parse(participant.enrolledAt)
      &&days!==null&&days>=protocol.retentionWindowDays[0]&&days<=protocol.retentionWindowDays[1];
    return {...item,score:eligible?outcome!.score:null,missing:!eligible};
  });
  const arms=(["baseline","adaptive"] as const).map(arm=>{
    const group=rows.filter(row=>row.arm===arm),observed=group.filter(row=>!row.missing);
    return {arm,assigned:group.length,observed:observed.length,missing:group.length-observed.length,
      mean:observed.length?observed.reduce((sum,row)=>sum+row.score!,0)/observed.length:null};
  });
  return {status:errors.length?"invalid":arms.some(arm=>arm.observed<protocol.minimumPerArm)?"insufficient_observations":"ready_for_statistical_review",errors,arms,
    attritionRequiresReview:rows.some(row=>row.missing),learningGainsEstablished:false,
    qualification:"Observed-case summaries only. A study analyst must assess missingness, assignment integrity and the preregistered analysis before efficacy claims."};
}
