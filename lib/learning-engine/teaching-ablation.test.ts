import { describe, expect, it, vi } from "vitest";
import {
  assembleTeachingAblationCorpus, evaluateTeachingAblation, teachingAblationActions,
  teachingCaseHash, teachingCorpusHash, validateTeachingAblationCorpus,
  type TeachingAblationCorpus,
} from "./teaching-ablation";

type InputCase = Parameters<typeof assembleTeachingAblationCorpus>[0]["cases"][number];
const state = { confirmed: true, hasEvidence: true, supported: false, hasAssessment: true, priorSupport: 1 };

function engineeringCase(id: string, changes: Partial<InputCase> = {}): InputCase {
  return {
    id, provenanceId: `authored-${id}`, documentFamily: `book-${id}`,
    templateFamily: `template-${id}`, learnerFamily: `scenario-${id}`, split: "test",
    state, expectedAction: "hint", provenance: "authored_engineering_fixture",
    rights: "authored_original", containsStudentData: false, consentReceiptId: null,
    reviewerIds: [], sourceExcerpt: `Synthetic source evidence for ${id}.`, ...changes,
  };
}

async function corpus(cases: InputCase[]): Promise<TeachingAblationCorpus> {
  return assembleTeachingAblationCorpus({ createdAt: "2026-09-26T00:00:00Z", cases });
}

describe("offline teaching-action ablation", () => {
  it("compares the real ladder with fixed hint and source-unaware variants on identical held-out cases", async () => {
    const blocked = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network use is forbidden"));
    try {
      const input = await corpus([
        engineeringCase("hint"),
        engineeringCase("example", { state: { ...state, priorSupport: 2 }, expectedAction: "related_example" }),
        engineeringCase("missing-source", { state: { ...state, hasEvidence: false }, sourceExcerpt: null, expectedAction: "clarify" }),
        engineeringCase("unconfirmed", { state: { ...state, confirmed: false }, expectedAction: "clarify" }),
        engineeringCase("supported", { state: { ...state, supported: true }, expectedAction: "independent_attempt" }),
        engineeringCase("unassessed", { state: { ...state, hasAssessment: false }, expectedAction: "orient" }),
      ]);
      const report = await evaluateTeachingAblation(input);
      expect(report.heldOutCases).toBe(6);
      expect(report.comparison.current.correct).toBe(6);
      expect(report.comparison.fixed_hint.correct).toBe(5);
      expect(report.comparison.source_unaware.correct).toBe(5);
      expect(report.disagreements).toEqual({ currentVsFixedHint: 1, currentVsSourceUnaware: 1 });
      expect(report.comparison.source_unaware.evidenceGateViolations).toBe(1);
      expect(report.comparison.current.evidenceGateViolations).toBe(0);
      expect(report.comparison.current.confirmationGateViolations).toBe(0);
      expect(report.cases.find(item => item.caseIndex === 2)?.actions).toEqual({ current: "clarify", fixed_hint: "clarify", source_unaware: "hint" });
      expect(report.comparison.current.strata.fixedGate).toMatchObject({ labelAgreement: 4, count: 4 });
      expect(report.comparison.current.strata.discretionary).toMatchObject({ labelAgreement: 2, count: 2 });
      expect(report.cases.every(item => !Object.hasOwn(item, "id") && !Object.hasOwn(item, "contentHash"))).toBe(true);
      expect(report.evidence).toMatchObject({ reviewerQualificationsVerified: false, studentLearningGainsEstablished: false, studentRoutingChanged: false });
      expect(blocked).not.toHaveBeenCalled();
    } finally { blocked.mockRestore(); }
  });

  it("keeps confirmation and supported-answer constraints in both baselines", () => {
    expect(teachingAblationActions({ ...state, confirmed: false })).toEqual({ current: "clarify", fixed_hint: "clarify", source_unaware: "clarify" });
    expect(teachingAblationActions({ ...state, supported: true })).toEqual({ current: "independent_attempt", fixed_hint: "independent_attempt", source_unaware: "independent_attempt" });
  });

  it("rejects changed excerpts, changed case fields, and changed corpus membership", async () => {
    const original = await corpus([engineeringCase("a")]);
    const excerpt = structuredClone(original);
    excerpt.cases[0].sourceExcerpt = "Tampered passage";
    await expect(validateTeachingAblationCorpus(excerpt)).rejects.toThrow("source excerpt hash changed");
    const changedState = structuredClone(original);
    changedState.cases[0].state.priorSupport = 2;
    await expect(validateTeachingAblationCorpus(changedState)).rejects.toThrow("content hash changed");
    const membership = structuredClone(original);
    membership.cases.push({ ...membership.cases[0], id: "b", provenanceId: "authored-b" });
    const second = membership.cases[1];
    const { contentHash: unused, ...caseBody } = second; void unused;
    second.contentHash = await teachingCaseHash(caseBody);
    await expect(validateTeachingAblationCorpus(membership)).rejects.toThrow("corpus hash changed");
  });

  it("refuses excluded rights, missing consent, and invented reviewer coverage even if content is rehashed", async () => {
    await expect(corpus([engineeringCase("excluded", { rights: "excluded" })])).rejects.toThrow("excluded rights");
    await expect(corpus([engineeringCase("student", { containsStudentData: true })])).rejects.toThrow("student consent");
    await expect(corpus([engineeringCase("review", { provenance: "educator_labeled", rights: "licensed_for_evaluation", reviewerIds: ["one", "one"] })])).rejects.toThrow("two distinct reviewer IDs");
    await expect(corpus([engineeringCase("unbound", { provenance: "educator_labeled", rights: "licensed_for_evaluation", reviewerIds: ["one", "two"] })])).rejects.toThrow("content-bound evaluation rights evidence");
    await expect(corpus([engineeringCase("unsafe-label", { state: { ...state, confirmed: false } })])).rejects.toThrow("fixed policy constraint");
  });

  it("enforces source, template, and learner family separation across partitions", async () => {
    for (const field of ["documentFamily", "templateFamily", "learnerFamily"] as const) {
      const test = engineeringCase("test");
      const train = engineeringCase("train", { split: "train", [field]: test[field] });
      await expect(corpus([test, train])).rejects.toThrow("family crosses partitions");
    }
  });

  it("rejects equivalent source excerpts crossing splits even when family labels differ", async () => {
    const test = engineeringCase("test", { sourceExcerpt: "A measured  RESULT\nwas observed." });
    const train = engineeringCase("train", { split: "train", sourceExcerpt: "a measured result was observed." });
    await expect(corpus([test, train])).rejects.toThrow("source excerpt crosses partitions");
  });

  it("scores test only and discloses whether labels are merely authored fixtures", async () => {
    const test = engineeringCase("test");
    const train = engineeringCase("train", { split: "train", expectedAction: "related_example" });
    const input = await corpus([train, test]);
    const report = await evaluateTeachingAblation(input);
    expect(report.comparison.current).toMatchObject({ correct: 1, count: 1 });
    expect(report.provenanceCounts).toEqual({ authoredEngineering: 1, educatorLabeledUnverified: 0 });
    const { corpusHash: unused, ...body } = input; void unused;
    expect(await teachingCorpusHash(body)).toBe(input.corpusHash);
  });
});
