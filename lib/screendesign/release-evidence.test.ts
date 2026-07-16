import { createHash } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import { GET as getBuildInfo } from "@/app/api/build-info/route";
import { SCREEN_DESIGN_CANONICAL_SCREEN_IDS } from "@/lib/qa/screendesign-fixtures";
import {
  createReviewIndex,
  sha256Text,
  type ReviewDirectorySets,
  type ReviewGalleryIndex,
  type ReviewGalleryRow,
} from "@/lib/screendesign/review-gallery";
import {
  RELEASE_EVIDENCE_VALIDATOR_VERSION,
  assertPreviewShaEquality,
  assertValidationReceiptMatches,
  createValidationReceipt,
  normalizeGitSha,
  sanitizeBuildIdentity,
  validateReleaseEvidenceDocument,
  type ReleaseEvidenceValidationResult,
} from "@/lib/screendesign/release-evidence";

const RUN_ID = "phase36-plan30";
const RELEASE_SHA = "a".repeat(40);

const directorySets = (): ReviewDirectorySets => ({
  source: SCREEN_DESIGN_CANONICAL_SCREEN_IDS.map((id) => `${id}.png`),
  app: SCREEN_DESIGN_CANONICAL_SCREEN_IDS.map((id) => `${id}.png`),
  diff: SCREEN_DESIGN_CANONICAL_SCREEN_IDS.map((id) => `${id}.png`),
  actions: SCREEN_DESIGN_CANONICAL_SCREEN_IDS.map((id) => `${id}.json`),
});

const makeRow = (id: string, rowIndex: number): ReviewGalleryRow => ({
  id,
  fixtureScenario: `${id}:default`,
  runId: RUN_ID,
  releaseSha: RELEASE_SHA,
  artifacts: {
    source: { path: `source/${id}.png`, sha256: sha256Text(`${id}:source`) },
    app: { path: `app/${id}.png`, sha256: sha256Text(`${id}:app`) },
    diff: { path: `diff/${id}.png`, sha256: sha256Text(`${id}:diff`) },
    action: { path: `actions/${id}.json`, sha256: sha256Text(`${id}:action`) },
  },
  baseline: {
    goldenPath: `tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/${id}.png`,
    goldenBlobHash: `${(rowIndex % 8) + 1}`.repeat(40),
    reviewCommit: `${((rowIndex + 2) % 8) + 1}`.repeat(40),
    reviewerName: "Diana Review",
    owningPlan: "36-05",
    fixtureScenario: `${id}:default`,
    declaredTolerance: { maxDiffPixelRatio: 0.005, masks: [] },
    playwrightComparison: { matcher: "toHaveScreenshot", status: "pass" },
  },
  actionResult: { status: "pass", primaryAction: "pass", navigation: "pass" },
});

const makeIndex = (): ReviewGalleryIndex =>
  createReviewIndex({
    runId: RUN_ID,
    releaseSha: RELEASE_SHA,
    generatedAt: "2026-07-16T12:00:00.000Z",
    rows: SCREEN_DESIGN_CANONICAL_SCREEN_IDS.map(makeRow),
    directorySets: directorySets(),
  });

const hashesFor = (index: ReviewGalleryIndex): ReadonlyMap<string, string> =>
  new Map(
    index.rows.flatMap((row) =>
      Object.values(row.artifacts).map((artifact) => [artifact.path, artifact.sha256]),
    ),
  );

const actionEvidenceFor = (
  index: ReviewGalleryIndex,
): ReadonlyMap<string, Readonly<Record<string, unknown>>> =>
  new Map(
    index.rows.map((row) => [
      row.id,
      {
        schemaVersion: 1,
        status: "pass",
        screenId: row.id,
        scenarioId: row.fixtureScenario,
        primaryAction: { status: "pass" },
        navigation: { status: "pass" },
      },
    ]),
  );

const validate = (
  index: ReviewGalleryIndex,
  overrides: Partial<Parameters<typeof validateReleaseEvidenceDocument>[0]> = {},
): ReleaseEvidenceValidationResult =>
  validateReleaseEvidenceDocument({
    index,
    directorySets: directorySets(),
    artifactHashes: hashesFor(index),
    actionEvidence: actionEvidenceFor(index),
    expectedCount: 47,
    expectedRunId: RUN_ID,
    expectedReleaseSha: RELEASE_SHA,
    indexSha256: sha256Text(JSON.stringify(index)),
    ...overrides,
  });

describe("release evidence validator", () => {
  it("accepts only the exact complete 47-id producer document", () => {
    const result = validate(makeIndex());

    expect(result.complete).toBe(true);
    expect(result.count).toBe(47);
    expect(result.ids).toEqual(SCREEN_DESIGN_CANONICAL_SCREEN_IDS);
    expect(result.runId).toBe(RUN_ID);
    expect(result.releaseSha).toBe(RELEASE_SHA);
  });

  it("rejects missing, extra, duplicate, skipped, and unreviewed rows with ids", () => {
    const index = makeIndex();
    expect(() =>
      validate({ ...index, rows: index.rows.slice(1) }),
    ).toThrow(/ai-history-log|47/iu);
    expect(() =>
      validate(index, {
        directorySets: {
          ...directorySets(),
          source: [...directorySets().source, "extra.png"],
        },
      }),
    ).toThrow(/extra/iu);
    expect(() =>
      validate({ ...index, rows: [...index.rows.slice(0, -1), index.rows[0]] }),
    ).toThrow(/duplicate|wellness-recovery-log/iu);
    expect(() =>
      validate({
        ...index,
        rows: index.rows.map((row, rowIndex) =>
          rowIndex === 0
            ? {
                ...row,
                actionResult: { ...row.actionResult, status: "skipped" as const },
              }
            : row,
        ),
      }),
    ).toThrow(/ai-history-log|passing/iu);
    expect(() =>
      validate({
        ...index,
        rows: index.rows.map((row, rowIndex) =>
          rowIndex === 0
            ? { ...row, baseline: { ...row.baseline, reviewerName: "" } }
            : row,
        ),
      }),
    ).toThrow(/ai-history-log|reviewer/iu);
  });

  it("rejects modified files, stale runs, stale SHAs, and nonpassing action documents", () => {
    const index = makeIndex();
    const changedHashes = new Map(hashesFor(index));
    changedHashes.set(index.rows[0].artifacts.source.path, "0".repeat(64));
    expect(() => validate(index, { artifactHashes: changedHashes })).toThrow(
      /ai-history-log|hash/iu,
    );
    expect(() => validate(index, { expectedRunId: "other-run" })).toThrow(/run id/iu);
    expect(() =>
      validate(index, { expectedReleaseSha: "b".repeat(40) }),
    ).toThrow(/release sha/iu);
    const actionEvidence = new Map(actionEvidenceFor(index));
    actionEvidence.set("ai-history-log", {
      schemaVersion: 1,
      status: "pass",
      screenId: "ai-history-log",
      scenarioId: "ai-history-log:default",
      primaryAction: { status: "pass" },
      navigation: { status: "skipped" },
    });
    expect(() => validate(index, { actionEvidence })).toThrow(
      /ai-history-log.*navigation/iu,
    );
  });

  it("writes a receipt only from a successful complete result and binds every identity", () => {
    const result = validate(makeIndex());
    const validatorHash = "c".repeat(64);
    const receipt = createValidationReceipt({
      result,
      validatorHash,
      validatedAt: "2026-07-16T12:30:00.000Z",
    });

    expect(receipt.validatorVersion).toBe(RELEASE_EVIDENCE_VALIDATOR_VERSION);
    expect(receipt.validatorSha256).toBe(validatorHash);
    expect(receipt.indexSha256).toBe(result.indexSha256);
    expect(receipt.ids).toEqual(SCREEN_DESIGN_CANONICAL_SCREEN_IDS);
    expect(() => assertValidationReceiptMatches(receipt, result, validatorHash)).not.toThrow();
    expect(() =>
      assertValidationReceiptMatches(
        { ...receipt, indexSha256: "0".repeat(64) },
        result,
        validatorHash,
      ),
    ).toThrow(/index hash/iu);
    expect(() =>
      createValidationReceipt({
        result: { ...result, complete: false },
        validatorHash,
        validatedAt: "2026-07-16T12:30:00.000Z",
      }),
    ).toThrow(/complete/iu);
  });
});

describe("preview and served build identity", () => {
  const priorCommit = process.env.VERCEL_GIT_COMMIT_SHA;
  const priorDeployment = process.env.VERCEL_DEPLOYMENT_ID;

  afterEach(() => {
    if (priorCommit === undefined) delete process.env.VERCEL_GIT_COMMIT_SHA;
    else process.env.VERCEL_GIT_COMMIT_SHA = priorCommit;
    if (priorDeployment === undefined) delete process.env.VERCEL_DEPLOYMENT_ID;
    else process.env.VERCEL_DEPLOYMENT_ID = priorDeployment;
  });

  it("requires full normalized equality across local, inspection, and served SHAs", () => {
    const upper = RELEASE_SHA.toUpperCase();
    expect(
      assertPreviewShaEquality({
        expectedSha: upper,
        inspectionSha: RELEASE_SHA,
        servedSha: RELEASE_SHA,
      }),
    ).toEqual({
      expectedSha: RELEASE_SHA,
      inspectionSha: RELEASE_SHA,
      servedSha: RELEASE_SHA,
    });
    expect(() => normalizeGitSha(RELEASE_SHA.slice(0, 12))).toThrow(/full/iu);
    expect(() =>
      assertPreviewShaEquality({
        expectedSha: RELEASE_SHA,
        inspectionSha: "b".repeat(40),
        servedSha: RELEASE_SHA,
      }),
    ).toThrow(/mismatch/iu);
  });

  it("sanitizes build identity to two safe deployment fields", async () => {
    expect(
      sanitizeBuildIdentity({
        gitCommitSha: RELEASE_SHA.toUpperCase(),
        deploymentId: "dpl_123-safe",
        secret: "must-not-leak",
      }),
    ).toEqual({ gitCommitSha: RELEASE_SHA, deploymentId: "dpl_123-safe" });

    process.env.VERCEL_GIT_COMMIT_SHA = RELEASE_SHA;
    process.env.VERCEL_DEPLOYMENT_ID = "dpl_123-safe";
    const response = await getBuildInfo();
    expect(response.headers.get("cache-control")).toContain("no-store");
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toEqual({ gitCommitSha: RELEASE_SHA, deploymentId: "dpl_123-safe" });
    expect(Object.keys(body)).toHaveLength(2);
  });

  it("returns null rather than exposing malformed deployment identity", () => {
    expect(
      sanitizeBuildIdentity({
        gitCommitSha: "not-a-sha",
        deploymentId: "unsafe deployment id with spaces",
      }),
    ).toEqual({ gitCommitSha: null, deploymentId: null });
  });
});
