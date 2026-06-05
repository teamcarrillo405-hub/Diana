import { describe, expect, it } from "vitest";
import { OPEN_SOURCE_PROGRAMS, openSourceGapCoverage, openSourceProgram } from "./open-source-programs";

describe("open source program integration map", () => {
  it("covers the four downloaded programs", () => {
    expect(OPEN_SOURCE_PROGRAMS.map((program) => program.id).sort()).toEqual([
      "languagetool",
      "leantime",
      "nextcloud",
      "openjarvis",
    ]);
  });

  it("keeps copyleft projects behind a concept or service boundary", () => {
    for (const program of OPEN_SOURCE_PROGRAMS.filter((item) => item.license.startsWith("AGPL"))) {
      expect(program.integrationBoundary).toMatch(/Do not/);
      expect(program.integrationBoundary).toMatch(/Diana|bundle|copy/);
    }
  });

  it("maps each competitor gap to a Diana use area", () => {
    const coverage = openSourceGapCoverage();
    expect(coverage.voiceAndLocalControl.length).toBeGreaterThan(0);
    expect(coverage.adhdDyslexiaPlanning.length).toBeGreaterThan(0);
    expect(coverage.studentSourceVault.length).toBeGreaterThan(0);
    expect(coverage.writingMechanics.length).toBeGreaterThan(0);
    expect(openSourceProgram("languagetool").dianaUse.join(" ")).toContain("authorship");
  });
});
