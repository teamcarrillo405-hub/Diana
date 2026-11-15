import { NextResponse } from "next/server";

import {
  formatHomeworkKernelForTutor,
  homeworkAuthorshipMetadata,
  loadAssignmentHomeworkKernel,
  type AssignmentHomeworkKernel,
} from "@/lib/assignment-help/server-understanding";
import type { AssignmentReviewField } from "@/lib/assignment-review";
import { assertDianaHomeworkAllowed } from "@/lib/ai/diana-trust-rules";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

type AssignmentRealtimeInput = {
  assignmentId: string;
  fields: AssignmentReviewField[];
};

type RealtimeEdgeSuccess = {
  ok: true;
  clientSecret: string;
  expiresAt: number | null;
  sessionId: string | null;
  model: string;
  realtimeUrl: string;
};

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

function boundedIdempotencyKey(request: Request): string {
  return request.headers.get("x-idempotency-key")?.trim().slice(0, 128) || crypto.randomUUID();
}

function parseEdgeSuccess(value: unknown): RealtimeEdgeSuccess | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (
    candidate.ok !== true ||
    typeof candidate.clientSecret !== "string" ||
    !candidate.clientSecret.startsWith("ek_") ||
    typeof candidate.model !== "string" ||
    typeof candidate.realtimeUrl !== "string"
  ) return null;
  return {
    ok: true,
    clientSecret: candidate.clientSecret,
    expiresAt: typeof candidate.expiresAt === "number" ? candidate.expiresAt : null,
    sessionId: typeof candidate.sessionId === "string" ? candidate.sessionId : null,
    model: candidate.model,
    realtimeUrl: candidate.realtimeUrl,
  };
}

async function edgeFailure(error: unknown, data: unknown): Promise<{ status: number; error: string; code?: string }> {
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
    : "Voice Diana could not start. Try again in a moment.";
  const code = typeof candidate.code === "string" ? candidate.code : undefined;
  return {
    status: [400, 401, 403, 422, 429].includes(status) ? status : 503,
    error: message,
    ...(code ? { code } : {}),
  };
}

export async function POST(request: Request) {
  const input = normalizeInput(await request.json().catch(() => null));
  if (!input) {
    return NextResponse.json({ ok: false, error: "Voice Diana needs a valid assignment." }, { status: 400 });
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

  const context = buildMinimizedContext({ kernel: homeworkKernel, fields: input.fields });
  const idempotencyKey = boundedIdempotencyKey(request);
  const { data, error } = await supabase.functions.invoke("assignment-realtime", {
    body: {
      ownerId: user.id,
      assignmentId: input.assignmentId,
      context,
      fieldCount: input.fields.length,
      idempotencyKey,
      homework: homeworkAuthorshipMetadata(homeworkKernel, {
        route: "assignment-realtime",
        visibleWorkChars: context.length,
      }),
    },
  });
  const success = parseEdgeSuccess(data);
  if (error || !success) {
    const failure = await edgeFailure(error, data);
    return NextResponse.json({ ok: false, error: failure.error, ...(failure.code ? { code: failure.code } : {}) }, { status: failure.status });
  }

  return NextResponse.json(success);
}

export const runtime = "nodejs";
