import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  REVIEW_GALLERY_SCHEMA_VERSION,
  REVIEW_OUTPUT_RELATIVE_ROOT,
  assertCompleteReviewIndex,
  assertSafeReviewOutputRoot,
  buildReviewCapturePlan,
  createReviewIndex,
  sha256File,
  sha256Text,
  type ReviewGalleryRow,
} from "@/lib/screendesign/review-gallery";
import { SCREEN_DESIGN_CANONICAL_SCREEN_IDS } from "@/lib/qa/screendesign-fixtures";

const RELEASE_SHA = "a".repeat(40);
const RUN_ID = "phase36-plan30";

const artifactHash = (label: string): string => sha256Text(label);

const makeRow = (id: string, index: number): ReviewGalleryRow => ({
  id,
  fixtureScenario: `${id}:default`,
  runId: RUN_ID,
  releaseSha: RELEASE_SHA,
  artifacts: {
    source: { path: `source/${id}.png`, sha256: artifactHash(`${id}:source`) },
    app: { path: `app/${id}.png`, sha256: artifactHash(`${id}:app`) },
    diff: { path: `diff/${id}.png`, sha256: artifactHash(`${id}:diff`) },
    action: { path: `actions/${id}.json`, sha256: artifactHash(`${id}:action`) },
  },
  baseline: {
    goldenPath: `tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/${id}.png`,
    goldenBlobHash: `${(index % 9) + 1}`.repeat(40),
    reviewCommit: `${((index + 4) % 9) + 1}`.repeat(40),
    reviewerName: "Diana Review",
    owningPlan: "36-05",
    fixtureScenario: `${id}:default`,
    declaredTolerance: { maxDiffPixelRatio: 0.005, masks: [] },
    playwrightComparison: {
      matcher: "toHaveScreenshot",
      status: "pass",
    },
  },
  actionResult: {
    status: "pass",
    primaryAction: "pass",
    navigation: "pass",
  },
});

const completeRows = (): readonly ReviewGalleryRow[] =>
  SCREEN_DESIGN_CANONICAL_SCREEN_IDS.map(makeRow);

const directorySets = () => ({
  source: SCREEN_DESIGN_CANONICAL_SCREEN_IDS.map((id) => `${id}.png`),
  app: SCREEN_DESIGN_CANONICAL_SCREEN_IDS.map((id) => `${id}.png`),
  diff: SCREEN_DESIGN_CANONICAL_SCREEN_IDS.map((id) => `${id}.png`),
  actions: SCREEN_DESIGN_CANONICAL_SCREEN_IDS.map((id) => `${id}.json`),
});

describe("review gallery producer contract", () => {
  it("derives one canonical source, app, diff, and action path in registry order", () => {
    const plan = buildReviewCapturePlan();

    expect(plan).toHaveLength(47);
    expect(plan.map((row) => row.id)).toEqual(SCREEN_DESIGN_CANONICAL_SCREEN_IDS);
    expect(new Set(plan.flatMap((row) => Object.values(row.artifacts))).size).toBe(188);
    expect(plan[0]).toEqual({
      id: "ai-history-log",
      artifacts: {
        source: "source/ai-history-log.png",
        app: "app/ai-history-log.png",
        diff: "diff/ai-history-log.png",
        action: "actions/ai-history-log.json",
      },
    });
  });

  it("allows cleanup only at the fixed repository review directory", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "diana-review-root-"));
    await mkdir(path.join(root, "test-results"), { recursive: true });
    const expected = path.join(root, ...REVIEW_OUTPUT_RELATIVE_ROOT.split("/"));

    await expect(assertSafeReviewOutputRoot(root, expected)).resolves.toBe(
      path.resolve(expected),
    );
    await expect(assertSafeReviewOutputRoot(root, root)).rejects.toThrow(/fixed review output/iu);
    await expect(
      assertSafeReviewOutputRoot(root, path.join(root, "test-results")),
    ).rejects.toThrow(/fixed review output/iu);
    await expect(
      assertSafeReviewOutputRoot(root, path.resolve(root, "..", "outside")),
    ).rejects.toThrow(/fixed review output|outside/iu);
    await expect(
      assertSafeReviewOutputRoot(root, path.join(root, "test-results", "..", "escape")),
    ).rejects.toThrow(/fixed review output|traversal/iu);
  });

  it("rejects a symlinked output ancestor or output directory", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "diana-review-symlink-root-"));
    const outside = await mkdtemp(path.join(os.tmpdir(), "diana-review-outside-"));
    await symlink(outside, path.join(root, "test-results"), "junction");
    const expected = path.join(root, ...REVIEW_OUTPUT_RELATIVE_ROOT.split("/"));

    await expect(assertSafeReviewOutputRoot(root, expected)).rejects.toThrow(/symbolic link/iu);
  });

  it("hashes exact bytes with SHA-256", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "diana-review-hash-"));
    const file = path.join(root, "artifact.bin");
    await writeFile(file, Buffer.from([0, 1, 2, 3, 255]));

    expect(await sha256File(file)).toBe(
      "f7fa496a677a989682efbd16e3c5390768e856e91b3d7e7f09b1784e904803da",
    );
  });

  it("assembles only a complete canonical index with one run id and release SHA", () => {
    const rows = completeRows();
    const index = createReviewIndex({
      runId: RUN_ID,
      releaseSha: RELEASE_SHA,
      generatedAt: "2026-07-16T12:00:00.000Z",
      rows,
      directorySets: directorySets(),
    });

    expect(index.schemaVersion).toBe(REVIEW_GALLERY_SCHEMA_VERSION);
    expect(index.complete).toBe(true);
    expect(index.expectedCount).toBe(47);
    expect(index.rows).toEqual(rows);
    expect(() => assertCompleteReviewIndex(index, directorySets())).not.toThrow();
  });

  it.each([
    ["missing row", completeRows().slice(1), directorySets()],
    [
      "duplicate row",
      [...completeRows().slice(0, -1), completeRows()[0]],
      directorySets(),
    ],
    [
      "extra source file",
      completeRows(),
      { ...directorySets(), source: [...directorySets().source, "extra.png"] },
    ],
    [
      "missing passing diff",
      completeRows().map((row, index) =>
        index === 0
          ? {
              ...row,
              baseline: {
                ...row.baseline,
                playwrightComparison: {
                  ...row.baseline.playwrightComparison,
                  status: "skipped" as const,
                },
              },
            }
          : row,
      ),
      directorySets(),
    ],
    [
      "inconsistent run id",
      completeRows().map((row, index) =>
        index === 0 ? { ...row, runId: "stale-run" } : row,
      ),
      directorySets(),
    ],
    [
      "inconsistent release SHA",
      completeRows().map((row, index) =>
        index === 0 ? { ...row, releaseSha: "b".repeat(40) } : row,
      ),
      directorySets(),
    ],
    [
      "incomplete baseline metadata",
      completeRows().map((row, index) =>
        index === 0
          ? { ...row, baseline: { ...row.baseline, reviewerName: "" } }
          : row,
      ),
      directorySets(),
    ],
  ])("rejects %s", (_name, rows, sets) => {
    expect(() =>
      createReviewIndex({
        runId: RUN_ID,
        releaseSha: RELEASE_SHA,
        generatedAt: "2026-07-16T12:00:00.000Z",
        rows,
        directorySets: sets,
      }),
    ).toThrow();
  });

  it("rejects changed artifact hashes and noncanonical ordering", () => {
    const index = createReviewIndex({
      runId: RUN_ID,
      releaseSha: RELEASE_SHA,
      generatedAt: "2026-07-16T12:00:00.000Z",
      rows: completeRows(),
      directorySets: directorySets(),
    });
    const changedHash = {
      ...index,
      rows: index.rows.map((row, rowIndex) =>
        rowIndex === 0
          ? {
              ...row,
              artifacts: {
                ...row.artifacts,
                source: { ...row.artifacts.source, sha256: "0".repeat(64) },
              },
            }
          : row,
      ),
    };
    expect(() =>
      assertCompleteReviewIndex(changedHash, directorySets(), {
        expectedHashes: new Map(
          index.rows.flatMap((row) =>
            Object.values(row.artifacts).map((artifact) => [artifact.path, artifact.sha256]),
          ),
        ),
      }),
    ).toThrow(/hash/iu);

    expect(() =>
      assertCompleteReviewIndex(
        { ...index, rows: [...index.rows].reverse() },
        directorySets(),
      ),
    ).toThrow(/order/iu);
  });
});
