import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import {
  SCREEN_DESIGN_CANONICAL_SCREEN_IDS,
  SCREEN_DESIGN_FIXTURE_SCENARIOS,
  type ScreenDesignScreenId,
} from "@/lib/qa/screendesign-fixtures";
import {
  REVIEW_EXPECTED_COUNT,
  REVIEW_OUTPUT_RELATIVE_ROOT,
  SCREEN_DESIGN_IMPLEMENTATION_PLAN_BY_ID,
  assertSafeReviewOutputRoot,
  buildReviewCapturePlan,
  createReviewIndex,
  readReviewedBaselineMetadata,
  sha256File,
  type ReviewDirectorySets,
  type ReviewGalleryRow,
} from "@/lib/screendesign/review-gallery";
import { validateReleaseEvidenceFilesystem } from "@/lib/screendesign/release-evidence";

interface SharpPipeline {
  readonly metadata: () => Promise<{ readonly width?: number; readonly height?: number }>;
  readonly ensureAlpha: () => SharpPipeline;
  readonly composite: (
    overlays: readonly { readonly input: Buffer; readonly blend: "difference" }[],
  ) => SharpPipeline;
  readonly png: () => SharpPipeline;
  readonly toBuffer: () => Promise<Buffer>;
  readonly toFile: (outputPath: string) => Promise<unknown>;
}

const sharp = createRequire(import.meta.url)("sharp") as (
  input: string | Buffer,
) => SharpPipeline;

interface ProducerArguments {
  readonly clean: boolean;
  readonly expected: number;
  readonly runId: string;
}

interface ActionEvidence {
  readonly status?: unknown;
  readonly screenId?: unknown;
  readonly scenarioId?: unknown;
  readonly primaryAction?: Readonly<Record<string, unknown>>;
  readonly navigation?: Readonly<Record<string, unknown>>;
}

const usage =
  "Usage: npx tsx scripts/generate-screendesign-review-gallery.ts --clean --expected 47 --run-id phase36-plan30";
const RUN_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/u;
const SHA_PATTERN = /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/u;

const invariant: (condition: unknown, message: string) => asserts condition = (
  condition,
  message,
) => {
  if (!condition) throw new Error(`Review gallery producer: ${message}`);
};

const takeValue = (
  argv: readonly string[],
  index: number,
  option: string,
): string => {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${option} requires a value.`);
  return value;
};

export const parseProducerArguments = (
  argv: readonly string[],
): ProducerArguments => {
  let clean = false;
  let expected = 0;
  let runId = "";
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (option === "--clean") {
      clean = true;
      continue;
    }
    if (option === "--expected") {
      expected = Number(takeValue(argv, index, option));
      index += 1;
      continue;
    }
    if (option === "--run-id") {
      runId = takeValue(argv, index, option);
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${option}`);
  }
  if (!clean) throw new Error("--clean is required.");
  if (expected !== REVIEW_EXPECTED_COUNT) {
    throw new Error("--expected must be exactly 47.");
  }
  if (!RUN_ID_PATTERN.test(runId)) {
    throw new Error("--run-id must be a safe non-empty run id.");
  }
  return Object.freeze({ clean, expected, runId });
};

const resolveReleaseSha = async (projectRoot: string): Promise<string> => {
  const child = await new Promise<{ status: number | null; stdout: string }>(
    (resolve, reject) => {
      const process = spawn("git", ["rev-parse", "--verify", "HEAD^{commit}"], {
        cwd: projectRoot,
        shell: false,
        windowsHide: true,
        stdio: ["ignore", "pipe", "inherit"],
      });
      let stdout = "";
      process.stdout.setEncoding("utf8");
      process.stdout.on("data", (chunk: string) => {
        stdout += chunk;
      });
      process.on("error", reject);
      process.on("close", (status) => resolve({ status, stdout }));
    },
  );
  const releaseSha = child.stdout.trim().toLowerCase();
  invariant(child.status === 0 && SHA_PATTERN.test(releaseSha), "could not resolve full HEAD SHA");
  return releaseSha;
};

interface ReviewQaServer {
  readonly stop: () => Promise<void>;
}

const serverIsReady = async (): Promise<boolean> => {
  try {
    const response = await fetch("http://127.0.0.1:3005/login", {
      redirect: "manual",
      signal: AbortSignal.timeout(2_000),
    });
    return response.status < 500;
  } catch {
    return false;
  }
};

const startReviewQaServer = async (projectRoot: string): Promise<ReviewQaServer> => {
  invariant(!(await serverIsReady()), "port 3005 is already serving another process");
  const nextCli = path.join(
    projectRoot,
    "node_modules",
    "next",
    "dist",
    "bin",
    "next",
  );
  const child = spawn(
    process.execPath,
    [nextCli, "dev", "-p", "3005"],
    {
      cwd: projectRoot,
      env: { ...process.env, QA_CREATE_USER: "true" },
      shell: false,
      windowsHide: true,
      stdio: "inherit",
    },
  );
  let exitStatus: number | null | undefined;
  child.on("exit", (status) => {
    exitStatus = status;
  });
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline && !(await serverIsReady())) {
    invariant(exitStatus === undefined, `QA server exited early with ${String(exitStatus)}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  invariant(await serverIsReady(), "QA server did not become ready within 120 seconds");

  return {
    stop: async () => {
      if (exitStatus !== undefined || child.pid === undefined) return;
      if (process.platform === "win32") {
        await new Promise<void>((resolve) => {
          const stop = spawn(
            "taskkill",
            ["/PID", String(child.pid), "/T", "/F"],
            { shell: false, windowsHide: true, stdio: "ignore" },
          );
          stop.on("error", () => resolve());
          stop.on("close", () => resolve());
        });
      } else {
        child.kill("SIGTERM");
      }
    },
  };
};

const runPlaywrightSuite = async (input: {
  readonly projectRoot: string;
  readonly reviewStagingRoot: string;
  readonly runId: string;
  readonly releaseSha: string;
  readonly file: string;
  readonly project: "screendesign-source" | "screendesign-mobile";
}): Promise<void> => {
  const cli = path.join(
    input.projectRoot,
    "node_modules",
    "@playwright",
    "test",
    "cli.js",
  );
  process.stdout.write(
    `\n[review-gallery] Running ${input.file} (${input.project})\n`,
  );
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    CI: "",
    QA_CREATE_USER: "true",
    SCREENDESIGN_REVIEW_DIR: input.reviewStagingRoot,
    SCREENDESIGN_REVIEW_RUN_ID: input.runId,
    SCREENDESIGN_REVIEW_RELEASE_SHA: input.releaseSha,
  };
  delete env.SCREENDESIGN_WARMUP_ONLY;
  delete env.SCREEN_IDS;
  const status = await new Promise<number | null>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        cli,
        "test",
        input.file,
        `--project=${input.project}`,
        "--workers=1",
        "--retries=0",
        "--reporter=line",
      ],
      {
        cwd: input.projectRoot,
        env,
        shell: false,
        windowsHide: true,
        stdio: "inherit",
      },
    );
    child.on("error", reject);
    child.on("close", resolve);
  });
  invariant(
    status === 0,
    `${input.file} stopped with exit code ${String(status)}`,
  );
};

const listFilesOnly = async (directory: string): Promise<readonly string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  invariant(entries.every((entry) => entry.isFile()), `${directory} must contain files only`);
  return entries.map((entry) => entry.name).sort();
};

const expectedFiles = (extension: "png" | "json"): readonly string[] =>
  SCREEN_DESIGN_CANONICAL_SCREEN_IDS.map((id) => `${id}.${extension}`).sort();

const assertExactFiles = async (
  directory: string,
  extension: "png" | "json",
): Promise<readonly string[]> => {
  const actual = await listFilesOnly(directory);
  const expected = expectedFiles(extension);
  const missing = expected.filter((file) => !actual.includes(file));
  const extra = actual.filter((file) => !expected.includes(file));
  invariant(
    actual.length === REVIEW_EXPECTED_COUNT && missing.length === 0 && extra.length === 0,
    `${path.basename(directory)} exact set mismatch; missing [${missing.join(", ")}], extra [${extra.join(", ")}]`,
  );
  return actual;
};

const parseActionEvidence = async (
  filePath: string,
  screenId: ScreenDesignScreenId,
  scenarioId: string,
  runId: string,
  releaseSha: string,
): Promise<ActionEvidence> => {
  const parsed = JSON.parse(await readFile(filePath, "utf8")) as unknown;
  invariant(parsed !== null && typeof parsed === "object" && !Array.isArray(parsed), `${screenId} action evidence is not an object`);
  const evidence = parsed as ActionEvidence & {
    readonly producer?: Readonly<Record<string, unknown>>;
  };
  invariant(evidence.status === "pass", `${screenId} action result is not passing`);
  invariant(evidence.screenId === screenId, `${screenId} action record id is stale`);
  invariant(evidence.scenarioId === scenarioId, `${screenId} fixture scenario is stale`);
  invariant(evidence.primaryAction?.status === "pass", `${screenId} primary action is not passing`);
  invariant(evidence.navigation?.status === "pass", `${screenId} navigation is not passing`);
  invariant(
    evidence.producer?.runId === runId && evidence.producer?.releaseSha === releaseSha,
    `${screenId} producer identity is stale`,
  );
  return evidence;
};

const renderDifference = async (
  sourcePath: string,
  appPath: string,
  outputPath: string,
): Promise<void> => {
  const [sourceMetadata, appMetadata] = await Promise.all([
    sharp(sourcePath).metadata(),
    sharp(appPath).metadata(),
  ]);
  invariant(
    sourceMetadata.width === 393 && sourceMetadata.height === 852,
    `${path.basename(sourcePath)} is not the normalized 393x852 source capture`,
  );
  invariant(
    appMetadata.width === 393 && appMetadata.height === 852,
    `${path.basename(appPath)} is not the normalized 393x852 app capture`,
  );
  const app = await sharp(appPath).ensureAlpha().png().toBuffer();
  await sharp(sourcePath)
    .ensureAlpha()
    .composite([{ input: app, blend: "difference" }])
    .png()
    .toFile(outputPath);
};

const repositoryPath = (value: string): string => value.replaceAll("\\", "/");

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const renderHtmlGallery = (input: {
  readonly runId: string;
  readonly releaseSha: string;
  readonly generatedAt: string;
  readonly rows: readonly ReviewGalleryRow[];
}): string => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Diana 47-screen release review</title>
  <style>
    :root { color-scheme: dark; font-family: ui-sans-serif, system-ui, sans-serif; background: #080d1a; color: #f8fafc; }
    body { margin: 0; padding: 32px; }
    header { max-width: 1320px; margin: 0 auto 28px; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    p { color: #a5b4cf; overflow-wrap: anywhere; }
    main { display: grid; gap: 28px; max-width: 1320px; margin: 0 auto; }
    article { padding: 20px; border: 1px solid #29334a; border-radius: 16px; background: #10182a; }
    h2 { margin: 0 0 8px; font-size: 20px; }
    .meta { margin: 0 0 16px; font: 12px/1.5 ui-monospace, monospace; }
    .images { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
    figure { margin: 0; }
    img { display: block; width: 100%; height: auto; border-radius: 10px; background: #000; }
    figcaption { margin-top: 7px; color: #a5b4cf; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
    @media (max-width: 800px) { body { padding: 16px; } .images { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <header>
    <h1>Diana 47-screen release review</h1>
    <p>Run ${escapeHtml(input.runId)} | Release ${escapeHtml(input.releaseSha)} | Generated ${escapeHtml(input.generatedAt)}</p>
  </header>
  <main>
${input.rows
  .map(
    (row) => `    <article id="${escapeHtml(row.id)}">
      <h2>${escapeHtml(row.id)}</h2>
      <p class="meta">${escapeHtml(row.fixtureScenario)} | ${escapeHtml(row.baseline.owningPlan)} | Playwright ${escapeHtml(row.baseline.playwrightComparison.status)} | Actions ${escapeHtml(row.actionResult.status)}</p>
      <div class="images">
        <figure><img src="${escapeHtml(row.artifacts.source.path)}" alt="${escapeHtml(row.id)} normalized ScreenDesign source"><figcaption>Source</figcaption></figure>
        <figure><img src="${escapeHtml(row.artifacts.app.path)}" alt="${escapeHtml(row.id)} current Diana app"><figcaption>Current app</figcaption></figure>
        <figure><img src="${escapeHtml(row.artifacts.diff.path)}" alt="${escapeHtml(row.id)} visual difference"><figcaption>Difference visualization</figcaption></figure>
      </div>
    </article>`,
  )
  .join("\n")}
  </main>
</body>
</html>
`;

export const main = async (
  argv: readonly string[] = process.argv.slice(2),
): Promise<void> => {
  const args = parseProducerArguments(argv);
  const projectRoot = process.cwd();
  await mkdir(path.join(projectRoot, "test-results"), { recursive: true });
  const reviewRoot = await assertSafeReviewOutputRoot(
    projectRoot,
    path.join(projectRoot, ...REVIEW_OUTPUT_RELATIVE_ROOT.split("/")),
  );
  const releaseSha = await resolveReleaseSha(projectRoot);
  await rm(reviewRoot, { recursive: true, force: true });
  const stagingRoot = path.join(reviewRoot, ".producer-staging");
  await mkdir(stagingRoot, { recursive: true });

  const server = await startReviewQaServer(projectRoot);
  try {
    const suiteInput = {
      projectRoot,
      reviewStagingRoot: stagingRoot,
      runId: args.runId,
      releaseSha,
    };
    await runPlaywrightSuite({
      ...suiteInput,
      file: "tests/screendesign-source-capture.spec.ts",
      project: "screendesign-source",
    });
    await runPlaywrightSuite({
      ...suiteInput,
      file: "tests/screendesign-visual.spec.ts",
      project: "screendesign-mobile",
    });
    await runPlaywrightSuite({
      ...suiteInput,
      file: "tests/screendesign-navigation.spec.ts",
      project: "screendesign-mobile",
    });
  } finally {
    await server.stop();
  }

  const runRoot = path.join(stagingRoot, args.runId);
  await Promise.all([
    assertExactFiles(path.join(runRoot, "source"), "png"),
    assertExactFiles(path.join(runRoot, "app"), "png"),
    assertExactFiles(path.join(runRoot, "actions"), "json"),
  ]);
  await Promise.all(
    ["source", "app", "actions"].map((kind) =>
      rename(path.join(runRoot, kind), path.join(reviewRoot, kind)),
    ),
  );
  await mkdir(path.join(reviewRoot, "diff"), { recursive: true });

  const defaultScenarios = new Map(
    SCREEN_DESIGN_FIXTURE_SCENARIOS.filter((scenario) => scenario.isDefault).map(
      (scenario) => [scenario.screenId, scenario] as const,
    ),
  );
  invariant(defaultScenarios.size === REVIEW_EXPECTED_COUNT, "default fixture registry is incomplete");

  const capturePlan = buildReviewCapturePlan();
  const rows: ReviewGalleryRow[] = [];
  for (const planned of capturePlan) {
    const screenId = planned.id as ScreenDesignScreenId;
    const scenario = defaultScenarios.get(screenId);
    invariant(scenario, `${screenId} has no canonical default fixture scenario`);
    const sourcePath = path.join(reviewRoot, ...planned.artifacts.source.split("/"));
    const appPath = path.join(reviewRoot, ...planned.artifacts.app.split("/"));
    const diffPath = path.join(reviewRoot, ...planned.artifacts.diff.split("/"));
    const actionPath = path.join(reviewRoot, ...planned.artifacts.action.split("/"));
    await renderDifference(sourcePath, appPath, diffPath);
    const action = await parseActionEvidence(
      actionPath,
      screenId,
      scenario.id,
      args.runId,
      releaseSha,
    );
    const baseline = readReviewedBaselineMetadata({
      projectRoot,
      goldenPath: `tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/${screenId}.png`,
      releaseSha,
      owningPlan: SCREEN_DESIGN_IMPLEMENTATION_PLAN_BY_ID[screenId],
      fixtureScenario: scenario.id,
      declaredTolerance: { maxDiffPixelRatio: 0.005, masks: [] },
      playwrightStatus: "pass",
    });
    rows.push({
      id: screenId,
      fixtureScenario: scenario.id,
      runId: args.runId,
      releaseSha,
      artifacts: {
        source: { path: planned.artifacts.source, sha256: await sha256File(sourcePath) },
        app: { path: planned.artifacts.app, sha256: await sha256File(appPath) },
        diff: { path: planned.artifacts.diff, sha256: await sha256File(diffPath) },
        action: { path: planned.artifacts.action, sha256: await sha256File(actionPath) },
      },
      baseline,
      actionResult: {
        status: action.status as "pass",
        primaryAction: action.primaryAction?.status as "pass",
        navigation: action.navigation?.status as "pass",
      },
    });
  }

  const directorySets: ReviewDirectorySets = {
    source: await assertExactFiles(path.join(reviewRoot, "source"), "png"),
    app: await assertExactFiles(path.join(reviewRoot, "app"), "png"),
    diff: await assertExactFiles(path.join(reviewRoot, "diff"), "png"),
    actions: await assertExactFiles(path.join(reviewRoot, "actions"), "json"),
  };
  const generatedAt = new Date().toISOString();
  const index = createReviewIndex({
    runId: args.runId,
    releaseSha,
    generatedAt,
    rows,
    directorySets,
  });
  const indexPath = path.join(reviewRoot, "index.json");
  await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  const indexSha256 = await sha256File(indexPath);
  await writeFile(
    path.join(reviewRoot, "release.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        complete: true,
        expectedCount: REVIEW_EXPECTED_COUNT,
        runId: args.runId,
        releaseSha,
        generatedAt,
        index: { path: "index.json", sha256: indexSha256 },
        artifacts: { source: 47, app: 47, diff: 47, actions: 47 },
      },
      null,
      2,
    )}\n`,
    { encoding: "utf8", flag: "wx" },
  );
  await writeFile(
    path.join(reviewRoot, "index.html"),
    renderHtmlGallery({ runId: args.runId, releaseSha, generatedAt, rows }),
    { encoding: "utf8", flag: "wx" },
  );
  await rm(stagingRoot, { recursive: true, force: false });

  const result = await validateReleaseEvidenceFilesystem({
    projectRoot,
    reviewRoot,
    expectedCount: args.expected,
    expectedRunId: args.runId,
    expectedReleaseSha: releaseSha,
  });
  process.stdout.write(
    `${JSON.stringify(
      {
        status: "pass",
        complete: result.complete,
        count: result.count,
        runId: result.runId,
        releaseSha: result.releaseSha,
        indexSha256: result.indexSha256,
        output: repositoryPath(path.relative(projectRoot, reviewRoot)),
        gallery: repositoryPath(path.relative(projectRoot, path.join(reviewRoot, "index.html"))),
      },
      null,
      2,
    )}\n`,
  );
};

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n${usage}\n`);
  process.exitCode = 1;
});
