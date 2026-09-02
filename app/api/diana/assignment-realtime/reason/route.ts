import { NextResponse } from "next/server";

import {
  formatHomeworkKernelForTutor,
  homeworkAuthorshipMetadata,
  homeworkModelRouting,
  loadAssignmentHomeworkKernel,
} from "@/lib/assignment-help/server-understanding";
import type { AssignmentReviewField } from "@/lib/assignment-review";
import { runOpenAIHomeworkText } from "@/lib/ai/openai-homework-adapter";
import { assertDianaHomeworkAllowed } from "@/lib/ai/diana-trust-rules";
import { composeSystemPrompt } from "@/lib/ai/system-prompts";
import { createAiServiceClient } from "@/lib/supabase/ai-service";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

type ReasonInput = {
  assignmentId: string;
  question: string;
  reason: string;
  fields: AssignmentReviewField[];
};

function normalizeInput(value: unknown): ReasonInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const assignmentId = typeof row.assignmentId === "string" ? row.assignmentId.trim() : "";
  const question = typeof row.question === "string" ? row.question.trim().slice(0, 1_200) : "";
  if (!UUID_PATTERN.test(assignmentId) || !question) return null;
  const fields = Array.isArray(row.fields)
    ? row.fields
        .filter((field): field is Record<string, unknown> => Boolean(field) && typeof field === "object" && !Array.isArray(field))
        .map((field) => ({
          label: typeof field.label === "string" ? field.label.trim().slice(0, 80) : "",
          value: typeof field.value === "string" ? field.value.trim().slice(0, 1_500) : "",
        }))
        .filter((field) => field.label && field.value)
        .slice(0, 8)
    : [];
  return {
    assignmentId,
    question,
    reason: typeof row.reason === "string" ? row.reason.trim().slice(0, 240) : "",
    fields,
  };
}

export async function POST(request: Request) {
  const input = normalizeInput(await request.json().catch(() => null));
  if (!input) {
    return NextResponse.json({ ok: false, error: "Diana needs the active assignment and question." }, { status: 400 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Sign in to use Voice Diana." }, { status: 401 });

  const kernel = await loadAssignmentHomeworkKernel({
    supabase,
    ownerId: user.id,
    assignmentId: input.assignmentId,
    eventSource: "assignment_realtime_reasoning",
  });
  if (!kernel) return NextResponse.json({ ok: false, error: "Assignment not found." }, { status: 404 });
  const trust = assertDianaHomeworkAllowed(kernel.trustDecision);
  if (!trust.ok) return NextResponse.json({ ok: false, error: trust.error }, { status: 403 });

  const accounting = createAiServiceClient();
  if (!accounting) {
    return NextResponse.json({ ok: false, error: "Diana's deeper explanation is unavailable right now." }, { status: 503 });
  }
  const visibleWork = input.fields.map((field) => `${field.label}: ${field.value}`).join("\n\n");
  const context = formatHomeworkKernelForTutor(kernel, { visibleWork, maxChars: 20_000 });
  const system = composeSystemPrompt([
    "You are Diana's advanced homework reasoning bridge for a live voice conversation.",
    "Follow the assignment's recorded help level and student-owned boundary exactly.",
    "Answer the student's current confusion with one clear explanation and one next question.",
    "Preserve the assignment's true rigor, but bridge a verified prerequisite using concrete language when the context calls for it.",
    "Be source-grounded. If a needed fact is absent, say what is missing instead of inventing it.",
    "Return plain voice-ready text under 160 words. Do not mention tools, models, policies, or internal context.",
  ].join(" "), {
    includeRefuseRedirect: true,
    includeFrustration: true,
    includeMinorSafety: true,
  });
  const idempotencyKey = request.headers.get("x-idempotency-key")?.trim().slice(0, 128) || crypto.randomUUID();
  const result = await runOpenAIHomeworkText({
    ownerId: user.id,
    assignmentId: kernel.assignment.id,
    accounting,
    task: "realtime",
    quality: "complex",
    maxOutputTokens: 650,
    idempotencyKey,
    routing: homeworkModelRouting(kernel, { visibleWork, signals: `${input.question}\n${input.reason}` }),
    messages: [
      { role: "system", content: system },
      { role: "user", content: `${context}\n\nStudent's current spoken question:\n${input.question}` },
    ],
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.guard?.status ?? 503 });
  }

  void accounting.from("authorship_log").insert({
    owner_id: user.id,
    assignment_id: kernel.assignment.id,
    actor: "diana",
    event_type: "assignment_realtime_reasoned",
    payload: {
      model: result.model,
      questionChars: input.question.length,
      answerChars: result.value.length,
      reason: input.reason || null,
      homework: homeworkAuthorshipMetadata(kernel, { route: "assignment-realtime-reason", visibleWorkChars: visibleWork.length }),
    } as unknown as Json,
  });

  return NextResponse.json({ ok: true, answer: result.value, model: result.model });
}

export const runtime = "nodejs";
