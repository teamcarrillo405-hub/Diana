import { z } from "zod";
import { courseContentHash } from "./course-framework";
import { versionResponseRubric } from "./response-rubric";
import { responsePacketSchema, responseReviewPermissionSchema, responseTextHash } from "./response-assessment";
import type { VersionedActivity } from "./course-activities";

const digest = z.string().regex(/^[a-f0-9]{64}$/);
export const deliveredReviewSchema = z.object({
  id: z.string().uuid(), recordId: z.string().uuid(), revision: z.number().int().positive(),
  reviewerIds: z.array(z.string().uuid()).length(2), issuedAt: z.string().datetime({offset:true}),
  invitationIds: z.tuple([z.string().uuid(), z.string().uuid()]),
  subject: z.enum(["reading","english","science","history"]),
  expiresAt: z.string().datetime({offset:true}), revokedAt: z.string().datetime({offset:true}).nullable(),
  exerciseId: z.string(), activityVersionId: digest, response: z.string().min(1).max(4000),
  modality: z.enum(["typed", "handwriting", "voice"]), supportCount: z.number().int().min(0).max(100),
}).strict();
export type DeliveredReview = z.infer<typeof deliveredReviewSchema>;

/** The database returns only the confirmed answer fields, never the full notebook. */
export async function packetForDeliveredReview(activity: VersionedActivity, raw: unknown, blindSecret: string) {
  const review = deliveredReviewSchema.parse(raw);
  if (blindSecret.length < 32) throw new Error("assessment_blinding_secret_required");
  if (activity.id !== review.exerciseId || activity.versionId !== review.activityVersionId ||activity.subject!==review.subject||
      activity.sources.some(source => source.authorship !== "diana_authored") || review.revokedAt ||
      Date.parse(review.issuedAt) > Date.now() || Date.parse(review.expiresAt) <= Date.now()) throw new Error("review_version_or_permission_unavailable");
  const { rubric, hash: rubricHash } = await versionResponseRubric(activity);
  const responseHash = await responseTextHash(review.response);
  const permission = responseReviewPermissionSchema.parse({
    id: review.id, scope: "response_assessment", responseHash, activityVersionId: review.activityVersionId,
    provenance: "consented_student", rightsReference: "diana-original-practice", consentReference: review.id,
    issuedBy: review.id, issuedAt: new Date(review.issuedAt).toISOString(), expiresAt: new Date(review.expiresAt).toISOString(), revokedAt: review.revokedAt?new Date(review.revokedAt).toISOString():null,
    reviewerIds: review.reviewerIds, invitationIds: review.invitationIds,
  });
  const payload = { version: "response-assessment-v1" as const, activityVersionId:activity.versionId,
    rubricHash, rubric, prompt:activity.prompt,
    sources:activity.sources.map(source=>({id:source.id,title:source.title,text:source.text})),
    response:review.response,responseHash,supportCount:review.supportCount,modality:review.modality,permission };
  const contentHash = await courseContentHash(payload);
  return responsePacketSchema.parse({...payload,contentHash,id:await courseContentHash({blindSecret,contentHash})});
}
