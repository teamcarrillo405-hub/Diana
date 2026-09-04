import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./checkpoint-provenance", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./checkpoint-provenance")>();
  return {
    ...actual,
    validateBetaCheckpointEvidence: actual.validateBetaCheckpointEvidenceStructure,
  };
});

import type { ProviderCanaryReport } from "@/lib/lms/provider-canary";

import { betaBrowserRuntime, runBetaBrowser } from "./browser";
import {
  BETA_ATTESTATION_TRUST_REGISTRY_PATH_ENV,
  BETA_ATTESTATION_TRUST_REGISTRY_SHA256_ENV,
  BETA_ATTESTATION_TRUST_ROOT_SHA256_ENV,
  resolveBetaAttestationTrustRoot,
} from "./attestations";
import {
  gitText,
  writeMaterializedCheckpointReceipt,
  writeTestCheckpointPolicy,
} from "./checkpoint-provenance.test-fixtures";
import { BETA_LOCAL_GATE_DEFINITIONS, BETA_PUBLIC_PACKAGE_COMMANDS } from "./contracts";
import { readBetaRunManifest } from "./evidence";
import { readBetaFixtureMatrix } from "./fixture-matrix";
import { runBetaFixtures } from "./fixtures";
import { writeSignedEducationalEvaluationTestFixture } from "./evaluation-test-fixtures";
import { runBetaLmsMock } from "./lms-mock";
import {
  BETA_LMS_STAGING_ACK,
  runBetaLmsStaging,
} from "./lms-staging";
import { writeConfirmedBetaLmsStagingWriteFixtures } from "./lms-staging-write-records.test-fixtures";
import { runBetaLocalGate } from "./local-gate";
import { getBetaQaResourceNamespace } from "./qa-resources";
import { runBetaPreflight } from "./preflight";
import {
  BETA_BROWSER_BUILD_COMMAND,
  BETA_BROWSER_COMMAND,
  getBetaSubjectGateCommand,
} from "./surface-contracts";
import { getBetaCertificationInputDirectory } from "./certifications";
import { readBetaSurfaceReceipt } from "./surface-evidence";
import { parseBetaSubjectsCliArguments } from "./surface-cli";
import { runBetaSubjects } from "./subjects";

const roots: string[] = [];
const RELEASE_SHA = "a".repeat(40);
const STAGING_URL =
  "https://diana-a1b2c3-teamcarrillo405-hubs-projects.vercel.app";

function createProject(options: {
  subjectScript?: boolean;
  browserSpec?: boolean;
} = {}): string {
  const root = mkdtempSync(path.join(tmpdir(), "diana-beta-surfaces-"));
  roots.push(root);
  writeFileSync(
    path.join(root, "package.json"),
    `${JSON.stringify({
      name: "diana",
      version: "1.0.0",
      engines: { node: "24.x" },
      scripts: {
        ...Object.fromEntries(
          BETA_LOCAL_GATE_DEFINITIONS.map((gate) => [gate.command[2], gate.packageScript]),
        ),
        ...Object.fromEntries(
          BETA_PUBLIC_PACKAGE_COMMANDS.map((command) => [command.scriptName, command.packageScript]),
        ),
      },
    })}\n`,
  );
  if (options.subjectScript) {
    mkdirSync(path.join(root, "scripts"));
    writeFileSync(
      path.join(root, "scripts", "educational-evaluation-gate.ts"),
      "export {};\n",
    );
  }
  if (options.browserSpec) {
    writeFileSync(
      path.join(root, "tsconfig.json"),
      `${JSON.stringify({ compilerOptions: { strict: true }, include: ["**/*.ts"] }, null, 2)}\n`,
    );
    mkdirSync(path.join(root, "tests"));
    writeFileSync(path.join(root, "tests", "beta-browser.spec.ts"), "export {};\n");
  }
  writeFileSync(path.join(root, ".gitignore"), "artifacts/\nnode_modules/\n");
  writeTestCheckpointPolicy(root);
  gitText(root, ["init", "--quiet"]);
  gitText(root, ["config", "user.email", "surfaces@example.invalid"]);
  gitText(root, ["config", "user.name", "Beta Surfaces Test"]);
  gitText(root, ["add", "."]);
  gitText(root, ["commit", "--quiet", "-m", "trusted policy base"]);
  return root;
}

function completedRun(projectRoot: string, runId: string): void {
  const now = () => new Date("2026-08-30T12:00:00.000Z");
  const parentSha = gitText(projectRoot, ["rev-parse", "HEAD"]);
  gitText(projectRoot, ["add", "-A", "--", "."]);
  gitText(projectRoot, [
    "commit",
    "--quiet",
    "--allow-empty",
    "-m",
    `candidate ${runId}`,
  ]);
  const candidateSha = gitText(projectRoot, ["rev-parse", "HEAD"]);
  writeMaterializedCheckpointReceipt({
    projectRoot,
    runId,
    candidateSha,
    parentSha,
  });
  runBetaPreflight({ projectRoot, runId, runtimeVersion: "24.4.0", now });
  runBetaLocalGate({
    projectRoot,
    runId,
    now,
    runCommand: () => ({ status: 0, signal: null }),
  });
  runBetaFixtures({ projectRoot, runId, now });
}

function mockReport(mode: "mock" | "staging"): ProviderCanaryReport {
  return {
    ok: true,
    mode,
    network: mode === "mock" ? "intercepted" : "staging-providers",
    checks: [{
      id: "scope-contract",
      name: "Scope contract",
      ok: true,
      detail: "The fixed provider scope contract is present.",
    }],
  };
}

function stagingEnvironment(
  runId: string,
  releaseSha: string = RELEASE_SHA,
): Record<string, string> {
  const namespace = getBetaQaResourceNamespace(runId);
  return {
    DIANA_BETA_LMS_DISPOSABLE: "true",
    DIANA_BETA_LMS_ENVIRONMENT: "staging",
    DIANA_BETA_QA_RUN_ID: runId,
    DIANA_BETA_LMS_RESOURCE_NAMESPACE: namespace,
    DIANA_BETA_LMS_CANVAS_RESOURCE_TAG: namespace,
    DIANA_BETA_LMS_GOOGLE_RESOURCE_TAG: namespace,
    DIANA_BETA_RELEASE_SHA: releaseSha,
    DIANA_BETA_LMS_STAGING_URL: STAGING_URL,
    DIANA_PROVIDER_CANARY_ALLOW_WRITES: "true",
    DIANA_LMS_CANVAS_IMPORT_ENABLED: "true",
    DIANA_LMS_CANVAS_SUBMISSION_ENABLED: "true",
    DIANA_LMS_GOOGLE_IMPORT_ENABLED: "true",
    DIANA_LMS_GOOGLE_SUBMISSION_ENABLED: "true",
    DIANA_CANARY_PREVIEW_ORIGIN: STAGING_URL,
    DIANA_CANARY_CANVAS_BASE_URL: "https://sandbox.canvas.test",
    DIANA_CANARY_CANVAS_INSTITUTION_ID: "beta-school",
    DIANA_CANARY_CANVAS_COURSE_ID: "course",
    DIANA_CANARY_CANVAS_TEXT_ASSIGNMENT_ID: "text-assignment",
    DIANA_CANARY_CANVAS_FILE_ASSIGNMENT_ID: "file-assignment",
    DIANA_CANARY_CANVAS_GRADE_ASSIGNMENT_ID: "grade-assignment",
    DIANA_CANARY_CANVAS_GRADE_STUDENT_ID: "grade-student",
    DIANA_CANARY_CANVAS_GRADE_SCORE: "18",
    DIANA_CANARY_GOOGLE_GRANTED_SCOPES: "scope-one scope-two",
    DIANA_CANARY_GOOGLE_COURSE_ID: "course",
    DIANA_CANARY_GOOGLE_FILE_COURSEWORK_ID: "coursework",
    DIANA_CANARY_CANVAS_ACCESS_TOKEN: "synthetic-value",
    DIANA_CANARY_CANVAS_REFRESH_TOKEN: "synthetic-value",
    DIANA_CANARY_CANVAS_CLIENT_ID: "synthetic-value",
    DIANA_CANARY_CANVAS_CLIENT_SECRET: "synthetic-value",
    DIANA_CANARY_GOOGLE_ACCESS_TOKEN: "synthetic-value",
    DIANA_CANARY_GOOGLE_REFRESH_TOKEN: "synthetic-value",
    DIANA_CANARY_GOOGLE_CLIENT_ID: "synthetic-value",
    DIANA_CANARY_GOOGLE_CLIENT_SECRET: "synthetic-value",
  };
}

function writeSubjectPlaceholder(projectRoot: string, runId: string): void {
  const directory = getBetaCertificationInputDirectory(projectRoot, runId);
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    path.join(directory, "educational-evaluation-results.json"),
    `${JSON.stringify({ runId })}\n`,
  );
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("deterministic beta command surfaces", { timeout: 90_000 }, () => {
  it("writes the fixed provider, subject, and authenticated browser fixture matrix", () => {
    const projectRoot = createProject();
    const runId = "beta-fixture-matrix-001";
    completedRun(projectRoot, runId);

    const matrix = readBetaFixtureMatrix(projectRoot, runId);
    expect(matrix.value.providers).toHaveLength(2);
    expect(matrix.value.providers.every((provider) => provider.cases.length === 13)).toBe(true);
    expect(matrix.value.subjectCases).toHaveLength(21);
    expect(matrix.value.browserScenarios).toEqual(["assignment-detail:default"]);
    expect(matrix.digest).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("accepts one explicit full flag on the public subjects argument boundary", () => {
    expect(
      parseBetaSubjectsCliArguments(["--run-id=beta-subjects-cli-001", "--full"]),
    ).toEqual({
      help: false,
      runId: "beta-subjects-cli-001",
      full: true,
    });
    expect(
      parseBetaSubjectsCliArguments(["--run-id=beta-subjects-cli-001"]),
    ).toEqual({
      help: false,
      runId: "beta-subjects-cli-001",
      full: false,
    });
    expect(() =>
      parseBetaSubjectsCliArguments([
        "--run-id=beta-subjects-cli-001",
        "--full",
        "--full",
      ]),
    ).toThrow(/only be provided once/iu);
  });

  it("records unique QA_RUN_ID resources and blocks the reserved corpus boundary until it lands", () => {
    const projectRoot = createProject();
    const runId = "beta-subjects-001";
    completedRun(projectRoot, runId);
    let invoked = false;
    const receipt = runBetaSubjects({
      projectRoot,
      runId,
      full: true,
      runCommand(command) {
        invoked = true;
        expect(command).toEqual(getBetaSubjectGateCommand(runId));
        return { status: 0, signal: null, stdout: null, stderr: null };
      },
    });

    expect(invoked).toBe(false);
    expect(receipt.status).toBe("blocked");
    expect(receipt.command).toBeNull();
    expect(receipt.resources.every((resource) => resource.id.includes(runId))).toBe(true);
    expect(new Set(receipt.resources.map((resource) => resource.id)).size)
      .toBe(receipt.resources.length);
  });

  it("runs the one frozen corpus command when its fixed file is available", () => {
    const projectRoot = createProject({ subjectScript: true });
    const runId = "beta-subjects-ready-001";
    writeSignedEducationalEvaluationTestFixture({ projectRoot, runId });
    completedRun(projectRoot, runId);
    let invocations = 0;

    const receipt = runBetaSubjects({
      projectRoot,
      runId,
      full: true,
      environment: {
        ...process.env,
        [BETA_ATTESTATION_TRUST_REGISTRY_PATH_ENV]: "C:\\attacker\\keys.json",
        [BETA_ATTESTATION_TRUST_REGISTRY_SHA256_ENV]: "a".repeat(64),
        [BETA_ATTESTATION_TRUST_ROOT_SHA256_ENV]: "b".repeat(64),
      },
      runCommand(command, context) {
        invocations += 1;
        expect(command).toEqual(getBetaSubjectGateCommand(runId));
        expect(context.environment.QA_RUN_ID).toBe(runId);
        expect(context.environment[BETA_ATTESTATION_TRUST_REGISTRY_PATH_ENV])
          .toBeUndefined();
        expect(context.environment[BETA_ATTESTATION_TRUST_REGISTRY_SHA256_ENV])
          .toBeUndefined();
        expect(context.environment[BETA_ATTESTATION_TRUST_ROOT_SHA256_ENV])
          .toBe(resolveBetaAttestationTrustRoot(projectRoot).trustRootSha256);
        return { status: 0, signal: null, stdout: null, stderr: null };
      },
    });

    expect(invocations).toBe(1);
    expect(receipt.status).toBe("pass");
    expect(receipt.command).toEqual(getBetaSubjectGateCommand(runId));
  });

  it("runs the real subjects child with only the validated repository trust-root pin", { timeout: 90_000 }, () => {
    const projectRoot = createProject({ subjectScript: true });
    const runId = "beta-subjects-real-child-001";
    const actualCli = pathToFileURL(
      path.resolve(process.cwd(), "lib", "educational-evaluation", "cli.ts"),
    ).href;
    writeFileSync(
      path.join(projectRoot, "scripts", "educational-evaluation-gate.ts"),
      [
        "// TEST-ONLY wrapper that executes Diana's real educational gate in a child process.",
        `import { runEducationalEvaluationCli } from ${JSON.stringify(actualCli)};`,
        "process.exitCode = runEducationalEvaluationCli(process.argv.slice(2));",
        "",
      ].join("\n"),
    );
    symlinkSync(
      path.resolve(process.cwd(), "node_modules"),
      path.join(projectRoot, "node_modules"),
      process.platform === "win32" ? "junction" : "dir",
    );
    const referenceTime = new Date();
    writeSignedEducationalEvaluationTestFixture({
      projectRoot,
      runId,
      referenceTime,
    });
    completedRun(projectRoot, runId);

    const receipt = runBetaSubjects({
      projectRoot,
      runId,
      full: true,
      now: () => referenceTime,
      environment: {
        ...process.env,
        [BETA_ATTESTATION_TRUST_REGISTRY_PATH_ENV]: "C:\\attacker\\keys.json",
        [BETA_ATTESTATION_TRUST_REGISTRY_SHA256_ENV]: "a".repeat(64),
        [BETA_ATTESTATION_TRUST_ROOT_SHA256_ENV]: "b".repeat(64),
      },
    });

    expect(receipt.status).toBe("pass");
    expect(receipt.exitCode).toBe(0);
    expect(receipt.command).toEqual(getBetaSubjectGateCommand(runId));
  });

  it("requires explicit full mode before invoking the 996-case subject path", () => {
    const projectRoot = createProject({ subjectScript: true });
    const runId = "beta-subjects-full-block-001";
    writeSignedEducationalEvaluationTestFixture({ projectRoot, runId });
    completedRun(projectRoot, runId);
    let invoked = false;

    const receipt = runBetaSubjects({
      projectRoot,
      runId,
      full: false,
      runCommand() {
        invoked = true;
        return { status: 0, signal: null, stdout: null, stderr: null };
      },
    });

    expect(invoked).toBe(false);
    expect(receipt.status).toBe("blocked");
    expect(receipt.checks.find((check) => check.id === "full-mode")?.status).toBe("block");
  });

  it("blocks a run-ID-only placeholder before a successful command can be reported", () => {
    const projectRoot = createProject({ subjectScript: true });
    const runId = "beta-subjects-placeholder-001";
    completedRun(projectRoot, runId);
    writeSubjectPlaceholder(projectRoot, runId);
    let invoked = false;

    const receipt = runBetaSubjects({
      projectRoot,
      runId,
      full: true,
      runCommand() {
        invoked = true;
        return { status: 0, signal: null, stdout: null, stderr: null };
      },
    });

    expect(invoked).toBe(false);
    expect(receipt.status).toBe("blocked");
    expect(receipt.checks.find((check) => check.id === "full-results-input"))
      .toMatchObject({ status: "block" });
  });

  it("pins the browser command, project, spec, local URL, and run-scoped environment", () => {
    const projectRoot = createProject({ browserSpec: true });
    const runId = "beta-browser-001";
    completedRun(projectRoot, runId);
    const rootTypeScriptConfig = readFileSync(path.join(projectRoot, "tsconfig.json"), "utf8");
    let generatedTypeScriptConfig = "";
    const commands: string[][] = [];

    const receipt = runBetaBrowser({
      projectRoot,
      runId,
      environment: {
        PATH: process.env.PATH,
        PRIVATE_TOKEN: "not-for-child",
        DIANA_BETA_LOCAL_SUPABASE_URL: "http://127.0.0.1:54321",
        DIANA_BETA_LOCAL_SUPABASE_PUBLISHABLE_KEY: "publishable-local-test-key-123456",
        DIANA_BETA_LOCAL_SUPABASE_SERVICE_ROLE_KEY: "service-local-test-key-1234567890",
      },
      runCommand(command, context) {
        commands.push([...command]);
        expect(context.captureOutput).toBe(false);
        expect(context.environment.QA_RUN_ID).toBe(runId);
        expect(context.environment.QA_BASE_URL).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/u);
        expect(context.environment.NEXT_PUBLIC_APP_URL).toBe(
          context.environment.QA_BASE_URL,
        );
        expect(context.environment.QA_CREATE_USER).toBe("true");
        expect(context.environment.QA_REUSE_EXISTING_SERVER).toBe("false");
        expect(context.environment.QA_SERVER_MODE).toBe("production");
        expect(context.environment.NEXT_PUBLIC_DIANA_BETA_BROWSER_QA).toBe("true");
        expect(context.environment.QA_TEST_EMAIL).toMatch(
          /^diana-beta-[a-f0-9]{16}@local\.test$/u,
        );
        expect(context.environment.QA_TEST_PASSWORD).toBeUndefined();
        expect(context.environment.NEXT_PUBLIC_SUPABASE_URL).toBe("http://127.0.0.1:54321");
        expect(context.environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBe(
          "publishable-local-test-key-123456",
        );
        expect(context.environment.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe(
          "publishable-local-test-key-123456",
        );
        expect(context.environment.SUPABASE_SERVICE_ROLE_KEY).toBe(
          "service-local-test-key-1234567890",
        );
        expect(context.environment.QA_NEXT_DIST_DIR).toMatch(/^\.next-beta-[a-f0-9]{12}$/u);
        expect(context.environment.QA_TSCONFIG_PATH).toMatch(
          /^\.tsconfig-beta-[a-f0-9]{12}\.json$/u,
        );
        expect(context.environment.NEXT_TYPESCRIPT_CONFIG).toBe(
          context.environment.QA_TSCONFIG_PATH,
        );
        generatedTypeScriptConfig = path.join(
          projectRoot,
          context.environment.QA_TSCONFIG_PATH!,
        );
        expect(existsSync(generatedTypeScriptConfig)).toBe(true);
        const generated = JSON.parse(readFileSync(generatedTypeScriptConfig, "utf8")) as {
          compilerOptions: { strict?: boolean };
          include: string[];
        };
        expect(generated.compilerOptions.strict).toBe(true);
        expect(generated.include).toContain(
          `${context.environment.QA_NEXT_DIST_DIR}/types/**/*.ts`,
        );
        expect(context.environment.PRIVATE_TOKEN).toBeUndefined();
        if (command[1] === "next") {
          expect(command).toEqual(BETA_BROWSER_BUILD_COMMAND);
          return { status: 0, signal: null, stdout: null, stderr: null };
        }
        expect(command).toEqual(BETA_BROWSER_COMMAND);
        return { status: 0, signal: null, stdout: null, stderr: null };
      },
    });

    expect(receipt.status).toBe("pass");
    expect(receipt.command).toEqual(BETA_BROWSER_COMMAND);
    expect(commands).toEqual([BETA_BROWSER_BUILD_COMMAND, BETA_BROWSER_COMMAND]);
    expect(receipt.checks.find((check) => check.id === "browser-production-build"))
      .toMatchObject({ status: "pass" });
    expect(readFileSync(path.join(projectRoot, "tsconfig.json"), "utf8")).toBe(
      rootTypeScriptConfig,
    );
    expect(existsSync(generatedTypeScriptConfig)).toBe(false);
    expect(readBetaSurfaceReceipt(projectRoot, runId, "browser")).toEqual(receipt);
  });

  it("does not launch browser checks when the isolated production build fails", () => {
    const projectRoot = createProject({ browserSpec: true });
    const runId = "beta-browser-build-failure-001";
    completedRun(projectRoot, runId);
    const commands: string[][] = [];

    const receipt = runBetaBrowser({
      projectRoot,
      runId,
      environment: {
        PATH: process.env.PATH,
        DIANA_BETA_LOCAL_SUPABASE_URL: "http://127.0.0.1:54321",
        DIANA_BETA_LOCAL_SUPABASE_PUBLISHABLE_KEY: "publishable-local-test-key-123456",
        DIANA_BETA_LOCAL_SUPABASE_SERVICE_ROLE_KEY: "service-local-test-key-1234567890",
      },
      runCommand(command) {
        commands.push([...command]);
        expect(command).toEqual(BETA_BROWSER_BUILD_COMMAND);
        return { status: 1, signal: null, stdout: null, stderr: null };
      },
    });

    expect(commands).toEqual([BETA_BROWSER_BUILD_COMMAND]);
    expect(receipt.status).toBe("blocked");
    expect(receipt.command).toEqual(BETA_BROWSER_BUILD_COMMAND);
    expect(receipt.network).toBe("not-run");
    expect(receipt.writes).toBe("none");
    expect(receipt.checks.find((check) => check.id === "browser-production-build"))
      .toMatchObject({ status: "block" });
    expect(receipt.checks.find((check) => check.id === "browser-result"))
      .toMatchObject({ status: "block" });
  });

  it("fails closed before launch without a distinct dedicated loopback Supabase project", () => {
    let invoked = false;
    const runCommand = () => {
      invoked = true;
      return { status: 0, signal: null, stdout: null, stderr: null };
    };

    const cases = [
      {
        runId: "beta-browser-auth-boundary-missing-001",
        environment: {},
        message: /dedicated loopback Supabase URL/iu,
      },
      {
        runId: "beta-browser-auth-boundary-remote-001",
        environment: {
          DIANA_BETA_LOCAL_SUPABASE_URL: "https://supabase.example.test",
          DIANA_BETA_LOCAL_SUPABASE_PUBLISHABLE_KEY: "publishable-local-test-key-123456",
          DIANA_BETA_LOCAL_SUPABASE_SERVICE_ROLE_KEY: "service-local-test-key-1234567890",
        },
        message: /only a dedicated loopback Supabase project/iu,
      },
      {
        runId: "beta-browser-auth-boundary-shared-001",
        environment: {
          DIANA_BETA_LOCAL_SUPABASE_URL: betaBrowserRuntime(
            "beta-browser-auth-boundary-shared-001",
          ).baseUrl,
          DIANA_BETA_LOCAL_SUPABASE_PUBLISHABLE_KEY: "publishable-local-test-key-123456",
          DIANA_BETA_LOCAL_SUPABASE_SERVICE_ROLE_KEY: "service-local-test-key-1234567890",
        },
        message: /own loopback port/iu,
      },
    ];

    for (const testCase of cases) {
      const projectRoot = createProject({ browserSpec: true });
      completedRun(projectRoot, testCase.runId);
      const receipt = runBetaBrowser({
        projectRoot,
        runId: testCase.runId,
        environment: testCase.environment,
        runCommand,
      });

      expect(receipt.status).toBe("blocked");
      expect(receipt.command).toBeNull();
      expect(receipt.checks.find((check) => check.id === "browser-configuration"))
        .toMatchObject({ status: "block", detail: expect.stringMatching(testCase.message) });
      expect(readBetaSurfaceReceipt(projectRoot, testCase.runId, "browser")).toEqual(receipt);
    }
    expect(invoked).toBe(false);
  });

  it("locks the browser spec to real auth, complete monitoring, WCAG AA, and failure artifacts", () => {
    const helper = readFileSync(
      path.join(process.cwd(), "tests", "helpers", "beta-browser.ts"),
      "utf8",
    );
    const spec = readFileSync(
      path.join(process.cwd(), "tests", "beta-browser.spec.ts"),
      "utf8",
    );
    const playwrightConfig = readFileSync(
      path.join(process.cwd(), "playwright.config.ts"),
      "utf8",
    );
    const allowlist = helper.match(
      /const BROWSER_ISSUE_ALLOWLIST:[\s\S]*?^\];/mu,
    )?.[0] ?? "";
    const accessibilityGate = helper.match(
      /export async function expectNoWcagAaAccessibilityViolations[\s\S]*?^\}/mu,
    )?.[0] ?? "";

    expect(helper).not.toMatch(
      /\b(?:createServer|startBetaSupabaseStub|stopBetaSupabaseStub|QaSessionResult)\b/u,
    );
    expect(helper).toContain('page.on("pageerror"');
    expect(helper).toContain('page.on("console"');
    expect(helper).toContain('page.on("requestfailed"');
    expect(helper).toContain('page.on("response"');
    expect(helper).toContain('"hydration-error"');
    expect(helper).toContain('"same-origin-subresource"');
    expect(allowlist.match(/\bpattern:/gu) ?? []).toHaveLength(3);
    expect(allowlist).toContain("GL Driver Message");
    expect(allowlist).toContain("GPU stall due to ReadPixels");
    expect(allowlist).toContain("preloaded using link preload");
    expect(accessibilityGate).toContain(
      '.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])',
    );
    expect(accessibilityGate).toContain("results.violations.map");
    expect(accessibilityGate).not.toContain("results.violations.filter");

    expect(spec).toContain('trace: "off"');
    expect(spec).toContain('screenshot: { mode: "only-on-failure", fullPage: true }');
    expect(spec).toContain("for (const viewport of BETA_AUTHENTICATED_VIEWPORTS)");
    expect(spec).toContain("await openLocalQaStudentSession(page)");
    expect(spec).toContain('getByRole("textbox", STUDENT_WORK_TEXTBOX)');
    expect(spec).toContain('locator(".sd-assignment-inline-save")).toHaveText("Saved"');
    expect(spec).toContain("await context.clearCookies()");
    expect(spec).toContain('"Recovered unsaved work"');
    expect(spec).not.toMatch(/test\.(?:skip|fixme)|\.skip\(/u);
    expect(playwrightConfig).toContain('QA_SERVER_MODE must be development or production.');
    expect(playwrightConfig).toContain('npm run start -- -p ${qaPort}');
  });

  it("keeps the shipping browser wrapper bound to dedicated local Supabase inputs", () => {
    const wrapper = readFileSync(
      path.join(process.cwd(), "scripts", "beta", "browser.ts"),
      "utf8",
    );

    expect(wrapper).not.toContain("localOnlyBrowserEnvironment");
    expect(wrapper).not.toContain("sb_publishable_local_beta_placeholder");
    expect(wrapper).toContain("runBetaBrowser({");
    expect(wrapper).toContain('credentials: "dedicated-local-supabase"');
  });

  it("runs the intercepted provider certification without external writes", async () => {
    const projectRoot = createProject();
    const runId = "beta-lms-mock-001";
    completedRun(projectRoot, runId);
    const receipt = await runBetaLmsMock({
      projectRoot,
      runId,
      runCanary: async () => mockReport("mock"),
    });

    expect(receipt.status).toBe("pass");
    expect(receipt.network).toBe("intercepted");
    expect(receipt.writes).toBe("none");
  });

  it("does not invoke staging providers when acknowledgement is absent", () => {
    const projectRoot = createProject();
    const runId = "beta-lms-staging-block-001";
    completedRun(projectRoot, runId);
    let invoked = false;
    const receipt = runBetaLmsStaging({
      projectRoot,
      runId,
      acknowledgement: null,
      environment: stagingEnvironment(runId),
      runCommand() {
        invoked = true;
        return { status: 0, signal: null, stdout: null, stderr: null };
      },
    });

    expect(invoked).toBe(false);
    expect(receipt.status).toBe("blocked");
    expect(receipt.command).toBeNull();
    expect(receipt.writes).toBe("none");
    expect(receipt.network).toBe("not-run");
  });

  it("does not invoke staging providers when disposable configuration is absent", () => {
    const projectRoot = createProject();
    const runId = "beta-lms-staging-config-block-001";
    completedRun(projectRoot, runId);
    let invoked = false;
    const receipt = runBetaLmsStaging({
      projectRoot,
      runId,
      acknowledgement: BETA_LMS_STAGING_ACK,
      environment: {},
      runCommand() {
        invoked = true;
        return { status: 0, signal: null, stdout: null, stderr: null };
      },
    });

    expect(invoked).toBe(false);
    expect(receipt.status).toBe("blocked");
    expect(receipt.command).toBeNull();
    expect(receipt.writes).toBe("none");
  });

  it("uses the fixed staging command only after every disposable guard passes", async () => {
    const projectRoot = createProject();
    const runId = "beta-lms-staging-pass-001";
    completedRun(projectRoot, runId);
    const releaseSha = readBetaRunManifest(projectRoot, runId).source.commitSha;
    await writeConfirmedBetaLmsStagingWriteFixtures({
      projectRoot,
      runId,
      stagingUrl: STAGING_URL,
    });
    let invocations = 0;
    const receipt = runBetaLmsStaging({
      projectRoot,
      runId,
      acknowledgement: BETA_LMS_STAGING_ACK,
      environment: stagingEnvironment(runId, releaseSha),
      runCommand(command, context) {
        invocations += 1;
        expect(command).toEqual([
          "npx",
          "tsx",
          "scripts/provider-canary.ts",
          "--mode=staging",
        ]);
        expect(context.captureOutput).toBe(true);
        return {
          status: 0,
          signal: null,
          stdout: JSON.stringify(mockReport("staging")),
          stderr: null,
        };
      },
    });

    expect(invocations).toBe(1);
    expect(receipt.status).toBe("pass");
    expect(receipt.writes).toBe("disposable-staging");
    expect(receipt.bindings).toEqual({ releaseSha, url: STAGING_URL });
  });
});
