import {
  STUDENT_RUNTIME_READ_TOOLS,
  createOpenJarvisSidecarRequest,
  type DianaToolName,
  type WorkRequest,
} from "./command-center-contract";

export type LocalAiSidecarProvider = "openjarvis" | "ollama" | "codex";

export type LocalAiSidecarTransport = "openai_http" | "ollama_http" | "codex_cli";

export type LocalAiSidecarConfig = {
  provider: LocalAiSidecarProvider;
  baseUrl: string;
  model: string;
};

export type LocalAiSidecarMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LocalAiSidecarChatRequest = {
  url: string;
  init: {
    method: "POST";
    headers: Record<string, string>;
    body: string;
  };
};

export const DEFAULT_OLLAMA_SIDECAR: LocalAiSidecarConfig = {
  provider: "ollama",
  baseUrl: "http://127.0.0.1:11434",
  model: "llama3.2:3b",
};

export const DEFAULT_OPENJARVIS_SIDECAR: LocalAiSidecarConfig = {
  provider: "openjarvis",
  baseUrl: "http://127.0.0.1:8000",
  model: "local-default",
};

export const DEFAULT_CODEX_OAUTH_SIDECAR: LocalAiSidecarConfig = {
  provider: "codex",
  baseUrl: "codex://oauth",
  model: "gpt-5.5",
};

export function createStudentDianaVoiceSidecarRequest(input: {
  id: string;
  goalId: string;
  readOnly?: boolean;
  allowedDianaTools?: readonly DianaToolName[];
}): WorkRequest {
  return createOpenJarvisSidecarRequest({
    id: input.id,
    goalId: input.goalId,
    title: "Let a student type or speak to Diana through a local sidecar",
    task: [
      "Accept typed text or voice transcript from Diana.",
      "Use only approved Diana tools for assignment context and learning help.",
      "Return a candidate response and tool-call trace to Diana.",
      "Diana must apply AI policy, minor safety, and authorship logging before the student sees the result.",
    ].join(" "),
    readOnly: input.readOnly ?? true,
    allowedDianaTools: input.allowedDianaTools ?? STUDENT_RUNTIME_READ_TOOLS,
  });
}

export function sidecarHealthUrl(config: LocalAiSidecarConfig): string {
  const baseUrl = config.baseUrl.replace(/\/$/, "");
  if (config.provider === "codex") {
    throw new Error("Codex OAuth uses CLI transport; run the Codex worker check instead.");
  }
  return config.provider === "openjarvis" ? `${baseUrl}/v1/models` : `${baseUrl}/api/tags`;
}

export function sidecarTransport(provider: LocalAiSidecarProvider): LocalAiSidecarTransport {
  if (provider === "openjarvis") return "openai_http";
  if (provider === "ollama") return "ollama_http";
  return "codex_cli";
}

export function createSidecarChatRequest(
  config: LocalAiSidecarConfig,
  messages: readonly LocalAiSidecarMessage[],
): LocalAiSidecarChatRequest {
  const baseUrl = config.baseUrl.replace(/\/$/, "");

  if (config.provider === "codex") {
    throw new Error("Codex OAuth uses CLI transport; create Codex exec args instead.");
  }

  if (config.provider === "openjarvis") {
    return {
      url: `${baseUrl}/v1/chat/completions`,
      init: {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: config.model,
          messages,
          temperature: 0,
        }),
      },
    };
  }

  const prompt = messages.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join("\n\n");
  return {
    url: `${baseUrl}/api/generate`,
    init: {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: config.model,
        prompt,
        stream: false,
        options: { temperature: 0 },
      }),
    },
  };
}

export function parseSidecarText(provider: LocalAiSidecarProvider, responseJson: unknown): string {
  if (!responseJson || typeof responseJson !== "object") return "";
  const data = responseJson as Record<string, unknown>;

  if (provider === "ollama") {
    return typeof data.response === "string" ? data.response : "";
  }

  const choices = Array.isArray(data.choices) ? data.choices : [];
  const first = choices[0];
  if (!first || typeof first !== "object") return "";
  const message = (first as { message?: unknown }).message;
  if (!message || typeof message !== "object") return "";
  const content = (message as { content?: unknown }).content;
  return typeof content === "string" ? content : "";
}

export function createCodexOAuthExecArgs(config: LocalAiSidecarConfig, prompt: string): string[] {
  return [
    "exec",
    "--ephemeral",
    "--sandbox",
    "read-only",
    "--model",
    config.model,
    prompt,
  ];
}

export function localSidecarBoundaryIssues(request: WorkRequest): string[] {
  const issues: string[] = [];
  if (request.targetSystem !== "openjarvis") {
    issues.push("Local student sidecar requests must target OpenJarvis.");
  }
  if (request.sourceSystem !== "diana") {
    issues.push("Local student sidecar requests must originate from Diana.");
  }
  if (request.constraints.policyMode !== "student_runtime") {
    issues.push("Local student sidecar requests must use student_runtime policy mode.");
  }
  if (!request.constraints.allowedDianaTools?.length) {
    issues.push("Local student sidecar requests must declare allowed Diana tools.");
  }
  if (!request.constraints.privateLocalOnly) {
    issues.push("Local student sidecar requests must be privateLocalOnly.");
  }
  return issues;
}
