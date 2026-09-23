import { describe, expect, it } from "vitest";

import {
  ASSIGNMENT_CAPABILITY_REGISTRY,
} from "@/lib/assignment-capabilities";
import {
  buildAssignmentArtifact,
  parseStoredAssignmentArtifactBlocks,
} from "@/lib/assignment-artifact";
import {
  SUBJECT_DOMAINS,
  resolveAssignmentProfile,
} from "@/lib/assignment-profile";
import { buildSourcePacket } from "@/lib/assignment-sources";
import {
  ACCESSIBILITY_EVALUATION_MODES,
  SUBJECT_EVALUATION_MATRIX,
} from "@/lib/course-mode/subject-evaluation-matrix";
import { subjectPackForDomain } from "@/lib/course-mode/subject-packs";

describe("universal high-school subject evaluation matrix", () => {
  it("provides 20 representative scenarios for every subject domain", () => {
    expect(SUBJECT_EVALUATION_MATRIX).toHaveLength(
      SUBJECT_DOMAINS.length * 20,
    );
    expect(new Set(SUBJECT_EVALUATION_MATRIX.map((scenario) => scenario.id)).size)
      .toBe(SUBJECT_EVALUATION_MATRIX.length);

    for (const domain of SUBJECT_DOMAINS) {
      const scenarios = SUBJECT_EVALUATION_MATRIX.filter(
        (scenario) => scenario.subjectDomain === domain,
      );
      expect(scenarios, domain).toHaveLength(20);
      expect(
        scenarios.filter((scenario) =>
          ["pdf", "worksheet", "pdf_worksheet"].includes(
            scenario.sourceFormat,
          )
        ).length,
        domain,
      ).toBeGreaterThanOrEqual(5);
      expect(
        scenarios.filter((scenario) => scenario.mixedCapability).length,
        domain,
      ).toBeGreaterThanOrEqual(3);
      expect(new Set(scenarios.map((scenario) => scenario.aiPolicy)), domain)
        .toEqual(new Set(["green", "yellow", "red"]));
      expect(new Set(scenarios.map((scenario) => scenario.sourceState)), domain)
        .toEqual(new Set(["complete", "partial", "none"]));
      expect(
        new Set(scenarios.map((scenario) => scenario.accessibilityMode)),
        domain,
      ).toEqual(new Set(ACCESSIBILITY_EVALUATION_MODES));
      expect(scenarios.some((scenario) => scenario.adversarialPrompt), domain)
        .toBe(true);
      expect(
        scenarios.some((scenario) => scenario.unsafeSourceInstruction),
        domain,
      ).toBe(true);
    }
  });

  it("meets the 95 percent subject and capability selection gate", () => {
    const results = SUBJECT_EVALUATION_MATRIX.map((scenario) => {
      const profile = resolveAssignmentProfile(scenario.input);
      return {
        id: scenario.id,
        subject: profile.subjectDomain === scenario.subjectDomain,
        capabilities:
          profile.capabilities.length ===
            scenario.expectedCapabilities.length &&
          profile.capabilities.every(
            (capability, index) =>
              capability === scenario.expectedCapabilities[index],
          ),
      };
    });
    const subjectAccuracy =
      results.filter((result) => result.subject).length / results.length;
    const capabilityAccuracy =
      results.filter((result) => result.capabilities).length / results.length;
    const failures = results.filter(
      (result) => !result.subject || !result.capabilities,
    );

    expect(
      subjectAccuracy,
      JSON.stringify(failures.slice(0, 20), null, 2),
    ).toBeGreaterThanOrEqual(0.95);
    expect(
      capabilityAccuracy,
      JSON.stringify(failures.slice(0, 20), null, 2),
    ).toBeGreaterThanOrEqual(0.95);
  });

  it("keeps native tools usable under every policy and exportable", () => {
    for (const scenario of SUBJECT_EVALUATION_MATRIX) {
      const profile = resolveAssignmentProfile(scenario.input);
      const pack = subjectPackForDomain(scenario.subjectDomain);
      expect(pack.id, scenario.id).toBe(scenario.subjectPackId);

      const blocks = profile.capabilities.map((capability, position) => {
        const definition = ASSIGNMENT_CAPABILITY_REGISTRY[capability];
        expect(
          definition.aiPolicy[scenario.aiPolicy],
          `${scenario.id}:${capability}`,
        ).toMatch(/^(available|read_only|hidden)$/u);
        return {
          key: `${scenario.id}-${capability}`,
          type: definition.artifactBlockType,
          capability,
          label: definition.label,
          position,
          content: { studentEvidence: `Student evidence ${position + 1}` },
          plainText: `Student evidence ${position + 1}`,
          sourceAnchors: [],
        };
      });
      const artifact = buildAssignmentArtifact({
        mode: profile.legacyMode,
        artifactType: profile.artifactType,
        title: scenario.input.title,
        blocks,
      });
      expect(artifact.blocks, scenario.id).toHaveLength(blocks.length);
      expect(artifact.plainText, scenario.id).toContain("Student evidence");

      const reopened = parseStoredAssignmentArtifactBlocks(
        artifact.blocks.map((block) => ({
          id: block.id,
          block_key: block.key,
          block_type: block.type,
          capability: block.capability,
          label: block.label,
          position: block.position,
          content: block.content,
          plain_text: block.plainText,
          source_anchors: block.sourceAnchors,
        })),
      );
      expect(reopened.map((block) => block.capability), scenario.id)
        .toEqual(profile.capabilities);
    }
  });

  it("builds grounded source packets for every imported-source scenario", () => {
    for (const scenario of SUBJECT_EVALUATION_MATRIX) {
      const sources = scenario.sourceState === "none"
        ? []
        : [{
            source_type: scenario.sourceFormat === "inline"
              ? "instructions"
              : "attachment",
            title: `${scenario.id} source`,
            extracted_text: scenario.input.sourceText ?? "",
            source_location: scenario.sourceFormat.includes("pdf")
              ? "page 1"
              : "item 1",
          }];
      const packet = buildSourcePacket(
        { description: scenario.input.description, rubric_text: "Teacher rubric" },
        sources,
      );
      expect(packet.directions, scenario.id).toContain(
        "Representative high-school evaluation case",
      );
      expect(packet.rubric, scenario.id).toBe("Teacher rubric");
      if (scenario.sourceState === "none") {
        expect(packet.citations, scenario.id).toHaveLength(0);
      } else {
        expect(packet.citations, scenario.id).toHaveLength(1);
        expect(
          `${packet.directions}\n${packet.materialText}`,
          scenario.id,
        ).toContain("evaluation case");
      }
    }
  });

  it("requires the complete workflow evidence contract for every scenario", () => {
    for (const scenario of SUBJECT_EVALUATION_MATRIX) {
      expect(scenario.saveCloseReopen, scenario.id).toBe(true);
      expect(scenario.canonicalExport, scenario.id).toBe(true);
      expect(scenario.lmsDelivery, scenario.id)
        .toBe("supported_or_honest_handoff");
      expect(scenario.inspectAuthorshipAndProvenance, scenario.id).toBe(true);
      expect(scenario.teacherRubricAndStandardsEvidence, scenario.id).toBe(true);
    }
  });
});
