import { NextResponse } from "next/server";

import {
  formatHomeworkKernelForTutor,
  homeworkAuthorshipMetadata,
  loadAssignmentHomeworkKernel,
  type AssignmentHomeworkKernel,
} from "@/lib/assignment-help/server-understanding";
import type { AssignmentReviewField } from "@/lib/assignment-review";
import { estimateTokenReservation, logInteraction, runSafeBudgetedAiCall } from "@/lib/ai/safety";
import { assertDianaHomeworkAllowed } from "@/lib/ai/diana-trust-rules";
import { createAiServiceClient } from "@/lib/supabase/ai-service";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

const REALTIME_TTL_SECONDS = 600;
const MAX_OUTPUT_TOKENS = 450;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

const REALTIME_TUTOR_PROMPT = [
  "You are Diana, a live voice homework tutor inside the student's assignment workspace.",
  "Use a Study Mode-style conversation: ask one short question, guide one next move, and check understanding before moving on.",
  "Never give the final answer, write the finished assignment, or submit work for the student.",
  "If the student asks for the answer, redirect to the next thinking step.",
  "Speak in short, calm sentences for ADHD and dyslexia accessibility.",
  "For math, ask what operation, rule, graph, or check should happen next before solving.",
  "For writing, research, DBQs, language, coding, art, labs, and projects, focus on process, evidence, revision, and student-owned work.",
  "If a diagram would help, describe it simply in words and ask the student to sketch or inspect it.",
  "Use the answer_complex_homework tool only when the student's question needs advanced, multi-source, or extended reasoning beyond a short conversational step.",
  "Do not browse, open external systems, submit work, change data, or claim an action happened.",
].join(" ");

type AssignmentRealtimeInput = {
  assignmentId: string;
  fields: AssignmentReviewField[];
};

type RealtimeSecretResponse = {
  value?: unknown;
  expires_at?: unknown;
  session?: { id?: unknown; model?: unknown } | null;
};

type RealtimeProviderFailureCode =
  | "realtime_model_unavailable"
  | "realtime_rate_limited"
  | "realtime_provider_unavailable";

class RealtimeProviderError extends Error {
  constructor(readonly code: RealtimeProviderFailureCode) {
    super(code);
  }
}

function normalizeInput(raw: unknown): AssignmentRealtimeInput | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const assignmentId = typeof data.assignmentId === "string" ? data.assignmentId.trim() : "";
  if (!UUID_PATTERN.test(assignmentId)) return null;
  const fields = Array.isArray(data.fields)
    ? data.fields
        .filter((field): field is Record<string, unknown> => Boolean(field) && typeof field === "object" && !Array.isArray(field))
        .map((field) => ({
          label: typeof field.label === "string" ? field.label.trim().slice(0, 80) : "",
          value: typeof field.value === "string" ? field.value.trim().slice(0, 1_200) : "",
        }))
        .filter((field) => field.label.length > 0 && field.value.length > 0)
        .slice(0, 8)
    : [];
  return { assignmentId, fields };
}

function clipped(label: string, value: string, max: number): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return `${label}: ${trimmed.slice(0, max)}`;
}

function buildMinimizedContext(args: {
  kernel: AssignmentHomeworkKernel;
  fields: AssignmentReviewField[];
}): string {
  const fieldText = args.fields
    .map((field) => clipped(field.label, field.value, 1_200))
    .filter(Boolean)
    .join("\n\n");
  return formatHomeworkKernelForTutor(args.kernel, {
    visibleWork: fieldText ? `Student work visible in the workspace:\n${fieldText}` : "",
    maxChars: 8_000,
  });
}

function buildRealtimeInstructions(context: string): string {
  return [
    REALTIME_TUTOR_PROMPT,
    "Assignment context for this voice session:",
    context || "No assignment source was available. Ask the student to read or describe the prompt before helping.",
  ].join("\n\n");
}

function safeRealtimeModel() {
  return process.env.OPENAI_REALTIME_MODEL?.trim() || "gpt-realtime-2.1-mini";
}

function safeRealtimeVoice() {
  const value = process.env.OPENAI_REALTIME_VOICE?.trim() || "marin";
  return /^(alloy|ash|ballad|coral|echo|sage|shimmer|verse|marin|cedar)$/u.test(value) ? value : "marin";
}

function guardFailureResponse(failure: { status: number; message: string; kind: string }) {
  const message = failure.kind === "budget"
    ? "Voice Diana is paused for today. Try again tomorrow."
    : failure.kind === "safety"
      ? failure.message
      : "Voice Diana is taking a short pause while usage is checked. Try again.";
  return NextResponse.json({ ok: false, error: message }, { status: failure.status });
}

function inputBytes(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

async function createRealtimeClientSecret(args: {
  apiKey: string;
  model: string;
  instructions: string;
  idempotencyKey?: string;
}) {
  const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
      ...(args.idempotencyKey ? { "X-Client-Request-Id": args.idempotencyKey } : {}),
    },
    body: JSON.stringify({
      expires_after: { anchor: "created_at", seconds: REALTIME_TTL_SECONDS },
      session: {
        type: "realtime",
        model: args.model,
        instructions: args.instructions,
        output_modalities: ["audio"],
        max_output_tokens: MAX_OUTPUT_TOKENS,
        tool_choice: "auto",
        tools: [{
          type: "function",
          name: "answer_complex_homework",
          description: "Ask Diana's strongest homework reasoning model for one source-grounded, voice-ready explanation when the current question is advanced, multi-source, or needs extended reasoning.",
          parameters: {
            type: "object",
            additionalProperties: false,
            properties: {
              question: {
                type: "string",
                description: "The student's exact homework question or confusion, without inventing missing context.",
              },
              reason: {
                type: "string",
                description: "A short explanation of why deeper reasoning is needed.",
              },
            },
            required: ["question"],
          },
        }],
        tracing: null,
        truncation: { type: "retention_ratio", retention_ratio: 0.5, token_limits: { post_instructions: 4_000 } },
        audio: {
          input: {
            noise_reduction: { type: "near_field" },
            transcription: { model: "gpt-4o-mini-transcribe", language: "en" },
            turn_detection: { type: "semantic_vad", create_response: true, interrupt_response: true, eagerness: "auto" },
          },
          output: { voice: safeRealtimeVoice(), speed: 0.95 },
        },
      },
    }),
  });
  let payload: RealtimeSecretResponse = {};
  try {
    payload = await response.json() as RealtimeSecretResponse;
  } catch {
    throw new Error("openai_realtime_invalid_response");
  }
  if (!response.ok) {
    if (response.status === 404) throw new RealtimeProviderError("realtime_model_unavailable");
    if (response.status === 429) throw new RealtimeProviderError("realtime_rate_limited");
    throw new RealtimeProviderError("realtime_provider_unavailable");
  }
  if (typeof payload.value !== "string" || !payload.value.startsWith("ek_")) {
    throw new RealtimeProviderError("realtime_provider_unavailable");
  }
  return {
    clientSecret: payload.value,
    expiresAt: typeof payload.expires_at === "number" ? payload.expires_at : null,
    sessionId: typeof payload.session?.id === "string" ? payload.session.id : null,
    model: typeof payload.session?.model === "string" ? payload.session.model : args.model,
  };
}

export async function POST(request: Request) {
  const input = normalizeInput(await request.json().catch(() => null));
  if (!input) {
    return NextResponse.json({ ok: false, error: "Voice Diana needs a valid assignment." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "Voice Diana is not connected to OpenAI Realtime yet." }, { status: 503 });
  }

  const accounting = createAiServiceClient();
  if (!accounting) {
    return NextResponse.json({ ok: false, error: "Voice Diana is unavailable right now." }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in to use Voice Diana." }, { status: 401 });
  }

  const homeworkKernel = await loadAssignmentHomeworkKernel({
    supabase,
    ownerId: user.id,
    assignmentId: input.assignmentId,
    eventSource: "assignment_realtime",
  });
  if (!homeworkKernel) {
    return NextResponse.json({ ok: false, error: "Assignment not found." }, { status: 404 });
  }
  const trustAllowed = assertDianaHomeworkAllowed(homeworkKernel.trustDecision);
  if (!trustAllowed.ok) {
    return NextResponse.json({ ok: false, error: trustAllowed.error }, { status: 403 });
  }

  const context = buildMinimizedContext({
    kernel: homeworkKernel,
    fields: input.fields,
  });
  const instructions = buildRealtimeInstructions(context);
  const model = safeRealtimeModel();
  const idempotencyKey = request.headers.get("x-idempotency-key")?.trim().slice(0, 128) || crypto.randomUUID();
  const estimatedTokens = estimateTokenReservation({
    systemPrompt: REALTIME_TUTOR_PROMPT,
    input: context,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
  });

  try {
    const guarded = await runSafeBudgetedAiCall({
      ownerId: user.id,
      supabase: accounting,
      input: context,
      systemPrompt: REALTIME_TUTOR_PROMPT,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      idempotencyKey,
      invoke: () => createRealtimeClientSecret({ apiKey, model, instructions, idempotencyKey }),
      getTokens: () => estimatedTokens,
      getOutput: (value) => ({ sessionId: value.sessionId, model: value.model, expiresAt: value.expiresAt }),
    });
    if (!guarded.ok) return guardFailureResponse(guarded);

    const value = guarded.value;
    void accounting.from("authorship_log").insert({
      owner_id: user.id,
      assignment_id: homeworkKernel.assignment.id,
      actor: "diana",
      event_type: "assignment_realtime_started",
      payload: {
        model: value.model,
        sessionId: value.sessionId,
        expiresAt: value.expiresAt,
        contextChars: context.length,
        fieldCount: input.fields.length,
        ttlSeconds: REALTIME_TTL_SECONDS,
        outputTokenLimit: MAX_OUTPUT_TOKENS,
        route: "assignment-realtime",
        homework: homeworkAuthorshipMetadata(homeworkKernel, { route: "assignment-realtime", visibleWorkChars: context.length }),
      } as unknown as Json,
    });

    void logInteraction({
      ownerId: user.id,
      assignmentId: homeworkKernel.assignment.id,
      feature: "assignment_realtime",
      model: value.model,
      correlationId: idempotencyKey,
      inputBytes: inputBytes(context),
      outputBytes: inputBytes(JSON.stringify({ sessionId: value.sessionId, expiresAt: value.expiresAt })),
      tokensUsed: estimatedTokens,
    }, accounting);

    return NextResponse.json({
      ok: true,
      clientSecret: value.clientSecret,
      expiresAt: value.expiresAt,
      sessionId: value.sessionId,
      model: value.model,
      realtimeUrl: "https://api.openai.com/v1/realtime/calls",
    });
  } catch (error) {
    const code = error instanceof RealtimeProviderError ? error.code : "realtime_provider_unavailable";
    const errorMessage = code === "realtime_model_unavailable"
      ? "Voice Diana is not enabled for this OpenAI project yet."
      : code === "realtime_rate_limited"
        ? "Voice Diana is busy right now. Try again in a moment."
        : "Voice Diana could not start. Try again in a moment.";
    return NextResponse.json({ ok: false, code, error: errorMessage }, { status: 503 });
  }
}

export const runtime = "nodejs";
