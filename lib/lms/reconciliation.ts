import type { LmsProvider } from "./types";

export type CanvasSubmissionObservation = {
  provider: "canvas";
  submissionId: string | null;
  state: string | null;
  attempt: number | null;
  submittedAt: string | null;
  attachmentIds: string[];
};

export type GoogleSubmissionObservation = {
  provider: "google_classroom";
  submissionId: string | null;
  state: string | null;
  attachmentIds: string[];
};

export type ProviderSubmissionObservation =
  | CanvasSubmissionObservation
  | GoogleSubmissionObservation;

export type SubmissionFileReconciliationRecord = {
  version: 1;
  baseline: ProviderSubmissionObservation;
  artifact: {
    localFileId: string;
    payloadDigest: string;
    sha256Digest: string;
    providerArtifactId: string | null;
  };
};

export type SubmissionTextReconciliationRecord = {
  version: 2;
  baseline: CanvasSubmissionObservation;
  text: {
    payloadDigest: string;
  };
};

export type SubmissionReconciliationRecord =
  | SubmissionFileReconciliationRecord
  | SubmissionTextReconciliationRecord;

export type BoundSubmissionReconciliation = {
  status: "submitted" | "confirmation_pending";
  verified: boolean;
  detail: string;
};

const RECONCILIATION_RECORD_KEY = "diana_submission_reconciliation";
const PROVIDER_OBSERVATION_KEY = "diana_provider_observation";
const SHA256_HEX = /^[a-f0-9]{64}$/u;
const CANVAS_CONFIRMED_STATES = new Set(["submitted", "pending_review", "graded"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nullableString(value: unknown): string | null | undefined {
  if (value === null) return null;
  return typeof value === "string" ? value : undefined;
}

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) return null;
  return [...new Set(value)];
}

function parseProviderSubmissionObservation(value: unknown): ProviderSubmissionObservation | null {
  if (!isRecord(value)) return null;
  const submissionId = nullableString(value.submissionId);
  const state = nullableString(value.state);
  const attachmentIds = stringArray(value.attachmentIds);
  if (submissionId === undefined || state === undefined || !attachmentIds) return null;

  if (value.provider === "canvas") {
    const submittedAt = nullableString(value.submittedAt);
    const attempt = value.attempt;
    if (
      submittedAt === undefined
      || (attempt !== null && (!Number.isInteger(attempt) || Number(attempt) < 0))
    ) return null;
    return {
      provider: "canvas",
      submissionId,
      state,
      attempt: attempt === null ? null : Number(attempt),
      submittedAt,
      attachmentIds,
    };
  }

  if (value.provider === "google_classroom") {
    return {
      provider: "google_classroom",
      submissionId,
      state,
      attachmentIds,
    };
  }
  return null;
}

export function createSubmissionReconciliationRecord(input: {
  baseline: ProviderSubmissionObservation;
  localFileId: string;
  payloadDigest: string;
  sha256Digest: string;
}): SubmissionFileReconciliationRecord {
  if (
    !input.localFileId
    || !SHA256_HEX.test(input.payloadDigest)
    || !SHA256_HEX.test(input.sha256Digest)
  ) {
    throw new Error("The submission artifact binding is incomplete.");
  }
  return {
    version: 1,
    baseline: input.baseline,
    artifact: {
      localFileId: input.localFileId,
      payloadDigest: input.payloadDigest,
      sha256Digest: input.sha256Digest,
      providerArtifactId: null,
    },
  };
}

export function createSubmissionTextReconciliationRecord(input: {
  baseline: CanvasSubmissionObservation;
  payloadDigest: string;
}): SubmissionTextReconciliationRecord {
  if (!SHA256_HEX.test(input.payloadDigest) || input.baseline.attempt === null) {
    throw new Error("The text submission binding is incomplete.");
  }
  return {
    version: 2,
    baseline: input.baseline,
    text: { payloadDigest: input.payloadDigest },
  };
}

export function bindSubmissionProviderArtifact(
  record: SubmissionFileReconciliationRecord,
  providerArtifactId: string,
): SubmissionFileReconciliationRecord {
  if (!providerArtifactId.trim()) throw new Error("The provider artifact identifier is missing.");
  return {
    ...record,
    artifact: {
      ...record.artifact,
      providerArtifactId,
    },
  };
}

export function submissionReconciliationProviderResponse(
  record: SubmissionReconciliationRecord,
): Record<string, unknown> {
  return { [RECONCILIATION_RECORD_KEY]: record };
}

export function providerSubmissionObservationResponse(
  observation: ProviderSubmissionObservation,
): Record<string, unknown> {
  return { [PROVIDER_OBSERVATION_KEY]: observation };
}

export function readSubmissionReconciliationRecord(
  providerResponse: unknown,
): SubmissionReconciliationRecord | null {
  if (!isRecord(providerResponse) || !isRecord(providerResponse[RECONCILIATION_RECORD_KEY])) return null;
  const value = providerResponse[RECONCILIATION_RECORD_KEY];
  if (!isRecord(value)) return null;
  const baseline = parseProviderSubmissionObservation(value.baseline);
  if (
    value.version === 2
    && baseline?.provider === "canvas"
    && isRecord(value.text)
    && typeof value.text.payloadDigest === "string"
    && SHA256_HEX.test(value.text.payloadDigest)
  ) {
    return {
      version: 2,
      baseline,
      text: { payloadDigest: value.text.payloadDigest },
    };
  }
  if (value.version !== 1 || !isRecord(value.artifact)) return null;
  const artifact = value.artifact;
  const providerArtifactId = nullableString(artifact.providerArtifactId);
  if (
    !baseline
    || typeof artifact.localFileId !== "string"
    || !artifact.localFileId
    || typeof artifact.payloadDigest !== "string"
    || !SHA256_HEX.test(artifact.payloadDigest)
    || typeof artifact.sha256Digest !== "string"
    || !SHA256_HEX.test(artifact.sha256Digest)
    || providerArtifactId === undefined
  ) return null;
  return {
    version: 1,
    baseline,
    artifact: {
      localFileId: artifact.localFileId,
      payloadDigest: artifact.payloadDigest,
      sha256Digest: artifact.sha256Digest,
      providerArtifactId,
    },
  };
}

export function readProviderSubmissionObservation(
  providerResponse: unknown,
): ProviderSubmissionObservation | null {
  if (!isRecord(providerResponse)) return null;
  return parseProviderSubmissionObservation(providerResponse[PROVIDER_OBSERVATION_KEY]);
}

function pending(detail: string): BoundSubmissionReconciliation {
  return { status: "confirmation_pending", verified: false, detail };
}

const UNBOUND_DETAIL = "Diana cannot match the provider's current submission to this exact file and attempt yet. Check the school system; Diana will not send the file again.";

export function reconcileBoundProviderSubmission(input: {
  record: SubmissionReconciliationRecord | null;
  current: ProviderSubmissionObservation | null;
  receiptSubmissionFileId: string | null;
}): BoundSubmissionReconciliation {
  const { record, current } = input;
  if (record?.version === 2) {
    if (
      !current
      || current.provider !== "canvas"
      || input.receiptSubmissionFileId !== null
    ) return pending(UNBOUND_DETAIL);
    const baseline = record.baseline;
    const state = current.state?.toLowerCase() ?? null;
    if (
      !state
      || !CANVAS_CONFIRMED_STATES.has(state)
      || baseline.attempt === null
      || current.attempt === null
      || current.attempt !== baseline.attempt + 1
      || (baseline.submissionId !== null && current.submissionId !== baseline.submissionId)
    ) return pending(UNBOUND_DETAIL);
    return {
      status: "submitted",
      verified: true,
      detail: "Canvas confirms the text submission attempt created after Diana's baseline check.",
    };
  }
  if (
    !record
    || !current
    || record.version !== 1
    || record.artifact.localFileId !== input.receiptSubmissionFileId
    || record.baseline.provider !== current.provider
    || !record.artifact.providerArtifactId
  ) return pending(UNBOUND_DETAIL);

  const expectedArtifactId = record.artifact.providerArtifactId;
  if (current.provider === "canvas" && record.baseline.provider === "canvas") {
    const baseline = record.baseline;
    const state = current.state?.toLowerCase() ?? null;
    if (!state || !CANVAS_CONFIRMED_STATES.has(state)) return pending(UNBOUND_DETAIL);
    if (
      baseline.attempt === null
      || current.attempt === null
      || current.attempt !== baseline.attempt + 1
      || (baseline.submissionId !== null && current.submissionId !== baseline.submissionId)
      || baseline.attachmentIds.includes(expectedArtifactId)
      || !current.attachmentIds.includes(expectedArtifactId)
    ) return pending(UNBOUND_DETAIL);
    return {
      status: "submitted",
      verified: true,
      detail: "Canvas confirms the exact file on the submission attempt created after Diana's baseline check.",
    };
  }

  if (current.provider === "google_classroom" && record.baseline.provider === "google_classroom") {
    const baseline = record.baseline;
    const state = current.state?.toUpperCase() ?? null;
    if (state === "RETURNED") {
      return pending("Google Classroom shows this work as returned, not turned in. Diana will not send the file again.");
    }
    if (
      state !== "TURNED_IN"
      || !baseline.submissionId
      || current.submissionId !== baseline.submissionId
      || baseline.state?.toUpperCase() === "TURNED_IN"
      || baseline.attachmentIds.includes(expectedArtifactId)
      || !current.attachmentIds.includes(expectedArtifactId)
    ) return pending(UNBOUND_DETAIL);
    return {
      status: "submitted",
      verified: true,
      detail: "Google Classroom confirms the exact Diana file is attached and currently turned in.",
    };
  }

  return pending(UNBOUND_DETAIL);
}

export type ExistingLmsAssignment = {
  id: string;
  external_id: string | null;
};

export type RemovedAssignmentPreservation = {
  assignmentId: string;
  externalId: string;
  provider: LmsProvider;
  providerState: "not_in_snapshot";
  disposition: "preserve_local_assignment";
  preserveStudentWork: true;
  deleteAssignment: false;
};

export type RemovedAssignmentReconciliation = {
  snapshot: "complete" | "partial";
  removed: readonly RemovedAssignmentPreservation[];
  summary: {
    providerMissing: number;
    preserved: number;
    deleted: 0;
  };
};

export function planRemovedAssignmentReconciliation(input: {
  provider: LmsProvider;
  existing: readonly ExistingLmsAssignment[];
  incomingExternalIds: readonly string[];
  snapshot: "complete" | "partial";
}): RemovedAssignmentReconciliation {
  if (input.snapshot !== "complete") {
    return {
      snapshot: "partial",
      removed: Object.freeze([]),
      summary: { providerMissing: 0, preserved: 0, deleted: 0 },
    };
  }

  const incoming = new Set(input.incomingExternalIds);
  const removed = input.existing.flatMap((assignment): RemovedAssignmentPreservation[] => {
    if (!assignment.external_id || incoming.has(assignment.external_id)) return [];
    return [{
      assignmentId: assignment.id,
      externalId: assignment.external_id,
      provider: input.provider,
      providerState: "not_in_snapshot",
      disposition: "preserve_local_assignment",
      preserveStudentWork: true,
      deleteAssignment: false,
    }];
  });

  return {
    snapshot: "complete",
    removed: Object.freeze(removed),
    summary: {
      providerMissing: removed.length,
      preserved: removed.length,
      deleted: 0,
    },
  };
}
