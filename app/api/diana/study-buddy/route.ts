import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import {
  isDianaStudyHelperEnabled,
  resolveDianaStudyHelperConfig,
  createDianaStudyHelperResponse,
  type StudyHelperInput,
  type StudyHelperMode,
} from "@/lib/integrations/diana-study-helper-sidecar";

const DAILY_LIMIT = 35;

function normalizeInput(raw: unknown): StudyHelperInput | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const source = typeof data.source === "string" ? data.source.trim() : "";
  const question = typeof data.question === "string" ? data.question.trim() : "";
  if (question.length < 2 || question.length > 1000) return null;
  const mode: StudyHelperMode =
    data.mode === "hint" ? "hint" : data.mode === "quiz" ? "quiz" : "guide";
  return { source, question, mode };
}

export async function POST(request: Request) {
  if (!isDianaStudyHelperEnabled()) {
    return NextResponse.json(
      { ok: false, error: "Diana study help is off right now." },
      { status: 503 },
    );
  }

  const input = normalizeInput(await request.json().catch(() => null));
  if (!input) {
    return NextResponse.json(
      { ok: false, error: "Add a question to get Diana's help." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in to get Diana's help." }, { status: 401 });
  }

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("authorship_log")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id)
    .eq("event_type", "study_buddy_response")
    .gte("created_at", yesterday);

  if ((count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json(
      { ok: false, error: "Diana study help is paused for today. Try again tomorrow." },
      { status: 429 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tutor_persona, tutor_style, tutor_complexity")
    .eq("user_id", user.id)
    .maybeSingle();

  const configuredInput: StudyHelperInput = {
    ...input,
    tutorPersona: profile?.tutor_persona ?? "diana",
    tutorStyle: profile?.tutor_style ?? "socratic",
    complexity: profile?.tutor_complexity ?? "balanced",
  };

  try {
    const config = resolveDianaStudyHelperConfig();
    const result = await createDianaStudyHelperResponse({ input: configuredInput, config });

    await supabase.from("authorship_log").insert({
      owner_id: user.id,
      actor: "diana",
      event_type: "study_buddy_response",
      payload: {
        mode: input.mode,
        tutorPersona: configuredInput.tutorPersona,
        tutorStyle: configuredInput.tutorStyle,
        complexity: configuredInput.complexity,
        sourceChars: input.source.length,
        questionChars: input.question.length,
        responseChars: JSON.stringify(result).length,
        model: config.model,
      } as unknown as Json,
    });

    return NextResponse.json({ ok: true, response: result });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Diana study help is unavailable right now." },
      { status: 503 },
    );
  }
}

export const runtime = "nodejs";
