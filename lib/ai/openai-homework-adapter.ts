import {
  logInteraction,
  runSafeBudgetedAiCall,
  type AiGuardFailure,
  type LogParams,
} from "@/lib/ai/safety";
import {
  selectHomeworkModelTier,
  type HomeworkModelRouting,
  type HomeworkModelTask,
  type HomeworkModelTier,
} from "@/lib/ai/homework-model-tier";

export type OpenAIHomeworkTask = HomeworkModelTask;

export type OpenAIHomeworkQuality = HomeworkModelTier;

export type OpenAIHomeworkRouting = HomeworkModelRouting;

const OPENAI_HOMEWORK_DEFAULT_MODELS: Record<OpenAIHomeworkQuality, string> = {
  fast: "gpt-5.6-luna",
  quality: "gpt-5.6-terra",
  complex: "gpt-5.6-sol",
};

const OPENAI_HOMEWORK_REASONING_EFFORT: Record<OpenAIHomeworkQuality, "low" | "medium" | "high"> = {
  fast: "low",
  quality: "medium",
  complex: "high",
};

const OPENAI_HOMEWORK_RETRY_STATUSES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
export type OpenAIHomeworkMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type OpenAIHomeworkResult<T> =
  | { ok: true; value: T; model: string; tokens: number; rawContent: string }
  | { ok: false; error: string; guard?: AiGuardFailure };

const UNVERIFIED_PROVIDER_OUTPUT = "Diana could not verify the AI response. Try again.";

export function selectOpenAIHomeworkQuality(input: {
  task: OpenAIHomeworkTask;
} & OpenAIHomeworkRouting): OpenAIHomeworkQuality {
  return selectHomeworkModelTier(input);
}

export function openAIHomeworkModel(quality: OpenAIHomeworkQuality): string {
  const envKey = `OPENAI_HOMEWORK_${quality.toUpperCase()}_MODEL`;
  return process.env[envKey]?.trim() ||
    process.env.OPENAI_HOMEWORK_MODEL?.trim() ||
    OPENAI_HOMEWORK_DEFAULT_MODELS[quality];
}

export function parseOpenAIJsonObject<T>(
  raw: string,
  fallback: T,
  validate: (value: unknown) => value is T,
): T {
  const candidate = extractJsonObject(raw);
  if (!candidate) return fallback;
  try {
    const parsed = JSON.parse(candidate) as unknown;
    return validate(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function tryParseOpenAIJsonObject<T>(
  raw: string,
  validate: (value: unknown) => value is T,
): { ok: true; value: T } | { ok: false } {
  const candidate = extractJsonObject(raw);
  if (!candidate) return { ok: false };
  try {
    const parsed = JSON.parse(candidate) as unknown;
    return validate(parsed) ? { ok: true, value: parsed } : { ok: false };
  } catch {
    return { ok: false };
  }
}

export async function runOpenAIHomeworkJson<T>({
  ownerId,
  assignmentId,
  accounting,
  task,
  messages,
  maxOutputTokens,
  validate,
  fetcher = fetch,
  idempotencyKey,
  routing,
}: {
  ownerId: string;
  assignmentId?: string | null;
  accounting: Parameters<typeof runSafeBudgetedAiCall>[0]["supabase"];
  task: OpenAIHomeworkTask;
  messages: OpenAIHomeworkMessage[];
  maxOutputTokens: number;
  fallback: T;
  validate: (value: unknown) => value is T;
  fetcher?: typeof fetch;
  idempotencyKey?: string;
  routing?: OpenAIHomeworkRouting;
}): Promise<OpenAIHomeworkResult<T>> {
  const systemPrompt = messages.find((message) => message.role === "system")?.content ?? "";
  const input = messages.map((message) => `${message.role}: ${message.content}`).join("\n\n");
  const quality = selectOpenAIHomeworkQuality({ task, ...routing });
  const model = openAIHomeworkModel(quality);

  const guarded = await runSafeBudgetedAiCall({
    ownerId,
    supabase: accounting,
    input,
    systemPrompt,
    maxOutputTokens,
    idempotencyKey,
    invoke: () => callOpenAIHomeworkChatWithRetry({ quality, model, messages, maxOutputTokens, json: true, fetcher }),
    getTokens: (value) => value.tokens,
    getOutput: (value) => value.content,
  });
  if (!guarded.ok) return { ok: false, error: guarded.message, guard: guarded };

  await logInteraction({
    ownerId,
    assignmentId,
    feature: logFeatureForTask(task),
    model: guarded.value.model,
    correlationId: idempotencyKey,
    inputBytes: new TextEncoder().encode(input).byteLength,
    outputBytes: new TextEncoder().encode(guarded.value.content).byteLength,
    tokensUsed: guarded.value.tokens,
  }, accounting);

  const parsed = tryParseOpenAIJsonObject(guarded.value.content, validate);
  if (!parsed.ok) return { ok: false, error: UNVERIFIED_PROVIDER_OUTPUT };

  return {
    ok: true,
    value: parsed.value,
    model: guarded.value.model,
    tokens: guarded.value.tokens,
    rawContent: guarded.value.content,
  };
}

export async function runOpenAIHomeworkText({
  ownerId,
  assignmentId,
  accounting,
  task,
  messages,
  maxOutputTokens,
  quality: requestedQuality,
  fetcher = fetch,
  idempotencyKey,
  routing,
}: {
  ownerId: string;
  assignmentId?: string | null;
  accounting: Parameters<typeof runSafeBudgetedAiCall>[0]["supabase"];
  task: OpenAIHomeworkTask;
  messages: OpenAIHomeworkMessage[];
  maxOutputTokens: number;
  quality?: OpenAIHomeworkQuality;
  fetcher?: typeof fetch;
  idempotencyKey?: string;
  routing?: OpenAIHomeworkRouting;
}): Promise<OpenAIHomeworkResult<string>> {
  const systemPrompt = messages.find((message) => message.role === "system")?.content ?? "";
  const input = messages.map((message) => `${message.role}: ${message.content}`).join("\n\n");
  const quality = requestedQuality ?? selectOpenAIHomeworkQuality({ task, ...routing });
  const model = openAIHomeworkModel(quality);
  const guarded = await runSafeBudgetedAiCall({
    ownerId,
    supabase: accounting,
    input,
    systemPrompt,
    maxOutputTokens,
    idempotencyKey,
    invoke: () => callOpenAIHomeworkChatWithRetry({ quality, model, messages, maxOutputTokens, json: false, fetcher }),
    getTokens: (value) => value.tokens,
    getOutput: (value) => value.content,
  });
  if (!guarded.ok) return { ok: false, error: guarded.message, guard: guarded };

  await logInteraction({
    ownerId,
    assignmentId,
    feature: logFeatureForTask(task),
    model: guarded.value.model,
    correlationId: idempotencyKey,
    inputBytes: new TextEncoder().encode(input).byteLength,
    outputBytes: new TextEncoder().encode(guarded.value.content).byteLength,
    tokensUsed: guarded.value.tokens,
  }, accounting);
  if (!guarded.value.content.trim()) {
    return { ok: false, error: UNVERIFIED_PROVIDER_OUTPUT };
  }
  return {
    ok: true,
    value: guarded.value.content,
    model: guarded.value.model,
    tokens: guarded.value.tokens,
    rawContent: guarded.value.content,
  };
}


function logFeatureForTask(task: OpenAIHomeworkTask): LogParams["feature"] {
  switch (task) {
    case "source_extraction":
      return "doc_extract";
    case "visual_explanation":
      return "visual_tool";
    case "study_artifact":
      return "study_artifacts";
    case "realtime":
      return "assignment_realtime";
    default:
      return task;
  }
}
async function callOpenAIHomeworkChatWithRetry(args: {
  quality: OpenAIHomeworkQuality;
  model: string;
  messages: OpenAIHomeworkMessage[];
  maxOutputTokens: number;
  json: boolean;
  fetcher: typeof fetch;
}): Promise<{ content: string; model: string; tokens: number }> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await callOpenAIHomeworkChat(args);
    } catch (error) {
      lastError = error;
      if (!(error instanceof OpenAIHomeworkRetryableError)) break;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("openai_homework_unavailable");
}

class OpenAIHomeworkRetryableError extends Error {}

async function callOpenAIHomeworkChat({
  quality,
  model,
  messages,
  maxOutputTokens,
  json,
  fetcher,
}: {
  quality: OpenAIHomeworkQuality;
  model: string;
  messages: OpenAIHomeworkMessage[];
  maxOutputTokens: number;
  json: boolean;
  fetcher: typeof fetch;
}): Promise<{ content: string; model: string; tokens: number }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("openai_homework_not_configured");
  const systemInstructions = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  const response = await fetcher("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions: systemInstructions,
      input: messages
        .filter((message) => message.role !== "system")
        .map((message) => ({
          role: message.role,
          content: [{ type: "input_text", text: message.content }],
        })),
      max_output_tokens: maxOutputTokens,
      reasoning: { effort: OPENAI_HOMEWORK_REASONING_EFFORT[quality] },
      ...(json ? { text: { format: { type: "json_object" } } } : {}),
      store: false,
    }),
  });
  if (!response.ok) {
    if (OPENAI_HOMEWORK_RETRY_STATUSES.has(response.status)) throw new OpenAIHomeworkRetryableError("openai_homework_retryable");
    throw new Error("openai_homework_unavailable");
  }
  const payload = await response.json() as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      prompt_tokens?: number;
      completion_tokens?: number;
    };
    model?: string;
  };
  const content = payload.output_text ?? payload.output
    ?.flatMap((item) => item.content ?? [])
    .find((item) => item.type === "output_text" && typeof item.text === "string")
    ?.text ?? "";
  if (!content.trim()) throw new Error("openai_homework_empty_response");
  return {
    content,
    model: payload.model ?? model,
    tokens: Number(payload.usage?.input_tokens ?? payload.usage?.prompt_tokens ?? 0) +
      Number(payload.usage?.output_tokens ?? payload.usage?.completion_tokens ?? 0),
  };
}

function extractJsonObject(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  return start >= 0 && end > start ? trimmed.slice(start, end + 1) : null;
}
