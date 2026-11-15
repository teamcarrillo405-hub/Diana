import { z } from "zod";
import { evidenceAnchorSchema, type EvidenceAnchor } from "./contracts";
import { courseContentHash, coursePrerequisites, frameworkSchema } from "./course-framework";
import { evaluateMappingReviews, mappingReviewAssignmentSchema, mappingReviewJudgmentSchema, mappingReviewPacketSchema } from "./competency-mapping-review";
import { responseReviewerSchema } from "./response-assessment";

const identity = z.string().min(1).max(200);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
/** Integrity bindings only. Authenticity comes from the caller's operator-controlled store. */
export const sourceMappingPublicationSchema = z.object({
  id: identity, packetId: digest, packetHash: digest, competencyId: identity, competencyHash: digest,
  sourceVersionId: digest, sourceContentHash: digest, sourceAssetHash: digest,
  anchor: evidenceAnchorSchema, assignmentId: identity, assignmentHash: digest,
  reviews: z.array(z.object({ id: z.string().uuid(), hash: digest }).strict()).min(2).max(3),
  status: z.enum(["published", "suspended", "withdrawn"]), issuedBy: identity,
  issuedAt: z.string().datetime(), publishedAt: z.string().datetime(), expiresAt: z.string().datetime(),
  revokedAt: z.string().datetime().nullable(),
}).strict();
export type SourceMappingPublication = z.infer<typeof sourceMappingPublicationSchema>;
type ReviewInput = Parameters<typeof evaluateMappingReviews>[0];
export type PublishedMappingInput = ReviewInput & {
  /** Never populate from a review upload or client request. Read current state each invocation. */
  trustedPublicationState: {
    readAt: string; validUntil: string; issuerIds: string[]; publications: unknown[];
  };
};
const stateSchema = z.object({ readAt: z.string().datetime(), validUntil: z.string().datetime(),
  issuerIds: z.array(identity).max(100), publications: z.array(sourceMappingPublicationSchema).max(1000) }).strict();
const unique = (values: readonly string[]) => new Set(values).size === values.length;

/** Resolve current operator publication and current educator evidence together, failing closed. */
export async function resolvePublishedSourceMappings(input: PublishedMappingInput, now = Date.now()) {
  if (!Number.isFinite(now)) throw new Error("mapping_publication_invalid_time");
  const state = stateSchema.parse(input.trustedPublicationState);
  if (Date.parse(state.readAt) > now || Date.parse(state.validUntil) <= now
    || Date.parse(state.validUntil) - Date.parse(state.readAt) > 300_000
    || !unique(state.issuerIds) || !unique(state.publications.map(item => item.id)))
    throw new Error("mapping_publication_state_unavailable");
  const evaluation = await evaluateMappingReviews(input, now);
  if (evaluation.status === "invalid") throw new Error("mapping_publication_reviews_invalid");
  const packets = input.packets.map(item => mappingReviewPacketSchema.parse(item));
  const reviews = input.reviews.map(item => mappingReviewJudgmentSchema.parse(item));
  const assignments = input.currentAssignments.map(item => mappingReviewAssignmentSchema.parse(item));
  const reviewers = input.reviewers.map(item => responseReviewerSchema.parse(item));
  let validUntil = Date.parse(state.validUntil);
  const keys = await Promise.all(state.publications.map(async item =>
    item.competencyId + ":" + await courseContentHash(item.anchor)));
  if (!unique(keys) || !unique(state.publications.map(item => item.packetId)))
    throw new Error("mapping_publication_conflict");
  const mappings: Array<{ publicationId: string; publicationHash: string; packetId: string;
    competencyId: string; competencyHash: string; anchor: EvidenceAnchor; reviewIds: string[] }> = [];
  for (const publication of state.publications) {
    // Withdrawn/suspended/expired entries never fall back to an earlier record.
    if (publication.status !== "published" || publication.revokedAt
      || Date.parse(publication.expiresAt) <= now) continue;
    const packet = packets.find(item => item.id === publication.packetId);
    const row = evaluation.rows.find(item => item.packetId === publication.packetId);
    const boundReviews = reviews.filter(item => item.packetId === publication.packetId);
    if (!packet || !row || row.judgment !== "supported" || !["agreed", "adjudicated"].includes(row.status)
      || !state.issuerIds.includes(publication.issuedBy)
      || boundReviews.some(item => item.reviewerId === publication.issuedBy)
      || Date.parse(publication.issuedAt) > Date.parse(publication.publishedAt)
      || Date.parse(publication.publishedAt) > now
      || boundReviews.some(item => Date.parse(item.reviewedAt) > Date.parse(publication.publishedAt))
      || publication.packetHash !== packet.contentHash
      || publication.competencyId !== packet.competency.id || publication.competencyHash !== packet.competencyHash
      || publication.sourceVersionId !== packet.sourceVersion.id
      || publication.sourceContentHash !== packet.sourceVersion.contentHash || publication.sourceAssetHash !== packet.sourceAssetHash
      || publication.assignmentId !== packet.assignmentId || publication.assignmentHash !== packet.assignmentHash
      || await courseContentHash(publication.anchor) !== await courseContentHash(packet.anchor)
      || !unique(publication.reviews.map(item => item.id))
      || publication.reviews.length !== row.reviewIds.length || publication.reviews.length !== boundReviews.length
      || publication.reviews.some(item => !row.reviewIds.includes(item.id)))
      throw new Error("mapping_publication_binding_changed");
    for (const reference of publication.reviews) {
      const review = boundReviews.find(item => item.id === reference.id);
      if (!review || await courseContentHash(review) !== reference.hash) throw new Error("mapping_publication_review_changed");
    }
    const assignment = assignments.find(item => item.id === packet.assignmentId);
    const credentials = boundReviews.map(review => reviewers.find(item => item.id === review.reviewerId));
    if (!assignment || credentials.some(item => !item)) throw new Error("mapping_publication_reviews_invalid");
    validUntil = Math.min(validUntil, Date.parse(publication.expiresAt), Date.parse(assignment.expiresAt),
      ...credentials.map(item => Date.parse(item!.expiresAt)));
    mappings.push({ publicationId: publication.id, publicationHash: await courseContentHash(publication),
      packetId: packet.id, competencyId: packet.competency.id, competencyHash: packet.competencyHash,
      anchor: packet.anchor, reviewIds: [...row.reviewIds] });
  }
  return { mappings, resolvedAt: new Date(now).toISOString(), validUntil: new Date(validUntil).toISOString(),
    answerabilityEstablished: false as const, masteryEstablished: false as const,
    identityExternallyVerified: false as const };
}

export type ReviewedMappingCandidate = { score: number; anchor: EvidenceAnchor };
/** Explicit offline comparison entry point. Revalidates publications and evidence on every call.
 * Only equal lexical-score groups may move. Existing candidate objects, scores and anchors are preserved.
 */
export async function compareReviewedMappingRanking<T extends ReviewedMappingCandidate>(input: PublishedMappingInput & {
  candidates: readonly T[]; selectedCompetencyId: string; includeDeclaredPrerequisites: boolean;
}, now = Date.now()) {
  const framework = frameworkSchema.parse(input.currentFramework);
  if (!framework.competencies.some(item => item.id === input.selectedCompetencyId)) throw new Error("mapping_selection_required");
  if (input.candidates.length > 48 || input.candidates.some(item => !Number.isFinite(item.score) || item.score < 0))
    throw new Error("mapping_candidates_invalid");
  const anchors = input.candidates.map(item => evidenceAnchorSchema.parse(item.anchor));
  const candidateKeys = await Promise.all(anchors.map(courseContentHash));
  if (!unique(candidateKeys)) throw new Error("mapping_candidates_duplicate");
  // The baseline is already ranked. Do not repair, resort, add to, or truncate it here.
  if (input.candidates.some((item, index) => index > 0 && item.score > input.candidates[index - 1].score))
    throw new Error("mapping_candidates_not_lexically_ranked");
  const resolution = await resolvePublishedSourceMappings(input, now);
  const allowed = new Set([input.selectedCompetencyId, ...(input.includeDeclaredPrerequisites
    ? coursePrerequisites(framework, input.selectedCompetencyId).map(item => item.id) : [])]);
  const publicationKeys = await Promise.all(resolution.mappings.map(async item => ({ ...item, anchorKey: await courseContentHash(item.anchor) })));
  const provenance = candidateKeys.map((key, index) => ({ baselineRank: index + 1,
    publications: publicationKeys.filter(item => item.anchorKey === key && allowed.has(item.competencyId))
      .map(item => ({ publicationId: item.publicationId, publicationHash: item.publicationHash, packetId: item.packetId,
        competencyId: item.competencyId, relationship: item.competencyId === input.selectedCompetencyId ? "selected" as const : "prerequisite" as const,
        reviewIds: item.reviewIds })) }));
  const indices = input.candidates.map((_, index) => index).sort((left, right) => {
    const difference = input.candidates[right].score - input.candidates[left].score;
    return difference || Number(provenance[right].publications.length > 0) - Number(provenance[left].publications.length > 0) || left - right;
  });
  return { baseline: [...input.candidates], ranked: indices.map(index => input.candidates[index]),
    provenance: indices.map((index, rank) => ({ ...provenance[index], reviewedRank: rank + 1 })),
    selectedCompetencyId: input.selectedCompetencyId, resolvedAt: resolution.resolvedAt, validUntil: resolution.validUntil,
    productionActivated: false as const, answerabilityEstablished: false as const, masteryEstablished: false as const };
}
