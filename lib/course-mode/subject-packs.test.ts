import { describe, expect, it } from "vitest";

import {
  ASSIGNMENT_CAPABILITIES,
  ASSIGNMENT_CAPABILITY_REGISTRY,
} from "@/lib/assignment-capabilities";
import { SUBJECT_DOMAINS } from "@/lib/assignment-profile";
import {
  listSubjectPacks,
  normalizeSubjectPackKey,
  requireNativeSubjectPack,
  resolveSubjectPack,
  SUBJECT_DOMAIN_PACK_IDS,
  SUBJECT_PACK_IDS,
  SUBJECT_PACK_REGISTRY,
  subjectPackForDomain,
  type SubjectPackId,
} from "./subject-packs";

const NAMED_DOMAIN_CASES: ReadonlyArray<readonly [string, SubjectPackId]> = [
  ["math", "mathematics"],
  ["science", "science"],
  ["English/writing", "english_writing"],
  ["history/social studies", "history_social_studies"],
  ["world languages", "world_languages"],
  ["computer science", "computer_science"],
  ["visual arts", "visual_arts"],
  ["general projects", "general_projects"],
  ["physical education", "physical_education"],
  ["health education", "health"],
  ["accounting", "accounting"],
  ["economics", "economics"],
  ["geography/map work", "geography_map_work"],
  ["engineering", "engineering"],
  ["trade/CTE", "trade_cte"],
  ["music", "music"],
  ["theatre", "theatre"],
  ["dance", "dance"],
  ["CAD", "cad"],
  ["advanced technical labs", "advanced_technical_labs"],
];

describe("Course Mode subject-pack registry", () => {
  it("defines a complete native contract for every pack", () => {
    expect(listSubjectPacks().map((pack) => pack.id)).toEqual(SUBJECT_PACK_IDS);

    for (const pack of listSubjectPacks()) {
      expect(pack.native, pack.id).toBe(true);
      expect(pack.allowGenericFallback, pack.id).toBe(false);
      expect(pack.methodology.length, pack.id).toBeGreaterThan(0);
      expect(pack.requiredCapabilities.length, pack.id).toBeGreaterThan(0);
      expect(pack.artifactExpectations.length, pack.id).toBeGreaterThan(0);
      expect(pack.reviewRules.length, pack.id).toBeGreaterThan(0);
      expect(pack.standardsFrameworkHints.length, pack.id).toBeGreaterThan(0);
      expect(pack.safetyDignityConstraints.length, pack.id).toBeGreaterThan(0);

      for (const capability of pack.requiredCapabilities) {
        expect(ASSIGNMENT_CAPABILITIES, `${pack.id}:${capability}`).toContain(capability);
        expect(ASSIGNMENT_CAPABILITY_REGISTRY[capability], `${pack.id}:${capability}`).toBeDefined();
      }
      for (const artifact of pack.artifactExpectations) {
        expect(artifact.requiredEvidence.length, `${pack.id}:${artifact.artifactType}`).toBeGreaterThan(0);
      }
      for (const rule of pack.reviewRules) {
        expect(rule.id, pack.id).not.toBe("");
        expect(rule.requirement, pack.id).not.toBe("");
      }
      for (const hint of pack.standardsFrameworkHints) {
        expect(hint.framework, pack.id).not.toBe("");
        expect(hint.selectionHint, pack.id).not.toBe("");
      }
    }
  });

  it("maps every canonical assignment subject domain to a native pack", () => {
    expect(Object.keys(SUBJECT_DOMAIN_PACK_IDS).sort()).toEqual([...SUBJECT_DOMAINS].sort());

    for (const domain of SUBJECT_DOMAINS) {
      const pack = subjectPackForDomain(domain);
      expect(pack, domain).toBe(SUBJECT_PACK_REGISTRY[SUBJECT_DOMAIN_PACK_IDS[domain]]);
      expect(pack.native, domain).toBe(true);
      expect(pack.allowGenericFallback, domain).toBe(false);
      expect(resolveSubjectPack(domain), domain).toBe(pack);
    }
  });

  it.each(NAMED_DOMAIN_CASES)(
    "resolves the named domain %s to its native pack",
    (name, expectedPackId) => {
      const pack = resolveSubjectPack(name);
      expect(pack?.id).toBe(expectedPackId);
      expect(pack?.native).toBe(true);
      expect(pack?.allowGenericFallback).toBe(false);
    },
  );

  it("normalizes punctuation, separators, spacing, and case deterministically", () => {
    expect(normalizeSubjectPackKey("  Geography / MAP-work  ")).toBe("geography_map_work");
    expect(resolveSubjectPack("  Geography / MAP-work  ")?.id).toBe("geography_map_work");
    expect(resolveSubjectPack("Career & Technical Education")?.id).toBe("trade_cte");
    expect(resolveSubjectPack("COMPUTER-AIDED DESIGN")?.id).toBe("cad");
  });

  it("never sends an unknown named domain through the general-project pack", () => {
    expect(resolveSubjectPack("marine upholstery")).toBeNull();
    expect(() => requireNativeSubjectPack("marine upholstery")).toThrow(
      'No native subject pack is registered for "marine upholstery".',
    );

    expect(requireNativeSubjectPack("general project").id).toBe("general_projects");
    expect(requireNativeSubjectPack("advanced technical lab").id).toBe(
      "advanced_technical_labs",
    );
  });
});
