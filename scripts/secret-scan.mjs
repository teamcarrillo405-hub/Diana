import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const projectRoot = path.resolve(process.cwd());
const configPath = path.join(projectRoot, ".gitleaks.toml");

function fail(message) {
  console.error(`secret-scan: blocked\n  ${message}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? projectRoot,
    encoding: options.encoding ?? "utf8",
    shell: false,
    windowsHide: true,
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.error) fail(`${command} could not run: ${result.error.message}`);
  return result;
}

function gitBuffer(args) {
  const result = run("git", args, { encoding: "buffer" });
  if (result.status !== 0 || !Buffer.isBuffer(result.stdout)) {
    fail("Git could not enumerate the exact release source boundary.");
  }
  return result.stdout;
}

function nullSeparated(buffer) {
  return buffer.toString("utf8").split("\0").filter(Boolean);
}

function isSensitiveLocalPath(relativePath) {
  const normalized = relativePath.replaceAll("\\", "/");
  const baseName = path.posix.basename(normalized);
  const environmentFile = baseName === ".env"
    || (baseName.startsWith(".env.") && !baseName.endsWith(".example"));
  return environmentFile
    || normalized.split("/").includes(".secrets")
    || baseName === "auth-storage-state.json";
}

function assertExactRepositoryRoot() {
  const result = run("git", ["rev-parse", "--show-toplevel"]);
  if (result.status !== 0 || typeof result.stdout !== "string") {
    fail("The release source must be an exact Git repository root.");
  }
  if (path.resolve(result.stdout.trim()).toLowerCase() !== projectRoot.toLowerCase()) {
    fail("The secret scan must run from the exact Git repository root.");
  }
}

function assertSensitiveFilesAreLocalOnly() {
  const tracked = nullSeparated(gitBuffer([
    "ls-files",
    "--cached",
    "-z",
    "--",
    ":(glob)**/.env",
    ":(glob)**/.env.*",
    ":(glob)**/.secrets/**",
    ":(glob)**/auth-storage-state.json",
  ])).filter(isSensitiveLocalPath);
  if (tracked.length > 0) {
    fail("A local environment, secret, or browser-session file is tracked by Git.");
  }

  const rootEntries = readdirSync(projectRoot, { withFileTypes: true });
  const localCandidates = rootEntries
    .filter((entry) => isSensitiveLocalPath(entry.name))
    .map((entry) => entry.name);
  for (const candidate of localCandidates) {
    const ignored = run("git", ["check-ignore", "-q", "--", candidate]);
    if (ignored.status !== 0) {
      fail("A local environment or secret path exists but is not protected by Git ignore rules.");
    }
  }
}

function resolveGitleaks() {
  const configured = process.env.DIANA_GITLEAKS_BIN?.trim();
  if (!configured) return process.platform === "win32" ? "gitleaks.exe" : "gitleaks";
  const resolved = path.resolve(configured);
  if (!existsSync(resolved) || !lstatSync(resolved).isFile()) {
    fail("DIANA_GITLEAKS_BIN does not name a regular Gitleaks executable.");
  }
  return resolved;
}

function runGitleaks(executable, mode, target) {
  const reportDirectory = mkdtempSync(path.join(tmpdir(), "diana-gitleaks-report-"));
  const reportPath = path.join(reportDirectory, "findings.json");
  const result = run(executable, [
    mode,
    "--config",
    configPath,
    "--redact",
    "--no-banner",
    "--exit-code=1",
    "--report-format=json",
    `--report-path=${reportPath}`,
    target,
  ], { stdio: "inherit" });
  if (result.status !== 0) {
    try {
      const findings = JSON.parse(readFileSync(reportPath, "utf8"));
      if (Array.isArray(findings)) {
        for (const finding of findings) {
          const rule = typeof finding?.RuleID === "string" ? finding.RuleID : "unknown-rule";
          const file = typeof finding?.File === "string"
            ? path.relative(target, finding.File).replaceAll("\\", "/")
            : "unknown-file";
          const line = Number.isSafeInteger(finding?.StartLine) ? `:${finding.StartLine}` : "";
          console.error(`  ${rule}: ${file}${line}`);
        }
      }
    } catch {
      // The final failure remains fail-closed even if Gitleaks did not emit JSON.
    } finally {
      rmSync(reportDirectory, { recursive: true, force: true });
    }
    fail(`Gitleaks ${mode} scan did not pass.`);
  }
  rmSync(reportDirectory, { recursive: true, force: true });
}

function createReleaseSourceMirror() {
  const mirrorRoot = mkdtempSync(path.join(tmpdir(), "diana-gitleaks-source-"));
  const files = nullSeparated(gitBuffer([
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "-z",
  ])).sort((left, right) => left.localeCompare(right));
  let copied = 0;
  for (const relativePath of files) {
    const source = path.resolve(projectRoot, relativePath);
    if (!source.startsWith(`${projectRoot}${path.sep}`) || !existsSync(source)) continue;
    const destination = path.resolve(mirrorRoot, relativePath);
    if (!destination.startsWith(`${mirrorRoot}${path.sep}`)) {
      rmSync(mirrorRoot, { recursive: true, force: true });
      fail("A release-source path escaped the temporary scan mirror.");
    }
    mkdirSync(path.dirname(destination), { recursive: true });
    const stats = lstatSync(source);
    if (stats.isSymbolicLink()) {
      writeFileSync(destination, `SYMLINK_TARGET=${readlinkSync(source)}\n`);
    } else if (stats.isFile()) {
      copyFileSync(source, destination);
    } else {
      continue;
    }
    copied += 1;
  }
  return { mirrorRoot, copied };
}

assertExactRepositoryRoot();
if (!existsSync(configPath) || !lstatSync(configPath).isFile()) {
  fail("The fixed Gitleaks configuration is unavailable.");
}
assertSensitiveFilesAreLocalOnly();

const executable = resolveGitleaks();
runGitleaks(executable, "git", projectRoot);
const { mirrorRoot, copied } = createReleaseSourceMirror();
try {
  runGitleaks(executable, "dir", mirrorRoot);
} finally {
  rmSync(mirrorRoot, { recursive: true, force: true });
}

console.log(`secret-scan: passed (${copied} releasable source files plus Git history)`);
