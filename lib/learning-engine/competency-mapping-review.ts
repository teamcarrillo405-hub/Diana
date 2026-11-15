import { z } from "zod";
import { blockSchema, documentVersionSchema, evidenceAnchorSchema, type StructuredDocument } from "./contracts";
import { validateDocumentAnchor } from "./curriculum";
import { competencySchema, courseContentHash, frameworkSchema } from "./course-framework";
import { suggestSourceCompetencies, type CompetencySuggestion } from "./competency-mapping";
import { responseReviewerSchema } from "./response-assessment";
import { PRECALCULUS_BOOK, PUBLIC_TEXTBOOK_SCOPE, textbookAssetPath } from "./textbook-catalog";

const digest = z.string().regex(/^[a-f0-9]{64}$/);
const identity = z.string().min(1).max(200);
const chapter = z.number().int().min(1).max(9);

/** Operator-issued review assignment, not a source license or a reviewer credential. */
export const mappingReviewAssignmentSchema = z.object({
  id: identity, scope: z.literal("public_textbook_competency_mapping"),
  sourceVersionId: digest, sourceContentHash: digest, sourceAssetHash: digest,
  issuedBy: identity, issuedAt: z.string().datetime(), expiresAt: z.string().datetime(),
  revokedAt: z.string().datetime().nullable(), reviewerIds: z.array(identity).min(2).max(10),
}).strict();
export type MappingReviewAssignment = z.infer<typeof mappingReviewAssignmentSchema>;

export const mappingReviewPacketSchema = z.object({
  version: z.literal("source-competency-review-v1"), id: digest, contentHash: digest,
  bookId: z.literal(PRECALCULUS_BOOK.id), edition: z.literal(PRECALCULUS_BOOK.edition),
  license: z.literal(PRECALCULUS_BOOK.license), chapter, sourceAssetHash: digest,
  sourceVersion: documentVersionSchema, anchor: evidenceAnchorSchema,
  readerUrl: z.string().startsWith("/assets/textbooks/").max(500),
  competency: competencySchema, competencyHash: digest,
  suggestionHash: digest, assignmentId: identity, assignmentHash: digest,
}).strict();
export type MappingReviewPacket = z.infer<typeof mappingReviewPacketSchema>;

export const mappingReviewJudgmentSchema = z.object({
  id: z.string().uuid(), packetId: digest, packetHash: digest,
  reviewerId: identity, qualificationReference: z.string().min(1).max(300),
  role: z.enum(["rater", "adjudicator"]), reviewedAt: z.string().datetime(),
  conflictOfInterest: z.boolean(), resolves: z.array(z.string().uuid()).max(2),
  originalPageChecked: z.boolean(), objectiveChecked: z.boolean(),
  judgment: z.enum(["supported", "unsupported", "uncertain"]),
  rationale: z.string().trim().min(20).max(3000),
  evidence: z.array(z.object({
    start: z.number().int().nonnegative(), end: z.number().int().positive(),
    exactText: z.string().min(1).max(12000),
  }).strict()).max(4),
}).strict();
export type MappingReviewJudgment = z.infer<typeof mappingReviewJudgmentSchema>;

function unique(values: readonly string[]) { return new Set(values).size === values.length; }
function current(assignment: MappingReviewAssignment, now: number) {
  return !assignment.revokedAt && Date.parse(assignment.issuedAt) <= now && Date.parse(assignment.expiresAt) > now
    && unique(assignment.reviewerIds);
}
async function packetHash(packet: Omit<MappingReviewPacket, "id" | "contentHash">) { return courseContentHash(packet); }

function publicSource(document: StructuredDocument, chapterNumber: number, assetHash: string) {
  const version = documentVersionSchema.parse(document.version);
  const expectedId = `${PRECALCULUS_BOOK.id}-chapter-${chapterNumber}`;
  if (!PRECALCULUS_BOOK.chapters.some(item => item.number === chapterNumber)
    || version.documentId !== expectedId || version.ownerId !== PUBLIC_TEXTBOOK_SCOPE.ownerId
    || version.assignmentId !== PUBLIC_TEXTBOOK_SCOPE.assignmentId || version.classId !== PUBLIC_TEXTBOOK_SCOPE.classId
    || version.subject !== "math" || version.edition !== `${PRECALCULUS_BOOK.edition}, chapter ${chapterNumber}`
    || version.instructionRights !== "licensed" || version.trainingPermission !== "excluded"
    || version.sourceAssetHash !== assetHash || !digest.safeParse(assetHash).success) throw new Error("mapping_review_public_source_required");
  return version;
}

/** An exact lexical proposal can become a review packet, never an automatic course alignment. */
export async function buildMappingReviewPacket(input: {
  framework: unknown; document: StructuredDocument; suggestion: CompetencySuggestion;
  chapter: number; assetHash: string; assignment: unknown; blindSecret: string;
}, now = Date.now()): Promise<MappingReviewPacket> {
  if (input.blindSecret.length < 32) throw new Error("mapping_review_blinding_secret_required");
  const version = publicSource(input.document, input.chapter, input.assetHash);
  const assignment = mappingReviewAssignmentSchema.parse(input.assignment);
  if (!current(assignment, now) || assignment.sourceVersionId !== version.id
    || assignment.sourceContentHash !== version.contentHash || assignment.sourceAssetHash !== input.assetHash
    || assignment.reviewerIds.includes(assignment.issuedBy)) throw new Error("mapping_review_assignment_unavailable");
  const framework = frameworkSchema.parse(input.framework);
  const skill = framework.competencies.find(item => item.id === input.suggestion.skillId);
  const block = input.document.blocks.find(item => item.id === input.suggestion.anchor.blockId);
  if (!skill || !block || !validateDocumentAnchor(input.suggestion.anchor, input.document)) throw new Error("mapping_review_source_changed");
  blockSchema.parse(block);
  const recomputed = await suggestSourceCompetencies(framework, version, [block], input.document.pages);
  const candidate = recomputed.suggestions.find(item => item.skillId === skill.id);
  if (!candidate || candidate.mappingHash !== input.suggestion.mappingHash
    || await courseContentHash(candidate.anchor) !== await courseContentHash(input.suggestion.anchor)) throw new Error("mapping_review_suggestion_changed");
  const payload = {
    version: "source-competency-review-v1" as const, bookId: PRECALCULUS_BOOK.id,
    edition: PRECALCULUS_BOOK.edition, license: PRECALCULUS_BOOK.license,
    chapter: input.chapter, sourceAssetHash: input.assetHash, sourceVersion: version,
    anchor: input.suggestion.anchor, readerUrl: textbookAssetPath(input.chapter) + "#page=" + input.suggestion.anchor.location.page,
    competency: skill, competencyHash: await courseContentHash(skill),
    suggestionHash: candidate.mappingHash, assignmentId: assignment.id,
    assignmentHash: await courseContentHash(assignment),
  };
  const contentHash = await packetHash(payload);
  return mappingReviewPacketSchema.parse({ ...payload, contentHash,
    id: await courseContentHash({ secret: input.blindSecret, contentHash }) });
}

/** Current source locks and reviewer assignments must be supplied from an operator-controlled store. */
export async function validateMappingReviewPacket(raw: unknown, rawSourceLock: unknown,
  current: { framework: unknown; document: StructuredDocument }) {
  const packet = mappingReviewPacketSchema.parse(raw);
  const sourceLock = z.object({ chapter, assetHash: digest, versionId: digest, contentHash: digest }).strict().parse(rawSourceLock);
  const framework = frameworkSchema.parse(current.framework);
  const competency = framework.competencies.find(item => item.id === packet.competency.id);
  const { id: _id, contentHash: _contentHash, ...payload } = packet;
  if (packet.contentHash !== await packetHash(payload)
    || packet.competencyHash !== await courseContentHash(packet.competency)
    || packet.anchor.versionId !== packet.sourceVersion.id
    || packet.anchor.contentHash !== packet.sourceVersion.contentHash
    || packet.anchor.location.endOffset - packet.anchor.location.startOffset !== packet.anchor.exactText.length
    || packet.competency.id.split(".")[0] !== packet.sourceVersion.subject
    || packet.readerUrl !== textbookAssetPath(packet.chapter) + "#page=" + packet.anchor.location.page
    || sourceLock.chapter !== packet.chapter || sourceLock.assetHash !== packet.sourceAssetHash
    || sourceLock.versionId !== packet.sourceVersion.id || sourceLock.contentHash !== packet.sourceVersion.contentHash)
    throw new Error("mapping_review_packet_changed");
  publicSource({ version: packet.sourceVersion, pages: [], blocks: [], chunks: [] }, packet.chapter, packet.sourceAssetHash);
  if (!competency || await courseContentHash(competency) !== packet.competencyHash
    || await courseContentHash(current.document.version) !== await courseContentHash(packet.sourceVersion)
    || !validateDocumentAnchor(packet.anchor, current.document)) throw new Error("mapping_review_current_content_changed");
  const block = current.document.blocks.find(item => item.id === packet.anchor.blockId);
  if (!block) throw new Error("mapping_review_current_content_changed");
  const proposals = await suggestSourceCompetencies(framework, current.document.version, [block], current.document.pages);
  const proposal = proposals.suggestions.find(item => item.skillId === competency.id);
  if (!proposal || proposal.mappingHash !== packet.suggestionHash
    || await courseContentHash(proposal.anchor) !== await courseContentHash(packet.anchor))
    throw new Error("mapping_review_current_content_changed");
  return packet;
}

/** Produces descriptive agreement only. No runtime skill, standards or mastery promotion. */
export async function evaluateMappingReviews(input: {
  packets: unknown[]; sourceLocks: unknown[]; reviews: unknown[];
  reviewers: unknown[]; currentAssignments: unknown[];
  currentFramework: unknown; currentDocuments: StructuredDocument[];
}, now = Date.now()) {
  if (input.packets.length > 1000 || input.sourceLocks.length > 9 || input.reviews.length > 3000
    || input.reviewers.length > 1000 || input.currentAssignments.length > 1000
    || input.currentDocuments.length > 9) throw new Error("mapping_review_batch_limit");
  const framework = frameworkSchema.parse(input.currentFramework);
  if (!unique(input.currentDocuments.map(document => document.version.id))) throw new Error("mapping_review_duplicate_current_source");
  const locks = input.sourceLocks.map(value => z.object({ chapter, assetHash: digest, versionId: digest, contentHash: digest }).strict().parse(value));
  const packets = await Promise.all(input.packets.map(value => {
    const parsed = mappingReviewPacketSchema.parse(value);
    const lock = locks.find(item => item.chapter === parsed.chapter);
    if (!lock) throw new Error("mapping_review_source_lock_missing");
    const document = input.currentDocuments.find(item => item.version.id === parsed.sourceVersion.id);
    if (!document) throw new Error("mapping_review_current_source_missing");
    return validateMappingReviewPacket(parsed, lock, { framework, document });
  }));
  const reviews = input.reviews.map(value => mappingReviewJudgmentSchema.parse(value));
  const reviewers = input.reviewers.map(value => responseReviewerSchema.parse(value));
  const assignments = input.currentAssignments.map(value => mappingReviewAssignmentSchema.parse(value));
  const errors: string[] = [];
  if (!unique(locks.map(item => String(item.chapter))) || !unique(packets.map(item => item.id))
    || !unique(packets.map(item => item.contentHash))) errors.push("duplicate_packet_or_source_lock");
  if (!unique(reviewers.map(item => item.id))) errors.push("duplicate_reviewer_identity");
  if (!unique(assignments.map(item => item.id))) errors.push("duplicate_assignment");
  if (!unique(reviews.map(item => item.id)) || !unique(reviews.map(item => item.packetId + ":" + item.reviewerId))) errors.push("duplicate_review");
  for (const packet of packets) {
    const latest = assignments.find(item => item.id === packet.assignmentId);
    if (!latest || !current(latest, now) || await courseContentHash(latest) !== packet.assignmentHash
      || latest.sourceVersionId !== packet.sourceVersion.id
      || latest.sourceContentHash !== packet.sourceVersion.contentHash
      || latest.sourceAssetHash !== packet.sourceAssetHash
      || latest.reviewerIds.includes(latest.issuedBy)) errors.push("review_assignment_changed");
  }
  for (const review of reviews) {
    const packet = packets.find(item => item.id === review.packetId);
    const person = reviewers.find(item => item.id === review.reviewerId);
    if (!packet || packet.contentHash !== review.packetHash) { errors.push("review_packet_mismatch"); continue; }
    const assignment = assignments.find(item => item.id === packet.assignmentId);
    if (!person || !person.subjects.includes(packet.competency.subject)
      || person.qualificationReference !== review.qualificationReference || person.revokedAt
      || person.verifiedBy === person.id || Date.parse(person.verifiedAt) > Date.parse(review.reviewedAt)
      || Date.parse(person.expiresAt) <= now || Date.parse(review.reviewedAt) > now
      || !assignment || Date.parse(review.reviewedAt) < Date.parse(assignment.issuedAt)
      || !assignment.reviewerIds.includes(review.reviewerId)
      || assignment.issuedBy === review.reviewerId || review.conflictOfInterest
      || !review.originalPageChecked || !review.objectiveChecked) errors.push("reviewer_or_evidence_ineligible");
    if (review.evidence.some(span => span.end <= span.start || span.end > packet.anchor.exactText.length
      || packet.anchor.exactText.slice(span.start, span.end) !== span.exactText)
      || review.judgment === "supported" && !review.evidence.length) errors.push("review_evidence_changed");
    if (review.role === "rater" && review.resolves.length) errors.push("rater_cannot_adjudicate");
  }
  const rows = packets.map(packet => {
    const raters = reviews.filter(item => item.packetId === packet.id && item.role === "rater");
    const adjudicators = reviews.filter(item => item.packetId === packet.id && item.role === "adjudicator");
    if (raters.length > 2 || adjudicators.length > 1) errors.push("excess_reviewers");
    const complete = raters.length === 2 && raters[0].reviewerId !== raters[1].reviewerId;
    const agreed = complete && raters[0].judgment === raters[1].judgment;
    const adjudicator = adjudicators[0];
    const resolved = complete && !agreed && !!adjudicator
      && adjudicator.reviewerId !== raters[0].reviewerId && adjudicator.reviewerId !== raters[1].reviewerId
      && adjudicator.resolves.length === 2 && unique(adjudicator.resolves)
      && raters.every(item => adjudicator.resolves.includes(item.id) && Date.parse(item.reviewedAt) <= Date.parse(adjudicator.reviewedAt));
    if (adjudicator && !resolved) errors.push("adjudication_not_independent_or_bound");
    const chosen = agreed ? raters[0] : resolved ? adjudicator : null;
    return { packetId: packet.id, sourceVersionId: packet.sourceVersion.id,
      sourceContentHash: packet.sourceVersion.contentHash, sourceAssetHash: packet.sourceAssetHash,
      blockId: packet.anchor.blockId, competencyId: packet.competency.id,
      competencyRevision: packet.competency.revision, competencyHash: packet.competencyHash,
      suggestionHash: packet.suggestionHash, status: agreed ? "agreed" : resolved ? "adjudicated" : complete ? "disagreement" : "pending",
      judgment: chosen?.judgment ?? null, reviewIds: chosen ? agreed ? raters.map(item => item.id) : [...raters.map(item => item.id), adjudicator.id] : [],
    };
  });
  const status = errors.length ? "invalid" : !rows.length || rows.some(row => !row.judgment) ? "incomplete" : "review_complete";
  return { status, errors: [...new Set(errors)],
    rows: errors.length ? rows.map(row => ({ ...row, status: "invalid", judgment: null, reviewIds: [] })) : rows,
    summary: status === "review_complete" ? {
      reviewed: rows.length, supported: rows.filter(row => row.judgment === "supported").length,
      unsupported: rows.filter(row => row.judgment === "unsupported").length,
      uncertain: rows.filter(row => row.judgment === "uncertain").length,
      adjudicated: rows.filter(row => row.status === "adjudicated").length,
    } : null,
    publicationEligible: false as const, standardsAlignmentEstablished: false as const,
    studentLearningMeasured: false as const, identityExternallyVerified: false as const,
    limitation: "The operator must verify the actual source rights, PDF/page checks, reviewer identities and qualifications. Agreement on a public-source skill mapping is not a standards alignment, student mastery finding, or automatic runtime publication.",
  };
}
