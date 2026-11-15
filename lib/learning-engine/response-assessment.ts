import { z } from "zod";
import { courseContentHash } from "./course-framework";
import { domainSchema } from "./course-domains";
import { responseRubricSchema, versionResponseRubric } from "./response-rubric";
import type { VersionedActivity } from "./course-activities";
import { validateProblemState, type ProblemState } from "./problem-state";

const digest = z.string().regex(/^[a-f0-9]{64}$/), id = z.string().min(1).max(200);
const qualificationReference = z.string().min(1).max(300);
export const responseReviewPermissionSchema = z.object({
  id, scope: z.literal("response_assessment"), responseHash: digest, activityVersionId: digest,
  provenance: z.enum(["authored_synthetic", "consented_student"]),
  rightsReference: id, consentReference: id.nullable(), issuedBy: id,
  issuedAt: z.string().datetime(), expiresAt: z.string().datetime(), revokedAt: z.string().datetime().nullable(),
  reviewerIds: z.array(id).min(2).max(10),
  invitationIds: z.tuple([z.string().uuid(), z.string().uuid()]).optional(),
}).strict().refine(value => value.provenance !== "consented_student" || (!!value.consentReference && !!value.invitationIds), "Student response review needs consent and invitation evidence.");
export const responsePacketSchema = z.object({
  version: z.literal("response-assessment-v1"), id: digest, contentHash: digest,
  activityVersionId: digest, rubricHash: digest, rubric: responseRubricSchema,
  prompt: z.string().min(1).max(4000), sources: z.array(z.object({id, title:z.string(), text:z.string().max(12000)}).strict()).max(3),
  response: z.string().min(1).max(4000), responseHash: digest,
  supportCount: z.number().int().min(0).max(100), modality: z.enum(["typed", "handwriting", "voice"]),
  permission: responseReviewPermissionSchema,
}).strict();
export type ResponsePacket = z.infer<typeof responsePacketSchema>;

/** Registry is imported by a trusted operator, never accepted from a review form. */
export const responseReviewerSchema = z.object({
  id, subjects: z.array(domainSchema).min(1), qualificationReference, verifiedBy: id,
  verifiedAt: z.string().datetime(), expiresAt: z.string().datetime(), revokedAt: z.string().datetime().nullable(),
}).strict();
export const responseAssessmentSchema = z.object({
  id: z.string().uuid(), packetId: digest, packetHash: digest, rubricHash: digest,
  reviewerId: id, qualificationReference, role: z.enum(["rater", "adjudicator"]),
  reviewedAt: z.string().datetime(), conflictOfInterest: z.boolean(),
  resolves: z.array(z.string().uuid()).max(2),
  criteria: z.array(z.object({
    criterionId: z.string(), score: z.number().int().min(0).max(3).nullable(),
    rationale: z.string().trim().min(20).max(2000),
    evidence: z.array(z.object({start:z.number().int().nonnegative(),end:z.number().int().positive(),exactText:z.string().min(1).max(4000)}).strict()).max(6),
  }).strict()).min(2).max(6),
}).strict();
export type ResponseAssessment = z.infer<typeof responseAssessmentSchema>;

export async function responseTextHash(response: string) { return courseContentHash({response}); }
function permissionCurrent(permission: z.infer<typeof responseReviewPermissionSchema>, now: number) {
  return !permission.revokedAt && Date.parse(permission.issuedAt) <= now && Date.parse(permission.expiresAt) > now
    && new Set(permission.reviewerIds).size === permission.reviewerIds.length
    && (!permission.invitationIds || new Set(permission.invitationIds).size === permission.invitationIds.length);
}
async function packetContentHash(packet: Omit<ResponsePacket, "id" | "contentHash">) { return courseContentHash(packet); }

/** No network or training export. Only original catalog content is currently supported. */
export async function buildResponsePacket(activity: VersionedActivity, raw: ProblemState, rawPermission: unknown, blindSecret: string, now = Date.now()): Promise<ResponsePacket> {
  const state = await validateProblemState(raw), permission = responseReviewPermissionSchema.parse(rawPermission);
  if (blindSecret.length < 32) throw new Error("assessment_blinding_secret_required");
  if (activity.sources.some(source => source.authorship !== "diana_authored")) throw new Error("private_material_review_export_unavailable");
  const response = state.observations.find(item => item.id === "response");
  if (state.scope.exerciseId !== activity.id || state.exerciseVersionId !== activity.versionId || !response || response.confirmedHash !== response.contentHash ||
    !["typed", "handwriting", "voice"].includes(response.modality)) throw new Error("assessment_response_not_confirmed");
  const responseHash = await responseTextHash(response.text);
  if (permission.responseHash !== responseHash || permission.activityVersionId !== activity.versionId || !permissionCurrent(permission, now)) throw new Error("assessment_permission_unavailable");
  const {rubric, hash: rubricHash} = await versionResponseRubric(activity);
  const payload = {version:"response-assessment-v1" as const, activityVersionId:activity.versionId, rubricHash, rubric, prompt:activity.prompt,
    sources:activity.sources.map(source => ({id:source.id,title:source.title,text:source.text})), response:response.text,responseHash,
    supportCount:state.supportCount, modality:response.modality as ResponsePacket["modality"],permission};
  const contentHash = await packetContentHash(payload);
  return responsePacketSchema.parse({...payload,contentHash,id:await courseContentHash({blindSecret,contentHash})});
}

export async function validateResponsePacket(raw: unknown) {
  const packet = responsePacketSchema.parse(raw), {id:_id,contentHash,...payload}=packet;
  if (contentHash !== await packetContentHash(payload) || packet.responseHash !== await responseTextHash(packet.response) ||
    packet.rubricHash !== await courseContentHash({activityVersionId:packet.activityVersionId,rubric:packet.rubric}) ||
    packet.permission.responseHash !== packet.responseHash || packet.permission.activityVersionId !== packet.activityVersionId) throw new Error("assessment_packet_changed");
  return packet;
}

/** Two independent ratings, with a separate third educator for disagreement. No mastery promotion. */
export async function evaluateResponseAssessments(rawPackets: unknown[], rawReviews: unknown[], rawRegistry: unknown[], rawCurrentPermissions: unknown[], now=Date.now()) {
  if (rawPackets.length > 5000 || rawReviews.length > 15000 || rawRegistry.length > 1000 || rawCurrentPermissions.length>5000) throw new Error("assessment_batch_bound");
  const packets = await Promise.all(rawPackets.map(validateResponsePacket)), reviews=rawReviews.map(value=>responseAssessmentSchema.parse(value)), registry=rawRegistry.map(value=>responseReviewerSchema.parse(value)), permissions=rawCurrentPermissions.map(value=>responseReviewPermissionSchema.parse(value));
  const errors:string[]=[];
  if (new Set(packets.map(value=>value.id)).size!==packets.length || new Set(packets.map(value=>value.contentHash)).size!==packets.length) errors.push("duplicate_packet");
  if (new Set(registry.map(value=>value.id)).size!==registry.length) errors.push("duplicate_reviewer_identity");
  if (new Set(permissions.map(value=>value.id)).size!==permissions.length) errors.push("duplicate_review_permission");
  for(const packet of packets){
    const current=permissions.find(value=>value.id===packet.permission.id);
    if(!current || !permissionCurrent(current,now) || await courseContentHash(current)!==await courseContentHash(packet.permission)) errors.push("review_permission_changed");
  }
  const ids=new Set<string>(), pairs=new Set<string>();
  for (const review of reviews) {
    const packet=packets.find(value=>value.id===review.packetId), person=registry.find(value=>value.id===review.reviewerId), pair=review.packetId+":"+review.reviewerId;
    if(ids.has(review.id)||pairs.has(pair)) errors.push("duplicate_assessment");
    ids.add(review.id);pairs.add(pair);
    if (!packet || packet.contentHash!==review.packetHash || packet.rubricHash!==review.rubricHash) { errors.push("assessment_binding_changed"); continue; }
    if (!person || person.qualificationReference!==review.qualificationReference || !person.subjects.includes(packet.rubric.subject) || person.revokedAt || person.verifiedBy===person.id ||
      Date.parse(person.verifiedAt)>Date.parse(review.reviewedAt) || Date.parse(person.expiresAt)<=now || Date.parse(review.reviewedAt)>now || review.conflictOfInterest ||
      !permissionCurrent(packet.permission,now) || Date.parse(review.reviewedAt)<Date.parse(packet.permission.issuedAt) || !packet.permission.reviewerIds.includes(review.reviewerId)) errors.push("reviewer_or_permission_ineligible");
    if(new Set(review.criteria.map(value=>value.criterionId)).size!==review.criteria.length || review.criteria.length!==packet.rubric.criteria.length || review.criteria.some(value=>!packet.rubric.criteria.some(criterion=>criterion.id===value.criterionId))) errors.push("assessment_criteria_incomplete");
    for(const criterion of review.criteria) {
      if(criterion.score!==null&&criterion.score>0&&!criterion.evidence.length) errors.push("assessment_evidence_required");
      if(criterion.evidence.some(span=>span.end<=span.start || span.end>packet.response.length || packet.response.slice(span.start,span.end)!==span.exactText)) errors.push("assessment_span_changed");
    }
    if(review.role==="rater"&&review.resolves.length) errors.push("rater_cannot_adjudicate");
  }
  let pairedCriteria=0, agreedCriteria=0;
  const rows=packets.map(packet=>{
    const raters=reviews.filter(value=>value.packetId===packet.id&&value.role==="rater"), adjudicators=reviews.filter(value=>value.packetId===packet.id&&value.role==="adjudicator");
    const complete=raters.length===2&&new Set(raters.map(value=>value.reviewerId)).size===2&&raters.every(value=>value.criteria.every(criterion=>criterion.score!==null));
    const equal=complete&&packet.rubric.criteria.every(criterion=>raters[0].criteria.find(value=>value.criterionId===criterion.id)?.score===raters[1].criteria.find(value=>value.criterionId===criterion.id)?.score);
    if(complete) for(const criterion of packet.rubric.criteria){pairedCriteria++; if(raters[0].criteria.find(value=>value.criterionId===criterion.id)?.score===raters[1].criteria.find(value=>value.criterionId===criterion.id)?.score)agreedCriteria++;}
    const adjudicator=adjudicators.length===1?adjudicators[0]:null;
    const resolved=complete&&!equal&&!!adjudicator&&adjudicator.resolves.length===2&&new Set(adjudicator.resolves).size===2&&raters.every(value=>adjudicator.resolves.includes(value.id)&&Date.parse(value.reviewedAt)<=Date.parse(adjudicator.reviewedAt))&&adjudicator.criteria.every(value=>value.score!==null);
    if(adjudicators.length && !resolved) errors.push("adjudication_not_independent_or_bound");
    if(raters.length>2) errors.push("excess_raters");
    const chosen=equal?raters[0]:resolved?adjudicator:null;
    return {packetId:packet.id,status:equal?"agreed":resolved?"adjudicated":complete?"disagreement":"pending",criteria:chosen?.criteria??null,supportCount:packet.supportCount};
  });
  return {status:errors.length?"invalid":!rows.length||rows.some(row=>!row.criteria)?"incomplete":"review_complete",errors:[...new Set(errors)],
    rows:errors.length?rows.map(row=>({...row,status:"invalid",criteria:null})):rows,
    agreement:{pairedCriteria,agreedCriteria,exactRate:!errors.length&&pairedCriteria?agreedCriteria/pairedCriteria:null},
    eligibleForKnowledge:false,trainingEligible:false,learningGainsEstablished:false,
    qualification:"Descriptive educator agreement for these responses only. The operator must verify real identities, qualifications, rights and consent references. No automatic grade, training permission or learning-effect claim."};
}
