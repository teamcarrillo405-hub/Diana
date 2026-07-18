import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import {
  checkTokenBudget,
  incrementTokens,
  logInteraction,
  resetBudgetIfNewDay,
} from "@/lib/ai/safety";
import {
  isDianaStudyHelperEnabled,
  resolveDianaStudyHelperConfig,
  createDianaStudyHelperResponse,
  type StudyHelperInput,
  type StudyHelperMode,
} from "@/lib/integrations/diana-study-helper-sidecar";

const DAILY_LIMIT = 35;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

type StudyHelperRouteInput = StudyHelperInput & {
  classId: string | null;
  qaScenario: string | null;
};

function normalizeInput(raw: unknown): StudyHelperRouteInput | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const source = typeof data.source === "string" ? data.source.trim() : "";
  const question = typeof data.question === "string" ? data.question.trim() : "";
  if (question.length < 2 || question.length > 1000) return null;
  if (data.classId !== undefined && data.classId !== null && data.classId !== "" && (
    typeof data.classId !== "string" || !UUID_PATTERN.test(data.classId)
  )) return null;
  const mode: StudyHelperMode =
    data.mode === "hint" ? "hint" : data.mode === "quiz" ? "quiz" : "guide";
  return {
    source,
    question,
    mode,
    classId: typeof data.classId === "string" && data.classId ? data.classId : null,
    qaScenario: data.qaScenario === "tutor-chat:default" ? data.qaScenario : null,
  };
}

export async function POST(request: Request) {
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

  if (input.classId) {
    const { data: classroom } = await supabase
      .from("classes")
      .select("ai_mode")
      .eq("id", input.classId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!classroom) {
      return NextResponse.json({ ok: false, error: "Class not found." }, { status: 404 });
    }
    if (classroom.ai_mode === "red" || classroom.ai_mode === "yellow") {
      return NextResponse.json(
        { ok: false, error: "Tutor chat is unavailable for this class." },
        { status: 403 },
      );
    }
  }

  await resetBudgetIfNewDay(user.id, supabase);
  const budget = await checkTokenBudget(user.id, supabase);
  if (!budget.allowed) {
    return NextResponse.json(
      { ok: false, error: "Diana study help is paused for today. Try again tomorrow." },
      { status: 429 },
    );
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
    source: input.source,
    question: input.question,
    mode: input.mode,
    tutorPersona: profile?.tutor_persona ?? "diana",
    tutorStyle: profile?.tutor_style ?? "socratic",
    complexity: profile?.tutor_complexity ?? "balanced",
  };

  const deterministicQa = process.env.NODE_ENV !== "production"
    && process.env.QA_CREATE_USER === "true"
    && input.qaScenario === "tutor-chat:default";
  if (!deterministicQa && !isDianaStudyHelperEnabled()) {
    return NextResponse.json(
      { ok: false, error: "Diana study help is off right now." },
      { status: 503 },
    );
  }

  try {
    const config = resolveDianaStudyHelperConfig();
    const result = deterministicQa
      ? {
          title: "Guided step",
          main: "Which phrase in the source gives you the clearest starting point?",
          reason: "Naming that phrase keeps the reasoning in your own words.",
          steps: ["Point to one phrase.", "Explain it simply.", "Connect it to your claim."],
          anchor: `This help is anchored to: ${input.source.slice(0, 100)}`,
        }
      : await createDianaStudyHelperResponse({ input: configuredInput, config });
    const estimatedTokens = Math.max(
      1,
      Math.ceil((input.source.length + input.question.length + JSON.stringify(result).length) / 4),
    );

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
        model: deterministicQa ? "qa-deterministic" : config.model,
      } as unknown as Json,
    });

    await Promise.allSettled([
      logInteraction({
        ownerId: user.id,
        feature: "study_buddy",
        model: deterministicQa ? "qa-deterministic" : config.model,
        promptSummary: input.question,
        tokensUsed: estimatedTokens,
      }, supabase),
      incrementTokens(user.id, estimatedTokens, supabase),
    ]);

    return NextResponse.json({ ok: true, response: result });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Diana study help is unavailable right now." },
      { status: 503 },
    );
  }
}

export const runtime = "nodejs";
