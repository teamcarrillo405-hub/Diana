// supabase/functions/agent-coach/index.ts
// Agent Fab — the global "Ask Diana" chat drawer (handoff_for_claude_code/
// designs/Agent Fab.dc.html, README §6). Page-aware, general coaching:
// "what should I do next", "explain this page", "I'm feeling stuck", or a
// free-typed question. Never gives final answers — same guard rails as every
// other AI feature (SOCRATIC_GUARD via COMPETITIVE_LEARNING_LOOP, MINOR_SAFETY).
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
import { adaptationLineForOwner } from "../_shared/adaptation.ts";
import { callStudentTextModel } from "../_shared/student-model.ts";

const COACH_PROMPT = `You are Diana, a calm study coach embedded in a
homework app for a high-school student. You are NOT a subject tutor here —
you help the student navigate the app and think clearly, the same way a good
in-person aide would.
- If asked what to do next, point them at Work (their assignment queue is
  sorted by urgency) rather than naming a specific task yourself unless the
  current page already told you one.
- If asked to explain the current page, ask what specifically is confusing
  (a word, a number, a button) rather than re-explaining everything.
- If the student says they feel stuck or overwhelmed, normalize it in one
  short line, then suggest the smallest possible next action (60 seconds of
  work on the thing they're avoiding).
- Keep replies to 4 sentences or fewer. No bullet lists in chat.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    const body = await req.json() as {
      ownerId?: unknown;
      message?: unknown;
      pageLabel?: unknown;
      history?: unknown;
    };
    const { ownerId, message, pageLabel, history } = body;

    if (typeof ownerId !== "string" || !ownerId) {
      return new Response(JSON.stringify({ error: "ownerId required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (typeof message !== "string" || !message.trim()) {
      return new Response(JSON.stringify({ error: "message required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!Array.isArray(history)) {
      return new Response(JSON.stringify({ error: "history must be an array" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await resetBudgetIfNewDay(ownerId, supabase);
    const { allowed } = await checkTokenBudget(ownerId, supabase);
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "You've used your AI quota for today — resets at midnight." }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      );
    }

    const systemPrompt = composeSystemPrompt(COACH_PROMPT, {
      includeRefuseRedirect: true,
      includeFrustration: true,
      includeMinorSafety: true,
      personalization: await adaptationLineForOwner(ownerId, supabase),
    });

    // Flatten the last few turns as context — this drawer is short, page-scoped
    // coaching, not a deep multi-turn tutor session.
    const recentHistory = (history as Array<{ role?: unknown; content?: unknown }>)
      .filter((h) => (h.role === "student" || h.role === "coach") && typeof h.content === "string")
      .slice(-6) as Array<{ role: "student" | "coach"; content: string }>;

    const transcript = recentHistory
      .map((h) => `${h.role === "student" ? "Student" : "Diana"}: ${h.content}`)
      .join("\n");
    const pageContext = typeof pageLabel === "string" && pageLabel
      ? `The student is currently on the "${pageLabel}" page.\n`
      : "";
    const userPrompt = `${pageContext}${transcript ? transcript + "\n" : ""}Student: ${message}`;

    const ai = await callStudentTextModel({
      system: systemPrompt,
      user: userPrompt,
      maxTokens: 300,
      quality: "fast",
    });

    Promise.resolve()
      .then(async () => {
        await logInteraction(
          {
            ownerId,
            assignmentId: null,
            feature: "agent_coach",
            model: ai.model,
            promptSummary: message.slice(0, 200),
            tokensUsed: ai.tokens,
          },
          supabase,
        );
        await incrementTokens(ownerId, ai.tokens, supabase);
      })
      .catch((e) => console.warn("post-response side effects failed", e));

    return new Response(JSON.stringify({ content: ai.content }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    console.error("agent-coach error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
