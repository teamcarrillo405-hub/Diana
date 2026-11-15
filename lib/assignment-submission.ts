import {
  buildAssignmentArtifact,
  type AssignmentArtifact,
  type AssignmentArtifactBlockInput,
} from "@/lib/assignment-artifact";
import {
  ASSIGNMENT_CAPABILITY_REGISTRY,
  UNIVERSAL_TYPED_INK_FALLBACK,
  type AssignmentCapability,
  type AssignmentCapabilityDefinition,
} from "@/lib/assignment-capabilities";
import type { AssignmentWorkProfile } from "@/lib/assignment-profile";
import { parseWorkspaceMode } from "@/lib/assignment-workspace";
import { utf8ByteLength } from "@/lib/specialist-artifacts/bounds";
import type {
  SpecialistArtifactContextConsumer,
  SpecialistArtifactContextMetadataInput,
  SpecialistRuntimeHealth,
} from "@/lib/specialist-artifacts/contracts";
import {
  CANONICAL_RENDER_PLAIN_TEXT_MAX_BYTES,
  buildCanonicalRenderDocument,
  canonicalSpecialistDeliveryManifest,
  projectCanonicalRenderDocument,
  specialistArtifactContextsForConsumer,
  toCanonicalRenderBlock,
  type CanonicalRenderDocument,
  type CanonicalRenderProjection,
  type CanonicalRenderTarget,
  type CanonicalSpecialistDeliveryManifest,
  type SpecialistArtifactConsumerContext,
} from "@/lib/specialist-artifacts/render-blocks";
import {
  UNKNOWN_SPECIALIST_RUNTIME_HEALTH,
  resolveSpecialistRuntimeHealth,
  type ResolveSpecialistRuntimeHealthInput,
} from "@/lib/specialist-artifacts/runtime-health";
import { trySerializeSpecialistArtifactContext } from "@/lib/specialist-artifacts/serializers";
import type { AssignmentSubmissionPreview } from "@/lib/assignment-workspace-contracts";

export type CanonicalSubmissionAssignment = {
  id: string;
  title: string;
  saved_work: unknown;
  work_profile: unknown;
  academicBand?: unknown;
  academic_band?: unknown;
  gradeBand?: unknown;
  grade_band?: unknown;
  rubricText?: unknown;
  rubric_text?: unknown;
  rubricAnchors?: unknown;
  rubric_anchors?: unknown;
  sourceAnchors?: unknown;
  source_anchors?: unknown;
};

export type CanonicalSubmissionProblem = {
  id?: string | null;
  problem_number: number;
  problem_text: string;
  student_work: unknown;
  scaffold?: unknown;
  progress_status?: string | null;
};

export type CanonicalSubmissionBuildInput = {
  assignment: CanonicalSubmissionAssignment;
  profile: AssignmentWorkProfile;
  problems: readonly CanonicalSubmissionProblem[];
  blocks?: readonly AssignmentArtifactBlockInput[];
  specialistContext?: SpecialistArtifactContextMetadataInput;
  specialistRuntimeEvidence?: Partial<Record<AssignmentCapability, SubmissionSpecialistRuntimeEvidence>>;
};

export type CanonicalAssignmentSubmission = {
  artifact: AssignmentArtifact;
  universalTextPayload: string;
  specialistRenderDocument: CanonicalRenderDocument;
  textPayload: string;
};

export type CanonicalSubmissionTargetPayload = {
  target: CanonicalRenderTarget;
  universalTextPayload: string;
  textPayload: string;
  specialistProjection: CanonicalRenderProjection;
  specialistDelivery: CanonicalSpecialistDeliveryManifest;
  universalFallback: typeof UNIVERSAL_TYPED_INK_FALLBACK;
};

export type SubmissionSpecialistRuntimeEvidence = Omit<
  ResolveSpecialistRuntimeHealthInput,
  "readiness"
>;

export const SUBMISSION_SPECIALIST_RUNTIME_POLICY = "fresh_server_evidence_required" as const;
const SUBMISSION_SPECIALIST_RUNTIME_FALLBACK_DETAIL =
  "No fresh server-authoritative specialist runtime evidence is attached to this submission; use the universal typed and ink projection.";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function assignmentSubmissionFileName(title: string): string {
  const stem = title
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/giu, "-")
    .replace(/^-|-$/gu, "")
    .toLowerCase()
    .slice(0, 96) || "assignment";
  return `${stem}.pdf`;
}

export function buildCanonicalSubmissionArtifact(
  input: CanonicalSubmissionBuildInput,
): AssignmentArtifact {
  const savedWork = record(input.assignment.saved_work);
  const mode = parseWorkspaceMode(savedWork.workspaceMode)
    ?? parseWorkspaceMode(input.assignment.work_profile)
    ?? input.profile.legacyMode;

  return buildAssignmentArtifact({
    mode,
    artifactType: input.profile.artifactType,
    title: input.assignment.title,
    savedWork,
    problems: input.problems.map((problem) => ({
      problemNumber: problem.problem_number,
      problemText: problem.problem_text,
      studentWork: problem.student_work,
      scaffold: problem.scaffold,
    })),
    blocks: input.blocks,
  });
}

export function submissionSpecialistRuntimeHealth(
  capability: AssignmentCapability,
  runtimeEvidence?: SubmissionSpecialistRuntimeEvidence,
): SpecialistRuntimeHealth {
  const definition: AssignmentCapabilityDefinition =
    ASSIGNMENT_CAPABILITY_REGISTRY[capability];
  if (definition.readiness === "unavailable") {
    return resolveSpecialistRuntimeHealth({
      readiness: definition.readiness,
      available: false,
    });
  }
  if (runtimeEvidence) {
    return resolveSpecialistRuntimeHealth({
      readiness: definition.readiness,
      ...runtimeEvidence,
    });
  }
  return {
    ...UNKNOWN_SPECIALIST_RUNTIME_HEALTH,
    detail: SUBMISSION_SPECIALIST_RUNTIME_FALLBACK_DETAIL,
  };
}

function contextItems(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return value === undefined || value === null || value === "" ? [] : [value];
}

function firstContextValue(...values: unknown[]): unknown {
  return values.find((value) =>
    value !== undefined && value !== null &&
    (typeof value !== "string" || value.trim().length > 0)
  );
}

function specialistContextForBlock(
  input: CanonicalSubmissionBuildInput,
  block: AssignmentArtifact["blocks"][number],
): SpecialistArtifactContextMetadataInput {
  const assignment = input.assignment;
  const workProfile = record(assignment.work_profile);
  const profile = record(input.profile);
  const rubricText = firstContextValue(
    assignment.rubricText,
    assignment.rubric_text,
  );
  return {
    assignmentIdentity: {
      id: assignment.id,
      title: assignment.title,
    },
    academicBand: firstContextValue(
      input.specialistContext?.academicBand,
      assignment.academicBand,
      assignment.academic_band,
      assignment.gradeBand,
      assignment.grade_band,
      workProfile.academicBand,
      workProfile.academic_band,
      workProfile.gradeBand,
      workProfile.grade_band,
      profile.academicBand,
      profile.academic_band,
    ),
    rubricAnchors: [
      ...contextItems(input.specialistContext?.rubricAnchors),
      ...contextItems(assignment.rubricAnchors),
      ...contextItems(assignment.rubric_anchors),
      ...contextItems(rubricText),
    ],
    sourceAnchors: [
      ...block.sourceAnchors,
      ...contextItems(input.specialistContext?.sourceAnchors),
    ],
  };
}

function canonicalSpecialistDocument(
  input: CanonicalSubmissionBuildInput,
  artifact: AssignmentArtifact,
): {
  document: CanonicalRenderDocument;
  specialistBlockIds: Set<string>;
} {
  const specialistBlockIds = new Set<string>();
  const blocks = artifact.blocks.flatMap((block) => {
    const context = trySerializeSpecialistArtifactContext({
      id: block.id,
      key: block.key,
      label: block.label,
      type: block.type,
      capability: block.capability,
      content: block.content,
      artifactContext: specialistContextForBlock(input, block),
    });
    if (!context) return [];
    specialistBlockIds.add(block.id);
    return [toCanonicalRenderBlock(context, {
      id: block.key || block.id,
      label: block.label,
      runtimeHealth: submissionSpecialistRuntimeHealth(
        context.capability,
        input.specialistRuntimeEvidence?.[context.capability],
      ),
    })];
  });
  return {
    document: buildCanonicalRenderDocument({ blocks }),
    specialistBlockIds,
  };
}

function universalSubmissionText(
  artifact: AssignmentArtifact,
  specialistBlockIds: ReadonlySet<string>,
  hasSpecialistContent: boolean,
): string {
  const blockText = artifact.blocks.flatMap((block) => {
    if (specialistBlockIds.has(block.id) || !block.plainText.trim()) return [];
    return [`${block.label}\n${block.plainText.trim()}`];
  });
  if (blockText.length === 0 && !hasSpecialistContent) return "";
  return [artifact.title, ...blockText]
    .filter((value): value is string => Boolean(value))
    .join("\n\n");
}

export function composeCanonicalSubmissionText(
  universalTextPayload: string,
  specialistTextPayload: string,
): string {
  const payload = [universalTextPayload.trim(), specialistTextPayload.trim()]
    .filter(Boolean)
    .join("\n\n");
  const byteLength = utf8ByteLength(payload);
  if (byteLength > CANONICAL_RENDER_PLAIN_TEXT_MAX_BYTES) {
    throw new RangeError(
      `Canonical submission text needs ${byteLength} bytes, above the ${CANONICAL_RENDER_PLAIN_TEXT_MAX_BYTES}-byte limit.`,
    );
  }
  return payload;
}

export function buildCanonicalAssignmentSubmission(
  input: CanonicalSubmissionBuildInput,
): CanonicalAssignmentSubmission {
  const artifact = buildCanonicalSubmissionArtifact(input);
  const specialist = canonicalSpecialistDocument(input, artifact);
  const universalTextPayload = universalSubmissionText(
    artifact,
    specialist.specialistBlockIds,
    specialist.document.blocks.length > 0,
  );
  const textPayload = composeCanonicalSubmissionText(
    universalTextPayload,
    specialist.document.plainText,
  );
  return {
    artifact,
    universalTextPayload,
    specialistRenderDocument: specialist.document,
    textPayload,
  };
}

export function buildCanonicalSpecialistContexts(
  input: CanonicalSubmissionBuildInput,
  consumer: SpecialistArtifactContextConsumer,
): readonly SpecialistArtifactConsumerContext[] {
  const submission = buildCanonicalAssignmentSubmission(input);
  return specialistArtifactContextsForConsumer(
    submission.specialistRenderDocument,
    consumer,
  );
}

export function canonicalSubmissionText(input: CanonicalSubmissionBuildInput): string {
  return buildCanonicalAssignmentSubmission(input).textPayload;
}

export function canonicalSubmissionPayloadForTarget(
  preview: AssignmentSubmissionPreview,
  target: CanonicalRenderTarget,
): CanonicalSubmissionTargetPayload {
  const specialistRenderDocument = preview.specialistRenderDocument
    ?? buildCanonicalRenderDocument({ blocks: [] });
  const specialistProjection = projectCanonicalRenderDocument(
    specialistRenderDocument,
    target,
  );
  const hasCanonicalParts = preview.specialistRenderDocument !== undefined
    && preview.universalTextPayload !== undefined;
  const baseUniversalTextPayload = hasCanonicalParts
    ? preview.universalTextPayload ?? ""
    : preview.textPayload;
  const universalTextPayload = hasCanonicalParts
    ? composeCanonicalSubmissionText(
        baseUniversalTextPayload,
        specialistProjection.fallbackPlainText,
      )
    : baseUniversalTextPayload;
  return {
    target,
    universalTextPayload,
    textPayload: hasCanonicalParts
      ? composeCanonicalSubmissionText(
          universalTextPayload,
          specialistProjection.plainText,
        )
      : preview.textPayload,
    specialistProjection,
    specialistDelivery: canonicalSpecialistDeliveryManifest(
      specialistRenderDocument,
    ),
    universalFallback: UNIVERSAL_TYPED_INK_FALLBACK,
  };
}

export function buildAssignmentSubmissionPreview(input: {
  assignment: CanonicalSubmissionAssignment;
  profile: AssignmentWorkProfile;
  problems: readonly CanonicalSubmissionProblem[];
  blocks?: readonly AssignmentArtifactBlockInput[];
  specialistContext?: SpecialistArtifactContextMetadataInput;
  specialistRuntimeEvidence?: Partial<Record<AssignmentCapability, SubmissionSpecialistRuntimeEvidence>>;
  destination: string;
  submissionType: AssignmentSubmissionPreview["submissionType"];
}): AssignmentSubmissionPreview {
  const canonical = buildCanonicalAssignmentSubmission(input);
  const problems = [...input.problems]
    .sort((left, right) => left.problem_number - right.problem_number)
    .map((problem) => {
      const studentWork = record(problem.student_work);
      return {
        id: problem.id ?? `problem-${problem.problem_number}`,
        number: problem.problem_number,
        prompt: problem.problem_text,
        typedWork: text(studentWork.work) || text(studentWork.answer),
        inkData: text(studentWork.workInk),
        complete: problem.progress_status === "done",
      };
    });

  return {
    assignmentId: input.assignment.id,
    assignmentTitle: input.assignment.title,
    payloadDigest: null,
    destination: input.destination,
    submissionType: input.submissionType,
    fileName: assignmentSubmissionFileName(input.assignment.title),
    textPayload: canonical.textPayload,
    universalTextPayload: canonical.universalTextPayload,
    specialistRenderDocument: canonical.specialistRenderDocument,
    problems,
    incompleteProblemNumbers: problems.filter((problem) => !problem.complete).map((problem) => problem.number),
  };
}
