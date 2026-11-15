import { describe, expect, it } from "vitest";

import { resolveAssignmentProfile } from "@/lib/assignment-profile";
import { buildSourcePacket } from "@/lib/assignment-sources";
import {
  buildAssignmentUnderstanding,
  formatMethodologyForTutor,
  inferTargetAcademicLevel,
  methodologyForProfile,
  resolveHomeworkHelpContract,
} from "./methodology";

describe("universal assignment methodology", () => {
  it("keeps health check-in changes in presentation support at the lowest content level", () => {
    const contract = resolveHomeworkHelpContract({
      supportIntensity: "guided",
      readiness: { body: "low", focus: "scattered" },
      attempts: { incorrectAttempts: 0, stuckRequests: 0 },
    });

    expect(contract.helpLevel).toBe(30);
    expect(contract.presentationSupports).toEqual(expect.arrayContaining([
      "keep wording short and reduce visible choices",
      "show one step at a time",
    ]));
    expect(contract.studentOwnedBoundary).toContain("student makes the next move");
  });

  it("raises help from 30 to 75 percent only through repeated attempt signals", () => {
    expect(resolveHomeworkHelpContract({ attempts: { incorrectAttempts: 1 } }).helpLevel).toBe(45);
    expect(resolveHomeworkHelpContract({ attempts: { incorrectAttempts: 2 } }).helpLevel).toBe(60);
    expect(resolveHomeworkHelpContract({ attempts: { incorrectAttempts: 3 } }).helpLevel).toBe(75);
    expect(resolveHomeworkHelpContract({ attempts: { stuckRequests: 3 } }).stopBeforeAnswer).toBe(false);
  });

  it("provides subject-specific adapters for specialized high-school classes", () => {
    const cases = [
      ["Accounting journal entries", "accounting_ledger", "T-account"],
      ["Geography choropleth map", "map_workspace", "map annotation"],
      ["CAD dimensioned sketch", "cad_workspace", "dimension checklist"],
      ["Music theory composition", "music_notation", "measure map"],
      ["Physical education movement log", "performance_log", "safe progression ladder"],
    ] as const;

    for (const [title, nativeTool, visualSupport] of cases) {
      const profile = resolveAssignmentProfile({ kind: "other", title });
      const methodology = methodologyForProfile(profile);
      expect(profile.capabilities).toContain(nativeTool);
      expect(methodology.visualSupports).toContain(visualSupport);
      expect(methodology.helpByLevel[75]).toContain("student-owned");
    }
  });

  it("feeds native subject-pack evidence and guardrails into tutor context", () => {
    const profile = resolveAssignmentProfile({
      kind: "other",
      className: "Welding CTE",
      title: "Welding shop procedure and joint-quality evidence",
      description: "Use the approved procedure, record measurements, and submit reflection evidence.",
    });
    const sourcePacket = buildSourcePacket(
      { description: "Record the teacher-approved procedure reference and evidence.", rubric_text: "Include PPE, measurements, reflection, and teacher sign-off." },
      [{ source_type: "upload", title: "procedure.pdf", extracted_text: "Approved setup checks and PPE are on page 2.", source_location: "page 2" }],
    );

    const understanding = buildAssignmentUnderstanding({
      profile,
      sourcePacket,
      importStatuses: ["imported"],
    });
    const context = formatMethodologyForTutor(understanding);

    expect(understanding.methodology.subjectPackId).toBe("trade_cte");
    expect(understanding.methodology.evidenceExpectations[0]?.requiredEvidence).toContain("Approved procedure reference");
    expect(understanding.methodology.reviewRules.map((rule) => rule.authority)).toContain("verified_teacher");
    expect(understanding.methodology.standardsFrameworkHints[0]?.selectionHint).toContain("state or district program");
    expect(understanding.methodology.safetyDignityConstraints.join(" ")).toContain("Never generate machine-operation");
    expect(context).toContain("Native subject pack: Trade and Career Technical Education (trade_cte)");
    expect(context).toContain("Evidence required: trade_evidence");
    expect(context).toContain("Review authority: deterministic");
    expect(context).toContain("Safety and dignity:");
  });
  it("summarizes uploaded assignment understanding and asks for confirmation when extraction is partial", () => {
    const profile = resolveAssignmentProfile({
      kind: "other",
      title: "Chemistry worksheet",
      description: "Answer questions 1-3 from the uploaded PDF.",
    });
    const sourcePacket = buildSourcePacket(
      { description: "Answer questions 1-3.", rubric_text: "Show units." },
      [{ source_type: "upload", title: "worksheet.pdf", extracted_text: "1. Balance H2 + O2.\n2. Find molar mass.", source_location: "page 1" }],
    );

    const understanding = buildAssignmentUnderstanding({
      profile,
      sourcePacket,
      importStatuses: ["partial"],
      attempts: { lowConfidenceExtraction: true },
    });

    expect(understanding.sourceState).toBe("source_partial");
    expect(understanding.needsStudentConfirmation).toBe(true);
    expect(formatMethodologyForTutor(understanding)).toContain("confirm the queue");
  });

  it("bridges a younger learner into advanced college material without lowering the assignment rigor", () => {
    const profile = resolveAssignmentProfile({
      kind: "other",
      className: "Biometrics 410",
      title: "Upper-division biometric classifier evaluation",
      description: "Compare false acceptance and false rejection rates using a receiver operating characteristic curve.",
    });
    const sourcePacket = buildSourcePacket(
      { description: "Evaluate the classifier and defend the selected operating threshold.", rubric_text: "Use the supplied data and explain the tradeoff." },
      [{ source_type: "upload", title: "biometrics-lab.pdf", extracted_text: "Calculate FAR and FRR for each threshold, then plot the ROC curve.", source_location: "page 4" }],
    );

    const understanding = buildAssignmentUnderstanding({
      profile,
      sourcePacket,
      importStatuses: ["imported"],
      learnerContext: {
        schoolYear: 7,
        tutorComplexity: "balanced",
        targetAcademicLevel: inferTargetAcademicLevel("Biometrics 410 upper-division laboratory"),
      },
    });
    const context = formatMethodologyForTutor(understanding);

    expect(understanding.learnerContext.targetAcademicLevel).toBe("college_advanced");
    expect(understanding.learnerContext.prerequisiteBridgeRequired).toBe(true);
    expect(context).toContain("Learner grade: 7");
    expect(context).toContain("preserve the assignment's rigor");
    expect(context).toContain("teach that bridge with a concrete example");
  });
});
