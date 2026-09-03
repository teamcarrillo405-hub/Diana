import assert from "node:assert/strict";
import test from "node:test";

import {
  DependencyAuditError,
  readAuditCounts,
  runDependencyAudit,
} from "./security-audit.mjs";

function report(high = 0, critical = 0) {
  return JSON.stringify({
    auditReportVersion: 2,
    vulnerabilities: {},
    metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high, critical, total: high + critical } },
  });
}

test("reads high and critical counts only from a valid npm audit report", () => {
  assert.deepEqual(readAuditCounts(report(2, 1)), { high: 2, critical: 1 });
  assert.equal(readAuditCounts("not json"), null);
  assert.equal(readAuditCounts(JSON.stringify({ metadata: { vulnerabilities: {} } })), null);
});

test("passes a valid clean audit report without retrying", () => {
  let calls = 0;
  const result = runDependencyAudit({
    npmCliPath: "npm-cli.js",
    runCommand: () => {
      calls += 1;
      return { status: 0, signal: null, stdout: report() };
    },
  });
  assert.deepEqual(result, { attempts: 1, high: 0, critical: 0 });
  assert.equal(calls, 1);
});

test("retries an unavailable registry response once before accepting a valid report", () => {
  let calls = 0;
  const result = runDependencyAudit({
    npmCliPath: "npm-cli.js",
    runCommand: () => {
      calls += 1;
      return calls === 1
        ? { status: 1, signal: null, stdout: "", stderr: "registry unavailable" }
        : { status: 0, signal: null, stdout: report() };
    },
  });
  assert.deepEqual(result, { attempts: 2, high: 0, critical: 0 });
  assert.equal(calls, 2);
});

test("fails immediately for a valid report with high or critical vulnerabilities", () => {
  let calls = 0;
  assert.throws(() => runDependencyAudit({
    npmCliPath: "npm-cli.js",
    runCommand: () => {
      calls += 1;
      return { status: 1, signal: null, stdout: report(1, 0) };
    },
  }), (error) => error instanceof DependencyAuditError && error.code === "DEPENDENCY_VULNERABILITIES_FOUND");
  assert.equal(calls, 1);
});

test("fails after the bounded retry when no valid registry report is available", () => {
  let calls = 0;
  assert.throws(() => runDependencyAudit({
    npmCliPath: "npm-cli.js",
    runCommand: () => {
      calls += 1;
      return { status: null, signal: "SIGTERM", stdout: "" };
    },
  }), (error) => error instanceof DependencyAuditError && error.code === "DEPENDENCY_AUDIT_UNAVAILABLE");
  assert.equal(calls, 2);
});
