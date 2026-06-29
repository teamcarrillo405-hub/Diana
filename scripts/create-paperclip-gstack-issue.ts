import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createPaperclipGstackDashboardQaRequest } from "../lib/integrations/command-center-handoff";
import {
  createPaperclipIssueDraftFromWorkRequest,
  formatPaperclipCreateIssueEnvelope,
  type PaperclipIssuePriority,
} from "../lib/integrations/command-center-paperclip";

function argValue(name: string): string | null {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function priorityValue(raw: string | null): PaperclipIssuePriority {
  if (raw === "critical" || raw === "high" || raw === "medium" || raw === "low") {
    return raw;
  }
  if (raw) {
    throw new Error(`Invalid priority: ${raw}`);
  }
  return "medium";
}

function main() {
  const id = argValue("id") ?? `diana-dashboard-qa-${new Date().toISOString().slice(0, 10)}`;
  const workGoalId = argValue("work-goal") ?? "goal-diana-command-center";
  const writePath = argValue("write");

  const workRequest = createPaperclipGstackDashboardQaRequest({
    id,
    goalId: workGoalId,
    readOnly: !hasFlag("allow-edits"),
  });

  const envelope = createPaperclipIssueDraftFromWorkRequest(workRequest, {
    companyId: argValue("company-id"),
    projectId: argValue("project-id"),
    paperclipGoalId: argValue("paperclip-goal-id"),
    parentId: argValue("parent-id"),
    assigneeAgentId: argValue("assignee-agent-id"),
    assigneeUserId: argValue("assignee-user-id"),
    priority: priorityValue(argValue("priority")),
    billingCode: argValue("billing-code") ?? undefined,
  });

  const payload = formatPaperclipCreateIssueEnvelope(envelope);

  if (writePath) {
    const output = join(process.cwd(), writePath);
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, payload);
    console.log(`paperclip issue payload written: ${writePath}`);
    return;
  }

  process.stdout.write(payload);
}

main();
