import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, test } from "node:test";

import { REVIEWED_PICOMATCH, evaluateAuditReport, runSecurityAudit, verifyPicomatchSource } from "./security-audit.mjs";

const roots = [];
const node = "node_modules/picomatch";
const known = {
  source: REVIEWED_PICOMATCH.advisorySource,
  name: "picomatch",
  dependency: "picomatch",
  title: REVIEWED_PICOMATCH.advisoryTitle,
  url: REVIEWED_PICOMATCH.advisory,
  severity: "high",
  range: REVIEWED_PICOMATCH.advisoryRange,
};
const finding = (name, via, nodes = ["node_modules/" + name], severity = "high") => ({ name, severity, via, nodes });

function audit(findings = {}) {
  const counts = { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 };
  for (const item of Object.values(findings)) { counts[item.severity]++; counts.total++; }
  return { auditReportVersion: 2, vulnerabilities: findings, metadata: { vulnerabilities: counts } };
}

function picomatchAudit(extra = {}) {
  return audit({ picomatch: finding("picomatch", [known]), ...extra });
}

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "diana-source-audit-"));
  roots.push(root);
  const installed = path.join(root, "node_modules/picomatch");
  mkdirSync(path.join(installed, "lib"), { recursive: true });
  for (const relative of Object.keys(REVIEWED_PICOMATCH.files)) copyFileSync(path.join("node_modules/picomatch", relative), path.join(installed, relative));
  writeFileSync(path.join(installed, "package.json"), JSON.stringify({ name: "picomatch", version: REVIEWED_PICOMATCH.version, main: "index.js" }));
  writeFileSync(path.join(root, "package.json"), JSON.stringify({ overrides: { picomatch: REVIEWED_PICOMATCH.source } }));
  writeFileSync(path.join(root, "package-lock.json"), JSON.stringify({
    lockfileVersion: 3,
    packages: {
      "": { name: "diana" },
      [node]: { version: REVIEWED_PICOMATCH.version, resolved: REVIEWED_PICOMATCH.source, integrity: REVIEWED_PICOMATCH.integrity },
    },
  }));
  return root;
}

function changeJson(filename, update) {
  const value = JSON.parse(readFileSync(filename, "utf8"));
  update(value);
  writeFileSync(filename, JSON.stringify(value));
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

test("retains raw counts while resolving only the known source and all dependent causes", () => {
  const report = picomatchAudit({
    micromatch: finding("micromatch", ["picomatch"]),
    vite: finding("vite", ["picomatch", "micromatch"]),
  });
  const before = JSON.stringify(report);
  const result = evaluateAuditReport(report, [node]);
  assert.equal(result.passed, true);
  assert.equal(result.rawHigh, 3);
  assert.deepEqual(result.sourceRemediated, ["micromatch", "picomatch", "vite"]);
  assert.equal(JSON.stringify(report), before);
});

test("an unrelated high advisory and its dependent packages remain blocking", () => {
  const report = picomatchAudit({
    vite: finding("vite", ["picomatch", "other"]),
    other: finding("other", [{ ...known, source: 123, url: "https://github.com/advisories/GHSA-other", name: "other", dependency: "other" }]),
  });
  const result = evaluateAuditReport(report, [node]);
  assert.equal(result.passed, false);
  assert.deepEqual(result.unresolved, ["other", "vite"]);
});

test("changed metadata, an alias, and a new advisory cannot borrow the reviewed resolution", () => {
  for (const cause of [
    { ...known, url: "https://github.com/advisories/GHSA-new" },
    { ...known, source: 1247711 },
    { ...known, range: "<=5.0.0" },
    { ...known, title: "Additional unreviewed bypass" },
    { ...known, dependency: "different-package" },
  ]) assert.equal(evaluateAuditReport(audit({ picomatch: finding("picomatch", [cause]) }), [node]).passed, false);
  assert.equal(evaluateAuditReport(audit({ alias: finding("alias", [known]) }), [node]).passed, false);
  assert.equal(evaluateAuditReport(audit({ picomatch: finding("picomatch", [known, { ...known, url: "https://github.com/advisories/GHSA-new" }]) }), [node]).passed, false);
});

test("critical findings, cycles, and unverified affected paths remain blocking", () => {
  assert.equal(evaluateAuditReport(audit({ picomatch: finding("picomatch", [known], [node], "critical") }), [node]).passed, false);
  assert.equal(evaluateAuditReport(audit({ one: finding("one", ["two"]), two: finding("two", ["one"]) }), [node]).passed, false);
  assert.equal(evaluateAuditReport(audit({ picomatch: finding("picomatch", [known], [node, "node_modules/old/node_modules/picomatch"]) }), [node]).passed, false);
});

test("malformed reports, registry errors, unresolved causes and inconsistent counts fail closed", () => {
  for (const report of [
    { error: { code: "ENOAUDIT" } },
    { ...picomatchAudit(), auditReportVersion: 1 },
    audit({ vite: finding("vite", ["missing"]) }),
    { ...picomatchAudit(), metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 } } },
    audit({ picomatch: finding("picomatch", []) }),
  ]) assert.throws(() => evaluateAuditReport(report, [node]));
  assert.throws(() => evaluateAuditReport(audit(), []));
});

test("aggregate severity cannot understate a direct high or critical advisory", () => {
  for (const severity of ["low", "moderate"]) {
    for (const causeSeverity of ["high", "critical"]) {
      const report = audit({
        other: finding("other", [{ ...known, name: "other", dependency: "other", severity: causeSeverity }], ["node_modules/other"], severity),
      });
      assert.throws(() => evaluateAuditReport(report, [node]), /understated the severity/);
    }
  }
});

test("aggregate severity cannot understate a referenced dependency cause", () => {
  const report = audit({
    picomatch: finding("picomatch", [known]),
    consumer: finding("consumer", ["picomatch"], ["node_modules/consumer"], "moderate"),
  });
  assert.throws(() => evaluateAuditReport(report, [node]), /understated the severity/);
});

test("a successful unmodified registry report respects the existing high threshold", () => {
  const low = finding("minor", [{ ...known, name: "minor", dependency: "minor", severity: "moderate" }], ["node_modules/minor"], "moderate");
  assert.equal(evaluateAuditReport(audit({ minor: low }), [node]).passed, true);
});

test("verifies the archive, lock, entry metadata and every installed source file", () => {
  assert.deepEqual(verifyPicomatchSource(fixture()), [node]);
});

test("an altered parser or alternate package entry point cannot be verified", () => {
  const tampered = fixture();
  writeFileSync(path.join(tampered, node, "lib/parse.js"), "module.exports = () => /a+/;");
  assert.throws(() => verifyPicomatchSource(tampered), /source differs/);
  const alternate = fixture();
  changeJson(path.join(alternate, node, "package.json"), value => { value.exports = "./other.js"; });
  assert.throws(() => verifyPicomatchSource(alternate), /entry point differs/);
});

test("zero locked nodes, a different archive or a changed override fail closed", () => {
  for (const mutate of [
    lock => { delete lock.packages[node]; },
    lock => { lock.packages[node].integrity = "sha512-other"; },
    lock => { lock.packages[node].resolved = "https://registry.npmjs.org/picomatch/-/picomatch-4.0.7.tgz"; },
  ]) {
    const root = fixture();
    changeJson(path.join(root, "package-lock.json"), mutate);
    assert.throws(() => verifyPicomatchSource(root));
  }
  const root = fixture();
  changeJson(path.join(root, "package.json"), value => { value.overrides.picomatch = "4.0.7"; });
  assert.throws(() => verifyPicomatchSource(root), /override/);
});

test("an additional installed nested copy cannot be hidden by deduplication", () => {
  const root = fixture();
  const nested = path.join(root, "node_modules/consumer/node_modules/picomatch");
  mkdirSync(nested, { recursive: true });
  writeFileSync(path.join(root, "node_modules/consumer/package.json"), JSON.stringify({ name: "consumer", version: "1.0.0" }));
  writeFileSync(path.join(nested, "package.json"), JSON.stringify({ name: "picomatch", version: "2.3.2", main: "index.js" }));
  assert.throws(() => verifyPicomatchSource(root), /copies differ/);
});

test("a directory without a manifest cannot conceal a nested unpatched copy", () => {
  const root = fixture();
  const nested = path.join(root, "node_modules/consumer/node_modules/picomatch");
  mkdirSync(nested, { recursive: true });
  writeFileSync(path.join(nested, "package.json"), JSON.stringify({ name: "picomatch", version: "2.3.2", main: "index.js" }));
  assert.throws(() => verifyPicomatchSource(root), /manifest is missing/);
});

test("ordinary dependency directories must have manifests even when empty", () => {
  const root = fixture();
  mkdirSync(path.join(root, "node_modules/manifestless"));
  assert.throws(() => verifyPicomatchSource(root), /manifest is missing/);
});

test("a file cannot shadow picomatch directory resolution", () => {
  const root = fixture();
  writeFileSync(path.join(root, "node_modules/picomatch.js"), "module.exports = () => true;");
  assert.throws(() => verifyPicomatchSource(root), /entries must be directories/);
});

test("dot-prefixed npm metadata remains outside ordinary package traversal", () => {
  const root = fixture();
  mkdirSync(path.join(root, "node_modules/@scope/.npm-staging"), { recursive: true });
  mkdirSync(path.join(root, "node_modules/.bin"));
  writeFileSync(path.join(root, "node_modules/.package-lock.json"), "{}");
  assert.deepEqual(verifyPicomatchSource(root), [node]);
});

test("a linked consumer cannot conceal a nested unpatched copy", () => {
  const root = fixture();
  const target = path.join(root, "linked-consumer");
  const nested = path.join(target, "node_modules/picomatch");
  mkdirSync(nested, { recursive: true });
  writeFileSync(path.join(target, "package.json"), JSON.stringify({ name: "consumer", version: "1.0.0" }));
  writeFileSync(path.join(nested, "package.json"), JSON.stringify({ name: "picomatch", version: "2.3.2", main: "index.js" }));
  symlinkSync(target, path.join(root, "node_modules/consumer"), process.platform === "win32" ? "junction" : "dir");
  assert.throws(() => verifyPicomatchSource(root), /Linked dependency/);
});

test("a linked scope cannot bypass the package traversal", () => {
  const root = fixture();
  const target = path.join(root, "linked-scope");
  mkdirSync(path.join(target, "consumer"), { recursive: true });
  writeFileSync(path.join(target, "consumer/package.json"), JSON.stringify({ name: "@linked/consumer", version: "1.0.0" }));
  symlinkSync(target, path.join(root, "node_modules/@linked"), process.platform === "win32" ? "junction" : "dir");
  assert.throws(() => verifyPicomatchSource(root), /Linked dependency/);
});

test("the command preserves registry JSON and stderr and uses the high threshold", () => {
  const root = fixture();
  const raw = JSON.stringify(picomatchAudit());
  let printed = "", args;
  const result = runSecurityAudit({
    projectRoot: root,
    runCommand(_command, received, options) {
      args = received;
      assert.equal(options.shell, false);
      assert.equal(options.timeout, 120_000);
      return { status: 1, stdout: raw, stderr: "registry diagnostic\n" };
    },
    write(value) { printed += value; },
  });
  assert.equal(result.passed, true);
  assert.deepEqual(args.slice(-3), ["audit", "--json", "--audit-level=high"]);
  assert.ok(printed.startsWith(raw));
  assert.match(printed, /registry diagnostic/);
  assert.match(printed, /registry still reports/);
  assert.match(printed, /Unresolved high\/critical findings: 0/);
});

test("audit execution and parse errors always block", () => {
  const root = fixture();
  for (const result of [
    { status: null, signal: "SIGTERM", stdout: "" },
    { status: 2, stdout: JSON.stringify(audit()) },
    { status: 1, error: new Error("registry unavailable"), stdout: "" },
    { status: 0, stdout: "unexpected registry response" },
    { status: 1, stdout: JSON.stringify(audit()) },
  ]) assert.throws(() => runSecurityAudit({ projectRoot: root, runCommand: () => result, write() {} }));
});
