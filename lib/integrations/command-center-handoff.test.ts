import { describe, expect, it } from "vitest";
import {
  COMMAND_CENTER_ROADMAP,
  createPaperclipGstackDashboardQaRequest,
  currentIntegrationPhase,
  dianaDashboardQaArtifacts,
  formatWorkRequestForPaperclip,
} from "./command-center-handoff";
import { requestTouchesStudentData, studentRuntimeBoundaryIssues } from "./command-center-contract";

describe("command center handoff", () => {
  it("keeps the staged roadmap ordered from contract to operations", () => {
    expect(COMMAND_CENTER_ROADMAP.map((phase) => phase.id)).toEqual([
      "phase-1-contracts",
      "phase-2-paperclip-gstack",
      "phase-3-openjarvis-readonly",
      "phase-4-openjarvis-safe-writes",
      "phase-5-operations",
    ]);
    expect(currentIntegrationPhase().id).toBe("phase-2-paperclip-gstack");
  });

  it("creates a read-only Paperclip to gstack dashboard QA request", () => {
    const request = createPaperclipGstackDashboardQaRequest({
      id: "diana-dashboard-qa-001",
      goalId: "goal-diana-command-center",
    });

    expect(request.sourceSystem).toBe("paperclip");
    expect(request.targetSystem).toBe("gstack");
    expect(request.worker).toBe("gstack");
    expect(request.constraints.policyMode).toBe("engineering");
    expect(request.constraints.readOnly).toBe(true);
    expect(request.constraints.maxBudgetCents).toBe(250);
    expect(requestTouchesStudentData(request)).toBe(false);
    expect(studentRuntimeBoundaryIssues(request)).toEqual([]);
    expect(request.task).toContain("Do not access or mutate Diana student records");
  });

  it("references only internal artifacts for dashboard QA", () => {
    const artifacts = dianaDashboardQaArtifacts();

    expect(artifacts.length).toBeGreaterThan(0);
    expect(artifacts.every((artifact) => artifact.sensitivity === "internal")).toBe(true);
    expect(artifacts.map((artifact) => artifact.uri)).toContain("repo://LOGIC_MANIFEST.md");
  });

  it("formats valid JSON for Paperclip storage or dispatch", () => {
    const request = createPaperclipGstackDashboardQaRequest({
      id: "diana-dashboard-qa-002",
      goalId: "goal-diana-command-center",
    });
    const formatted = formatWorkRequestForPaperclip(request);

    expect(formatted.endsWith("\n")).toBe(true);
    expect(JSON.parse(formatted)).toMatchObject({
      id: "diana-dashboard-qa-002",
      targetSystem: "gstack",
      worker: "gstack",
    });
  });
});
