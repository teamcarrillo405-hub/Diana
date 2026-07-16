import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { SCREEN_DESIGN_CANONICAL_SCREEN_IDS } from "@/lib/qa/screendesign-fixtures";

export const REVIEW_GALLERY_SCHEMA_VERSION = 1 as const;
export const REVIEW_OUTPUT_RELATIVE_ROOT =
  "test-results/screendesign-review" as const;
export const REVIEW_EXPECTED_COUNT = 47 as const;
export const REVIEW_ARTIFACT_KINDS = [
  "source",
  "app",
  "diff",
  "actions",
] as const;

export type ReviewArtifactKind = (typeof REVIEW_ARTIFACT_KINDS)[number];
export type ReviewComparisonStatus = "pass" | "fail" | "skipped";

export interface ReviewCapturePlanRow {
  readonly id: string;
  readonly artifacts: Readonly<{
    source: string;
    app: string;
    diff: string;
    action: string;
  }>;
}

export interface ReviewArtifactReference {
  readonly path: string;
  readonly sha256: string;
}

export interface ReviewMaskDeclaration {
  readonly selector: string;
  readonly reason: string;
}

export interface ReviewBaselineMetadata {
  readonly goldenPath: string;
  readonly goldenBlobHash: string;
  readonly reviewCommit: string;
  readonly reviewerName: string;
  readonly owningPlan: `36-${string}`;
  readonly fixtureScenario: string;
  readonly declaredTolerance: Readonly<{
    maxDiffPixelRatio: number;
    masks: readonly ReviewMaskDeclaration[];
  }>;
  readonly playwrightComparison: Readonly<{
    matcher: "toHaveScreenshot";
    status: ReviewComparisonStatus;
  }>;
}

export interface ReviewGalleryRow {
  readonly id: string;
  readonly fixtureScenario: string;
  readonly runId: string;
  readonly releaseSha: string;
  readonly artifacts: Readonly<{
    source: ReviewArtifactReference;
    app: ReviewArtifactReference;
    diff: ReviewArtifactReference;
    action: ReviewArtifactReference;
  }>;
  readonly baseline: ReviewBaselineMetadata;
  readonly actionResult: Readonly<{
    status: "pass" | "fail" | "skipped";
    primaryAction: "pass" | "fail" | "skipped";
    navigation: "pass" | "fail" | "skipped";
  }>;
}

export interface ReviewDirectorySets {
  readonly source: readonly string[];
  readonly app: readonly string[];
  readonly diff: readonly string[];
  readonly actions: readonly string[];
}

export interface ReviewGalleryIndex {
  readonly schemaVersion: typeof REVIEW_GALLERY_SCHEMA_VERSION;
  readonly complete: true;
  readonly expectedCount: typeof REVIEW_EXPECTED_COUNT;
  readonly runId: string;
  readonly releaseSha: string;
  readonly generatedAt: string;
  readonly rows: readonly ReviewGalleryRow[];
}

export interface CreateReviewIndexInput {
  readonly runId: string;
  readonly releaseSha: string;
  readonly generatedAt: string;
  readonly rows: readonly ReviewGalleryRow[];
  readonly directorySets: ReviewDirectorySets;
}

export interface AssertReviewIndexOptions {
  readonly expectedHashes?: ReadonlyMap<string, string>;
}

export interface ReadBaselineReviewInput {
  readonly projectRoot: string;
  readonly goldenPath: string;
  readonly releaseSha: string;
  readonly owningPlan: `36-${string}`;
  readonly fixtureScenario: string;
  readonly declaredTolerance: ReviewBaselineMetadata["declaredTolerance"];
  readonly playwrightStatus?: ReviewComparisonStatus;
}

const SHA_PATTERN = /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const RUN_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/u;
const PLAN_PATTERN = /^36-\d{2}$/u;

const invariant: (condition: unknown, message: string) => asserts condition = (
  condition,
  message,
) => {
  if (!condition) throw new Error(`Review gallery contract: ${message}`);
};

export const normalizeRepositoryPath = (value: string): string => {
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//u, "");
  invariant(
    normalized.length > 0 &&
      !path.posix.isAbsolute(normalized) &&
      !normalized.split("/").includes(".."),
    `invalid repository path ${value}`,
  );
  return normalized;
};

export const buildReviewCapturePlan = (): readonly ReviewCapturePlanRow[] =>
  Object.freeze(
    SCREEN_DESIGN_CANONICAL_SCREEN_IDS.map((id) =>
      Object.freeze({
        id,
        artifacts: Object.freeze({
          source: `source/${id}.png`,
          app: `app/${id}.png`,
          diff: `diff/${id}.png`,
          action: `actions/${id}.json`,
        }),
      }),
    ),
  );

const existingPathIsSymlink = async (value: string): Promise<boolean> => {
  const stats = await lstat(value).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  return stats?.isSymbolicLink() ?? false;
};

export const assertSafeReviewOutputRoot = async (
  projectRoot: string,
  requestedRoot: string,
): Promise<string> => {
  const resolvedProject = path.resolve(projectRoot);
  const projectReal = await realpath(resolvedProject);
  const expected = path.resolve(
    projectReal,
    ...REVIEW_OUTPUT_RELATIVE_ROOT.split("/"),
  );
  const requested = path.resolve(requestedRoot);

  invariant(
    requested === expected,
    `cleanup target must be the fixed review output ${expected}; received ${requested}`,
  );
  invariant(
    expected.startsWith(`${projectReal}${path.sep}`),
    "review output is outside the repository",
  );

  let cursor = path.join(projectReal, "test-results");
  for (const segment of ["", "screendesign-review"]) {
    if (segment) cursor = path.join(cursor, segment);
    invariant(
      !(await existingPathIsSymlink(cursor)),
      `cleanup boundary contains a symbolic link: ${cursor}`,
    );
  }

  const nearestExisting = await realpath(path.dirname(expected));
  invariant(
    nearestExisting === path.dirname(expected),
    "cleanup parent resolves through a symbolic link",
  );
  return expected;
};

export const sha256Text = (value: string): string =>
  createHash("sha256").update(value, "utf8").digest("hex");

export const sha256Bytes = (value: Buffer | Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");

export const sha256File = async (filePath: string): Promise<string> =>
  sha256Bytes(await readFile(filePath));

const assertExactSet = (
  actualValues: readonly string[],
  expectedValues: readonly string[],
  label: string,
): void => {
  const actual = [...actualValues].sort();
  const expected = [...expectedValues].sort();
  invariant(new Set(actual).size === actual.length, `${label} contains duplicates`);
  const missing = expected.filter((value) => !actual.includes(value));
  const extra = actual.filter((value) => !expected.includes(value));
  invariant(
    missing.length === 0 && extra.length === 0,
    `${label} exact set mismatch; missing [${missing.join(", ")}], extra [${extra.join(", ")}]`,
  );
};

const assertArtifact = (
  artifact: ReviewArtifactReference,
  expectedPath: string,
  expectedHashes?: ReadonlyMap<string, string>,
): void => {
  invariant(
    normalizeRepositoryPath(artifact.path) === expectedPath,
    `artifact path must be ${expectedPath}`,
  );
  invariant(SHA256_PATTERN.test(artifact.sha256), `invalid hash for ${artifact.path}`);
  const expectedHash = expectedHashes?.get(expectedPath);
  invariant(
    expectedHash === undefined || expectedHash === artifact.sha256,
    `artifact hash changed for ${expectedPath}`,
  );
};

const assertBaseline = (
  row: ReviewGalleryRow,
  expectedScenario: string,
): void => {
  const baseline = row.baseline;
  invariant(
    normalizeRepositoryPath(baseline.goldenPath) ===
      `tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/${row.id}.png`,
    `${row.id} golden path is not canonical`,
  );
  invariant(SHA_PATTERN.test(baseline.goldenBlobHash), `${row.id} golden blob hash is invalid`);
  invariant(SHA_PATTERN.test(baseline.reviewCommit), `${row.id} review commit is invalid`);
  invariant(
    baseline.reviewerName.trim().length > 0 && !baseline.reviewerName.includes("@"),
    `${row.id} reviewer name is absent or contains an email`,
  );
  invariant(PLAN_PATTERN.test(baseline.owningPlan), `${row.id} owning plan is invalid`);
  invariant(
    baseline.fixtureScenario === expectedScenario,
    `${row.id} baseline fixture scenario is inconsistent`,
  );
  invariant(
    Number.isFinite(baseline.declaredTolerance.maxDiffPixelRatio) &&
      baseline.declaredTolerance.maxDiffPixelRatio >= 0 &&
      baseline.declaredTolerance.maxDiffPixelRatio <= 0.005,
    `${row.id} tolerance exceeds the reviewed maximum`,
  );
  for (const mask of baseline.declaredTolerance.masks) {
    invariant(mask.selector.trim().length > 0, `${row.id} mask selector is empty`);
    invariant(mask.reason.trim().length > 0, `${row.id} mask reason is empty`);
  }
  invariant(
    baseline.playwrightComparison.matcher === "toHaveScreenshot" &&
      baseline.playwrightComparison.status === "pass",
    `${row.id} does not have a passing authoritative Playwright comparison`,
  );
};

export const assertCompleteReviewIndex = (
  index: ReviewGalleryIndex,
  directorySets: ReviewDirectorySets,
  options: AssertReviewIndexOptions = {},
): void => {
  invariant(index.schemaVersion === REVIEW_GALLERY_SCHEMA_VERSION, "unsupported schema version");
  invariant(index.complete === true, "index is not marked complete");
  invariant(index.expectedCount === REVIEW_EXPECTED_COUNT, "index expected count must be 47");
  invariant(RUN_ID_PATTERN.test(index.runId), "run id is invalid");
  invariant(SHA_PATTERN.test(index.releaseSha), "release SHA is invalid");
  invariant(!Number.isNaN(Date.parse(index.generatedAt)), "generated timestamp is invalid");
  invariant(index.rows.length === REVIEW_EXPECTED_COUNT, "index must contain exactly 47 rows");

  const ids = index.rows.map((row) => row.id);
  invariant(new Set(ids).size === ids.length, "index contains duplicate screen ids");
  invariant(
    ids.every((id, rowIndex) => id === SCREEN_DESIGN_CANONICAL_SCREEN_IDS[rowIndex]),
    "index rows are missing, extra, or outside canonical registry order",
  );

  const planById = new Map(buildReviewCapturePlan().map((row) => [row.id, row]));
  for (const row of index.rows) {
    const planned = planById.get(row.id);
    invariant(planned, `unknown canonical screen id ${row.id}`);
    invariant(row.runId === index.runId, `${row.id} has an inconsistent run id`);
    invariant(row.releaseSha === index.releaseSha, `${row.id} has an inconsistent release SHA`);
    invariant(
      row.fixtureScenario === `${row.id}:default`,
      `${row.id} does not use its canonical default fixture`,
    );
    assertArtifact(row.artifacts.source, planned.artifacts.source, options.expectedHashes);
    assertArtifact(row.artifacts.app, planned.artifacts.app, options.expectedHashes);
    assertArtifact(row.artifacts.diff, planned.artifacts.diff, options.expectedHashes);
    assertArtifact(row.artifacts.action, planned.artifacts.action, options.expectedHashes);
    assertBaseline(row, row.fixtureScenario);
    invariant(row.actionResult.status === "pass", `${row.id} action evidence is not passing`);
    invariant(
      row.actionResult.primaryAction === "pass" &&
        row.actionResult.navigation === "pass",
      `${row.id} primary-action/navigation evidence is incomplete`,
    );
  }

  assertExactSet(
    directorySets.source,
    SCREEN_DESIGN_CANONICAL_SCREEN_IDS.map((id) => `${id}.png`),
    "source directory",
  );
  assertExactSet(
    directorySets.app,
    SCREEN_DESIGN_CANONICAL_SCREEN_IDS.map((id) => `${id}.png`),
    "app directory",
  );
  assertExactSet(
    directorySets.diff,
    SCREEN_DESIGN_CANONICAL_SCREEN_IDS.map((id) => `${id}.png`),
    "diff directory",
  );
  assertExactSet(
    directorySets.actions,
    SCREEN_DESIGN_CANONICAL_SCREEN_IDS.map((id) => `${id}.json`),
    "actions directory",
  );
};

export const createReviewIndex = (
  input: CreateReviewIndexInput,
): ReviewGalleryIndex => {
  const index: ReviewGalleryIndex = Object.freeze({
    schemaVersion: REVIEW_GALLERY_SCHEMA_VERSION,
    complete: true,
    expectedCount: REVIEW_EXPECTED_COUNT,
    runId: input.runId,
    releaseSha: input.releaseSha,
    generatedAt: input.generatedAt,
    rows: Object.freeze([...input.rows]),
  });
  assertCompleteReviewIndex(index, input.directorySets);
  return index;
};

const runGit = (
  projectRoot: string,
  args: readonly string[],
  options: { allowNonzero?: boolean } = {},
): string => {
  const result = spawnSync("git", [...args], {
    cwd: projectRoot,
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && !options.allowNonzero) {
    throw new Error(
      `Review gallery Git check could not run git ${args.join(" ")}: ${String(result.stderr).trim()}`,
    );
  }
  return result.status === 0 ? String(result.stdout).trim() : "";
};

export const readReviewedBaselineMetadata = (
  input: ReadBaselineReviewInput,
): ReviewBaselineMetadata => {
  const relativePath = normalizeRepositoryPath(input.goldenPath);
  invariant(
    runGit(input.projectRoot, ["ls-files", "--error-unmatch", "--", relativePath], {
      allowNonzero: true,
    }) === relativePath,
    `golden is not tracked: ${relativePath}`,
  );
  invariant(
    runGit(input.projectRoot, ["status", "--porcelain", "--", relativePath]) === "",
    `golden is dirty: ${relativePath}`,
  );

  const goldenBlobHash = runGit(input.projectRoot, [
    "rev-parse",
    `${input.releaseSha}:${relativePath}`,
  ]);
  invariant(SHA_PATTERN.test(goldenBlobHash), `golden has no release blob: ${relativePath}`);

  const history = runGit(input.projectRoot, [
    "log",
    "-1",
    "--format=%H%x00%an",
    "--",
    relativePath,
  ]);
  const separator = history.indexOf("\0");
  invariant(separator > 0, `golden has no review history: ${relativePath}`);
  const reviewCommit = history.slice(0, separator).trim();
  const reviewerName = history.slice(separator + 1).trim();
  invariant(SHA_PATTERN.test(reviewCommit), `golden review commit is invalid: ${relativePath}`);
  invariant(reviewerName.length > 0 && !reviewerName.includes("@"), "reviewer name is unsafe");

  const ancestor = spawnSync(
    "git",
    ["merge-base", "--is-ancestor", reviewCommit, input.releaseSha],
    { cwd: input.projectRoot, shell: false, windowsHide: true },
  );
  invariant(
    !ancestor.error && ancestor.status === 0,
    `golden review commit is not an ancestor of release SHA: ${relativePath}`,
  );

  const metadata: ReviewBaselineMetadata = {
    goldenPath: relativePath,
    goldenBlobHash,
    reviewCommit,
    reviewerName,
    owningPlan: input.owningPlan,
    fixtureScenario: input.fixtureScenario,
    declaredTolerance: input.declaredTolerance,
    playwrightComparison: {
      matcher: "toHaveScreenshot",
      status: input.playwrightStatus ?? "pass",
    },
  };
  assertBaseline(
    {
      id: path.posix.basename(relativePath, ".png"),
      fixtureScenario: input.fixtureScenario,
      runId: "baseline-check",
      releaseSha: input.releaseSha,
      artifacts: {
        source: { path: "source/placeholder.png", sha256: "0".repeat(64) },
        app: { path: "app/placeholder.png", sha256: "0".repeat(64) },
        diff: { path: "diff/placeholder.png", sha256: "0".repeat(64) },
        action: { path: "actions/placeholder.json", sha256: "0".repeat(64) },
      },
      baseline: metadata,
      actionResult: { status: "pass", primaryAction: "pass", navigation: "pass" },
    },
    input.fixtureScenario,
  );
  return Object.freeze(metadata);
};
