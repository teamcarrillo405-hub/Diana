import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  DEFAULT_CODEX_OAUTH_SIDECAR,
  DEFAULT_OLLAMA_SIDECAR,
  createCodexOAuthExecArgs,
  createSidecarChatRequest,
  parseSidecarText,
  sidecarHealthUrl,
  type LocalAiSidecarConfig,
  type LocalAiSidecarProvider,
} from "../lib/integrations/openjarvis-sidecar";

function argValue(name: string): string | null {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

function providerValue(raw: string | null): LocalAiSidecarProvider {
  if (raw === "openjarvis" || raw === "ollama" || raw === "codex") return raw;
  if (raw === "codex_oauth" || raw === "oauth-codex") return "codex";
  if (raw) throw new Error(`Invalid provider: ${raw}`);
  if (process.env.DIANA_LOCAL_AI_PROVIDER) return providerValue(process.env.DIANA_LOCAL_AI_PROVIDER);
  return process.env.OPENJARVIS_BASE_URL ? "openjarvis" : "ollama";
}

async function main() {
  const provider = providerValue(argValue("provider"));
  const config: LocalAiSidecarConfig = {
    provider,
    baseUrl:
      argValue("base-url") ??
      process.env.OPENJARVIS_BASE_URL ??
      (provider === "ollama"
        ? DEFAULT_OLLAMA_SIDECAR.baseUrl
        : provider === "codex"
          ? DEFAULT_CODEX_OAUTH_SIDECAR.baseUrl
          : "http://127.0.0.1:8000"),
    model:
      argValue("model") ??
      process.env.OPENJARVIS_MODEL ??
      (provider === "ollama"
        ? DEFAULT_OLLAMA_SIDECAR.model
        : provider === "codex"
          ? DEFAULT_CODEX_OAUTH_SIDECAR.model
          : "local-default"),
  };

  if (provider === "codex") {
    const text = runCodexWorkerCheck(config);
    printResult(config, text);
    return;
  }

  const health = await fetch(sidecarHealthUrl(config));
  if (!health.ok) {
    throw new Error(`Sidecar health check returned ${health.status} ${health.statusText}`);
  }

  const chatRequest = createSidecarChatRequest(config, [
    {
      role: "system",
      content: "You are a local Diana sidecar health check. Reply in one short sentence.",
    },
    {
      role: "user",
      content: "Confirm the local Diana sidecar can answer a typed student message.",
    },
  ]);

  const chat = await fetch(chatRequest.url, chatRequest.init);
  if (!chat.ok) {
    throw new Error(`Sidecar chat check returned ${chat.status} ${chat.statusText}`);
  }
  const json = await chat.json();
  const text = parseSidecarText(config.provider, json).trim();
  if (!text) {
    throw new Error("Sidecar chat returned an empty response.");
  }

  printResult(config, text);
}

function runCodexWorkerCheck(config: LocalAiSidecarConfig): string {
  const tempDir = mkdtempSync(join(tmpdir(), "diana-codex-worker-"));
  const outputPath = join(tempDir, "last-message.txt");
  try {
    const prompt = "Reply with one short sentence confirming Diana can use the Codex OAuth worker.";
    const baseArgs = createCodexOAuthExecArgs(config, prompt);
    const promptArg = baseArgs.at(-1);
    const args = [...baseArgs.slice(0, -1), "--output-last-message", outputPath, promptArg ?? prompt];
    const invocation = codexInvocation();
    const result = spawnSync(invocation.command, [...invocation.argsPrefix, ...args], {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 120_000,
      windowsHide: true,
    });

    if (result.error) {
      throw new Error(`Codex worker check returned ${result.error.message}`);
    }
    if (result.status !== 0) {
      const detail = [result.stderr, result.stdout].filter(Boolean).join("\n").trim();
      throw new Error(`Codex worker check returned exit ${result.status}${detail ? `: ${detail}` : ""}`);
    }

    const text = readFileSync(outputPath, "utf8").trim();
    if (!text) {
      throw new Error("Codex worker check returned an empty response.");
    }
    return text;
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function codexInvocation(): { command: string; argsPrefix: string[] } {
  const appData = process.env.APPDATA;
  const codexJs = appData
    ? join(appData, "npm", "node_modules", "@openai", "codex", "bin", "codex.js")
    : "";
  if (codexJs && existsSync(codexJs)) {
    return { command: process.execPath, argsPrefix: [codexJs] };
  }
  return { command: process.platform === "win32" ? "codex.cmd" : "codex", argsPrefix: [] };
}

function printResult(config: LocalAiSidecarConfig, text: string) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        provider: config.provider,
        baseUrl: config.baseUrl,
        model: config.model,
        responsePreview: text.slice(0, 240),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
