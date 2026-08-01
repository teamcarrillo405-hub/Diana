import { composeSystemPrompt } from "@/lib/ai/system-prompts";
import {
  DEFAULT_OPENJARVIS_SIDECAR,
  createSidecarChatRequest,
  createStudentDianaVoiceSidecarRequest,
  localSidecarBoundaryIssues,
  parseSidecarText,
  type LocalAiSidecarConfig,
  type LocalAiSidecarMessage,
} from "@/lib/integrations/openjarvis-sidecar";
import { STUDENT_RUNTIME_READ_TOOLS } from "@/lib/integrations/command-center-contract";

export type DianaVoiceCandidateSource = "typed" | "voice";

export type DianaVoiceCandidateInput = {
  transcript: string;
  source: DianaVoiceCandidateSource;
  assignmentId?: string | null;
  learnedContext?: string | null;
};

export type DianaVoiceCandidateTrace = {
  worker: "openjarvis";
  provider: "openjarvis";
  model: string;
  policyMode: "student_runtime";
  readOnly: true;
  allowedDianaTools: readonly string[];
};

export type DianaVoiceCandidateResult = {
  response: string;
  trace: DianaVoiceCandidateTrace;
};

export type DianaVoiceCandidateAuditPayload = {
  source: DianaVoiceCandidateSource;
  transcriptChars: number;
  responseChars: number;
  trace: DianaVoiceCandidateTrace;
};

export const DIANA_VOICE_PROVIDER_ERROR_CODES = [
  "provider_boundary_invalid",
  "provider_http_error",
  "provider_response_invalid",
  "provider_response_empty",
] as const;

export type DianaVoiceProviderErrorCode =
  (typeof DIANA_VOICE_PROVIDER_ERROR_CODES)[number];

export class DianaVoiceProviderError extends Error {
  readonly code: DianaVoiceProviderErrorCode;
  readonly metadata: Readonly<{ httpStatus?: number; issueCount?: number }>;

  constructor(
    code: DianaVoiceProviderErrorCode,
    metadata: { httpStatus?: number; issueCount?: number } = {},
  ) {
    super(code);
    this.name = "DianaVoiceProviderError";
    this.code = code;
    this.metadata = Object.freeze({ ...metadata });
  }
}

const VOICE_SIDECAR_PROMPT = [
  "You are a local Diana sidecar worker.",
  "Return one candidate next move for Diana to review before the student sees it.",
  "Do not write final homework, final essay prose, final answers, or assignment submissions.",
  "Use the student's typed text or voice transcript as the only source unless Diana provides approved context.",
  "Keep the response under 80 words. Ask one concrete next-step question when that is more useful than advice.",
].join(" ");

export function isDianaVoiceSidecarEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const value = env.DIANA_OPENJARVIS_SIDECAR_ENABLED ?? env.DIANA_VOICE_SIDECAR_ENABLED;
  return value === "true" || value === "1";
}

export function resolveDianaVoiceSidecarConfig(env: NodeJS.ProcessEnv = process.env): LocalAiSidecarConfig {
  return {
    ...DEFAULT_OPENJARVIS_SIDECAR,
    baseUrl: env.OPENJARVIS_BASE_URL ?? DEFAULT_OPENJARVIS_SIDECAR.baseUrl,
    model: env.OPENJARVIS_MODEL ?? "llama3.2:3b",
  };
}

export function normalizeDianaVoiceCandidateInput(raw: unknown): DianaVoiceCandidateInput | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const transcript = typeof data.transcript === "string" ? data.transcript.trim() : "";
  if (transcript.length < 2 || transcript.length > 2000) return null;
  const source = data.source === "voice" ? "voice" : "typed";
  const assignmentId = typeof data.assignmentId === "string" && data.assignmentId.trim()
    ? data.assignmentId.trim()
    : null;
  const learnedContext = typeof data.learnedContext === "string" && data.learnedContext.trim()
    ? data.learnedContext.trim().slice(0, 400)
    : null;
  return {
    transcript,
    source,
    assignmentId,
    ...(learnedContext ? { learnedContext } : {}),
  };
}

export function buildDianaVoiceSidecarMessages(input: DianaVoiceCandidateInput): LocalAiSidecarMessage[] {
  return [
    {
      role: "system",
      content: composeSystemPrompt(VOICE_SIDECAR_PROMPT, {
        includeRefuseRedirect: true,
        includeFrustration: true,
        includeMinorSafety: true,
      }),
    },
    {
      role: "user",
      content: [
        `Input source: ${input.source}`,
        input.learnedContext ? `Diana-approved learned context: ${input.learnedContext}` : "",
        "Student text or transcript:",
        input.transcript,
      ].filter(Boolean).join("\n"),
    },
  ];
}

export async function createDianaVoiceCandidate({
  input,
  config = resolveDianaVoiceSidecarConfig(),
  fetchImpl = fetch,
  signal,
}: {
  input: DianaVoiceCandidateInput;
  config?: LocalAiSidecarConfig;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}): Promise<DianaVoiceCandidateResult> {
  const workRequest = createStudentDianaVoiceSidecarRequest({
    id: `voice-sidecar-${Date.now()}`,
    goalId: "student-voice-session",
    readOnly: true,
    allowedDianaTools: STUDENT_RUNTIME_READ_TOOLS,
  });
  const issues = localSidecarBoundaryIssues(workRequest);
  if (issues.length > 0) {
    throw new DianaVoiceProviderError("provider_boundary_invalid", {
      issueCount: Math.min(issues.length, 20),
    });
  }

  const chatRequest = createSidecarChatRequest(config, buildDianaVoiceSidecarMessages(input));
  let response: Response;
  try {
    response = await fetchImpl(chatRequest.url, { ...chatRequest.init, signal });
  } catch {
    throw new DianaVoiceProviderError("provider_http_error");
  }
  if (!response.ok) {
    throw new DianaVoiceProviderError("provider_http_error", {
      httpStatus: Math.max(0, Math.min(599, Math.floor(response.status))),
    });
  }

  let rawPayload: unknown;
  try {
    rawPayload = await response.json();
  } catch {
    throw new DianaVoiceProviderError("provider_response_invalid");
  }
  if (!hasOpenJarvisTextShape(rawPayload)) {
    throw new DianaVoiceProviderError("provider_response_invalid");
  }

  let parsedText: string;
  try {
    parsedText = parseSidecarText("openjarvis", rawPayload);
  } catch {
    throw new DianaVoiceProviderError("provider_response_invalid");
  }
  const text = normalizeDianaVoiceCandidateResponse(parsedText);
  if (!text) {
    throw new DianaVoiceProviderError("provider_response_empty");
  }

  return {
    response: text.slice(0, 1200),
    trace: {
      worker: "openjarvis",
      provider: "openjarvis",
      model: config.model,
      policyMode: "student_runtime",
      readOnly: true,
      allowedDianaTools: [...STUDENT_RUNTIME_READ_TOOLS],
    },
  };
}

function hasOpenJarvisTextShape(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== "object") {
    return false;
  }
  const message = (choices[0] as { message?: unknown }).message;
  return Boolean(
    message && typeof message === "object" &&
      typeof (message as { content?: unknown }).content === "string",
  );
}

export function normalizeDianaVoiceCandidateResponse(raw: string): string {
  const compact = raw.replace(/\s+/g, " ").trim();
  if (!compact) return "";

  const firstQuestion = compact.indexOf("?");
  const secondQuestion = firstQuestion >= 0 ? compact.indexOf("?", firstQuestion + 1) : -1;
  const oneQuestion = secondQuestion >= 0 ? compact.slice(0, firstQuestion + 1) : compact;
  const words = oneQuestion.split(" ");
  return words.length <= 80 ? oneQuestion : `${words.slice(0, 80).join(" ")}...`;
}

export function createDianaVoiceCandidateAuditPayload(
  input: DianaVoiceCandidateInput,
  result: DianaVoiceCandidateResult,
): DianaVoiceCandidateAuditPayload {
  return {
    source: input.source,
    transcriptChars: input.transcript.length,
    responseChars: result.response.length,
    trace: result.trace,
  };
}
