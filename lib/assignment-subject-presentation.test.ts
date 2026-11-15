import { describe, expect, it } from "vitest";

import { resolveAssignmentProfile, SUBJECT_DOMAINS } from "./assignment-profile";
import { subjectPresentationFor } from "./assignment-subject-presentation";

const TITLES: Record<(typeof SUBJECT_DOMAINS)[number], string> = {
  mathematics: "Algebra equations",
  english_language_arts: "English rhetorical analysis essay",
  science: "Chemistry lab investigation",
  social_studies: "History DBQ response",
  world_language: "Spanish oral response",
  computer_science: "Python debugging task",
  visual_arts: "Drawing and artist statement",
  music: "Music theory composition",
  theatre: "Theatre monologue",
  dance: "Dance choreography",
  physical_education: "PE fitness assessment",
  health: "Health education reflection",
  accounting: "Accounting trial balance",
  economics: "Economics supply and demand analysis",
  geography: "Geography map analysis",
  engineering: "Engineering prototype design",
  trade_cte: "CTE welding procedure",
  cad: "CAD dimensioned sketch",
  advanced_technical_labs: "Advanced technical laboratory",
  interdisciplinary: "Interdisciplinary capstone project",
  general: "Friday task",
};

describe("subject workspace presentation", () => {
  it("gives every resolved subject a shared work-unit contract", () => {
    for (const domain of SUBJECT_DOMAINS) {
      const profile = resolveAssignmentProfile({ kind: "other", title: TITLES[domain] });
      const presentation = subjectPresentationFor(profile);
      expect(presentation.unitNoun, domain).toBeTruthy();
      expect(presentation.unitNounPlural, domain).toBeTruthy();
      expect(presentation.units.length, domain).toBeGreaterThan(0);
      if (presentation.primaryCapability) {
        expect(profile.capabilities, domain).toContain(presentation.primaryCapability);
        expect(presentation.optionalCapabilities, domain).not.toContain(presentation.primaryCapability);
      }
    }
  });

  it("opens the most useful available tool for core multimodal subjects", () => {
    const expectations = {
      mathematics: "equation_editor",
      science: "data_lab",
      world_language: "audio_review",
      computer_science: "code_runner",
      visual_arts: "drawing_canvas",
    } as const;

    for (const [domain, capability] of Object.entries(expectations)) {
      const typedDomain = domain as keyof typeof expectations;
      const profile = resolveAssignmentProfile({ kind: "other", title: TITLES[typedDomain] });
      expect(subjectPresentationFor(profile).primaryCapability, domain).toBe(capability);
    }
  });

  it("turns clearly numbered imported worksheet text into ordered problem units", () => {
    const profile = resolveAssignmentProfile({ kind: "problem_set", title: "Algebra equations" });
    const presentation = subjectPresentationFor(profile, {
      directions: "1. Solve 2x = 8\n2. Solve 3x + 1 = 10",
    });

    expect(presentation.units).toEqual([
      expect.objectContaining({ label: "Problem 1", type: "problem", prompt: "Solve 2x = 8" }),
      expect.objectContaining({ label: "Problem 2", type: "problem", prompt: "Solve 3x + 1 = 10" }),
    ]);
  });
});
