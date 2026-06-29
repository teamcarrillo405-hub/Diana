import { spawnSync } from "node:child_process";

type AuditStatus = "pass" | "fail" | "warn";

type AuditCheck = {
  name: string;
  status: AuditStatus;
  detail: string;
};

const PAPERCLIP_URL = process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3100";
const OPENJARVIS_URL = process.env.OPENJARVIS_BASE_URL ?? "http://127.0.0.1:8000";
const OLLAMA_URL = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
const RUN_DEEP = !process.argv.includes("--quick");
const SKIP_CODEX = process.argv.includes("--skip-codex");

const BACKEND_UI_PATTERN = [
  "127\\.0\\.0\\.1:8000",
  "127\\.0\\.0\\.1:3100",
  "127\\.0\\.0\\.1:11434",
  "codex://oauth",
  "paperclipai",
  "Paperclip",
  "OpenJarvis",
  "gstack",
  "\\bollama\\b",
].join("|");

async function main() {
  const checks: AuditCheck[] = [];

  checks.push(checkNoPaperclipTunnel());
  checks.push(await checkJsonEndpoint("Paperclip local/private health", `${PAPERCLIP_URL}/api/health`, (json) => {
    const record = json as Record<string, unknown>;
    return record.status === "ok" &&
      record.deploymentMode === "authenticated" &&
      record.deploymentExposure === "private";
  }));
  checks.push(await checkJsonEndpoint("OpenJarvis server health", `${OPENJARVIS_URL}/health`, (json) => {
    return (json as Record<string, unknown>).status === "ok";
  }));
  checks.push(await checkJsonEndpoint("OpenJarvis model endpoint", `${OPENJARVIS_URL}/v1/models`, (json) => {
    const data = (json as { data?: unknown }).data;
    return Array.isArray(data) && data.length > 0;
  }));
  checks.push(await checkJsonEndpoint("Ollama model endpoint", `${OLLAMA_URL}/api/tags`, (json) => {
    const models = (json as { models?: unknown }).models;
    return Array.isArray(models) && models.length > 0;
  }));
  checks.push(runCommandCheck("gstack browser health", npmCommand(), ["run", "gstack:browse", "--", "status"], "Status: healthy"));
  checks.push(runCommandCheck("OpenJarvis sidecar chat", npmCommand(), ["run", "command-center:openjarvis-test"], "\"ok\": true"));
  checks.push(runCommandCheck("Ollama fallback chat", npmCommand(), [
    "run",
    "command-center:local-ai-test",
    "--",
    "--provider=ollama",
    "--base-url=http://127.0.0.1:11434",
    "--model=llama3.2:3b",
  ], "\"ok\": true"));
  checks.push(runCommandCheck("Paperclip to gstack handoff", npmCommand(), ["run", "command-center:handoff"], "\"targetSystem\": \"gstack\""));
  checks.push(runCommandCheck("Paperclip issue payload", npmCommand(), ["run", "command-center:paperclip-issue"], "\"tool\": \"paperclipCreateIssue\""));
  checks.push(checkStudentUiBoundary());
  checks.push(runCommandCheck("command-center contract tests", npxCommand(), [
    "vitest",
    "run",
    "lib/integrations/diana-voice-sidecar.test.ts",
    "app/api/diana/voice-candidate/route.test.ts",
    "app/(app)/voice/voice-command-surface.test.tsx",
    "app/api/workers/claim/route.test.ts",
    "app/api/workers/complete/route.test.ts",
    "app/api/workers/metrics/route.test.ts",
    "lib/integrations/command-center-contract.test.ts",
    "lib/integrations/command-center-handoff.test.ts",
    "lib/integrations/command-center-paperclip.test.ts",
    "lib/integrations/openjarvis-sidecar.test.ts",
    "lib/worker-tier/production-worker-tier.test.ts",
    "lib/worker-tier/worker-queue.test.ts",
    "lib/worker-tier/worker-runner.test.ts",
    "lib/worker-tier/worker-metrics.test.ts",
    "components/voice-textarea.test.tsx",
  ], "Test Files"));

  if (RUN_DEEP && !SKIP_CODEX) {
    checks.push(runCommandCheck("Codex OAuth worker", npmCommand(), [
      "run",
      "command-center:local-ai-test",
      "--",
      "--provider=codex",
    ], "\"ok\": true", 150_000));
  } else {
    checks.push({
      name: "Codex OAuth worker",
      status: "warn",
      detail: RUN_DEEP ? "skipped by --skip-codex" : "skipped by --quick",
    });
  }

  printReport(checks);

  if (checks.some((check) => check.status === "fail")) {
    process.exit(1);
  }
}

async function checkJsonEndpoint(
  name: string,
  url: string,
  validate: (json: unknown) => boolean,
): Promise<AuditCheck> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { name, status: "fail", detail: `${url} returned ${response.status} ${response.statusText}` };
    }
    const json = await response.json();
    const ok = validate(json);
    return {
      name,
      status: ok ? "pass" : "fail",
      detail: ok ? url : `${url} returned unexpected payload: ${JSON.stringify(json).slice(0, 400)}`,
    };
  } catch (error) {
    return {
      name,
      status: "fail",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

function checkNoPaperclipTunnel(): AuditCheck {
  if (process.platform !== "win32") {
    const result = spawnSync("ps", ["-eo", "pid,args"], { encoding: "utf8" });
    return inspectTunnelOutput(result.stdout, result.error?.message);
  }

  const script = [
    "Get-CimInstance Win32_Process",
    "| Where-Object { $_.Name -eq 'ngrok.exe' -or $_.CommandLine -match 'ngrok' }",
    "| Select-Object ProcessId,CommandLine",
    "| ConvertTo-Json -Compress",
  ].join(" ");
  const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", script], {
    encoding: "utf8",
    windowsHide: true,
  });
  return inspectTunnelOutput(result.stdout, result.error?.message || result.stderr);
}

function inspectTunnelOutput(output: string, error?: string): AuditCheck {
  if (error?.trim()) {
    return { name: "No public Paperclip tunnel", status: "fail", detail: error.trim() };
  }

  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const paperclipTunnels = lines.filter((line) => /ngrok/i.test(line) && /(?:\s|:)3100\b/.test(line));
  if (paperclipTunnels.length > 0) {
    return {
      name: "No public Paperclip tunnel",
      status: "fail",
      detail: paperclipTunnels.join(" | "),
    };
  }
  return {
    name: "No public Paperclip tunnel",
    status: "pass",
    detail: "no ngrok process exposing Paperclip port 3100",
  };
}

function checkStudentUiBoundary(): AuditCheck {
  const result = spawnSync(rgCommand(), [
    "-n",
    "--glob",
    "!*.test.*",
    BACKEND_UI_PATTERN,
    "app",
    "components",
  ], {
    cwd: process.cwd(),
    encoding: "utf8",
    windowsHide: true,
  });

  if (result.error) {
    return { name: "Student UI backend boundary", status: "fail", detail: result.error.message };
  }
  if (result.status === 1) {
    return {
      name: "Student UI backend boundary",
      status: "pass",
      detail: "no direct Paperclip/OpenJarvis/gstack/Ollama/Codex backend references in app/ or components/",
    };
  }
  if (result.status === 0) {
    return {
      name: "Student UI backend boundary",
      status: "fail",
      detail: result.stdout.trim().split(/\r?\n/).slice(0, 12).join(" | "),
    };
  }
  return {
    name: "Student UI backend boundary",
    status: "fail",
    detail: result.stderr.trim() || `rg exited ${result.status}`,
  };
}

function runCommandCheck(
  name: string,
  command: string,
  args: string[],
  expectedText: string,
  timeoutMs = 90_000,
): AuditCheck {
  const invocation = commandInvocation(command, args);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: timeoutMs,
    windowsHide: true,
  });
  const combined = [result.stdout, result.stderr].filter(Boolean).join("\n");

  if (result.error) {
    return { name, status: "fail", detail: result.error.message };
  }
  if (result.status !== 0) {
    return { name, status: "fail", detail: `exit ${result.status}: ${combined.slice(0, 600)}` };
  }
  if (!combined.includes(expectedText)) {
    return { name, status: "fail", detail: `missing expected text ${JSON.stringify(expectedText)}` };
  }
  return { name, status: "pass", detail: expectedText };
}

function printReport(checks: readonly AuditCheck[]) {
  console.log("command-center-audit");
  for (const check of checks) {
    console.log(`  ${statusLabel(check.status)} ${check.name}: ${check.detail}`);
  }

  const issueCount = checks.filter((check) => check.status === "fail").length;
  const warned = checks.filter((check) => check.status === "warn").length;
  if (issueCount > 0) {
    console.log(`command-center-audit: action needed (${issueCount} blocking, ${warned} warned)`);
    return;
  }
  console.log(`command-center-audit: ready (${warned} warned)`);
}

function statusLabel(status: AuditStatus): string {
  if (status === "pass") return "PASS";
  if (status === "warn") return "WARN";
  return "FAIL";
}

function npmCommand(): string {
  return "npm";
}

function npxCommand(): string {
  return "npx";
}

function rgCommand(): string {
  return process.platform === "win32" ? "rg.exe" : "rg";
}

function commandInvocation(command: string, args: string[]): { command: string; args: string[] } {
  if (process.platform !== "win32") return { command, args };
  if (command !== "npm" && command !== "npx") return { command, args };
  return {
    command: "cmd.exe",
    args: ["/d", "/s", "/c", command, ...args],
  };
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
