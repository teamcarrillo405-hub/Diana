import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAiServiceClient } from "@/lib/supabase/ai-service";
import type { Json } from "@/lib/supabase/types";
import { logInteraction, runSafeBudgetedAiCall } from "@/lib/ai/safety";
import {
  BREAK_DOWN_PROMPT,
  type BreakDownInput,
  createDianaBreakDownProviderResult,
  isDianaStudyHelperEnabled,
  resolveDianaStudyHelperConfig,
} from "@/lib/integrations/diana-study-helper-sidecar";

const DAILY_LIMIT = 35;

function normalizeInput(raw: unknown): BreakDownInput | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const assignment = typeof data.assignment === "string"
    ? data.assignment.trim()
    : "";
  if (assignment.length < 2 || assignment.length > 3000) return null;
  return { assignment };
}

export async function POST(request: Request) {
  if (!isDianaStudyHelperEnabled()) {
    return NextResponse.json(
      { ok: false, error: "Diana break-down help is off right now." },
      { status: 503 },
    );
  }

  const input = normalizeInput(await request.json().catch(() => null));
  if (!input) {
    return NextResponse.json(
      { ok: false, error: "Paste an assignment to break it down." },
      { status: 400 },
    );
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

  try {
    const config = resolveDianaStudyHelperConfig();
    const guarded = await runSafeBudgetedAiCall({
      ownerId: user.id,
      supabase: accounting,
      input: input.assignment,
      systemPrompt: BREAK_DOWN_PROMPT,
      maxOutputTokens: 900,
      idempotencyKey: boundedIdempotencyKey(request),
      invoke: () => createDianaBreakDownProviderResult({ input, config }),
      getTokens: (value) => value.tokens,
      getOutput: (value) => value.moderationContent,
    });
    if (!guarded.ok) {
      const message = guarded.kind === "budget"
        ? "Diana break-down help is paused for today. Try again tomorrow."
        : guarded.kind === "safety"
        ? guarded.message
        : "Diana break-down help is unavailable right now.";
      return NextResponse.json({ ok: false, error: message }, {
        status: guarded.status,
      });
    }
    const steps = guarded.value.value;
    const tokens = guarded.value.tokens || Math.max(
      1,
      Math.ceil((input.assignment.length + JSON.stringify(steps).length) / 4),
    );

    await accounting.from("authorship_log").insert({
      owner_id: user.id,
      actor: "diana",
      event_type: "break_down_steps",
      payload: {
        assignmentChars: input.assignment.length,
        stepCount: steps.length,
        model: config.model,
      } as unknown as Json,
    });

    await logInteraction({
      ownerId: user.id,
      feature: "break_down",
      model: config.model,
      correlationId: request.headers.get("x-request-id") ?? undefined,
      inputBytes: new TextEncoder().encode(input.assignment).byteLength,
      outputBytes: new TextEncoder().encode(JSON.stringify(steps)).byteLength,
      tokensUsed: tokens,
    }, accounting);

    return NextResponse.json({ ok: true, steps });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Diana break-down help is unavailable right now." },
      { status: 503 },
    );
  }
}

function boundedIdempotencyKey(request: Request): string | undefined {
  const value = request.headers.get("x-idempotency-key")?.trim();
  return value ? value.slice(0, 128) : undefined;
}

export const runtime = "nodejs";
