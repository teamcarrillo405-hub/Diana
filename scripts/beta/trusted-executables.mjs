import { spawnSync } from "node:child_process";
import { accessSync, constants as fsConstants, lstatSync, realpathSync } from "node:fs";
import path from "node:path";

const STARTUP_ENVIRONMENT = Object.freeze({ ...process.env });
const WINDOWS_EXECUTABLE_NAMES = Object.freeze([
  "git.exe",
  "git.cmd",
  "git.bat",
  "where.exe",
  "where.cmd",
  "where.bat",
  "gitleaks.exe",
  "gitleaks.cmd",
  "gitleaks.bat",
  "powershell.exe",
]);

/**
 * @param {string} message
 * @returns {never}
 */
function fail(message) {
  throw new Error(message);
}

function samePath(left, right) {
  const normalize = process.platform === "win32"
    ? (value) => path.resolve(value).toLowerCase()
    : (value) => path.resolve(value);
  return normalize(left) === normalize(right);
}

function pathIsInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative.length === 0
    || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

function lstatIfPresent(filePath) {
  try {
    return lstatSync(filePath);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    fail(`Trusted executable path could not be inspected: ${filePath}`);
  }
}

/**
 * @param {string} filePath
 * @param {string} label
 * @returns {string}
 */
function canonicalRegularExecutable(filePath, label) {
  if (!path.isAbsolute(filePath)) fail(`${label} must resolve to an absolute path.`);
  let canonical;
  try {
    canonical = realpathSync(filePath);
  } catch {
    fail(`${label} could not be resolved.`);
  }
  const stats = lstatIfPresent(canonical);
  if (stats === null || stats.isSymbolicLink() || !stats.isFile()) {
    fail(`${label} is not a canonical regular file.`);
  }
  if (process.platform !== "win32") {
    try {
      accessSync(canonical, fsConstants.X_OK);
    } catch {
      fail(`${label} is not executable.`);
    }
  }
  return canonical;
}

function environmentValue(environment, name) {
  const entry = Object.entries(environment).find(([key]) => key.toUpperCase() === name);
  return entry?.[1];
}

function absoluteLookupPath(environment) {
  const raw = environmentValue(environment, "PATH") ?? "";
  return raw
    .split(path.delimiter)
    .map((entry) => entry.trim().replace(/^"|"$/gu, ""))
    .filter((entry) => entry.length > 0 && path.isAbsolute(entry))
    .join(path.delimiter);
}

function trustedLookupEnvironment(environment) {
  const clean = Object.fromEntries(
    Object.entries(environment).filter(([key]) => key.toUpperCase() !== "PATH"),
  );
  clean.PATH = absoluteLookupPath(environment);
  return clean;
}

function resolveWindowsSystemDirectory(environment) {
  const configuredRoot = environmentValue(environment, "SYSTEMROOT")
    ?? environmentValue(environment, "WINDIR");
  if (typeof configuredRoot !== "string" || !path.isAbsolute(configuredRoot)) {
    fail("The trusted Windows system root is unavailable.");
  }
  let canonicalRoot;
  try {
    canonicalRoot = realpathSync(configuredRoot);
  } catch {
    fail("The trusted Windows system root could not be resolved.");
  }
  const systemDirectory = path.join(canonicalRoot, "System32");
  const stats = lstatIfPresent(systemDirectory);
  if (
    stats === null
    || stats.isSymbolicLink()
    || !stats.isDirectory()
    || !samePath(realpathSync(systemDirectory), systemDirectory)
  ) {
    fail("The trusted Windows system directory is unavailable.");
  }
  return systemDirectory;
}

/**
 * @param {string} command
 * @param {NodeJS.ProcessEnv} environment
 * @param {string} locator
 * @param {string} lookupCwd
 * @returns {string}
 */
function locateWithPinnedWindowsLocator(command, environment, locator, lookupCwd) {
  const result = spawnSync(locator, [command], {
    cwd: lookupCwd,
    encoding: "utf8",
    env: trustedLookupEnvironment(environment),
    shell: false,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const candidates = typeof result.stdout === "string"
    ? result.stdout.split(/\r?\n/gu).map((entry) => entry.trim()).filter(Boolean)
    : [];
  if (result.error || result.status !== 0 || candidates.length === 0) {
    fail(`The trusted Windows locator could not resolve ${command}.`);
  }
  return canonicalRegularExecutable(candidates[0], command);
}

/**
 * @param {string} command
 * @param {NodeJS.ProcessEnv} environment
 * @returns {string}
 */
function locateFromAbsolutePathEntries(command, environment) {
  for (const directory of absoluteLookupPath(environment).split(path.delimiter).filter(Boolean)) {
    const candidate = path.join(directory, command);
    const stats = lstatIfPresent(candidate);
    if (stats !== null && stats.isFile()) {
      return canonicalRegularExecutable(candidate, command);
    }
  }
  fail(`A trusted executable path could not be resolved for ${command}.`);
}

const WINDOWS_SYSTEM_DIRECTORY = process.platform === "win32"
  ? resolveWindowsSystemDirectory(STARTUP_ENVIRONMENT)
  : null;

export const PINNED_WINDOWS_LOCATOR_EXECUTABLE = process.platform === "win32"
  ? canonicalRegularExecutable(
      path.join(WINDOWS_SYSTEM_DIRECTORY, "where.exe"),
      "The Windows command locator",
    )
  : null;

export const PINNED_WINDOWS_POWERSHELL_EXECUTABLE = process.platform === "win32"
  ? canonicalRegularExecutable(
      path.join(
        WINDOWS_SYSTEM_DIRECTORY,
        "WindowsPowerShell",
        "v1.0",
        "powershell.exe",
      ),
      "Windows PowerShell",
    )
  : null;

export const TRUSTED_EXECUTABLE_LOOKUP_CWD = process.platform === "win32"
  ? WINDOWS_SYSTEM_DIRECTORY
  : path.parse(process.execPath).root;

/**
 * @param {string} command
 * @returns {string}
 */
export function resolveTrustedExecutable(command) {
  if (typeof command !== "string" || command.length === 0 || path.basename(command) !== command) {
    fail("Trusted command resolution accepts one executable basename.");
  }
  return process.platform === "win32"
    ? locateWithPinnedWindowsLocator(
        command,
        STARTUP_ENVIRONMENT,
        PINNED_WINDOWS_LOCATOR_EXECUTABLE,
        TRUSTED_EXECUTABLE_LOOKUP_CWD,
      )
    : locateFromAbsolutePathEntries(command, STARTUP_ENVIRONMENT);
}

export const PINNED_GIT_EXECUTABLE = resolveTrustedExecutable(
  process.platform === "win32" ? "git.exe" : "git",
);

export function assertTrustedExecutableOutsideProject(executable, projectRoot, label) {
  const canonicalExecutable = canonicalRegularExecutable(executable, label);
  const canonicalProjectRoot = realpathSync(projectRoot);
  if (pathIsInside(canonicalProjectRoot, canonicalExecutable)) {
    fail(`${label} resolves inside the repository checkout.`);
  }
  return canonicalExecutable;
}

export function assertNoRepositoryExecutableShadowing(projectRoot) {
  const canonicalProjectRoot = realpathSync(projectRoot);
  for (const executable of [
    PINNED_GIT_EXECUTABLE,
    PINNED_WINDOWS_LOCATOR_EXECUTABLE,
    PINNED_WINDOWS_POWERSHELL_EXECUTABLE,
  ].filter(Boolean)) {
    assertTrustedExecutableOutsideProject(executable, canonicalProjectRoot, "A pinned executable");
  }

  if (process.platform !== "win32") return;
  const candidateDirectories = new Set([canonicalProjectRoot]);
  for (const entry of absoluteLookupPath(STARTUP_ENVIRONMENT).split(path.delimiter).filter(Boolean)) {
    let canonicalEntry;
    try {
      canonicalEntry = realpathSync(entry);
    } catch {
      continue;
    }
    if (pathIsInside(canonicalProjectRoot, canonicalEntry)) candidateDirectories.add(canonicalEntry);
  }
  for (const directory of candidateDirectories) {
    for (const name of WINDOWS_EXECUTABLE_NAMES) {
      if (lstatIfPresent(path.join(directory, name)) !== null) {
        fail(`Repository-local executable shadowing is forbidden: ${name}`);
      }
    }
  }
}
