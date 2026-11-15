import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEPENDENCY_INSTALL_SCRIPT_NAME = "beta:dependencies";
export const DEPENDENCY_INSTALL_SCRIPT_BODY =
  "node scripts/beta/verify-dependency-install.mjs";
export const REQUIRED_NODE_ENGINE = "24.x";
export const NPM_CI_PROVENANCE_SCHEMA_VERSION = 1;
export const NPM_CI_PROVENANCE_KIND = "diana-beta-npm-ci-provenance";
export const NPM_CI_COMMAND = [
  "npm",
  "ci",
  "--ignore-scripts",
  "--no-audit",
  "--no-fund",
  "--include=dev",
  "--include=optional",
  "--include=peer",
];

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_PROJECT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..", "..");
const SAFE_PACKAGE_NAME = /^(?:@[a-z0-9._~-]+\/)?[a-z0-9._~-]+$/iu;
const DEPENDENCY_FIELDS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
];
const CHILD_ENVIRONMENT_KEYS = new Set([
  "APPDATA",
  "COMSPEC",
  "HOME",
  "HOMEDRIVE",
  "HOMEPATH",
  "LOCALAPPDATA",
  "NO_COLOR",
  "NUMBER_OF_PROCESSORS",
  "OS",
  "PATH",
  "PATHEXT",
  "PROCESSOR_ARCHITECTURE",
  "PROGRAMDATA",
  "PROGRAMFILES",
  "PROGRAMFILES(X86)",
  "SYSTEMROOT",
  "TEMP",
  "TMP",
  "TMPDIR",
  "USERPROFILE",
  "WINDIR",
]);

const ISSUE_MESSAGES = {
  "dependency-invalid": "Installed dependency is invalid",
  "dependency-lock-mismatch": "Installed dependency does not match package-lock.json",
  "dependency-missing": "Required dependency is missing",
  "dependency-extraneous": "Installed dependency is extraneous",
  "lock-root-mismatch": "package.json dependency declarations do not match package-lock.json",
  "lockfile-invalid": "package-lock.json must be a regular lockfileVersion 3 file",
  "node-runtime-mismatch": "Node must run the gate under the allowed 24.x runtime",
  "npm-ci-invalid": "npm ci did not complete successfully",
  "npm-cli-invalid": "The running Node installation must provide a regular npm CLI installation",
  "npm-runtime-mismatch": "The running npm version does not match the exact package.json pin",
  "npm-tree-invalid": "npm could not validate the installed dependency tree",
  "package-invalid": "package.json must contain the fixed Diana dependency gate metadata",
  "source-binding-invalid": "The dependency gate is not bound to this package source",
  "tree-output-invalid": "npm returned an invalid dependency tree report",
  "verification-error": "Dependency installation verification could not complete safely",
};

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safePackageName(value) {
  return typeof value === "string" && SAFE_PACKAGE_NAME.test(value)
    ? value
    : "[redacted-package]";
}

function normalizeIssues(issues) {
  const byKey = new Map();
  for (const issue of issues) {
    const code = Object.hasOwn(ISSUE_MESSAGES, issue?.code)
      ? issue.code
      : "verification-error";
    const packageName = issue?.packageName === undefined
      ? undefined
      : safePackageName(issue.packageName);
    const normalized = packageName === undefined ? { code } : { code, packageName };
    byKey.set(`${code}\0${packageName ?? ""}`, normalized);
  }
  const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;
  return [...byKey.values()].sort((left, right) => {
    const codeOrder = compareText(left.code, right.code);
    return codeOrder !== 0
      ? codeOrder
      : compareText(left.packageName ?? "", right.packageName ?? "");
  });
}

export class DependencyInstallVerificationError extends Error {
  constructor(issues) {
    super("Dependency installation verification did not pass.");
    this.name = "DependencyInstallVerificationError";
    this.issues = normalizeIssues(issues);
  }
}

function block(code, packageName) {
  throw new DependencyInstallVerificationError([
    packageName === undefined ? { code } : { code, packageName },
  ]);
}

function samePath(left, right) {
  const normalize = process.platform === "win32"
    ? (value) => path.resolve(value).toLowerCase()
    : (value) => path.resolve(value);
  return normalize(left) === normalize(right);
}

function regularRealPath(filePath, issueCode) {
  try {
    const stats = lstatSync(filePath);
    if (!stats.isFile() || stats.isSymbolicLink()) block(issueCode);
    return realpathSync(filePath);
  } catch (error) {
    if (error instanceof DependencyInstallVerificationError) throw error;
    block(issueCode);
  }
}

function readJsonFile(filePath, issueCode) {
  const realPath = regularRealPath(filePath, issueCode);
  try {
    const bytes = readFileSync(realPath);
    const parsed = JSON.parse(bytes.toString("utf8"));
    if (!isRecord(parsed)) block(issueCode);
    return { bytes, parsed, realPath };
  } catch (error) {
    if (error instanceof DependencyInstallVerificationError) throw error;
    block(issueCode);
  }
}

function environmentValue(environment, key) {
  const actualKey = Object.keys(environment).find(
    (candidate) => candidate.toLowerCase() === key.toLowerCase(),
  );
  return actualKey ? environment[actualKey] : undefined;
}

function dependencyMap(value) {
  return isRecord(value) ? value : {};
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map(
      (key) => `${JSON.stringify(key)}:${stableJson(value[key])}`,
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

function packageNameFromLockPath(lockPath) {
  const parts = lockPath.split("/");
  const nodeModulesIndex = parts.lastIndexOf("node_modules");
  if (nodeModulesIndex < 0 || nodeModulesIndex === parts.length - 1) return null;
  const first = parts[nodeModulesIndex + 1];
  if (first.startsWith("@")) {
    const second = parts[nodeModulesIndex + 2];
    return second ? `${first}/${second}` : null;
  }
  return first;
}

function normalizeInstalledPath(projectRoot, installedPath) {
  if (typeof installedPath !== "string" || !path.isAbsolute(installedPath)) return null;
  const relative = path.relative(projectRoot, path.resolve(installedPath));
  if (
    relative.length === 0
    || path.isAbsolute(relative)
    || relative === ".."
    || relative.startsWith(`..${path.sep}`)
  ) {
    return null;
  }
  const lockPath = relative.split(path.sep).join("/");
  return lockPath.split("/").includes("node_modules") ? lockPath : null;
}

function inspectProjectMetadata(projectRoot) {
  let realProjectRoot;
  try {
    realProjectRoot = realpathSync(projectRoot);
  } catch {
    block("source-binding-invalid");
  }
  if (!samePath(realProjectRoot, projectRoot)) block("source-binding-invalid");

  const packageResult = readJsonFile(
    path.join(realProjectRoot, "package.json"),
    "package-invalid",
  );
  const lockResult = readJsonFile(
    path.join(realProjectRoot, "package-lock.json"),
    "lockfile-invalid",
  );
  const packageJson = packageResult.parsed;
  const lockfile = lockResult.parsed;
  const npmPin = typeof packageJson.packageManager === "string"
    ? /^npm@(\d+\.\d+\.\d+)$/u.exec(packageJson.packageManager)?.[1]
    : undefined;

  if (
    packageJson.name !== "diana"
    || typeof packageJson.version !== "string"
    || packageJson.version.length === 0
    || packageJson.version.length > 128
    || packageJson.engines?.node !== REQUIRED_NODE_ENGINE
    || typeof npmPin !== "string"
    || packageJson.engines?.npm !== npmPin
    || packageJson.scripts?.[DEPENDENCY_INSTALL_SCRIPT_NAME]
      !== DEPENDENCY_INSTALL_SCRIPT_BODY
  ) {
    block("package-invalid");
  }

  if (
    lockfile.lockfileVersion !== 3
    || lockfile.requires !== true
    || !isRecord(lockfile.packages)
    || !isRecord(lockfile.packages[""])
  ) {
    block("lockfile-invalid");
  }

  const lockRoot = lockfile.packages[""];
  if (
    lockfile.name !== packageJson.name
    || lockfile.version !== packageJson.version
    || lockRoot.name !== packageJson.name
    || lockRoot.version !== packageJson.version
    || DEPENDENCY_FIELDS.some(
      (field) => stableJson(dependencyMap(packageJson[field]))
        !== stableJson(dependencyMap(lockRoot[field])),
    )
  ) {
    block("lock-root-mismatch");
  }

  return {
    lockBytes: lockResult.bytes,
    lockPackages: lockfile.packages,
    npmPin,
    packageBytes: packageResult.bytes,
    packageJson,
    packagePath: packageResult.realPath,
    projectRoot: realProjectRoot,
  };
}

function assertSourceBinding(metadata, environment, nodeExecPath, npmCliPath) {
  const packagePath = environmentValue(environment, "npm_package_json");
  const lifecycleEvent = environmentValue(environment, "npm_lifecycle_event");
  const lifecycleScript = environmentValue(environment, "npm_lifecycle_script");
  const npmExecPath = environmentValue(environment, "npm_execpath");
  const npmNodeExecPath = environmentValue(environment, "npm_node_execpath");
  if (
    typeof packagePath !== "string"
    || typeof npmExecPath !== "string"
    || typeof npmNodeExecPath !== "string"
    || lifecycleEvent !== DEPENDENCY_INSTALL_SCRIPT_NAME
    || lifecycleScript !== DEPENDENCY_INSTALL_SCRIPT_BODY
  ) {
    block("source-binding-invalid");
  }

  const boundPackagePath = regularRealPath(packagePath, "source-binding-invalid");
  const boundNpmCliPath = regularRealPath(npmExecPath, "source-binding-invalid");
  const boundNodePath = regularRealPath(npmNodeExecPath, "source-binding-invalid");
  const actualNodePath = regularRealPath(nodeExecPath, "source-binding-invalid");
  if (
    !samePath(boundPackagePath, metadata.packagePath)
    || !samePath(boundNpmCliPath, npmCliPath)
    || !samePath(boundNodePath, actualNodePath)
  ) {
    block("source-binding-invalid");
  }
}

function bundledNpmCliCandidates(nodeExecPath, platform) {
  const nodeDirectory = path.dirname(nodeExecPath);
  if (platform === "win32") {
    return [path.join(nodeDirectory, "node_modules", "npm", "bin", "npm-cli.js")];
  }
  return [
    path.resolve(nodeDirectory, "..", "lib", "node_modules", "npm", "bin", "npm-cli.js"),
    path.join(nodeDirectory, "node_modules", "npm", "bin", "npm-cli.js"),
  ];
}

function resolvePinnedNpmCli(nodeExecPath, expectedVersion, platform) {
  const npmCliCandidate = bundledNpmCliCandidates(nodeExecPath, platform).find(
    (candidate) => {
      try {
        return lstatSync(candidate).isFile();
      } catch {
        return false;
      }
    },
  );
  if (!npmCliCandidate) block("npm-cli-invalid");
  const npmCliPath = regularRealPath(npmCliCandidate, "npm-cli-invalid");
  if (path.basename(npmCliPath).toLowerCase() !== "npm-cli.js") {
    block("npm-cli-invalid");
  }
  const npmPackage = readJsonFile(
    path.resolve(path.dirname(npmCliPath), "..", "package.json"),
    "npm-cli-invalid",
  ).parsed;
  if (npmPackage.name !== "npm" || npmPackage.version !== expectedVersion) {
    block("npm-runtime-mismatch");
  }
  return npmCliPath;
}

function sanitizeNpmEnvironment(environment, offline) {
  const sanitized = {};
  for (const key of Object.keys(environment)) {
    if (CHILD_ENVIRONMENT_KEYS.has(key.toUpperCase())) {
      sanitized[key] = environment[key];
    }
  }
  sanitized.NO_COLOR = "1";
  sanitized.NPM_CONFIG_AUDIT = "false";
  sanitized.NPM_CONFIG_COLOR = "false";
  sanitized.NPM_CONFIG_FUND = "false";
  sanitized.NPM_CONFIG_IGNORE_SCRIPTS = "true";
  sanitized.NPM_CONFIG_LOGLEVEL = "silent";
  sanitized.NPM_CONFIG_UPDATE_NOTIFIER = "false";
  if (offline) sanitized.NPM_CONFIG_OFFLINE = "true";
  return sanitized;
}

export function sanitizeNpmTreeEnvironment(environment) {
  return sanitizeNpmEnvironment(environment, true);
}

function sanitizeNpmInstallEnvironment(environment) {
  return sanitizeNpmEnvironment(environment, false);
}

function defaultRunCommand(file, args, options) {
  return spawnSync(file, args, {
    ...options,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function commandStdout(result) {
  return typeof result?.stdout === "string"
    ? result.stdout
    : Buffer.isBuffer(result?.stdout)
      ? result.stdout.toString("utf8")
      : "";
}

function runPinnedNpm(npmCliPath, args, context, issueCode) {
  const result = context.runCommand(
    context.nodeExecPath,
    [npmCliPath, ...args],
    {
      cwd: context.projectRoot,
      env: context.environment,
      shell: false,
      windowsHide: true,
    },
  );
  if (result?.error || result?.signal !== null && result?.signal !== undefined) {
    block(issueCode);
  }
  return result;
}

function issueFromProblem(problem) {
  if (typeof problem !== "string") return null;
  const match = /^(missing|invalid|extraneous):\s+(@[^/\s]+\/[^@\s]+|[^@\s]+)(?:@|\s|$)/iu.exec(problem);
  if (!match) return null;
  const code = match[1].toLowerCase() === "missing"
    ? "dependency-missing"
    : match[1].toLowerCase() === "invalid"
      ? "dependency-invalid"
      : "dependency-extraneous";
  return { code, packageName: match[2] };
}

function emptyPlaceholderKind(lockPackages, parentLockPath, dependencyName) {
  if (typeof parentLockPath !== "string") return null;
  const parent = lockPackages[parentLockPath];
  if (!isRecord(parent)) return null;
  if (Object.hasOwn(dependencyMap(parent.optionalDependencies), dependencyName)) {
    return "optional";
  }
  const peerDependencies = dependencyMap(parent.peerDependencies);
  const peerMetadata = dependencyMap(parent.peerDependenciesMeta);
  if (Object.hasOwn(peerDependencies, dependencyName)) {
    return isRecord(peerMetadata[dependencyName])
      && peerMetadata[dependencyName].optional === true
      ? "optional-peer"
      : "peer";
  }
  return null;
}

function collectInstalledTree(tree, projectRoot, lockPackages) {
  if (!isRecord(tree) || !samePath(tree.path ?? "", projectRoot)) {
    block("tree-output-invalid");
  }
  const installed = new Map();
  const issues = [];
  const placeholders = { optional: 0, optionalPeer: 0, peer: 0 };
  const requiredPeerPlaceholders = [];
  for (const problem of Array.isArray(tree.problems) ? tree.problems : []) {
    const issue = issueFromProblem(problem);
    if (issue) issues.push(issue);
  }

  function visit(dependencies, parentLockPath) {
    if (!isRecord(dependencies)) return;
    for (const dependencyName of Object.keys(dependencies).sort()) {
      const dependency = dependencies[dependencyName];
      if (!isRecord(dependency)) {
        issues.push({ code: "tree-output-invalid" });
        continue;
      }
      if (Object.keys(dependency).length === 0) {
        const placeholderKind = emptyPlaceholderKind(
          lockPackages,
          parentLockPath,
          dependencyName,
        );
        if (placeholderKind === "optional") {
          placeholders.optional += 1;
        } else if (placeholderKind === "optional-peer") {
          placeholders.optionalPeer += 1;
        } else if (placeholderKind === "peer") {
          placeholders.peer += 1;
          requiredPeerPlaceholders.push(dependencyName);
        } else {
          issues.push({ code: "tree-output-invalid" });
        }
        continue;
      }
      const packageName = typeof dependency.name === "string"
        ? dependency.name
        : dependencyName;
      if (dependency.missing) issues.push({ code: "dependency-missing", packageName });
      if (dependency.invalid) issues.push({ code: "dependency-invalid", packageName });
      if (dependency.extraneous) {
        issues.push({ code: "dependency-extraneous", packageName });
      }

      const lockPath = normalizeInstalledPath(projectRoot, dependency.path);
      if (lockPath === null || typeof dependency.version !== "string") {
        if (!dependency.missing) issues.push({ code: "tree-output-invalid" });
      } else {
        const existing = installed.get(lockPath);
        if (
          existing
          && (existing.name !== packageName || existing.version !== dependency.version)
        ) {
          issues.push({ code: "tree-output-invalid" });
        } else {
          installed.set(lockPath, { name: packageName, version: dependency.version });
        }
      }
      visit(dependency.dependencies, lockPath);
    }
  }

  visit(tree.dependencies, "");
  for (const dependencyName of requiredPeerPlaceholders) {
    if (![...installed.values()].some((entry) => entry.name === dependencyName)) {
      issues.push({ code: "dependency-missing", packageName: dependencyName });
    }
  }
  return { installed, issues, placeholders };
}

function compareTreeToLock(installed, lockPackages) {
  const issues = [];
  const expected = new Map();
  for (const lockPath of Object.keys(lockPackages).sort()) {
    if (lockPath === "") continue;
    const entry = lockPackages[lockPath];
    const packageName = packageNameFromLockPath(lockPath);
    if (
      !isRecord(entry)
      || entry.link === true
      || packageName === null
      || typeof entry.version !== "string"
    ) {
      issues.push({ code: "lockfile-invalid" });
      continue;
    }
    expected.set(lockPath, {
      name: typeof entry.name === "string" ? entry.name : packageName,
      optional: entry.optional === true,
      version: entry.version,
    });
  }

  for (const [lockPath, actual] of installed) {
    const locked = expected.get(lockPath);
    if (!locked) {
      issues.push({ code: "dependency-extraneous", packageName: actual.name });
    } else if (actual.name !== locked.name || actual.version !== locked.version) {
      issues.push({ code: "dependency-lock-mismatch", packageName: actual.name });
    }
  }
  for (const [lockPath, locked] of expected) {
    if (!locked.optional && !installed.has(lockPath)) {
      issues.push({ code: "dependency-missing", packageName: locked.name });
    }
  }

  return { issues, lockPackageCount: expected.size };
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function verifyDependencyInstall(options = {}) {
  try {
    const projectRoot = path.resolve(options.projectRoot ?? SCRIPT_PROJECT_ROOT);
    const environment = options.environment ?? process.env;
    const nodeExecPath = options.nodeExecPath ?? process.execPath;
    const nodeVersion = options.nodeVersion ?? process.versions.node;
    const platform = options.platform ?? process.platform;
    const runCommand = options.runCommand ?? defaultRunCommand;
    const metadata = inspectProjectMetadata(projectRoot);

    if (!/^24\.\d+\.\d+$/u.test(nodeVersion)) block("node-runtime-mismatch");
    const realNodeExecPath = regularRealPath(nodeExecPath, "source-binding-invalid");
    const npmCliPath = resolvePinnedNpmCli(realNodeExecPath, metadata.npmPin, platform);
    assertSourceBinding(metadata, environment, realNodeExecPath, npmCliPath);
    const verificationContext = {
      environment: sanitizeNpmTreeEnvironment(environment),
      nodeExecPath: realNodeExecPath,
      projectRoot: metadata.projectRoot,
      runCommand,
    };

    const versionResult = runPinnedNpm(
      npmCliPath,
      ["--version"],
      verificationContext,
      "npm-runtime-mismatch",
    );
    if (
      versionResult?.status !== 0
      || commandStdout(versionResult).trim() !== metadata.npmPin
    ) {
      block("npm-runtime-mismatch");
    }

    const installResult = runPinnedNpm(
      npmCliPath,
      NPM_CI_COMMAND.slice(1),
      {
        ...verificationContext,
        environment: sanitizeNpmInstallEnvironment(environment),
      },
      "npm-ci-invalid",
    );
    if (installResult?.status !== 0) block("npm-ci-invalid");

    const installedMetadata = inspectProjectMetadata(metadata.projectRoot);
    const packageJsonSha256 = sha256(metadata.packageBytes);
    const packageLockSha256 = sha256(metadata.lockBytes);
    if (
      sha256(installedMetadata.packageBytes) !== packageJsonSha256
      || sha256(installedMetadata.lockBytes) !== packageLockSha256
      || installedMetadata.npmPin !== metadata.npmPin
    ) {
      block("source-binding-invalid");
    }

    const treeResult = runPinnedNpm(
      npmCliPath,
      [
        "ls",
        "--all",
        "--json",
        "--long",
        "--offline",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
      ],
      verificationContext,
      "npm-tree-invalid",
    );
    let tree;
    try {
      tree = JSON.parse(commandStdout(treeResult));
    } catch {
      block("tree-output-invalid");
    }

    const installedResult = collectInstalledTree(
      tree,
      installedMetadata.projectRoot,
      installedMetadata.lockPackages,
    );
    const lockResult = compareTreeToLock(
      installedResult.installed,
      installedMetadata.lockPackages,
    );
    const issues = normalizeIssues([
      ...installedResult.issues,
      ...lockResult.issues,
      ...(treeResult?.status === 0 ? [] : [{ code: "npm-tree-invalid" }]),
    ]);
    if (issues.length > 0) throw new DependencyInstallVerificationError(issues);

    return {
      schemaVersion: NPM_CI_PROVENANCE_SCHEMA_VERSION,
      kind: NPM_CI_PROVENANCE_KIND,
      status: "pass",
      install: {
        command: [...NPM_CI_COMMAND],
        exitCode: 0,
        packageJsonUnchanged: true,
        packageLockUnchanged: true,
        lifecycleScriptsRun: false,
        network: "registry-or-cache",
      },
      source: {
        packageJsonSha256,
        packageLockSha256,
        lockfileVersion: 3,
      },
      runtime: {
        nodeEngine: REQUIRED_NODE_ENGINE,
        nodeVersion,
        nodeExecutableSha256: sha256(readFileSync(realNodeExecPath)),
        npmVersion: installedMetadata.npmPin,
        npmCliSha256: sha256(readFileSync(npmCliPath)),
        platform: options.platform ?? process.platform,
        arch: options.arch ?? process.arch,
      },
      tree: {
        lockPackageCount: lockResult.lockPackageCount,
        installedPackageCount: installedResult.installed.size,
        optionalPlaceholderCount: installedResult.placeholders.optional,
        optionalPeerPlaceholderCount: installedResult.placeholders.optionalPeer,
        peerPlaceholderCount: installedResult.placeholders.peer,
      },
    };
  } catch (error) {
    if (error instanceof DependencyInstallVerificationError) throw error;
    throw new DependencyInstallVerificationError([{ code: "verification-error" }]);
  }
}

export function formatVerificationFailure(error) {
  const issues = error instanceof DependencyInstallVerificationError
    ? error.issues
    : normalizeIssues([{ code: "verification-error" }]);
  return [
    "beta-dependencies: blocked",
    ...issues.map((issue) => {
      const packageDetail = issue.packageName ? `: ${issue.packageName}` : "";
      return `  ${ISSUE_MESSAGES[issue.code]}${packageDetail}`;
    }),
  ].join("\n");
}

function isMainModule() {
  if (typeof process.argv[1] !== "string") return false;
  try {
    return samePath(realpathSync(process.argv[1]), realpathSync(SCRIPT_PATH));
  } catch {
    return false;
  }
}

if (isMainModule()) {
  if (process.argv.length !== 2) {
    console.error(formatVerificationFailure(
      new DependencyInstallVerificationError([{ code: "source-binding-invalid" }]),
    ));
    process.exitCode = 1;
  } else {
    try {
      console.log(JSON.stringify(verifyDependencyInstall(), null, 2));
    } catch (error) {
      console.error(formatVerificationFailure(error));
      process.exitCode = 1;
    }
  }
}
