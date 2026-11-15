import { describe, expect, it } from "vitest";
import { structureDocument } from "./curriculum";
import { loadCourseCatalog } from "./course-catalog";
import { courseContentHash } from "./course-framework";
import { suggestSourceCompetencies } from "./competency-mapping";
import { buildMappingReviewPacket, evaluateMappingReviews, type MappingReviewJudgment } from "./competency-mapping-review";
import { PRECALCULUS_BOOK, PUBLIC_TEXTBOOK_SCOPE } from "./textbook-catalog";

const now = Date.parse("2026-09-26T12:00:00.000Z");
const assetHash = "a".repeat(64);
const issuedAt = "2026-09-25T12:00:00.000Z";
const expiresAt = "2026-10-25T12:00:00.000Z";

async function fixture() {
  // This is a synthetic contract fixture. It is never an educator or actual PDF result.
  const document = await structureDocument({
    documentId: `${PRECALCULUS_BOOK.id}-chapter-1`, ...PUBLIC_TEXTBOOK_SCOPE,
    title: "Functions", edition: `${PRECALCULUS_BOOK.edition}, chapter 1`, subject: "math",
    instructionRights: "licensed", sourceAssetHash: assetHash,
  }, [{ page: 1, pageLabel: "1", interpretation: "original",
    text: "1. Solve a linear equation using inverse operations. Check the solution to the equation." }]);
  const framework = (await loadCourseCatalog()).framework;
  const suggestion = (await suggestSourceCompetencies(framework, document.version, document.blocks, document.pages))
    .suggestions.find(item => item.skillId === "math.linear_equations")!;
  expect(suggestion).toBeDefined();
  const assignment = { id: "mapping-review-1", scope: "public_textbook_competency_mapping" as const,
    sourceVersionId: document.version.id, sourceContentHash: document.version.contentHash,
    sourceAssetHash: assetHash, issuedBy: "operator", issuedAt, expiresAt, revokedAt: null,
    reviewerIds: ["educator-a", "educator-b", "educator-c"] };
  const packet = await buildMappingReviewPacket({ framework, document, suggestion, chapter: 1,
    assetHash, assignment, blindSecret: "s".repeat(64) }, now);
  const sourceLocks = [{ chapter: 1, assetHash, versionId: document.version.id,
    contentHash: document.version.contentHash }];
  const reviewers = ["educator-a", "educator-b", "educator-c"].map(id => ({ id,
    subjects: ["math"], qualificationReference: `verified-${id}`, verifiedBy: "operator",
    verifiedAt: issuedAt, expiresAt, revokedAt: null }));
  const review = (id: string, reviewerId: string, judgment: MappingReviewJudgment["judgment"] = "supported",
    role: MappingReviewJudgment["role"] = "rater", resolves: string[] = []): MappingReviewJudgment => ({
    id, packetId: packet.id, packetHash: packet.contentHash, reviewerId,
    qualificationReference: `verified-${reviewerId}`, role,
    reviewedAt: "2026-09-26T10:00:00.000Z", conflictOfInterest: false, resolves,
    originalPageChecked: true, objectiveChecked: true, judgment,
    rationale: "The selected source text directly covers this competency objective.",
    evidence: judgment === "supported" ? [{ start: 3, end: 26,
      exactText: packet.anchor.exactText.slice(3, 26) }] : [],
  });
  return { document, framework, suggestion, assignment, packet, sourceLocks, reviewers, review };
}

describe("public source competency review", () => {
  it("binds the packet to one public source, current assignment, exact text and competency revision", async () => {
    const data = await fixture();
    expect(data.packet.anchor.exactText).toBe(data.document.blocks[0].text);
    expect(data.packet.sourceVersion.contentHash).toBe(data.document.version.contentHash);
    expect(data.packet.competency.revision).toBeGreaterThan(0);
    const changed = structuredClone(data.framework);
    changed.competencies.find(item => item.id === data.suggestion.skillId)!.revision++;
    await expect(buildMappingReviewPacket({ framework: changed, document: data.document,
      suggestion: data.suggestion, chapter: 1, assetHash, assignment: data.assignment,
      blindSecret: "s".repeat(64) }, now)).rejects.toThrow("mapping_review_suggestion_changed");
  });

  it("refuses a private source, unconfirmed OCR and a revoked assignment", async () => {
    const data = await fixture();
    const privateDocument = structuredClone(data.document);
    privateDocument.version.ownerId = "00000000-0000-4000-8000-000000000099";
    await expect(buildMappingReviewPacket({ framework: data.framework, document: privateDocument,
      suggestion: data.suggestion, chapter: 1, assetHash, assignment: data.assignment,
      blindSecret: "s".repeat(64) }, now)).rejects.toThrow("mapping_review_public_source_required");
    const unconfirmed = structuredClone(data.document);
    unconfirmed.blocks[0].needsConfirmation = true;
    await expect(buildMappingReviewPacket({ framework: data.framework, document: unconfirmed,
      suggestion: data.suggestion, chapter: 1, assetHash, assignment: data.assignment,
      blindSecret: "s".repeat(64) }, now)).rejects.toThrow("mapping_review_source_changed");
    await expect(buildMappingReviewPacket({ framework: data.framework, document: data.document,
      suggestion: data.suggestion, chapter: 1, assetHash, assignment: { ...data.assignment, revokedAt: issuedAt },
      blindSecret: "s".repeat(64) }, now)).rejects.toThrow("mapping_review_assignment_unavailable");
  });

  it("reports independent support without automatically publishing a mapping", async () => {
    const data = await fixture();
    const reviews = [data.review("00000000-0000-4000-8000-000000000011", "educator-a"),
      data.review("00000000-0000-4000-8000-000000000012", "educator-b")];
    const result = await evaluateMappingReviews({ currentFramework: data.framework, currentDocuments: [data.document],
      packets: [data.packet], sourceLocks: data.sourceLocks,
      reviews, reviewers: data.reviewers, currentAssignments: [data.assignment] }, now);
    expect(result.status).toBe("review_complete");
    expect(result.rows[0]).toMatchObject({ status: "agreed", judgment: "supported", competencyId: "math.linear_equations" });
    expect(result.summary).toMatchObject({ reviewed: 1, supported: 1 });
    expect(result.publicationEligible).toBe(false);
    expect(result.identityExternallyVerified).toBe(false);
  });

  it("requires a separate bound adjudicator for disagreement", async () => {
    const data = await fixture();
    const first = data.review("00000000-0000-4000-8000-000000000011", "educator-a");
    const second = data.review("00000000-0000-4000-8000-000000000012", "educator-b", "unsupported");
    const input = { currentFramework: data.framework, currentDocuments: [data.document],
      packets: [data.packet], sourceLocks: data.sourceLocks, reviewers: data.reviewers,
      currentAssignments: [data.assignment] };
    expect((await evaluateMappingReviews({ ...input, reviews: [first, second] }, now)).status).toBe("incomplete");
    const third = data.review("00000000-0000-4000-8000-000000000013", "educator-c", "supported", "adjudicator", [first.id, second.id]);
    expect((await evaluateMappingReviews({ ...input, reviews: [first, second, third] }, now)).rows[0])
      .toMatchObject({ status: "adjudicated", judgment: "supported" });
    expect((await evaluateMappingReviews({ ...input, reviews: [first, second, { ...third, resolves: [first.id] }] }, now)).status).toBe("invalid");
  });

  it("invalidates stale rights, changed assignment, unchecked pages and altered evidence", async () => {
    const data = await fixture();
    const first = data.review("00000000-0000-4000-8000-000000000011", "educator-a");
    const second = data.review("00000000-0000-4000-8000-000000000012", "educator-b");
    const input = { currentFramework: data.framework, currentDocuments: [data.document],
      packets: [data.packet], sourceLocks: data.sourceLocks, reviews: [first, second],
      reviewers: data.reviewers, currentAssignments: [data.assignment] };
    await expect(evaluateMappingReviews({ ...input, sourceLocks: [{ ...data.sourceLocks[0], assetHash: "b".repeat(64) }] }, now))
      .rejects.toThrow("mapping_review_packet_changed");
    expect((await evaluateMappingReviews({ ...input, currentAssignments: [{ ...data.assignment, revokedAt: issuedAt }] }, now)).status).toBe("invalid");
    expect((await evaluateMappingReviews({ ...input, reviews: [{ ...first, originalPageChecked: false }, second] }, now)).status).toBe("invalid");
    expect((await evaluateMappingReviews({ ...input, reviews: [{ ...first, evidence: [{ start: 3, end: 26, exactText: "altered" }] }, second] }, now)).status).toBe("invalid");
  });

  it("rejects a rehashed embedded objective that differs from the current catalog", async () => {
    const data = await fixture();
    const forged = structuredClone(data.packet);
    forged.competency.objective = "Evaluate an unrelated scientific experiment.";
    forged.competencyHash = await courseContentHash(forged.competency);
    const { id: _id, contentHash: _contentHash, ...payload } = forged;
    forged.contentHash = await courseContentHash(payload);
    const reviews = [data.review("00000000-0000-4000-8000-000000000011", "educator-a"),
      data.review("00000000-0000-4000-8000-000000000012", "educator-b")]
      .map(review => ({ ...review, packetHash: forged.contentHash }));
    await expect(evaluateMappingReviews({ currentFramework: data.framework, currentDocuments: [data.document],
      packets: [forged], sourceLocks: data.sourceLocks, reviews, reviewers: data.reviewers,
      currentAssignments: [data.assignment] }, now)).rejects.toThrow("mapping_review_current_content_changed");
  });

  it("invalidates a changed current competency or original source even when packet hashes agree", async () => {
    const data = await fixture();
    const input = { currentFramework: data.framework, currentDocuments: [data.document],
      packets: [data.packet], sourceLocks: data.sourceLocks, reviews: [], reviewers: data.reviewers,
      currentAssignments: [data.assignment] };
    const framework = structuredClone(data.framework);
    framework.competencies.find(item => item.id === data.packet.competency.id)!.revision++;
    await expect(evaluateMappingReviews({ ...input, currentFramework: framework }, now))
      .rejects.toThrow("mapping_review_current_content_changed");
    const changed = structuredClone(data.document);
    changed.blocks[0].text = "This source now has different text.";
    await expect(evaluateMappingReviews({ ...input, currentDocuments: [changed] }, now))
      .rejects.toThrow("mapping_review_current_content_changed");
    await expect(evaluateMappingReviews({ ...input, currentDocuments: [] }, now))
      .rejects.toThrow("mapping_review_current_source_missing");
  });

  it("accepts the full shared credential reference length without changing its binding", async () => {
    const data = await fixture(), reference = "verified-" + "a".repeat(280);
    const reviews = [data.review("00000000-0000-4000-8000-000000000011", "educator-a"),
      data.review("00000000-0000-4000-8000-000000000012", "educator-b")]
      .map(review => ({ ...review, qualificationReference: reference }));
    const result = await evaluateMappingReviews({ currentFramework: data.framework, currentDocuments: [data.document],
      packets: [data.packet], sourceLocks: data.sourceLocks, reviews,
      reviewers: data.reviewers.map(reviewer => ({ ...reviewer, qualificationReference: reference })),
      currentAssignments: [data.assignment] }, now);
    expect(result.status).toBe("review_complete");
  });
});
