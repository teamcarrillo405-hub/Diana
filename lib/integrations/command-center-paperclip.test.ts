import { describe, expect, it } from "vitest";
import { createOpenJarvisSidecarRequest } from "./command-center-contract";
import { createPaperclipGstackDashboardQaRequest } from "./command-center-handoff";
import {
  createPaperclipIssueDescription,
  createPaperclipIssueCliArgs,
  createPaperclipIssueDraftFromWorkRequest,
  formatPaperclipCliDescription,
  formatPaperclipCreateIssueEnvelope,
  invalidPaperclipIdOptions,
  paperclipIssueDraftBoundaryIssues,
} from "./command-center-paperclip";

const UUID = "11111111-1111-4111-8111-111111111111";

describe("command center Paperclip issue adapter", () => {
  it("creates a Paperclip MCP issue payload for the gstack dashboard QA request", () => {
    const request = createPaperclipGstackDashboardQaRequest({
      id: "diana-dashboard-qa-003",
      goalId: "goal-diana-command-center",
    });
    const envelope = createPaperclipIssueDraftFromWorkRequest(request, {
      companyId: UUID,
      projectId: UUID,
      paperclipGoalId: UUID,
      assigneeAgentId: UUID,
    });

    expect(envelope.tool).toBe("paperclipCreateIssue");
    expect(envelope.payload).toMatchObject({
      companyId: UUID,
      projectId: UUID,
      goalId: UUID,
      assigneeAgentId: UUID,
      title: "[Diana] Run Diana dashboard QA through gstack",
      status: "todo",
      priority: "medium",
      billingCode: "diana-command-center",
    });
    expect(envelope.payload.description).toContain("## Acceptance Gates");
    expect(envelope.payload.description).toContain("Do not touch Diana student data.");
    expect(envelope.payload.description).toContain('"targetSystem": "gstack"');
  });

  it("does not put Diana's logical work request goal into Paperclip goalId", () => {
    const request = createPaperclipGstackDashboardQaRequest({
      id: "diana-dashboard-qa-004",
      goalId: "goal-diana-command-center",
    });
    const envelope = createPaperclipIssueDraftFromWorkRequest(request);

    expect(envelope.payload.goalId).toBeNull();
    expect(envelope.payload.description).toContain("Diana work request goal: goal-diana-command-center");
  });

  it("rejects student-runtime requests before they become Paperclip gstack issues", () => {
    const request = createOpenJarvisSidecarRequest({
      id: "student-sidecar-001",
      goalId: "student-session-001",
      title: "Help student talk to Diana",
      task: "Use local speech for a student session.",
    });

    expect(paperclipIssueDraftBoundaryIssues(request)).toContain(
      "Paperclip issue drafts must originate from Paperclip-owned work requests.",
    );
    expect(() => createPaperclipIssueDraftFromWorkRequest(request)).toThrow("Unsafe Paperclip issue draft");
  });

  it("rejects non-UUID Paperclip identifiers instead of emitting invalid tool input", () => {
    expect(invalidPaperclipIdOptions({ companyId: "not-a-uuid", paperclipGoalId: UUID })).toEqual(["companyId"]);

    const request = createPaperclipGstackDashboardQaRequest({
      id: "diana-dashboard-qa-005",
      goalId: "goal-diana-command-center",
    });

    expect(() =>
      createPaperclipIssueDraftFromWorkRequest(request, {
        companyId: "not-a-uuid",
      }),
    ).toThrow("Invalid Paperclip UUID option");
  });

  it("formats the Paperclip envelope as stable JSON", () => {
    const request = createPaperclipGstackDashboardQaRequest({
      id: "diana-dashboard-qa-006",
      goalId: "goal-diana-command-center",
    });
    const formatted = formatPaperclipCreateIssueEnvelope(createPaperclipIssueDraftFromWorkRequest(request));

    expect(formatted.endsWith("\n")).toBe(true);
    expect(JSON.parse(formatted)).toMatchObject({
      tool: "paperclipCreateIssue",
      payload: {
        status: "todo",
        priority: "medium",
      },
    });
  });

  it("creates safe paperclipai issue create arguments for live submission", () => {
    const request = createPaperclipGstackDashboardQaRequest({
      id: "diana-dashboard-qa-008",
      goalId: "goal-diana-command-center",
    });
    const envelope = createPaperclipIssueDraftFromWorkRequest(request, {
      companyId: UUID,
      assigneeAgentId: UUID,
      billingCode: "diana-command-center-test",
    });

    expect(createPaperclipIssueCliArgs(envelope, { apiBase: "http://127.0.0.1:3100" })).toEqual(
      expect.arrayContaining([
        "issue",
        "create",
        "-C",
        UUID,
        "--title",
        "[Diana] Run Diana dashboard QA through gstack",
        "--assignee-agent-id",
        UUID,
        "--billing-code",
        "diana-command-center-test",
        "--api-base",
        "http://127.0.0.1:3100",
      ]),
    );
  });

  it("requires a company id before creating live Paperclip CLI arguments", () => {
    const request = createPaperclipGstackDashboardQaRequest({
      id: "diana-dashboard-qa-009",
      goalId: "goal-diana-command-center",
    });

    expect(() => createPaperclipIssueCliArgs(createPaperclipIssueDraftFromWorkRequest(request))).toThrow(
      "companyId is required",
    );
  });

  it("escapes multiline markdown for Windows-safe Paperclip CLI submission", () => {
    expect(formatPaperclipCliDescription("one\n\ntwo")).toBe("one\\n\\ntwo");
  });

  it("includes internal artifact references in the issue description", () => {
    const request = createPaperclipGstackDashboardQaRequest({
      id: "diana-dashboard-qa-007",
      goalId: "goal-diana-command-center",
    });
    const description = createPaperclipIssueDescription(request);

    expect(description).toContain("repo://docs/architecture/command-center-integration.md");
    expect(description).toContain("repo://LOGIC_MANIFEST.md");
    expect(description).not.toContain("student_education_record");
  });
});
