import { readBetaRunManifest } from "./evidence";
import { getBetaQaResourceNamespace } from "./qa-resources";
import {
  assertCompleteBetaLmsStagingWriteSet,
  BETA_LMS_STAGING_WRITE_ACK,
  digestBetaLmsStagingWriteValue,
  executeDurableBetaLmsStagingWrite,
  type BetaLmsStagingWriteObservation,
  type BetaLmsStagingWriteOperation,
  type BetaLmsStagingWriteProvider,
  type BetaLmsStagingWriteResource,
  type ConfirmedBetaLmsStagingWriteRecord,
} from "./lms-staging-write-records";

const DEFAULT_NOW = () => new Date("2026-09-01T12:05:00.000Z");

type FixtureOperation = {
  provider: BetaLmsStagingWriteProvider;
  operation: BetaLmsStagingWriteOperation;
  observation: BetaLmsStagingWriteObservation;
  resources: BetaLmsStagingWriteResource[];
};

export async function writeConfirmedBetaLmsStagingWriteFixtures(input: {
  projectRoot: string;
  runId: string;
  stagingUrl: string;
  now?: () => Date;
}): Promise<ConfirmedBetaLmsStagingWriteRecord[]> {
  const manifest = readBetaRunManifest(input.projectRoot, input.runId);
  const namespace = getBetaQaResourceNamespace(input.runId);
  const bindingDigest = (provider: BetaLmsStagingWriteProvider, id: string) =>
    digestBetaLmsStagingWriteValue({ provider, id, namespace });
  const resource = (
    provider: BetaLmsStagingWriteProvider,
    providerResourceId: string,
    kind: BetaLmsStagingWriteResource["kind"],
    parentResourceId: string | null,
  ): BetaLmsStagingWriteResource => ({
    provider,
    providerResourceId,
    kind,
    resourceTag: namespace,
    parentResourceId,
    bindingDigest: bindingDigest(provider, providerResourceId),
    disposable: true,
  });
  const canvasText = resource(
    "canvas",
    "canvas-text-submission",
    "submission",
    null,
  );
  const canvasFileSubmission = resource(
    "canvas",
    "canvas-file-submission",
    "submission",
    null,
  );
  const canvasFile = resource(
    "canvas",
    "canvas-file-attachment",
    "file",
    canvasFileSubmission.providerResourceId,
  );
  const canvasGradeSubmission = resource(
    "canvas",
    "canvas-grade-submission",
    "submission",
    null,
  );
  const googleSubmission = resource(
    "google_classroom",
    "google-student-submission",
    "student_submission",
    null,
  );
  const googleFile = resource(
    "google_classroom",
    "google-drive-file",
    "drive_file",
    googleSubmission.providerResourceId,
  );
  const operations: FixtureOperation[] = [
    {
      provider: "canvas",
      operation: "canvas_text_submission",
      observation: {
        state: "known",
        providerSubmissionId: canvasText.providerResourceId,
        providerState: "submitted",
        attempt: 1,
        submittedAt: "2026-09-01T12:05:00.000Z",
        attachmentIds: [],
      },
      resources: [canvasText],
    },
    {
      provider: "canvas",
      operation: "canvas_file_submission",
      observation: {
        state: "known",
        providerSubmissionId: canvasFileSubmission.providerResourceId,
        providerState: "submitted",
        attempt: 1,
        submittedAt: "2026-09-01T12:05:00.000Z",
        attachmentIds: [canvasFile.providerResourceId],
      },
      resources: [canvasFileSubmission, canvasFile],
    },
    {
      provider: "canvas",
      operation: "canvas_grade_delivery",
      observation: {
        state: "known",
        providerSubmissionId: canvasGradeSubmission.providerResourceId,
        providerState: "graded",
        attempt: 1,
        submittedAt: "2026-09-01T12:05:00.000Z",
        attachmentIds: [],
        observedScore: 18,
        observedDraftScore: null,
      },
      resources: [canvasGradeSubmission],
    },
    {
      provider: "google_classroom",
      operation: "google_file_submission",
      observation: {
        state: "known",
        providerSubmissionId: googleSubmission.providerResourceId,
        providerState: "TURNED_IN",
        attempt: 1,
        submittedAt: "2026-09-01T12:05:00.000Z",
        attachmentIds: [googleFile.providerResourceId],
      },
      resources: [googleSubmission, googleFile],
    },
  ];

  const baseline: BetaLmsStagingWriteObservation = {
    state: "known",
    providerSubmissionId: null,
    providerState: "NEW",
    attempt: 0,
    submittedAt: null,
    attachmentIds: [],
  };
  for (const fixture of operations) {
    let current = baseline;
    await executeDurableBetaLmsStagingWrite({
      binding: {
        projectRoot: input.projectRoot,
        runId: input.runId,
        releaseSha: manifest.source.commitSha,
        stagingUrl: input.stagingUrl,
        resourceNamespace: namespace,
        acknowledgement: BETA_LMS_STAGING_WRITE_ACK,
        now: input.now ?? DEFAULT_NOW,
      },
      provider: fixture.provider,
      operation: fixture.operation,
      targetDigest: digestBetaLmsStagingWriteValue({ operation: fixture.operation, target: "fixture" }),
      payloadDigest: digestBetaLmsStagingWriteValue({ operation: fixture.operation, payload: "fixture" }),
      inspect: async () => current,
      write: async ({ recordResource }) => {
        for (const created of fixture.resources) recordResource(created);
        current = fixture.observation;
      },
      confirm: ({ current: observed, discoveredResources }) => ({
        confirmed:
          observed.state === "known" &&
          observed.providerSubmissionId === fixture.observation.providerSubmissionId &&
          discoveredResources.length === fixture.resources.length,
        detail: "Synthetic provider readback matched the fixture write.",
        resources: [...discoveredResources],
      }),
    });
  }

  return assertCompleteBetaLmsStagingWriteSet(
    input.projectRoot,
    input.runId,
    manifest.source.commitSha,
    input.stagingUrl,
  );
}
