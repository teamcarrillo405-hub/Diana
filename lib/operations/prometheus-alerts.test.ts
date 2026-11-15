import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseAllDocuments } from "yaml";
import { EXPECTED_CRON_JOBS, OPERATIONAL_ALERT_THRESHOLDS } from "./operational-health";

const manifestPath = join(process.cwd(), "deploy/worker/prometheus-example.yaml");
const runbookPath = join(process.cwd(), "docs/operations/operational-alerts-runbook.md");
const documents = parseAllDocuments(readFileSync(manifestPath, "utf8"));
const runbook = readFileSync(runbookPath, "utf8");
const ruleDocument = documents
  .map((document) => document.toJSON() as Record<string, unknown>)
  .find((document) => document.kind === "PrometheusRule") as RuleDocument;
const rules = ruleDocument.spec.groups.flatMap((group) => group.rules);

describe("operational prometheus alert rules", () => {
  it("covers every required operational failure mode", () => {
    expect(alertNames()).toEqual(expect.arrayContaining([
      "DianaReadinessFailure",
      "DianaCronSuccessStale",
      "DianaCronRunStuck",
      "DianaWorkerQueueBacklog",
      "DianaWorkerQueueAgeHigh",
      "DianaWorkerHighRetryCount",
      "DianaCronDeadLetterSignaled",
      "DianaAmbiguousSubmissionBacklog",
      "DianaAmbiguousSubmissionAgeHigh",
    ]));
  });

  it("locks alert expressions and durations to the exported threshold contract", () => {
    expect(rule("DianaReadinessFailure")).toMatchObject({
      expr: "diana_operational_readiness == 0",
      for: OPERATIONAL_ALERT_THRESHOLDS.readinessFor,
    });
    expect(rule("DianaWorkerQueueBacklog")).toMatchObject({
      expr: `sum(diana_worker_jobs_total{queue="student-ai-candidate",status="queued"}) > ${OPERATIONAL_ALERT_THRESHOLDS.queueBacklog}`,
      for: OPERATIONAL_ALERT_THRESHOLDS.queueBacklogFor,
    });
    expect(rule("DianaWorkerQueueAgeHigh")).toMatchObject({
      expr: `diana_worker_oldest_queued_age_ms{queue="student-ai-candidate"} > ${OPERATIONAL_ALERT_THRESHOLDS.queueAgeMs}`,
      for: OPERATIONAL_ALERT_THRESHOLDS.queueAgeFor,
    });
    expect(rule("DianaWorkerRunningAgeHigh")).toMatchObject({
      expr: `diana_worker_oldest_running_age_ms{queue="student-ai-candidate"} > ${OPERATIONAL_ALERT_THRESHOLDS.runningAgeMs}`,
      for: OPERATIONAL_ALERT_THRESHOLDS.runningAgeFor,
    });
    expect(rule("DianaWorkerHighRetryCount")).toMatchObject({
      expr: `sum(diana_worker_retries_total{queue="student-ai-candidate"}) > ${OPERATIONAL_ALERT_THRESHOLDS.retryCount}`,
      for: OPERATIONAL_ALERT_THRESHOLDS.retryFor,
    });
    expect(rule("DianaAmbiguousSubmissionBacklog")).toMatchObject({
      expr: `diana_submission_confirmation_pending_total > ${OPERATIONAL_ALERT_THRESHOLDS.ambiguousSubmissionBacklog}`,
      for: OPERATIONAL_ALERT_THRESHOLDS.ambiguousSubmissionFor,
    });
    expect(rule("DianaAmbiguousSubmissionAgeHigh")).toMatchObject({
      expr: `diana_submission_oldest_confirmation_pending_age_seconds > ${OPERATIONAL_ALERT_THRESHOLDS.ambiguousSubmissionAgeSeconds}`,
      for: OPERATIONAL_ALERT_THRESHOLDS.ambiguousSubmissionFor,
    });
    expect(EXPECTED_CRON_JOBS.map((job) => job.staleAfterSeconds)).toEqual([
      129600,
      777600,
      900,
      1800,
      28800,
      129600,
      129600,
    ]);
  });

  it("does not claim ownership and maps every alert to a repository runbook section", () => {
    for (const alert of rules) {
      expect(alert.labels.owner_status).toBe("unassigned");
      expect(alert.labels).not.toHaveProperty("owner");
      expect(alert.annotations.runbook_path).toMatch(
        /^docs\/operations\/operational-alerts-runbook\.md#[a-z0-9-]+$/,
      );
      const anchor = alert.annotations.runbook_path.split("#")[1];
      expect(runbookHeadings()).toContain(anchor);
    }
    expect(runbook).toContain("owner_status: unassigned");
    expect(runbook).toContain('owner: ""');
  });
});

function alertNames() {
  return rules.map((entry) => entry.alert);
}

function rule(name: string) {
  const found = rules.find((entry) => entry.alert === name);
  expect(found, `missing rule ${name}`).toBeDefined();
  return found!;
}

function runbookHeadings() {
  return [...runbook.matchAll(/^## (.+)$/gm)].map((match) =>
    match[1].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  );
}

type AlertRule = {
  alert: string;
  expr: string;
  for: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
};

type RuleDocument = {
  spec: { groups: Array<{ rules: AlertRule[] }> };
};
