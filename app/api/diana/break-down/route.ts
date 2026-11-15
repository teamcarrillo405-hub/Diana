import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAiServiceClient } from "@/lib/supabase/ai-service";
import type { Json } from "@/lib/supabase/types";
import {
  runOpenAIHomeworkJson,
  type OpenAIHomeworkMessage,
  type OpenAIHomeworkRouting,
} from "@/lib/ai/openai-homework-adapter";
import { assertDianaHomeworkAllowed, resolveDianaHomeworkTrust } from "@/lib/ai/diana-trust-rules";
import { resolveHomeworkAcademicBand } from "@/lib/ai/homework-model-tier";
import { inferTargetAcademicLevel } from "@/lib/assignment-help/methodology";
import { resolveAssignmentProfile } from "@/lib/assignment-profile";

const DAILY_LIMIT = 35;

const BREAK_DOWN_SYSTEM_PROMPT = [
  "You are Diana, a student-owned homework planning helper for high-school students.",
  "Return strict JSON only: { \"steps\": [{ \"step\": number, \"action\": string, \"minutes\": number, \"done\": false }] }.",
  "Create 5 to 8 short actions. Each action must be one concrete student task, not an explanation.",
  "Use ADHD and dyslexia-friendly wording: plain words, one action at a time, no shame, no final homework answers.",
  "Start with the smallest useful move. Keep each action under 12 minutes when possible.",
].join("\n");

type BreakDownInput = { assignment: string };
type BreakDownStep = { step: number; action: string; minutes: number; done: false };
type BreakDownResponse = { steps: BreakDownStep[] };

const FALLBACK_RESPONSE: BreakDownResponse = {
  steps: [
    { step: 1, action: "Circle what the teacher wants turned in.", minutes: 3, done: false },
    { step: 2, action: "Mark the due date, format, and any required source or problem numbers.", minutes: 4, done: false },
    { step: 3, action: "Write the first small move you can do without help.", minutes: 5, done: false },
  ],
};

function normalizeInput(raw: unknown): BreakDownInput | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const assignment = typeof data.assignment === "string"
    ? data.assignment.trim()
    : "";
  if (assignment.length < 2 || assignment.length > 3000) return null;
  return { assignment };
}

function isBreakDownResponse(value: unknown): value is BreakDownResponse {
  if (!value || typeof value !== "object") return false;
  const steps = (value as Record<string, unknown>).steps;
  if (!Array.isArray(steps) || steps.length === 0 || steps.length > 8) return false;
  return steps.every((step, index) => {
    if (!step || typeof step !== "object") return false;
    const item = step as Record<string, unknown>;
    return Number.isInteger(item.step) &&
      item.step === index + 1 &&
      typeof item.action === "string" &&
      item.action.trim().length >= 2 &&
      item.action.length <= 220 &&
      Number.isInteger(item.minutes) &&
      Number(item.minutes) >= 1 &&
      Number(item.minutes) <= 30 &&
      item.done === false;
  });
}

function messagesFor(input: BreakDownInput): OpenAIHomeworkMessage[] {
  return [
    { role: "system", content: BREAK_DOWN_SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        "Break this assignment into short student-owned steps.",
        "Do not complete the assignment. Do not provide final answers.",
        "Assignment:",
        input.assignment,
      ].join("\n"),
    },
  ];
}

function routingFor(input: BreakDownInput): OpenAIHomeworkRouting {
  const profile = resolveAssignmentProfile({
    kind: "other",
    description: input.assignment,
  });
  return {
    subjectDomain: profile.subjectDomain,
    academicBand: resolveHomeworkAcademicBand({
      targetAcademicLevel: inferTargetAcademicLevel(input.assignment),
    }),
    sourceChars: input.assignment.length,
    studentWorkChars: 0,
    hasRubric: /\brubric\b/iu.test(input.assignment),
    signals: input.assignment,
  };
}

export async function POST(request: Request) {
  const input = normalizeInput(await request.json().catch(() => null));
  if (!input) {
    return NextResponse.json(
      { ok: false, error: "Paste an assignment to break it down." },
      { status: 400 },
    );
  }

  const trust = resolveDianaHomeworkTrust();
  const allowed = assertDianaHomeworkAllowed(trust);
  if (!allowed.ok) {
    return NextResponse.json({ ok: false, error: allowed.error }, { status: 403 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Sign in to get Diana's help." },
      { status: 401 },
    );
  }

  const accounting = createAiServiceClient();
  if (!accounting) {
    return NextResponse.json(
      { ok: false, error: "Diana break-down help is unavailable right now." },
      { status: 503 },
    );
  }

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await accounting
    .from("authorship_log")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id)
    .eq("event_type", "break_down_steps")
    .gte("created_at", yesterday);

  if ((count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json(
      {
        ok: false,
        error: "Diana break-down help is paused for today. Try again tomorrow.",
      },
      { status: 429 },
    );
  }

  const result = await runOpenAIHomeworkJson({
    ownerId: user.id,
    accounting,
    task: "break_down",
    messages: messagesFor(input),
    maxOutputTokens: 900,
    fallback: FALLBACK_RESPONSE,
    validate: isBreakDownResponse,
    idempotencyKey: boundedIdempotencyKey(request),
    routing: routingFor(input),
  });

  if (!result.ok) {
    const status = result.guard?.status ?? 503;
    const message = result.guard?.kind === "budget"
      ? "Diana break-down help is paused for today. Try again tomorrow."
      : result.error || "Diana break-down help is unavailable right now.";
    return NextResponse.json({ ok: false, error: message }, { status });
  }

  await accounting.from("authorship_log").insert({
    owner_id: user.id,
    actor: "diana",
    event_type: "break_down_steps",
    payload: {
      assignmentChars: input.assignment.length,
      stepCount: result.value.steps.length,
      model: result.model,
      trustRules: trust.rules,
      productTier: trust.productTier,
      schoolPolicyDormant: trust.schoolPolicyDormant,
    } as unknown as Json,
  });

  return NextResponse.json({ ok: true, steps: result.value.steps });
}

function boundedIdempotencyKey(request: Request): string | undefined {
  const value = request.headers.get("x-idempotency-key")?.trim();
  return value ? value.slice(0, 128) : undefined;
}

export const runtime = "nodejs";
