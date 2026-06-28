import {
  formatWorkRequestForPaperclip,
} from "./command-center-handoff";
import { requestTouchesStudentData, type WorkRequest } from "./command-center-contract";

export type PaperclipIssueStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "done"
  | "blocked"
  | "cancelled";

export type PaperclipIssuePriority = "critical" | "high" | "medium" | "low";

export type PaperclipCreateIssuePayload = {
  companyId?: string | null;
  projectId?: string | null;
  goalId?: string | null;
  parentId?: string | null;
  title: string;
  description: string;
  status: PaperclipIssueStatus;
  priority: PaperclipIssuePriority;
  assigneeAgentId?: string | null;
  assigneeUserId?: string | null;
  billingCode?: string | null;
};

export type PaperclipCreateIssueEnvelope = {
  tool: "paperclipCreateIssue";
  payload: PaperclipCreateIssuePayload;
};

export type PaperclipIssueDraftOptions = {
  companyId?: string | null;
  projectId?: string | null;
  paperclipGoalId?: string | null;
  parentId?: string | null;
  assigneeAgentId?: string | null;
  assigneeUserId?: string | null;
  priority?: PaperclipIssuePriority;
  status?: PaperclipIssueStatus;
  billingCode?: string | null;
};

export type PaperclipCliSubmitOptions = {
  apiBase?: string | null;
  apiKey?: string | null;
  contextPath?: string | null;
  profile?: string | null;
};

const PAPERCLIP_ID_KEYS = [
  "companyId",
  "projectId",
  "paperclipGoalId",
  "parentId",
  "assigneeAgentId",
] as const;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function paperclipIssueDraftBoundaryIssues(request: WorkRequest): string[] {
  const issues: string[] = [];

  if (request.sourceSystem !== "paperclip") {
    issues.push("Paperclip issue drafts must originate from Paperclip-owned work requests.");
  }
  if (request.targetSystem !== "gstack") {
    issues.push("This Paperclip issue adapter currently targets gstack handoffs only.");
  }
  if (request.worker !== "gstack") {
    issues.push("This Paperclip issue adapter currently emits gstack worker tasks only.");
  }
  if (request.constraints.policyMode !== "engineering") {
    issues.push("Paperclip to gstack issues must use engineering policy mode.");
  }
  if (requestTouchesStudentData(request)) {
    issues.push("Paperclip to gstack issues must not include student-private or education-record artifacts.");
  }

  return issues;
}

export function invalidPaperclipIdOptions(options: PaperclipIssueDraftOptions): string[] {
  return PAPERCLIP_ID_KEYS.filter((key) => {
    const value = options[key];
    return typeof value === "string" && value.length > 0 && !UUID_PATTERN.test(value);
  });
}

export function createPaperclipIssueDescription(request: WorkRequest): string {
  const artifacts = request.inputs.length
    ? request.inputs
        .map((artifact) => `- ${artifact.title ?? artifact.kind}: ${artifact.uri} (${artifact.sensitivity})`)
        .join("\n")
    : "- No external artifacts.";

  return [
    "## Status",
    "",
    "Create a read-only gstack engineering run for Diana. This task is command-center coordination only; Diana remains the student runtime and policy gate.",
    "",
    "## Work",
    "",
    request.task,
    "",
    "## Constraints",
    "",
    `- Source: ${request.sourceSystem}`,
    `- Target: ${request.targetSystem}`,
    `- Worker: ${request.worker}`,
    `- Policy mode: ${request.constraints.policyMode}`,
    `- Read-only: ${String(request.constraints.readOnly)}`,
    `- Approval required: ${String(request.constraints.approvalRequired ?? false)}`,
    `- Max budget cents: ${request.constraints.maxBudgetCents ?? "not set"}`,
    `- Diana work request goal: ${request.goalId}`,
    "",
    "## Acceptance Gates",
    "",
    ...request.acceptanceGates.map((gate) => `- ${gate}`),
    "",
    "## Artifacts",
    "",
    artifacts,
    "",
    "## Diana Work Request",
    "",
    "```json",
    formatWorkRequestForPaperclip(request).trimEnd(),
    "```",
  ].join("\n");
}

export function createPaperclipIssueDraftFromWorkRequest(
  request: WorkRequest,
  options: PaperclipIssueDraftOptions = {},
): PaperclipCreateIssueEnvelope {
  const boundaryIssues = paperclipIssueDraftBoundaryIssues(request);
  if (boundaryIssues.length) {
    throw new Error(`Unsafe Paperclip issue draft: ${boundaryIssues.join(" ")}`);
  }

  const invalidIdOptions = invalidPaperclipIdOptions(options);
  if (invalidIdOptions.length) {
    throw new Error(`Invalid Paperclip UUID option(s): ${invalidIdOptions.join(", ")}`);
  }

  return {
    tool: "paperclipCreateIssue",
    payload: {
      companyId: options.companyId ?? null,
      projectId: options.projectId ?? null,
      goalId: options.paperclipGoalId ?? null,
      parentId: options.parentId ?? null,
      title: `[Diana] ${request.title}`,
      description: createPaperclipIssueDescription(request),
      status: options.status ?? "todo",
      priority: options.priority ?? "medium",
      assigneeAgentId: options.assigneeAgentId ?? null,
      assigneeUserId: options.assigneeUserId ?? null,
      billingCode: options.billingCode ?? "diana-command-center",
    },
  };
}

export function formatPaperclipCreateIssueEnvelope(envelope: PaperclipCreateIssueEnvelope): string {
  return `${JSON.stringify(envelope, null, 2)}\n`;
}

function pushOptionalArg(args: string[], name: string, value: string | null | undefined) {
  if (value) {
    args.push(name, value);
  }
}

export function formatPaperclipCliDescription(description: string): string {
  return description.replace(/\r?\n/g, "\\n");
}

export function createPaperclipIssueCliArgs(
  envelope: PaperclipCreateIssueEnvelope,
  options: PaperclipCliSubmitOptions = {},
): string[] {
  const { payload } = envelope;
  if (!payload.companyId) {
    throw new Error("companyId is required to submit a Paperclip issue.");
  }

  const args = [
    "issue",
    "create",
    "-C",
    payload.companyId,
    "--title",
    payload.title,
    "--description",
    formatPaperclipCliDescription(payload.description),
    "--status",
    payload.status,
    "--priority",
    payload.priority,
    "--json",
  ];

  pushOptionalArg(args, "--project-id", payload.projectId);
  pushOptionalArg(args, "--goal-id", payload.goalId);
  pushOptionalArg(args, "--parent-id", payload.parentId);
  pushOptionalArg(args, "--assignee-agent-id", payload.assigneeAgentId);
  pushOptionalArg(args, "--billing-code", payload.billingCode);
  pushOptionalArg(args, "--api-base", options.apiBase);
  pushOptionalArg(args, "--api-key", options.apiKey);
  pushOptionalArg(args, "--context", options.contextPath);
  pushOptionalArg(args, "--profile", options.profile);

  return args;
}
