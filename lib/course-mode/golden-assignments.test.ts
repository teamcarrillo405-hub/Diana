import { describe, expect, it } from "vitest";

import {
  ASSIGNMENT_CAPABILITIES,
  ASSIGNMENT_CAPABILITY_REGISTRY,
} from "@/lib/assignment-capabilities";
import { resolveAssignmentProfile } from "@/lib/assignment-profile";
import {
  GOLDEN_ASSIGNMENT_CATEGORIES,
  GOLDEN_ASSIGNMENTS,
  type GoldenAssignmentFixture,
} from "@/lib/course-mode/golden-assignments";

type FixtureScore = {
  id: string;
  subjectCorrect: boolean;
  capabilitiesCorrect: boolean;
  profileCorrect: boolean;
  actualSubject: string;
  actualCapabilities: readonly string[];
};

function scoreFixture(fixture: GoldenAssignmentFixture): FixtureScore {
  const actual = resolveAssignmentProfile(fixture.input);
  const capabilitiesCorrect =
    actual.capabilities.length === fixture.intendedCapabilities.length &&
    actual.capabilities.every(
      (capability, index) => capability === fixture.intendedCapabilities[index],
    );
  const subjectCorrect = actual.subjectDomain === fixture.expectedSubject;

  return {
    id: fixture.id,
    subjectCorrect,
    capabilitiesCorrect,
    profileCorrect: subjectCorrect && capabilitiesCorrect,
    actualSubject: actual.subjectDomain,
    actualCapabilities: actual.capabilities,
  };
}

function accuracy(scores: readonly FixtureScore[], key: keyof Pick<
  FixtureScore,
  "subjectCorrect" | "capabilitiesCorrect" | "profileCorrect"
>): number {
  return scores.filter((score) => score[key]).length / scores.length;
}

function failureReport(scores: readonly FixtureScore[]): string {
  const failures = scores.filter((score) => !score.profileCorrect);
  if (failures.length === 0) return "no failing fixtures";

  return failures.map((failure) => {
    const expected = GOLDEN_ASSIGNMENTS.find(
      (fixture) => fixture.id === failure.id,
    );
    return JSON.stringify({
      id: failure.id,
      expectedSubject: expected?.expectedSubject,
      actualSubject: failure.actualSubject,
      intendedCapabilities: expected?.intendedCapabilities,
      actualCapabilities: failure.actualCapabilities,
    });
  }).join("\n");
}

describe("golden assignment fixture matrix", () => {
  it("covers every requested high-school category with representative variants", () => {
    expect(GOLDEN_ASSIGNMENTS.length).toBeGreaterThanOrEqual(20);
    expect(new Set(GOLDEN_ASSIGNMENTS.map((fixture) => fixture.id)).size)
      .toBe(GOLDEN_ASSIGNMENTS.length);

    const coveredCategories = new Set(
      GOLDEN_ASSIGNMENTS.map((fixture) => fixture.category),
    );
    expect([...coveredCategories]).toEqual(
      expect.arrayContaining([...GOLDEN_ASSIGNMENT_CATEGORIES]),
    );

    const importedOrWorksheet = GOLDEN_ASSIGNMENTS.filter(
      (fixture) =>
        fixture.sourceFormat === "pdf" ||
        fixture.sourceFormat === "worksheet" ||
        fixture.sourceFormat === "pdf_worksheet",
    );
    expect(importedOrWorksheet.length).toBeGreaterThanOrEqual(5);
    expect(GOLDEN_ASSIGNMENTS.filter((fixture) => fixture.mixedCapability).length)
      .toBeGreaterThanOrEqual(3);
    expect(new Set(GOLDEN_ASSIGNMENTS.map((fixture) => fixture.sourceState)))
      .toEqual(new Set(["complete", "partial", "none"]));
    expect(new Set(GOLDEN_ASSIGNMENTS.map((fixture) => fixture.aiPolicy)))
      .toEqual(new Set(["green", "yellow", "red"]));
  });

  it("records valid intended capabilities and their AI-policy behavior", () => {
    for (const fixture of GOLDEN_ASSIGNMENTS) {
      expect(fixture.intendedCapabilities.length, fixture.id).toBeGreaterThan(0);
      expect(new Set(fixture.intendedCapabilities).size, fixture.id)
        .toBe(fixture.intendedCapabilities.length);

      for (const capability of fixture.intendedCapabilities) {
        expect(ASSIGNMENT_CAPABILITIES, fixture.id).toContain(capability);
        expect(
          ASSIGNMENT_CAPABILITY_REGISTRY[capability].aiPolicy[fixture.aiPolicy],
          `${fixture.id}:${capability}:${fixture.aiPolicy}`,
        ).toMatch(/^(available|read_only|hidden)$/u);
      }
    }
  });

  it("meets the 95 percent exact subject and profile-selection gate", () => {
    const scores = GOLDEN_ASSIGNMENTS.map(scoreFixture);
    const failures = failureReport(scores);

    expect(
      accuracy(scores, "subjectCorrect"),
      `Subject accuracy below 95%.\n${failures}`,
    ).toBeGreaterThanOrEqual(0.95);
    expect(
      accuracy(scores, "capabilitiesCorrect"),
      `Capability accuracy below 95%.\n${failures}`,
    ).toBeGreaterThanOrEqual(0.95);
    expect(
      accuracy(scores, "profileCorrect"),
      `Exact profile accuracy below 95%.\n${failures}`,
    ).toBeGreaterThanOrEqual(0.95);
  });
});
