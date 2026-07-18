import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import {
  mkdir,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import { SCREEN_DESIGN_CANONICAL_SCREEN_IDS } from "@/lib/qa/screendesign-fixtures";

interface SharpPipeline {
  readonly webp: (options: { readonly quality: number }) => SharpPipeline;
  readonly toFile: (outputPath: string) => Promise<unknown>;
}

const sharp = createRequire(import.meta.url)("sharp") as (
  input: string,
) => SharpPipeline;

const EXPECTED_COUNT = 47;
const QA_ORIGIN = "http://127.0.0.1:3005";
const OUTPUT_RELATIVE_ROOT = "public/screendesign-proof";
const STAGING_RELATIVE_ROOT = "test-results/screendesign-responsive-proof";

const invariant: (condition: unknown, message: string) => asserts condition = (
  condition,
  message,
) => {
  if (!condition) throw new Error(`Responsive proof producer: ${message}`);
};

const parseArguments = (argv: readonly string[]) => {
  const expectedIndex = argv.indexOf("--expected");
  const fromExisting = argv.includes("--from-existing");
  invariant(fromExisting || argv.includes("--clean"), "--clean is required unless --from-existing is used");
  invariant(expectedIndex >= 0, "--expected is required");
  invariant(Number(argv[expectedIndex + 1]) === EXPECTED_COUNT, "--expected must be 47");
  invariant(
    (fromExisting && argv.length === 3) || (!fromExisting && argv.length === 3),
    "usage: npx tsx scripts/generate-responsive-proof-gallery.ts --clean --expected 47",
  );
  return { fromExisting };
};

const serverIsReady = async () => {
  try {
    const response = await fetch(`${QA_ORIGIN}/login`, {
      redirect: "manual",
      signal: AbortSignal.timeout(2_000),
    });
    return response.status < 500;
  } catch {
    return false;
  }
};

const startQaServer = async (projectRoot: string) => {
  invariant(!(await serverIsReady()), "port 3005 is already serving another process");
  const nextCli = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
  const child = spawn(process.execPath, [nextCli, "dev", "-p", "3005"], {
    cwd: projectRoot,
    env: { ...process.env, QA_CREATE_USER: "true" },
    shell: false,
    windowsHide: true,
    stdio: "inherit",
  });
  let exitStatus: number | null | undefined;
  child.on("exit", (status) => {
    exitStatus = status;
  });

  const readyBy = Date.now() + 120_000;
  while (Date.now() < readyBy && !(await serverIsReady())) {
    invariant(exitStatus === undefined, `QA server exited early with ${String(exitStatus)}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  invariant(await serverIsReady(), "QA server did not become ready");

  return async () => {
    if (child.pid === undefined || exitStatus !== undefined) return;
    if (process.platform === "win32") {
      await new Promise<void>((resolve) => {
        const stop = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
          shell: false,
          windowsHide: true,
          stdio: "ignore",
        });
        stop.on("error", () => resolve());
        stop.on("close", () => resolve());
      });
      return;
    }
    child.kill("SIGTERM");
  };
};

const runVisualProject = async (
  projectRoot: string,
  proofRoot: string,
  project: "screendesign-mobile" | "screendesign-responsive-desktop",
) => {
  const cli = path.join(projectRoot, "node_modules", "@playwright", "test", "cli.js");
  const status = await new Promise<number | null>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        cli,
        "test",
        "tests/screendesign-visual.spec.ts",
        `--project=${project}`,
        "--workers=1",
        "--retries=0",
        "--reporter=line",
      ],
      {
        cwd: projectRoot,
        env: {
          ...process.env,
          CI: "",
          QA_BASE_URL: QA_ORIGIN,
          QA_CREATE_USER: "true",
          SCREENDESIGN_RESPONSIVE_PROOF_DIR: proofRoot,
        },
        shell: false,
        windowsHide: true,
        stdio: "inherit",
      },
    );
    child.on("error", reject);
    child.on("close", resolve);
  });
  invariant(status === 0, `${project} stopped with exit code ${String(status)}`);
};

const assertExactPngSet = async (directory: string) => {
  const actual = (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
  const expected = SCREEN_DESIGN_CANONICAL_SCREEN_IDS.map((id) => `${id}.png`).sort();
  const missing = expected.filter((file) => !actual.includes(file));
  const extra = actual.filter((file) => !expected.includes(file));
  invariant(
    actual.length === EXPECTED_COUNT && missing.length === 0 && extra.length === 0,
    `${path.basename(directory)} set mismatch; missing [${missing.join(", ")}], extra [${extra.join(", ")}]`,
  );
};

const convertVariant = async (
  stagingRoot: string,
  outputRoot: string,
  variant: "mobile" | "desktop",
) => {
  const inputDirectory = path.join(stagingRoot, variant);
  const outputDirectory = path.join(outputRoot, variant);
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all(
    SCREEN_DESIGN_CANONICAL_SCREEN_IDS.map((id) =>
      sharp(path.join(inputDirectory, `${id}.png`))
        .webp({ quality: 82 })
        .toFile(path.join(outputDirectory, `${id}.webp`)),
    ),
  );
};

export const main = async (argv = process.argv.slice(2)) => {
  const { fromExisting } = parseArguments(argv);
  const projectRoot = process.cwd();
  const outputRoot = path.join(projectRoot, ...OUTPUT_RELATIVE_ROOT.split("/"));
  const stagingRoot = path.join(projectRoot, ...STAGING_RELATIVE_ROOT.split("/"));
  invariant(outputRoot.startsWith(`${projectRoot}${path.sep}public${path.sep}`), "unsafe output root");
  invariant(
    stagingRoot.startsWith(`${projectRoot}${path.sep}test-results${path.sep}`),
    "unsafe staging root",
  );

  await rm(outputRoot, { recursive: true, force: true });
  if (!fromExisting) {
    await rm(stagingRoot, { recursive: true, force: true });
    await mkdir(stagingRoot, { recursive: true });

    const stopServer = await startQaServer(projectRoot);
    try {
      await runVisualProject(projectRoot, stagingRoot, "screendesign-mobile");
      await runVisualProject(
        projectRoot,
        stagingRoot,
        "screendesign-responsive-desktop",
      );
    } finally {
      await stopServer();
    }
  }

  await Promise.all([
    assertExactPngSet(path.join(stagingRoot, "mobile")),
    assertExactPngSet(path.join(stagingRoot, "desktop")),
  ]);
  await mkdir(outputRoot, { recursive: true });
  await Promise.all([
    convertVariant(stagingRoot, outputRoot, "mobile"),
    convertVariant(stagingRoot, outputRoot, "desktop"),
  ]);
  await writeFile(
    path.join(outputRoot, "manifest.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        expectedCount: EXPECTED_COUNT,
        complete: true,
        generatedAt: new Date().toISOString(),
        viewports: {
          mobile: { width: 393, height: 852 },
          desktop: { width: 1440, height: 1000 },
        },
        screens: SCREEN_DESIGN_CANONICAL_SCREEN_IDS,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  if (!fromExisting) {
    await rename(stagingRoot, `${stagingRoot}-complete`);
  }
  process.stdout.write(
    `Responsive proof gallery generated: ${EXPECTED_COUNT} mobile + ${EXPECTED_COUNT} desktop images in ${OUTPUT_RELATIVE_ROOT}\n`,
  );
};

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
