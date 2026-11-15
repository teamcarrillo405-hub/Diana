import { createHash } from "node:crypto";

import { parseStoredAssignmentArtifactBlocks } from "@/lib/assignment-artifact";
import {
  loadAssignmentHomeworkKernel,
  type AssignmentHomeworkKernel,
  type HomeworkSupabaseClient,
} from "@/lib/assignment-help/server-understanding";
import type { AssignmentWorkProfile } from "@/lib/assignment-profile";
import {
  buildAssignmentSubmissionPreview,
  canonicalSubmissionPayloadForTarget,
} from "@/lib/assignment-submission";
import {
  jsonByteLength,
  truncateUtf8,
  utf8ByteLength,
} from "@/lib/specialist-artifacts/bounds";
import type {
  SpecialistArtifactContextConsumer,
  SpecialistArtifactContextMetadataInput,
} from "@/lib/specialist-artifacts/contracts";
import {
  specialistArtifactContextsForConsumer,
  type SpecialistArtifactConsumerContext,
} from "@/lib/specialist-artifacts/render-blocks";
import type { AssignmentSubmissionPreview } from "@/lib/assignment-workspace-contracts";

export type PreparedAssignmentSubmissionFile = {
  id: string;
  filename: string;
  payloadDigest: string;
};

type SubmissionAssignmentRow = {
  id: string;
  title: string;
  description: string | null;
  rubric_text: string | null;
  assignment_profile: unknown;
  source_import_status: string | null;
  status: string;
  submitted_at: string | null;
  submission_url: string | null;
  external_source: string | null;
  external_url: string | null;
  submission_sync_status: string | null;
  saved_work: unknown;
  work_profile: unknown;
  classes?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

export const SPECIALIST_PROMPT_CONTEXT_MAX_BYTES = 96_000;
export const ASSIGNMENT_SUBMISSION_CANONICAL_PAYLOAD_MAX_BYTES = 16 * 1024 * 1024;
const SPECIALIST_PROMPT_CONTEXT_ITEM_MAX_BYTES = 48_000;
const SPECIALIST_PROMPT_PLAIN_TEXT_MAX_BYTES = 12_000;

export type AssignmentSubmissionDataSource =
  | "assignment"
  | "artifact_blocks"
  | "assignment_problems";

export class AssignmentSubmissionDataError extends Error {
  readonly source: AssignmentSubmissionDataSource;

  constructor(source: AssignmentSubmissionDataSource) {
    super(`Canonical assignment data could not be loaded from ${source}.`);
    this.name = "AssignmentSubmissionDataError";
    this.source = source;
  }
}

export function assertAssignmentSubmissionCanonicalPayloadByteLength(
  byteLength: number,
): void {
  if (!Number.isSafeInteger(byteLength) || byteLength < 0) {
    throw new TypeError("Canonical assignment payload byte length is invalid.");
  }
  if (byteLength > ASSIGNMENT_SUBMISSION_CANONICAL_PAYLOAD_MAX_BYTES) {
    throw new RangeError(
      `Canonical assignment payload needs ${byteLength} bytes, above the ${ASSIGNMENT_SUBMISSION_CANONICAL_PAYLOAD_MAX_BYTES}-byte limit.`,
    );
  }
}

function className(row: SubmissionAssignmentRow): string {
  const relation = Array.isArray(row.classes) ? row.classes[0] : row.classes;
  return relation?.name?.trim() || "your class";
}

export function submissionDestination(provider: string | null): string {
  if (provider === "canvas") return "Canvas";
  if (provider === "google_classroom") return "Google Classroom";
  return "Download or school handoff";
}

export function assignmentSubmissionReceiptProjection(
  preview: AssignmentSubmissionPreview,
) {
  const lmsPayload = canonicalSubmissionPayloadForTarget(preview, "lms");
  const semanticBlock = (block: (typeof lmsPayload.specialistProjection.contextBlocks)[number]) => ({
    ...block,
    runtimeState: {
      ...block.runtimeState,
      updatedAt: null,
    },
    runtimeHealth: {
      ...block.runtimeHealth,
      checkedAt: null,
      evidence: block.runtimeHealth.evidence
        ? { ...block.runtimeHealth.evidence, observedAt: null }
        : null,
    },
  });
  const specialistProjection = {
    ...lmsPayload.specialistProjection,
    blocks: lmsPayload.specialistProjection.blocks.map(semanticBlock),
    fallbackBlocks: lmsPayload.specialistProjection.fallbackBlocks.map(semanticBlock),
    contextBlocks: lmsPayload.specialistProjection.contextBlocks.map(semanticBlock),
  };
  return {
    assignmentId: preview.assignmentId,
    assignmentTitle: preview.assignmentTitle,
    destination: preview.destination,
    submissionType: preview.submissionType,
    fileName: preview.fileName,
    textPayload: lmsPayload.textPayload,
    universalTextPayload: lmsPayload.universalTextPayload,
    specialistProjection,
    specialistDelivery: lmsPayload.specialistDelivery,
    universalFallback: lmsPayload.universalFallback,
    problems: preview.problems,
    incompleteProblemNumbers: preview.incompleteProblemNumbers,
  };
}

export function assignmentSubmissionDigest(preview: AssignmentSubmissionPreview): string {
  return createHash("sha256")
    .update(assignmentSubmissionCanonicalPayloadBytes(preview))
    .digest("hex");
}

export function assignmentSubmissionCanonicalPayloadBytes(
  preview: AssignmentSubmissionPreview,
): Uint8Array {
  const bytes = new TextEncoder().encode(
    JSON.stringify(assignmentSubmissionReceiptProjection(preview)),
  );
  assertAssignmentSubmissionCanonicalPayloadByteLength(bytes.byteLength);
  return bytes;
}

function sourceIdForCitation(
  kernel: AssignmentHomeworkKernel,
  citation: string | null,
): string | null {
  if (!citation) return null;
  const source = kernel.sources.find((candidate) => {
    const title = candidate.title.trim();
    const location = candidate.source_location?.trim();
    return citation === title || citation === [title, location].filter(Boolean).join(", ");
  });
  return source?.id ?? null;
}

export function submissionSpecialistContextFromKernel(
  kernel: AssignmentHomeworkKernel,
): SpecialistArtifactContextMetadataInput {
  const sourceAnchors = kernel.sources.flatMap((source) => source.id
    ? [{
        sourceId: source.id,
        label: source.title,
        location: source.source_location,
      }]
    : []);
  const rubricAnchors = (kernel.sourcePacket.rubricCriteria ?? []).map((criterion) => ({
    criterionId: sourceIdForCitation(kernel, criterion.sourceCitation),
    criterion: criterion.text,
    location: criterion.sourceCitation,
  }));
  if (rubricAnchors.length === 0 && kernel.sourcePacket.rubric.trim()) {
    rubricAnchors.push({
      criterionId: null,
      criterion: kernel.sourcePacket.rubric,
      location: null,
    });
  }
  return {
    assignmentIdentity: {
      id: kernel.assignment.id,
      title: kernel.assignment.title,
    },
    academicBand: kernel.understanding.academicBand,
    rubricAnchors,
    sourceAnchors,
  };
}

function sha256Json(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function formatCanonicalSpecialistContextsForPrompt(
  contexts: readonly SpecialistArtifactConsumerContext[],
  options: { maxBytes?: number } = {},
): string {
  const maxBytes = options.maxBytes ?? SPECIALIST_PROMPT_CONTEXT_MAX_BYTES;
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 8_000 || maxBytes > 256_000) {
    throw new RangeError("Specialist prompt context maxBytes must be between 8000 and 256000.");
  }

  const includedContexts: unknown[] = [];
  const omittedContexts: Array<{
    kind: string;
    capability: string;
    canonicalContextByteLength: number;
    canonicalContextDigest: string;
  }> = [];

  for (const context of contexts) {
    const fullBytes = jsonByteLength(context);
    const boundedPlainText = truncateUtf8(
      context.plainText,
      SPECIALIST_PROMPT_PLAIN_TEXT_MAX_BYTES,
    );
    const candidate = fullBytes <= SPECIALIST_PROMPT_CONTEXT_ITEM_MAX_BYTES
      ? context
      : {
          consumer: context.consumer,
          schemaVersion: context.schemaVersion,
          kind: context.kind,
          capability: context.capability,
          summary: context.summary,
          plainText: boundedPlainText.value,
          plainTextTruncatedForPrompt: boundedPlainText.truncated,
          payloadOmittedForPrompt: true,
          canonicalPayloadByteLength: jsonByteLength(context.payload),
          canonicalPayloadDigest: sha256Json(context.payload),
          bounds: context.bounds,
          assignmentIdentity: context.assignmentIdentity,
          academicBand: context.academicBand,
          rubricAnchors: context.rubricAnchors,
          sourceAnchors: context.sourceAnchors,
          runtimeHealth: context.runtimeHealth,
          fallbackRequired: context.fallbackRequired,
        };
    const envelope = {
      schemaVersion: 1,
      limitBytes: maxBytes,
      includedContexts: [...includedContexts, candidate],
      omittedContexts,
      omittedContextCount: omittedContexts.length,
    };
    if (jsonByteLength(envelope) <= maxBytes) {
      includedContexts.push(candidate);
      continue;
    }
    omittedContexts.push({
      kind: context.kind,
      capability: context.capability,
      canonicalContextByteLength: fullBytes,
      canonicalContextDigest: sha256Json(context),
    });
  }

  const projection = {
    schemaVersion: 1,
    limitBytes: maxBytes,
    includedContexts,
    omittedContexts,
    omittedContextCount: omittedContexts.length,
  };
  const serialized = JSON.stringify(projection);
  if (utf8ByteLength(serialized) > maxBytes) {
    throw new RangeError("Specialist prompt manifest exceeds its explicit byte limit.");
  }
  return serialized;
}

export async function loadAssignmentSubmissionBundle(args: {
  supabase: HomeworkSupabaseClient;
  ownerId: string;
  assignmentId: string;
  profile?: AssignmentWorkProfile;
  kernel?: AssignmentHomeworkKernel;
}) {
  const assignmentResult = await args.supabase
    .from("assignments")
    .select("id, title, description, rubric_text, assignment_profile, source_import_status, status, submitted_at, submission_url, external_source, external_url, submission_sync_status, saved_work, work_profile, classes(name)")
    .eq("id", args.assignmentId)
    .eq("owner_id", args.ownerId)
    .maybeSingle() as {
      data: SubmissionAssignmentRow | null;
      error?: unknown;
    };
  if (assignmentResult.error) {
    throw new AssignmentSubmissionDataError("assignment");
  }
  const assignment = assignmentResult.data;
  if (!assignment) return null;

  const [kernel, problemsResult, blocksResult] = await Promise.all([
    args.kernel
      ? Promise.resolve(args.kernel)
      : loadAssignmentHomeworkKernel({
          supabase: args.supabase,
          ownerId: args.ownerId,
          assignmentId: args.assignmentId,
          eventSource: "submission_preview",
        }),
    args.supabase
      .from("assignment_problems")
      .select("id, problem_number, problem_text, student_work, scaffold, progress_status")
      .eq("assignment_id", args.assignmentId)
      .eq("owner_id", args.ownerId)
      .order("problem_number", { ascending: true })
      .order("id", { ascending: true }),
    args.supabase
      .from("artifact_blocks")
      .select("id, block_key, block_type, capability, label, position, content, plain_text, source_anchors")
      .eq("assignment_id", args.assignmentId)
      .eq("owner_id", args.ownerId)
      .order("position", { ascending: true })
      .order("block_key", { ascending: true })
      .order("id", { ascending: true }),
  ]);
  if (problemsResult.error) {
    throw new AssignmentSubmissionDataError("assignment_problems");
  }
  if (blocksResult.error) {
    throw new AssignmentSubmissionDataError("artifact_blocks");
  }
  if (!kernel) return null;
  const profile = args.profile ?? kernel?.profile;
  if (!profile) return null;

  const problems = (problemsResult.data ?? []) as Array<{
    id: string;
    problem_number: number;
    problem_text: string;
    student_work: unknown;
    scaffold: unknown;
    progress_status: string | null;
  }>;
  const blocks = parseStoredAssignmentArtifactBlocks(blocksResult.data);
  const defaultSubmissionType = assignment.external_source === "google_classroom"
    ? "file" as const
    : assignment.external_source === "canvas"
      ? "text" as const
      : "external_handoff" as const;
  const specialistContext = submissionSpecialistContextFromKernel(kernel);
  const canonicalAssignment = {
    ...assignment,
    description: kernel.assignment.description,
    rubric_text: kernel.assignment.rubric_text,
    assignment_profile: kernel.assignment.assignment_profile,
    source_import_status: kernel.assignment.source_import_status ?? null,
    academic_band: kernel.understanding.academicBand,
  };

  const draftPreview = buildAssignmentSubmissionPreview({
    assignment: canonicalAssignment,
    profile,
    problems,
    blocks,
    specialistContext,
    destination: submissionDestination(assignment.external_source),
    submissionType: defaultSubmissionType,
  });
  const preview = {
    ...draftPreview,
    payloadDigest: assignmentSubmissionDigest(draftPreview),
  };

  return {
    assignment,
    className: className(assignment),
    profile,
    preview,
    kernel,
  };
}

export async function loadCanonicalSpecialistContextsForAssignment(args: {
  supabase: HomeworkSupabaseClient;
  ownerId: string;
  assignmentId: string;
  consumer: SpecialistArtifactContextConsumer;
  profile?: AssignmentWorkProfile;
  kernel?: AssignmentHomeworkKernel;
}): Promise<readonly SpecialistArtifactConsumerContext[] | null> {
  const bundle = await loadAssignmentSubmissionBundle(args);
  if (!bundle) return null;
  if (!bundle.preview.specialistRenderDocument) return [];
  return specialistArtifactContextsForConsumer(
    bundle.preview.specialistRenderDocument,
    args.consumer,
  );
}
