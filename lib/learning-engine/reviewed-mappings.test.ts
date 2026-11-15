import { describe, expect, it } from "vitest";
import { structureDocument } from "./curriculum";
import { loadCourseCatalog } from "./course-catalog";
import { courseContentHash } from "./course-framework";
import { suggestSourceCompetencies } from "./competency-mapping";
import { buildMappingReviewPacket, type MappingReviewJudgment } from "./competency-mapping-review";
import { compareReviewedMappingRanking, resolvePublishedSourceMappings, type PublishedMappingInput, type SourceMappingPublication } from "./reviewed-mappings";
import { PRECALCULUS_BOOK, PUBLIC_TEXTBOOK_SCOPE } from "./textbook-catalog";

const now = Date.parse("2026-09-26T12:00:00.000Z"), issuedAt = "2026-09-25T12:00:00.000Z", expiresAt = "2026-10-25T12:00:00.000Z";
async function fixture(expiry: Partial<Record<"assignment" | "credential" | "publication", string>> = {}) {
  // Synthetic contract evidence only. These people, approvals and PDF checks are not real.
  const assetHash = "a".repeat(64);
  const document = await structureDocument({ documentId: `${PRECALCULUS_BOOK.id}-chapter-1`, ...PUBLIC_TEXTBOOK_SCOPE,
    title: "Functions", edition: `${PRECALCULUS_BOOK.edition}, chapter 1`, subject: "math",
    instructionRights: "licensed", sourceAssetHash: assetHash }, [{ page: 1, pageLabel: "1", interpretation: "original",
    text: "1. Solve a linear equation using inverse operations. Check the solution to the equation." }]);
  const framework = (await loadCourseCatalog()).framework;
  const suggestion = (await suggestSourceCompetencies(framework, document.version, document.blocks, document.pages))
    .suggestions.find(item => item.skillId === "math.linear_equations")!;
  const assignment = { id: "assignment", scope: "public_textbook_competency_mapping", sourceVersionId: document.version.id,
    sourceContentHash: document.version.contentHash, sourceAssetHash: assetHash, issuedBy: "operator", issuedAt, expiresAt: expiry.assignment ?? expiresAt,
    revokedAt: null, reviewerIds: ["rater-a", "rater-b", "rater-c"] };
  const packet = await buildMappingReviewPacket({ framework, document, suggestion, chapter: 1, assetHash, assignment, blindSecret: "s".repeat(64) }, now);
  const reviewers = assignment.reviewerIds.map(id => ({ id, subjects: ["math"], qualificationReference: `credential-${id}`,
    verifiedBy: "operator", verifiedAt: issuedAt, expiresAt: expiry.credential ?? expiresAt, revokedAt: null }));
  const reviews: MappingReviewJudgment[] = reviewers.slice(0, 2).map((person, index) => ({
    id: `00000000-0000-4000-8000-00000000000${index + 1}`, packetId: packet.id, packetHash: packet.contentHash,
    reviewerId: person.id, qualificationReference: person.qualificationReference, role: "rater", reviewedAt: "2026-09-26T10:00:00.000Z",
    conflictOfInterest: false, resolves: [], originalPageChecked: true, objectiveChecked: true, judgment: "supported",
    rationale: "This synthetic source exercise explicitly covers linear equation solving.",
    evidence: [{ start: 3, end: 26, exactText: packet.anchor.exactText.slice(3, 26) }] }));
  const publication: SourceMappingPublication = { id: "publication", packetId: packet.id, packetHash: packet.contentHash,
    competencyId: packet.competency.id, competencyHash: packet.competencyHash,
    sourceVersionId: document.version.id, sourceContentHash: document.version.contentHash, sourceAssetHash: assetHash,
    anchor: packet.anchor, assignmentId: assignment.id, assignmentHash: packet.assignmentHash,
    reviews: await Promise.all(reviews.map(async review => ({ id: review.id, hash: await courseContentHash(review) }))),
    status: "published", issuedBy: "operator", issuedAt, publishedAt: "2026-09-26T11:00:00.000Z", expiresAt: expiry.publication ?? expiresAt, revokedAt: null };
  const input: PublishedMappingInput = { packets: [packet], reviews, reviewers, currentAssignments: [assignment], currentFramework: framework,
    currentDocuments: [document], sourceLocks: [{ chapter: 1, assetHash, versionId: document.version.id, contentHash: document.version.contentHash }],
    trustedPublicationState: { readAt: new Date(now).toISOString(), validUntil: new Date(now + 60_000).toISOString(),
      issuerIds: ["operator"], publications: [publication] } };
  return { input, publication, reviews, framework, packet, document };
}

describe("operator-published source mapping resolution", () => {
  it.each(["assignment", "credential", "publication"] as const)("bounds validity by used %s expiry", async kind => {
    const deadline = new Date(now + 30_000).toISOString();
    const { input } = await fixture({ [kind]: deadline });
    expect((await resolvePublishedSourceMappings(input, now)).validUntil).toBe(deadline);
  });
  it("keeps the state deadline when it is earlier than evidence expiry", async () => {
    const { input } = await fixture();
    expect((await resolvePublishedSourceMappings(input, now)).validUntil).toBe(input.trustedPublicationState.validUntil);
  });
  it("requires publication independently of completed supported review", async () => {
    const { input } = await fixture();
    expect((await resolvePublishedSourceMappings(input, now)).mappings).toHaveLength(1);
    input.trustedPublicationState.publications = [];
    expect((await resolvePublishedSourceMappings(input, now)).mappings).toEqual([]);
  });
  it("rejects changed full review under the same ID, even if support stays the same", async () => {
    const { input, reviews } = await fixture();
    reviews[0].rationale += " A revised explanation changes the reviewed record.";
    await expect(resolvePublishedSourceMappings(input, now)).rejects.toThrow("mapping_publication_review_changed");
  });
  it("requires the entire published source anchor and original assignment binding", async () => {
    const first = await fixture();
    first.publication.anchor = { ...first.packet.anchor, location: { ...first.packet.anchor.location, pageLabel: "changed" } };
    await expect(resolvePublishedSourceMappings(first.input, now)).rejects.toThrow("mapping_publication_binding_changed");
    const second = await fixture();
    second.publication.assignmentHash = "f".repeat(64);
    await expect(resolvePublishedSourceMappings(second.input, now)).rejects.toThrow("mapping_publication_binding_changed");
  });
  it("rejects a changed current competency and changed current source", async () => {
    const first = await fixture();
    first.framework.competencies.find(item => item.id === first.packet.competency.id)!.objective += " Changed.";
    await expect(resolvePublishedSourceMappings(first.input, now)).rejects.toThrow("mapping_review_current_content_changed");
    const second = await fixture();
    second.document.blocks[0].text += " Changed.";
    await expect(resolvePublishedSourceMappings(second.input, now)).rejects.toThrow("mapping_review_current_content_changed");
  });
  it("rejects conflicts, absent evidence, stale snapshots and untrusted issuers", async () => {
    const { input, publication } = await fixture();
    input.trustedPublicationState.publications.push({ ...publication, id: "conflict", status: "withdrawn" });
    await expect(resolvePublishedSourceMappings(input, now)).rejects.toThrow("mapping_publication_conflict");
    input.trustedPublicationState.publications = [publication];
    input.trustedPublicationState.issuerIds = [];
    await expect(resolvePublishedSourceMappings(input, now)).rejects.toThrow("mapping_publication_binding_changed");
    input.trustedPublicationState.issuerIds = ["operator"];
    await expect(resolvePublishedSourceMappings(input, now + 60_000)).rejects.toThrow("mapping_publication_state_unavailable");
    input.reviews = [];
    await expect(resolvePublishedSourceMappings(input, now)).rejects.toThrow("mapping_publication_binding_changed");
  });
  it.each(["withdrawn", "suspended", "expired", "revoked"])("disables %s publication immediately", async status => {
    const { input, publication } = await fixture();
    if (status === "expired") publication.expiresAt = new Date(now).toISOString();
    else if (status === "revoked") publication.revokedAt = new Date(now).toISOString();
    else publication.status = status as "withdrawn" | "suspended";
    expect((await resolvePublishedSourceMappings(input, now)).mappings).toHaveLength(0);
  });
  it("requires a fully bound independent adjudicator when original raters disagree", async () => {
    const { input, reviews, publication } = await fixture();
    reviews[1].judgment = "unsupported";
    reviews.push({ ...reviews[0], id: "00000000-0000-4000-8000-000000000003", reviewerId: "rater-c",
      qualificationReference: "credential-rater-c", role: "adjudicator", resolves: reviews.map(item => item.id),
      reviewedAt: "2026-09-26T10:30:00.000Z" });
    publication.reviews = await Promise.all(reviews.map(async review => ({ id: review.id, hash: await courseContentHash(review) })));
    expect((await resolvePublishedSourceMappings(input, now)).mappings[0].reviewIds).toHaveLength(3);
    reviews[2].resolves = [reviews[0].id];
    await expect(resolvePublishedSourceMappings(input, now)).rejects.toThrow("mapping_publication_reviews_invalid");
  });
});

describe("explicit reviewed mapping comparison", () => {
  it("breaks only equal scores, preserving objects, candidate count and anchors", async () => {
    const { input, packet } = await fixture();
    const unmatched = { ...packet.anchor, blockId: "b".repeat(64) };
    const candidates = [{ name: "higher", score: 5, anchor: { ...unmatched, blockId: "c".repeat(64) } },
      { name: "tie", score: 3, anchor: unmatched }, { name: "reviewed", score: 3, anchor: packet.anchor }];
    const result = await compareReviewedMappingRanking({ ...input, candidates, selectedCompetencyId: packet.competency.id, includeDeclaredPrerequisites: false }, now);
    expect(result.ranked).toEqual([candidates[0], candidates[2], candidates[1]]);
    expect(result.ranked[1]).toBe(candidates[2]);
    expect(result.provenance[1]).toMatchObject({ baselineRank: 3, reviewedRank: 2 });
    expect(result.answerabilityEstablished).toBe(false);
    expect(result.masteryEstablished).toBe(false);
  });
  it("does not match a shortened anchor or infer a selected competency", async () => {
    const { input, packet } = await fixture();
    const candidates = [{ score: 1, anchor: { ...packet.anchor, exactText: packet.anchor.exactText.slice(1),
      location: { ...packet.anchor.location, startOffset: packet.anchor.location.startOffset + 1 } } }];
    const result = await compareReviewedMappingRanking({ ...input, candidates, selectedCompetencyId: packet.competency.id, includeDeclaredPrerequisites: false }, now);
    expect(result.provenance[0].publications).toEqual([]);
    await expect(compareReviewedMappingRanking({ ...input, candidates, selectedCompetencyId: "", includeDeclaredPrerequisites: false }, now)).rejects.toThrow("mapping_selection_required");
  });
  it("limits prerequisite support to declared graph relationships and explicit opt in", async () => {
    const { input, framework, packet } = await fixture();
    const successor = framework.competencies.find(item => item.id !== packet.competency.id && item.prerequisites.includes(packet.competency.id))!;
    expect(successor).toBeDefined();
    const args = { ...input, candidates: [{ score: 1, anchor: packet.anchor }], selectedCompetencyId: successor.id };
    expect((await compareReviewedMappingRanking({ ...args, includeDeclaredPrerequisites: false }, now)).provenance[0].publications).toEqual([]);
    expect((await compareReviewedMappingRanking({ ...args, includeDeclaredPrerequisites: true }, now)).provenance[0].publications[0].relationship).toBe("prerequisite");
  });
});
