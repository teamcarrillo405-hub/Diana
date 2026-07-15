// supabase/functions/task-breakdown/index.ts
// F6: AI task breakdown — Haiku 4.5, splits assignment into atomic steps.
// ai_mode: 'red' returns 403; 'yellow' is allowed (task breakdown is pure planning,
// not content generation — per research §"Pattern 1").
// Fire-and-forget: logInteraction + incrementTokens never block the response.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  checkTokenBudget,
  incrementTokens,
  logInteraction,
  resetBudgetIfNewDay,
} from "../_shared/safety.ts";
import { composeSystemPrompt } from "../_shared/system-prompts.ts";
import { callStudentTextModel } from "../_shared/student-model.ts";
import { adaptationLineForOwner } from "../_shared/adaptation.ts";

const BREAKDOWN_PROMPT = `You are a task-decomposition assistant for a high-school student with ADHD.
The student gives you an assignment. You split it into atomic steps, each completable in 5 minutes or less.
Rules:
- Output ONLY a JSON array. No prose before or after. Format: [{"step": 1, "action": "...", "minutes": N}, ...]
- Maximum 12 steps. Each action must be a concrete verb phrase like "Read pages 47 to 52" or "Write one topic sentence".
- Never say "study" or "work on" — be specific.
- Minutes per step must be 5 or fewer and a realistic estimate.
- Calm tone. No "you need to" or "you must". No exclamation marks.`;

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    // 1. Parse and validate body
    const body = await req.json() as {
      ownerId?: unknown;
      assignmentId?: unknown;
      title?: unknown;
      description?: unknown;
      kind?: unknown;
      estimatedMinutes?: unknown;
      aiMode?: unknown;
    };

    const { ownerId, assignmentId, title, description, kind, estimatedMinutes, aiMode } = body;

    if (typeof ownerId !== "string" || !ownerId) {
      return new Response(JSON.stringify({ error: "ownerId required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (typeof title !== "string" || !title) {
      return new Response(JSON.stringify({ error: "title required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (typeof kind !== "string" || !kind) {
      return new Response(JSON.stringify({ error: "kind required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. aiMode check — only 'red' blocks (yellow allowed for task breakdown)
    if (aiMode === "red") {
      return new Response(
        JSON.stringify({ error: "AI not available for this class" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // 3. Supabase service-role client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 4. Reset budget if it's a new day, then check remaining budget
    await resetBudgetIfNewDay(ownerId, supabase);
    const { allowed } = await checkTokenBudget(ownerId, supabase);
    if (!allowed) {
      return new Response(
        JSON.stringify({
          error: "You've used your AI quota for today. It resets at midnight.",
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // 5. Compose system prompt with MINOR_SAFETY only (no Socratic/frustration — one-shot planning)
    const systemPrompt = composeSystemPrompt(BREAKDOWN_PROMPT, {
      includeRefuseRedirect: false,
      includeFrustration: false,
      includeMinorSafety: true,
      personalization: await adaptationLineForOwner(ownerId, supabase),
    });

    // 6. Build single user message (no history — breakdown is one-shot)
    const userMessage = [
      `Title: ${title}`,
      kind ? `Kind: ${kind}` : null,
      estimatedMinutes ? `Estimated time: ${estimatedMinutes} minutes` : null,
      description ? `Description: ${(description as string).slice(0, 2000)}` : null,
    ].filter(Boolean).join("\n");

    // 7. Use the shared fast student model.
    const modelResult = await callStudentTextModel({
      system: systemPrompt,
      user: userMessage,
      maxTokens: 600,
    });
    // Return raw content string — parsing happens in the server action via
    // parseStepsFromContent so the parser is testable in vitest (node) instead of Deno.
    const content = modelResult.content;
    const tokens = modelResult.tokens;

    // 8. Fire-and-forget: log to ai_interactions + increment token counter.
    //    Must NOT block the response (AI-SAFETY-01 constraint).
    Promise.resolve()
      .then(async () => {
        await logInteraction(
          {
            ownerId,
            assignmentId: (assignmentId as string | null | undefined) ?? null,
            feature: "task_breakdown",
            model: modelResult.model,
            promptSummary: (title as string).slice(0, 200),
            tokensUsed: tokens,
          },
          supabase,
        );
        await incrementTokens(ownerId, tokens, supabase);
      })
      .catch((e) => console.warn("post-response side effects failed", e));

    // 9. Return response
    return new Response(JSON.stringify({ content }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("task-breakdown error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
