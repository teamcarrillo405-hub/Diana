import { describe, expect, it } from "vitest";

import type { AssignmentHomeworkKernel } from "./assignment-help/server-understanding";
import {
  AssignmentSubmissionDataError,
  formatCanonicalSpecialistContextsForPrompt,
  loadAssignmentSubmissionBundle,
  loadCanonicalSpecialistContextsForAssignment,
  submissionSpecialistContextFromKernel,
} from "./assignment-submission-server";
import type { AssignmentWorkProfile } from "./assignment-profile";
import { utf8ByteLength } from "./specialist-artifacts/bounds";
import {
  buildCanonicalRenderDocument,
  specialistArtifactContextsForConsumer,
  toCanonicalRenderBlock,
} from "./specialist-artifacts/render-blocks";
import { serializeCodeOutputArtifactContext } from "./specialist-artifacts/serializers";

describe("assignment submission specialist server context", () => {
  function query(result: { data: unknown; error: unknown }) {
    const builder = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      maybeSingle: () => Promise.resolve(result),
      then: (
        resolve: (value: typeof result) => unknown,
        reject: (reason: unknown) => unknown,
      ) => Promise.resolve(result).then(resolve, reject),
    };
    return builder;
  }

  it("loads academic band, rubric criteria, and owned assignment-source metadata from the kernel", () => {
    const kernel = {
      assignment: {
        id: "11111111-1111-4111-8111-111111111111",
        title: "Field report",
      },
      understanding: { academicBand: "high_foundation" },
      sources: [{
        id: "22222222-2222-4222-8222-222222222222",
        source_type: "rubric",
        title: "Teacher rubric",
        extracted_text: "Use evidence.",
        source_location: "p. 2",
      }],
      sourcePacket: {
        directions: "",
        rubric: "Use evidence.",
        materialText: "",
        citations: ["Teacher rubric, p. 2"],
        rubricCriteria: [{
          label: "Rubric 1",
          text: "Use evidence from the source.",
          sourceCitation: "Teacher rubric, p. 2",
        }],
      },
    } as unknown as AssignmentHomeworkKernel;

    expect(submissionSpecialistContextFromKernel(kernel)).toEqual({
      assignmentIdentity: {
        id: "11111111-1111-4111-8111-111111111111",
        title: "Field report",
      },
      academicBand: "high_foundation",
      rubricAnchors: [{
        criterionId: "22222222-2222-4222-8222-222222222222",
        criterion: "Use evidence from the source.",
        location: "Teacher rubric, p. 2",
      }],
      sourceAnchors: [{
        sourceId: "22222222-2222-4222-8222-222222222222",
        label: "Teacher rubric",
        location: "p. 2",
      }],
    });
  });

  it("uses exact canonical contexts when bounded and discloses oversized prompt projections", () => {
    const source = Array.from({ length: 80 }, (_, index) =>
      `${index}:${"student-code".repeat(75)}`
    ).join("\n");
    const block = toCanonicalRenderBlock(serializeCodeOutputArtifactContext({
      language: "python",
      code: source,
      output: [],
    }));
    const contexts = specialistArtifactContextsForConsumer(
      buildCanonicalRenderDocument({ blocks: [block] }),
      "review",
    );
    const formatted = formatCanonicalSpecialistContextsForPrompt(contexts, {
      maxBytes: 32_000,
    });
    const parsed = JSON.parse(formatted) as {
      includedContexts: Array<Record<string, unknown>>;
      omittedContextCount: number;
    };

    expect(utf8ByteLength(formatted)).toBeLessThanOrEqual(32_000);
    expect(parsed.omittedContextCount).toBe(0);
    expect(parsed.includedContexts[0]).toMatchObject({
      kind: "code_output",
      payloadOmittedForPrompt: true,
      plainTextTruncatedForPrompt: true,
      canonicalPayloadByteLength: expect.any(Number),
      canonicalPayloadDigest: expect.stringMatching(/^[a-f0-9]{64}$/u),
    });
  });

  it.each([
    ["assignment_problems", "assignment_problems"],
    ["artifact_blocks", "artifact_blocks"],
  ] as const)("fails closed when the %s query returns partial data with an error", async (table, source) => {
    const assignment = {
      id: "11111111-1111-4111-8111-111111111111",
      title: "Field report",
      description: null,
      rubric_text: null,
      assignment_profile: null,
      source_import_status: null,
      status: "drafting",
      submitted_at: null,
      submission_url: null,
      external_source: null,
      external_url: null,
      submission_sync_status: null,
      saved_work: {},
      work_profile: "handoff",
      classes: null,
    };
    const supabase = {
      from(candidate: string) {
        if (candidate === "assignments") return query({ data: assignment, error: null });
        if (candidate === table) {
          return query({ data: [{ id: "partial-row" }], error: { message: "query interrupted" } });
        }
        return query({ data: [], error: null });
      },
    };

    const loadArgs = {
      supabase,
      ownerId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      assignmentId: assignment.id,
      kernel: {} as AssignmentHomeworkKernel,
      profile: {} as AssignmentWorkProfile,
    };
    const expectedError = expect.objectContaining<Partial<AssignmentSubmissionDataError>>({
      name: "AssignmentSubmissionDataError",
      source,
    });

    await expect(loadAssignmentSubmissionBundle(loadArgs)).rejects.toEqual(expectedError);
    await expect(loadCanonicalSpecialistContextsForAssignment({
      ...loadArgs,
      consumer: "ask_diana",
    })).rejects.toEqual(expectedError);
  });
});
