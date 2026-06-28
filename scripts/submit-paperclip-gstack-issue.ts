import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createPaperclipGstackDashboardQaRequest } from "../lib/integrations/command-center-handoff";
import {
  createPaperclipIssueCliArgs,
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
  const companyId = argValue("company-id");
  if (!companyId) {
    throw new Error("--company-id=<uuid> is required for live Paperclip submission.");
  }

  const workRequest = createPaperclipGstackDashboardQaRequest({
    id: argValue("id") ?? `diana-dashboard-qa-${new Date().toISOString().slice(0, 10)}`,
    goalId: argValue("work-goal") ?? "goal-diana-command-center",
    readOnly: !hasFlag("allow-edits"),
  });

  const envelope = createPaperclipIssueDraftFromWorkRequest(workRequest, {
    companyId,
    projectId: argValue("project-id"),
    paperclipGoalId: argValue("paperclip-goal-id"),
    parentId: argValue("parent-id"),
    assigneeAgentId: argValue("assignee-agent-id"),
    assigneeUserId: argValue("assignee-user-id"),
    priority: priorityValue(argValue("priority")),
    billingCode: argValue("billing-code") ?? undefined,
  });

  if (hasFlag("dry-run")) {
    process.stdout.write(formatPaperclipCreateIssueEnvelope(envelope));
    return;
  }

  const args = createPaperclipIssueCliArgs(envelope, {
    apiBase: argValue("api-base"),
    apiKey: argValue("api-key"),
    contextPath: argValue("context"),
    profile: argValue("profile"),
  });

  const paperclipCli = process.platform === "win32"
    ? join(process.env.APPDATA ?? "", "npm", "node_modules", "paperclipai", "dist", "index.js")
    : null;
  const command = paperclipCli && existsSync(paperclipCli) ? process.execPath : "paperclipai";
  const commandArgs = paperclipCli && existsSync(paperclipCli) ? [paperclipCli, ...args] : args;
  const result = spawnSync(command, commandArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

main();
