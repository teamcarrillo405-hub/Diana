import { NextResponse } from "next/server";

import {
  formatHomeworkKernelForTutor,
  homeworkAuthorshipMetadata,
  homeworkModelRouting,
  loadAssignmentHomeworkKernel,
} from "@/lib/assignment-help/server-understanding";
import type { AssignmentReviewField } from "@/lib/assignment-review";
import { assertDianaHomeworkAllowed } from "@/lib/ai/diana-trust-rules";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

type ReasonInput = {
  assignmentId: string;
  question: string;
  reason: string;
  fields: AssignmentReviewField[];
};

type ReasonEdgeSuccess = { ok: true; answer: string; model: string };

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

function boundedIdempotencyKey(request: Request): string {
  return request.headers.get("x-idempotency-key")?.trim().slice(0, 128) || crypto.randomUUID();
}

function parseEdgeSuccess(value: unknown): ReasonEdgeSuccess | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.ok !== true || typeof candidate.answer !== "string" || !candidate.answer.trim() || typeof candidate.model !== "string") {
    return null;
  }
  return { ok: true, answer: candidate.answer.trim(), model: candidate.model };
}

async function edgeFailure(error: unknown, data: unknown): Promise<{ status: number; error: string }> {
  let status = 503;
  let payload = data;
  if (error && typeof error === "object" && "context" in error) {
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      status = context.status;
      payload = await context.clone().json().catch(() => payload);
    }
  }
  const candidate = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : {};
  const message = typeof candidate.error === "string" && candidate.error.trim()
    ? candidate.error.trim()
    : "Diana's deeper explanation is unavailable right now.";
  return { status: [400, 401, 403, 422, 429].includes(status) ? status : 503, error: message };
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

  const visibleWork = input.fields.map((field) => `${field.label}: ${field.value}`).join("\n\n");
  const context = formatHomeworkKernelForTutor(kernel, { visibleWork, maxChars: 20_000 });
  const { data, error } = await supabase.functions.invoke("assignment-realtime-reason", {
    body: {
      ownerId: user.id,
      assignmentId: input.assignmentId,
      context,
      question: input.question,
      reason: input.reason,
      routing: homeworkModelRouting(kernel, { visibleWork, signals: `${input.question}\n${input.reason}` }),
      idempotencyKey: boundedIdempotencyKey(request),
      homework: homeworkAuthorshipMetadata(kernel, {
        route: "assignment-realtime-reason",
        visibleWorkChars: visibleWork.length,
      }),
    },
  });
  const success = parseEdgeSuccess(data);
  if (error || !success) {
    const failure = await edgeFailure(error, data);
    return NextResponse.json({ ok: false, error: failure.error }, { status: failure.status });
  }

  return NextResponse.json(success);
}

export const runtime = "nodejs";
