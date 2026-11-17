import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REVIEWED_PICOMATCH = Object.freeze({
  advisory: "https://github.com/advisories/GHSA-fc5q-39xc-vjpf",
  advisorySource: 1247710,
  advisoryRange: "<=4.0.7",
  advisoryTitle: "picomatch vulnerable to ReDoS through single-branch repeated extglobs",
  source: "https://codeload.github.com/micromatch/picomatch/tar.gz/c63a5bf4e61dbdb81bc41e97dc2616c30acce337",
  integrity: "sha512-fUkAZYcy1VfryJblryQ+ixip/7oRgd3AT/O6Z6fnXiArrU+8phmzjO5C63Tod+qihQ9u+CYUy+IsuI2qV+HL7g==",
  version: "4.0.7",
  files: Object.freeze({
    "index.js": "02ae26406508e28f9ba0865be16cf77f0b33de6c4d4d49c212c4176df1d5625a",
    "posix.js": "5695ff5dfcd5a338a40630bd506056f2950bcb08fe1cc068519cbbfe60add480",
    "lib/parse.js": "5ec28434bfb056f856eabbaec0babbe467c855bbb7c96889d91015f2d6b0ece4",
    "lib/picomatch.js": "fdd249d7ffff853f3bb1c77eafc8baa1a437bea85a94c35877b83c6a40d9ca94",
    "lib/scan.js": "6457a1764e5c2e543cc3a0c00ce12ebb3764097628868198370b64d4e642aaae",
    "lib/utils.js": "f04604f70cd1a3f6ace80b84766468674ff38b4bb83818d2ef1d81fc6355f935",
    "lib/constants.js": "cdcb0716c3c7137f34fbec4fe29613de0aaa0a7de01505601ef3a88a5ba05fb0",
  }),
});

const severities = ["info", "low", "moderate", "high", "critical"];
const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
const isHigh = value => value === "high" || value === "critical";

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function contained(root, filename) {
  const relative = path.relative(root, filename);
  return relative.length > 0 && !path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`);
}

function regularFile(root, filename) {
  const stats = lstatSync(filename);
  requireCondition(stats.isFile() && !stats.isSymbolicLink() && contained(root, realpathSync(filename)), "Dependency source must be a regular file inside the checkout.");
  return readFileSync(filename);
}

function readJson(filename) {
  const parsed = JSON.parse(readFileSync(filename, "utf8"));
  requireCondition(isRecord(parsed), "Dependency metadata is malformed.");
  return parsed;
}

function packagePath(root, key) {
  requireCondition(typeof key === "string" && !key.includes("\\") && !key.split("/").some(part => part === ".." || part === ".")
    && /(?:^|\/)node_modules\/(?:@[^/]+\/)?[^/]+$/u.test(key), "Dependency path is malformed.");
  const filename = path.resolve(root, ...key.split("/"));
  requireCondition(contained(root, filename), "Dependency path is outside the checkout.");
  return filename;
}

function installedPicomatchPaths(root) {
  const matches = [];
  let packagesVisited = 0;
  function visitModules(directory) {
    let entries;
    try {
      requireCondition(!lstatSync(directory).isSymbolicLink(), "Linked dependency directories cannot be source verified.");
      entries = readdirSync(directory, { withFileTypes: true });
    }
    catch (error) { if (error.code === "ENOENT") return; throw error; }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      requireCondition(!entry.isSymbolicLink(), "Linked dependency packages cannot be source verified.");
      const filename = path.join(directory, entry.name);
      if (entry.name.startsWith("@") && entry.isDirectory()) {
        for (const scoped of readdirSync(filename)) {
          if (!scoped.startsWith(".")) visitPackage(path.join(filename, scoped));
        }
      } else {
        visitPackage(filename);
      }
    }
  }
  function visitPackage(directory) {
    requireCondition(++packagesVisited <= 20_000, "Dependency tree exceeds the verification bound.");
    const stats = lstatSync(directory);
    requireCondition(!stats.isSymbolicLink(), "Linked dependency packages cannot be source verified.");
    requireCondition(stats.isDirectory(), "Dependency package entries must be directories.");
    let manifest;
    try { manifest = readJson(path.join(directory, "package.json")); }
    catch (error) {
      if (error.code === "ENOENT") throw new Error(`Dependency package manifest is missing at ${path.relative(root, directory)}.`);
      throw error;
    }
    if (manifest.name === "picomatch" || path.basename(directory) === "picomatch") {
      matches.push(path.relative(root, directory).split(path.sep).join("/"));
    }
    visitModules(path.join(directory, "node_modules"));
  }
  visitModules(path.join(root, "node_modules"));
  return matches.sort();
}

export function verifyPicomatchSource(projectRoot) {
  const root = realpathSync(projectRoot);
  const manifest = JSON.parse(regularFile(root, path.join(root, "package.json")));
  const lock = JSON.parse(regularFile(root, path.join(root, "package-lock.json")));
  requireCondition(manifest.overrides?.picomatch === REVIEWED_PICOMATCH.source, "Picomatch override does not identify the reviewed source.");
  requireCondition(lock.lockfileVersion === 3 && isRecord(lock.packages), "The lockfile format is unsupported.");
  const nodes = Object.keys(lock.packages).filter(key => /(?:^|\/)node_modules\/picomatch$/u.test(key) || lock.packages[key]?.name === "picomatch").sort();
  requireCondition(nodes.length > 0, "No locked picomatch source was found.");
  requireCondition(JSON.stringify(nodes) === JSON.stringify(installedPicomatchPaths(root)), "Installed and locked picomatch copies differ.");
  for (const key of nodes) {
    const locked = lock.packages[key];
    requireCondition(locked.version === REVIEWED_PICOMATCH.version && locked.resolved === REVIEWED_PICOMATCH.source
      && locked.integrity === REVIEWED_PICOMATCH.integrity && !locked.link, "Locked picomatch is not the reviewed archive.");
    const directory = packagePath(root, key);
    const installed = JSON.parse(regularFile(root, path.join(directory, "package.json")));
    requireCondition(installed.name === "picomatch" && installed.version === REVIEWED_PICOMATCH.version
      && installed.main === "index.js" && installed.type !== "module" && installed.exports === undefined
      && installed.browser === undefined && installed.module === undefined, "Installed picomatch entry point differs from the reviewed source.");
    for (const [relative, expected] of Object.entries(REVIEWED_PICOMATCH.files)) {
      const actual = createHash("sha256").update(regularFile(root, path.join(directory, relative))).digest("hex");
      requireCondition(actual === expected, `Installed picomatch source differs at ${relative}.`);
    }
  }
  return nodes;
}

function validateAudit(audit) {
  requireCondition(isRecord(audit) && !audit.error && audit.auditReportVersion === 2
    && isRecord(audit.vulnerabilities) && isRecord(audit.metadata?.vulnerabilities), "npm audit returned an invalid report.");
  const counts = Object.fromEntries(severities.map(severity => [severity, 0]));
  for (const [name, vulnerability] of Object.entries(audit.vulnerabilities)) {
    requireCondition(isRecord(vulnerability) && vulnerability.name === name && severities.includes(vulnerability.severity)
      && Array.isArray(vulnerability.nodes) && vulnerability.nodes.length > 0 && vulnerability.nodes.every(node => typeof node === "string")
      && Array.isArray(vulnerability.via) && vulnerability.via.length > 0, "npm audit returned malformed vulnerability data.");
    for (const cause of vulnerability.via) {
      requireCondition(typeof cause === "string" ? isRecord(audit.vulnerabilities[cause])
        : isRecord(cause) && typeof cause.url === "string" && severities.includes(cause.severity)
          && typeof cause.name === "string" && typeof cause.dependency === "string", "npm audit returned an unresolved advisory cause.");
      const causeSeverity = typeof cause === "string" ? audit.vulnerabilities[cause].severity : cause.severity;
      requireCondition(severities.includes(causeSeverity) && severities.indexOf(vulnerability.severity) >= severities.indexOf(causeSeverity),
        "npm audit understated the severity of an advisory cause.");
    }
    counts[vulnerability.severity]++;
  }
  const metadata = audit.metadata.vulnerabilities;
  requireCondition(severities.every(severity => metadata[severity] === counts[severity])
    && metadata.total === Object.keys(audit.vulnerabilities).length, "npm audit vulnerability counts do not match its findings.");
}

export function evaluateAuditReport(audit, verifiedNodes) {
  validateAudit(audit);
  requireCondition(Array.isArray(verifiedNodes) && verifiedNodes.length > 0, "The reviewed source has not been verified.");
  const checkedNodes = new Set(verifiedNodes);
  const memo = new Map();
  function resolvedByReviewedSource(name, visiting = new Set()) {
    if (memo.has(name)) return memo.get(name);
    if (visiting.has(name)) return false;
    const vulnerability = audit.vulnerabilities[name];
    if (!vulnerability) return false;
    const next = new Set(visiting).add(name);
    const resolved = vulnerability.severity === "high" && vulnerability.via.every(cause => typeof cause === "string"
      ? resolvedByReviewedSource(cause, next)
      : name === "picomatch" && vulnerability.severity === "high" && cause.name === "picomatch" && cause.dependency === "picomatch"
        && cause.url === REVIEWED_PICOMATCH.advisory && cause.severity === "high"
        && cause.source === REVIEWED_PICOMATCH.advisorySource && cause.range === REVIEWED_PICOMATCH.advisoryRange
        && cause.title === REVIEWED_PICOMATCH.advisoryTitle
        && vulnerability.nodes.every(node => checkedNodes.has(node)));
    memo.set(name, resolved);
    return resolved;
  }
  const highFindings = Object.values(audit.vulnerabilities).filter(item => isHigh(item.severity));
  const unresolved = highFindings.filter(item => !resolvedByReviewedSource(item.name)).map(item => item.name).sort();
  return {
    passed: unresolved.length === 0,
    rawHigh: audit.metadata.vulnerabilities.high,
    rawCritical: audit.metadata.vulnerabilities.critical,
    sourceRemediated: highFindings.filter(item => resolvedByReviewedSource(item.name)).map(item => item.name).sort(),
    unresolved,
  };
}

export function runSecurityAudit({ projectRoot = process.cwd(), runCommand = spawnSync, write = text => process.stdout.write(text) } = {}) {
  const bundledCli = path.join(path.dirname(process.execPath), "node_modules/npm/bin/npm-cli.js");
  const npmCli = process.env.npm_execpath || (existsSync(bundledCli) ? bundledCli : null);
  const command = npmCli ? process.execPath : "npm";
  const arguments_ = [...(npmCli ? [npmCli] : []), "audit", "--json", "--audit-level=high"];
  const result = runCommand(command, arguments_, { cwd: projectRoot, encoding: "utf8", shell: false, timeout: 120_000, maxBuffer: 16 * 1024 * 1024 });
  // Keep the complete registry report visible, including the advisory that still
  // applies to the released version number of the reviewed upstream source.
  if (result.stdout) write(result.stdout.endsWith("\n") ? result.stdout : result.stdout + "\n");
  if (result.stderr) write(result.stderr.endsWith("\n") ? result.stderr : result.stderr + "\n");
  requireCondition(!result.error && !result.signal && (result.status === 0 || result.status === 1), "npm audit could not complete.");
  const audit = JSON.parse(result.stdout);
  const nodes = verifyPicomatchSource(projectRoot);
  const evaluation = evaluateAuditReport(audit, nodes);
  requireCondition(result.status === 0 || audit.metadata.vulnerabilities.high + audit.metadata.vulnerabilities.critical > 0, "npm audit exited unsuccessfully without matching findings.");
  write(`\nSource verification: ${nodes.length} picomatch copy/copies match reviewed upstream commit c63a5bf4e61dbdb81bc41e97dc2616c30acce337.\n`);
  if (evaluation.sourceRemediated.length > 0) {
    write(`The registry still reports ${REVIEWED_PICOMATCH.advisory} for version 4.0.7. Its reviewed source remediation is verified locally.\n`);
  }
  write(`Unresolved high/critical findings: ${evaluation.unresolved.length}.\n`);
  if (evaluation.unresolved.length) write(evaluation.unresolved.join("\n") + "\n");
  return evaluation;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (!runSecurityAudit().passed) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`Security audit blocked: ${error instanceof Error ? error.message : "verification could not complete."}\n`);
    process.exitCode = 1;
  }
}
