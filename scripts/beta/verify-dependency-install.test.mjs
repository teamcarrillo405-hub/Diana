import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, test } from "node:test";

import {
  DEPENDENCY_INSTALL_SCRIPT_BODY,
  DEPENDENCY_INSTALL_SCRIPT_NAME,
  DependencyInstallVerificationError,
  NPM_CI_COMMAND,
  NPM_CI_PROVENANCE_KIND,
  NPM_CI_PROVENANCE_SCHEMA_VERSION,
  formatVerificationFailure,
  verifyDependencyInstall,
} from "./verify-dependency-install.mjs";

const roots = [];
const runningNodePath = realpathSync(process.execPath);
const runningNpmCliPath = realpathSync(path.join(
  path.dirname(runningNodePath),
  "node_modules",
  "npm",
  "bin",
  "npm-cli.js",
));

function createFixture(options = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "diana-beta-dependencies-"));
  roots.push(root);
  const version = options.projectVersion ?? "1.2.3";
  const dependencies = options.dependencies ?? { fixture: "1.0.0" };
  const optionalDependencies = options.optionalDependencies ?? {};
  const packageJson = {
    name: "diana",
    version,
    packageManager: "npm@11.11.0",
    engines: { node: "24.x", npm: "11.11.0" },
    scripts: {
      [DEPENDENCY_INSTALL_SCRIPT_NAME]: DEPENDENCY_INSTALL_SCRIPT_BODY,
    },
    dependencies,
    ...(Object.keys(optionalDependencies).length > 0 ? { optionalDependencies } : {}),
    ...options.packageOverrides,
  };
  const defaultPackages = {
    "": {
      name: "diana",
      version,
      dependencies,
      ...(Object.keys(optionalDependencies).length > 0 ? { optionalDependencies } : {}),
    },
    "node_modules/fixture": { version: "1.0.0" },
  };
  const lockfile = {
    name: "diana",
    version,
    lockfileVersion: 3,
    requires: true,
    packages: options.lockPackages ?? defaultPackages,
    ...options.lockOverrides,
  };

  writeFileSync(path.join(root, "package.json"), `${JSON.stringify(packageJson)}\n`);
  writeFileSync(path.join(root, "package-lock.json"), `${JSON.stringify(lockfile)}\n`);

  const fakeNpmRoot = path.join(root, ".tools", "npm");
  const fakeNpmCliPath = path.join(fakeNpmRoot, "bin", "npm-cli.js");
  mkdirSync(path.dirname(fakeNpmCliPath), { recursive: true });
  writeFileSync(fakeNpmCliPath, "// fixture npm cli\n");
  writeFileSync(
    path.join(fakeNpmRoot, "package.json"),
    `${JSON.stringify({ name: "npm", version: options.npmPackageVersion ?? "11.11.0" })}\n`,
  );

  const realRoot = realpathSync(root);
  const tree = options.tree ?? {
    name: "diana",
    version,
    path: realRoot,
    dependencies: {
      fixture: {
        name: "fixture",
        version: "1.0.0",
        path: path.join(realRoot, "node_modules", "fixture"),
      },
    },
  };
  const environment = {
    PATH: process.env.PATH,
    SYSTEMROOT: process.env.SYSTEMROOT,
    TEMP: process.env.TEMP,
    SUPER_SECRET_TOKEN: "must-not-reach-npm-or-output",
    npm_execpath: runningNpmCliPath,
    npm_node_execpath: runningNodePath,
    npm_package_json: path.join(realRoot, "package.json"),
    npm_lifecycle_event: DEPENDENCY_INSTALL_SCRIPT_NAME,
    npm_lifecycle_script: DEPENDENCY_INSTALL_SCRIPT_BODY,
    ...options.environment,
  };

  return {
    environment,
    fakeNpmCliPath,
    npmCliPath: runningNpmCliPath,
    packageJson,
    realRoot,
    root,
    tree,
  };
}

function createRunner({
  ciStatus = 0,
  npmVersion = "11.11.0",
  onCi,
  tree,
  treeStatus = 0,
}) {
  const calls = [];
  return {
    calls,
    runCommand(file, args, options) {
      calls.push({ file, args, options });
      if (args[1] === "--version") {
        return { status: 0, signal: null, stdout: `${npmVersion}\n`, stderr: "" };
      }
      if (args[1] === "ci") {
        assert.deepEqual(args.slice(1), NPM_CI_COMMAND.slice(1));
        onCi?.();
        return { status: ciStatus, signal: null, stdout: "", stderr: "" };
      }
      assert.deepEqual(args.slice(1), [
        "ls",
        "--all",
        "--json",
        "--long",
        "--offline",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
      ]);
      return {
        status: treeStatus,
        signal: null,
        stdout: JSON.stringify(tree),
        stderr: "registry token must never be surfaced",
      };
    },
  };
}

function captureVerificationError(callback) {
  try {
    callback();
    assert.fail("Expected dependency verification to be blocked");
  } catch (error) {
    assert.ok(error instanceof DependencyInstallVerificationError);
    return error;
  }
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

test("verifies the source-bound lock tree with the exact Node and npm runtimes", () => {
  const fixture = createFixture();
  const runner = createRunner({ tree: fixture.tree });
  const report = verifyDependencyInstall({
    projectRoot: fixture.root,
    environment: fixture.environment,
    nodeVersion: "24.14.1",
    platform: "win32",
    arch: "x64",
    runCommand: runner.runCommand,
  });

  assert.equal(report.schemaVersion, NPM_CI_PROVENANCE_SCHEMA_VERSION);
  assert.equal(report.kind, NPM_CI_PROVENANCE_KIND);
  assert.equal(report.status, "pass");
  assert.deepEqual(report.install.command, NPM_CI_COMMAND);
  assert.equal(report.install.exitCode, 0);
  assert.equal(report.install.packageJsonUnchanged, true);
  assert.equal(report.install.packageLockUnchanged, true);
  assert.equal(report.install.lifecycleScriptsRun, false);
  assert.equal(report.install.network, "registry-or-cache");
  assert.match(report.source.packageJsonSha256, /^[a-f0-9]{64}$/u);
  assert.match(report.source.packageLockSha256, /^[a-f0-9]{64}$/u);
  assert.equal(report.source.lockfileVersion, 3);
  assert.equal(report.runtime.nodeEngine, "24.x");
  assert.equal(report.runtime.nodeVersion, "24.14.1");
  assert.equal(report.runtime.npmVersion, "11.11.0");
  assert.match(report.runtime.nodeExecutableSha256, /^[a-f0-9]{64}$/u);
  assert.match(report.runtime.npmCliSha256, /^[a-f0-9]{64}$/u);
  assert.equal(report.runtime.platform, "win32");
  assert.equal(report.runtime.arch, "x64");
  assert.equal(report.tree.lockPackageCount, 1);
  assert.equal(report.tree.installedPackageCount, 1);
  assert.equal(report.tree.optionalPlaceholderCount, 0);
  assert.equal(report.tree.optionalPeerPlaceholderCount, 0);
  assert.equal(report.tree.peerPlaceholderCount, 0);
  assert.equal(runner.calls.length, 3);

  for (const [index, call] of runner.calls.entries()) {
    assert.equal(call.file, runningNodePath);
    assert.equal(call.args[0], runningNpmCliPath);
    assert.equal(call.options.cwd, fixture.realRoot);
    assert.equal(call.options.shell, false);
    assert.equal(
      call.options.env.NPM_CONFIG_OFFLINE,
      index === 1 ? undefined : "true",
    );
    assert.equal(call.options.env.NPM_CONFIG_IGNORE_SCRIPTS, "true");
    assert.equal(call.options.env.SUPER_SECRET_TOKEN, undefined);
  }
  assert.equal(JSON.stringify(report).includes(fixture.realRoot), false);
  assert.equal(JSON.stringify(report).includes("must-not-reach"), false);
});

test("blocks failed npm ci and source files changed by the install boundary", () => {
  const failedFixture = createFixture();
  const failedRunner = createRunner({ ciStatus: 1, tree: failedFixture.tree });
  const failedError = captureVerificationError(() => verifyDependencyInstall({
    projectRoot: failedFixture.root,
    environment: failedFixture.environment,
    nodeVersion: "24.14.1",
    runCommand: failedRunner.runCommand,
  }));
  assert.deepEqual(failedError.issues, [{ code: "npm-ci-invalid" }]);
  assert.equal(failedRunner.calls.length, 2);

  const changedFixture = createFixture();
  const lockPath = path.join(changedFixture.root, "package-lock.json");
  const changedRunner = createRunner({
    tree: changedFixture.tree,
    onCi() {
      writeFileSync(lockPath, `${readFileSync(lockPath, "utf8")} `);
    },
  });
  const changedError = captureVerificationError(() => verifyDependencyInstall({
    projectRoot: changedFixture.root,
    environment: changedFixture.environment,
    nodeVersion: "24.14.1",
    runCommand: changedRunner.runCommand,
  }));
  assert.deepEqual(changedError.issues, [{ code: "source-binding-invalid" }]);
  assert.equal(changedRunner.calls.length, 2);
});

test("blocks a gate that is not bound to the exact package lifecycle", () => {
  const fixture = createFixture({
    environment: { npm_lifecycle_event: "beta:gate:local" },
  });
  const runner = createRunner({ tree: fixture.tree });
  const error = captureVerificationError(() => verifyDependencyInstall({
    projectRoot: fixture.root,
    environment: fixture.environment,
    nodeVersion: "24.14.1",
    runCommand: runner.runCommand,
  }));

  assert.deepEqual(error.issues, [{ code: "source-binding-invalid" }]);
  assert.equal(runner.calls.length, 0);
});

test("blocks Node or npm versions outside the exact package pins", () => {
  const nodeFixture = createFixture();
  const nodeRunner = createRunner({ tree: nodeFixture.tree });
  const nodeError = captureVerificationError(() => verifyDependencyInstall({
    projectRoot: nodeFixture.root,
    environment: nodeFixture.environment,
    nodeVersion: "23.11.0",
    runCommand: nodeRunner.runCommand,
  }));
  assert.deepEqual(nodeError.issues, [{ code: "node-runtime-mismatch" }]);
  assert.equal(nodeRunner.calls.length, 0);

  const npmFixture = createFixture();
  const npmRunner = createRunner({ npmVersion: "11.10.0", tree: npmFixture.tree });
  const npmError = captureVerificationError(() => verifyDependencyInstall({
    projectRoot: npmFixture.root,
    environment: npmFixture.environment,
    nodeVersion: "24.14.1",
    runCommand: npmRunner.runCommand,
  }));
  assert.deepEqual(npmError.issues, [{ code: "npm-runtime-mismatch" }]);
  assert.equal(npmRunner.calls.length, 1);

  const pinFixture = createFixture({
    packageOverrides: { engines: { node: "24.x", npm: "11.10.0" } },
  });
  const pinRunner = createRunner({ tree: pinFixture.tree });
  const pinError = captureVerificationError(() => verifyDependencyInstall({
    projectRoot: pinFixture.root,
    environment: pinFixture.environment,
    nodeVersion: "24.14.1",
    runCommand: pinRunner.runCommand,
  }));
  assert.deepEqual(pinError.issues, [{ code: "package-invalid" }]);
  assert.equal(pinRunner.calls.length, 0);
});

test("rejects a same-version npm-cli.js injected through the environment", () => {
  const fixture = createFixture();
  const runner = createRunner({ tree: fixture.tree });
  const error = captureVerificationError(() => verifyDependencyInstall({
    projectRoot: fixture.root,
    environment: {
      ...fixture.environment,
      npm_execpath: fixture.fakeNpmCliPath,
      PATH: `${path.dirname(fixture.fakeNpmCliPath)}${path.delimiter}${fixture.environment.PATH ?? ""}`,
    },
    nodeVersion: "24.14.1",
    runCommand: runner.runCommand,
  }));

  assert.deepEqual(error.issues, [{ code: "source-binding-invalid" }]);
  assert.equal(runner.calls.length, 0);
});

test("blocks package and lock declaration drift before invoking npm", () => {
  const fixture = createFixture({
    lockPackages: {
      "": {
        name: "diana",
        version: "1.2.3",
        dependencies: { fixture: "2.0.0" },
      },
      "node_modules/fixture": { version: "2.0.0" },
    },
  });
  const runner = createRunner({ tree: fixture.tree });
  const error = captureVerificationError(() => verifyDependencyInstall({
    projectRoot: fixture.root,
    environment: fixture.environment,
    nodeVersion: "24.14.1",
    runCommand: runner.runCommand,
  }));

  assert.deepEqual(error.issues, [{ code: "lock-root-mismatch" }]);
  assert.equal(runner.calls.length, 0);
});

test("blocks lock version drift and reports only sanitized package findings", () => {
  const dependencies = { fixture: "2.0.0", missing: "1.0.0" };
  const fixture = createFixture({
    dependencies,
    lockPackages: {
      "": { name: "diana", version: "1.2.3", dependencies },
      "node_modules/fixture": { version: "2.0.0" },
      "node_modules/missing": { version: "1.0.0" },
    },
  });
  const tree = {
    name: "diana",
    version: "1.2.3",
    path: fixture.realRoot,
    problems: [
      `extraneous: rogue@9.9.9 ${path.join(fixture.realRoot, "private", "hunter2")}`,
    ],
    dependencies: {
      fixture: {
        name: "fixture",
        version: "1.0.0",
        invalid: "2.0.0",
        path: path.join(fixture.realRoot, "node_modules", "fixture"),
      },
      missing: { name: "missing", missing: true },
      rogue: {
        name: "rogue",
        version: "9.9.9",
        extraneous: true,
        path: path.join(fixture.realRoot, "node_modules", "rogue"),
      },
    },
  };
  const runner = createRunner({ tree, treeStatus: 1 });
  const error = captureVerificationError(() => verifyDependencyInstall({
    projectRoot: fixture.root,
    environment: fixture.environment,
    nodeVersion: "24.14.1",
    runCommand: runner.runCommand,
  }));
  const output = formatVerificationFailure(error);

  assert.deepEqual(error.issues, [
    { code: "dependency-extraneous", packageName: "rogue" },
    { code: "dependency-invalid", packageName: "fixture" },
    { code: "dependency-lock-mismatch", packageName: "fixture" },
    { code: "dependency-missing", packageName: "missing" },
    { code: "npm-tree-invalid" },
  ]);
  assert.equal(output.includes("fixture"), true);
  assert.equal(output.includes("missing"), true);
  assert.equal(output.includes("rogue"), true);
  assert.equal(output.includes(fixture.realRoot), false);
  assert.equal(output.includes("hunter2"), false);
  assert.equal(output.includes("registry token"), false);
});

test("allows platform-optional lock entries to be absent", () => {
  const optionalDependencies = { "optional-fixture": "1.0.0" };
  const fixture = createFixture({
    dependencies: {},
    optionalDependencies,
    lockPackages: {
      "": {
        name: "diana",
        version: "1.2.3",
        optionalDependencies,
      },
      "node_modules/optional-fixture": { version: "1.0.0", optional: true },
    },
  });
  const tree = {
    name: "diana",
    version: "1.2.3",
    path: fixture.realRoot,
    dependencies: {},
  };
  const runner = createRunner({ tree });
  const report = verifyDependencyInstall({
    projectRoot: fixture.root,
    environment: fixture.environment,
    nodeVersion: "24.14.1",
    runCommand: runner.runCommand,
  });

  assert.equal(report.status, "pass");
  assert.equal(report.tree.lockPackageCount, 1);
  assert.equal(report.tree.installedPackageCount, 0);
});

test("accepts npm 11 empty optional and peer placeholders declared by the lock", () => {
  const dependencies = { fixture: "1.0.0", "peer-fixture": "1.0.0" };
  const fixture = createFixture({
    dependencies,
    lockPackages: {
      "": { name: "diana", version: "1.2.3", dependencies },
      "node_modules/fixture": {
        version: "1.0.0",
        optionalDependencies: { "optional-fixture": "1.0.0" },
        peerDependencies: {
          "optional-peer-fixture": "^1.0.0",
          "peer-fixture": "^1.0.0",
        },
        peerDependenciesMeta: {
          "optional-peer-fixture": { optional: true },
        },
      },
      "node_modules/optional-fixture": { version: "1.0.0", optional: true },
      "node_modules/optional-peer-fixture": {
        version: "1.0.0",
        optional: true,
        peer: true,
      },
      "node_modules/peer-fixture": { version: "1.0.0" },
    },
  });
  const tree = {
    name: "diana",
    version: "1.2.3",
    path: fixture.realRoot,
    dependencies: {
      fixture: {
        name: "fixture",
        version: "1.0.0",
        path: path.join(fixture.realRoot, "node_modules", "fixture"),
        dependencies: {
          "optional-fixture": {},
          "optional-peer-fixture": {},
          "peer-fixture": {},
        },
      },
      "peer-fixture": {
        name: "peer-fixture",
        version: "1.0.0",
        path: path.join(fixture.realRoot, "node_modules", "peer-fixture"),
      },
    },
  };
  const runner = createRunner({ tree });
  const report = verifyDependencyInstall({
    projectRoot: fixture.root,
    environment: fixture.environment,
    nodeVersion: "24.14.1",
    runCommand: runner.runCommand,
  });

  assert.equal(report.status, "pass");
  assert.equal(report.tree.optionalPlaceholderCount, 1);
  assert.equal(report.tree.optionalPeerPlaceholderCount, 1);
  assert.equal(report.tree.peerPlaceholderCount, 1);
  assert.equal(report.tree.installedPackageCount, 2);
});

test("does not accept an empty required dependency as an npm placeholder", () => {
  const dependencies = { fixture: "1.0.0", required: "1.0.0" };
  const fixture = createFixture({
    dependencies,
    lockPackages: {
      "": { name: "diana", version: "1.2.3", dependencies },
      "node_modules/fixture": { version: "1.0.0" },
      "node_modules/required": { version: "1.0.0" },
    },
  });
  const tree = {
    name: "diana",
    version: "1.2.3",
    path: fixture.realRoot,
    dependencies: {
      fixture: {
        name: "fixture",
        version: "1.0.0",
        path: path.join(fixture.realRoot, "node_modules", "fixture"),
      },
      required: {},
    },
  };
  const runner = createRunner({ tree });
  const error = captureVerificationError(() => verifyDependencyInstall({
    projectRoot: fixture.root,
    environment: fixture.environment,
    nodeVersion: "24.14.1",
    runCommand: runner.runCommand,
  }));

  assert.deepEqual(error.issues, [
    { code: "dependency-missing", packageName: "required" },
    { code: "tree-output-invalid" },
  ]);
});
