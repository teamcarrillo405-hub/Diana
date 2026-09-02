import { describe, expect, it } from "vitest";

import { ASSIGNMENT_CAPABILITY_REGISTRY, ASSIGNMENT_INPUT_CHANNELS } from "./assignment-capabilities";
import { SUBJECT_DOMAINS } from "./assignment-profile";
import { auditUniversalSubjectCoverage } from "./assignment-universal-coverage";

describe("universal subject workspace coverage", () => {
  it("maps every supported domain to a usable work format and all five input channels", () => {
    const coverage = auditUniversalSubjectCoverage();
    expect(coverage.map((row) => row.domain)).toEqual([...SUBJECT_DOMAINS]);
    expect(coverage).toHaveLength(21);
    for (const row of coverage) {
      expect(row.profile.subjectDomain).toBe(row.domain);
      expect(row.unitCount, row.domain).toBeGreaterThan(0);
      expect(row.inputChannels, row.domain).toEqual(Object.keys(ASSIGNMENT_INPUT_CHANNELS));
      expect(row.ready, row.domain).toBe(true);
    }
  });

  it("documents limitations for every specialist capability instead of overstating it", () => {
    for (const capability of Object.values(ASSIGNMENT_CAPABILITY_REGISTRY)) {
      expect(capability.limitations.length, capability.id).toBeGreaterThan(0);
      expect(["ready", "limited"]).toContain(capability.implementation);
    }
  });
});
