// supabase/functions/math-step/index.ts
// F09: Socratic math tutor — Haiku 4.5, never reveals the answer.
// ai_mode: 'red' and 'yellow' both return 403 (math is highest Socratic concern).
// Fire-and-forget: logInteraction + incrementTokens never block the response.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  checkTokenBudget,
  incrementTokens,
  logInteraction,
  resetBudgetIfNewDay,
} from "../_shared/safety.ts";
import { buildPersonalizationPrompt, composeSystemPrompt } from "../_shared/system-prompts.ts";
import { adaptationLineForOwner } from "../_shared/adaptation.ts";
import { callStudentTextModel } from "../_shared/student-model.ts";

const MATH_PROMPT = `You are a Socratic math tutor for a high-school student.
The student will share a math problem they are stuck on. Your rules:
- Never write out the final numeric or algebraic answer.
- Never finish the next step for them. Hint at it.
- Always end with a question they can act on, e.g. "What do you think the
  first move is?" or "What rule from class might apply here?"
- If the student says "just give me the answer" or similar, refer to the
  refuse-with-redirect guidance.
- Keep responses \u2264 5 short sentences. Calm tone, never alarmist.`;

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type, apikey",
      },
    });
  }

  try {
    // 1. Parse and validate body
    const body = await req.json() as {
      ownerId?: unknown;
      assignmentId?: unknown;
      history?: unknown;
      prompt?: unknown;
      aiMode?: unknown;
      stream?: unknown;
    };

    const { ownerId, assignmentId, history, prompt, aiMode } = body;
    const wantsStream = body.stream === true;

    if (typeof ownerId !== "string" || !ownerId) {
      return new Response(JSON.stringify({ error: "ownerId required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (typeof prompt !== "string" || !prompt) {
      return new Response(JSON.stringify({ error: "prompt required" }), {
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

    // 2. aiMode check — both 'red' and 'yellow' block math (yellow = citations only)
    if (aiMode === "red" || aiMode === "yellow") {
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("interests, session_mood")
      .eq("user_id", ownerId)
      .single();

    let personalization = buildPersonalizationPrompt({
      interests: Array.isArray(profile?.interests) ? profile.interests : [],
      sessionMood: typeof profile?.session_mood === "string" ? profile.session_mood : null,
    });

    // Effectiveness loop: one learned-context line from the student's own
    // "helped / not really" taps. Null on any failure — never blocks help.
    const learnedLine = await adaptationLineForOwner(ownerId, supabase);
    if (learnedLine) {
      personalization = personalization ? `${personalization}\n${learnedLine}` : learnedLine;
    }

    // 5. Compose system prompt with F17 + F18 + MINOR_SAFETY fragments
    const systemPrompt = composeSystemPrompt(MATH_PROMPT, {
      includeRefuseRedirect: true,
      includeFrustration: true,
      includeMinorSafety: true,
      personalization,
    });

    // 6. Build messages — cap history at last 6 turns (cost + frustration detection window)
    const messages = [
      ...(history as Array<{ role: "user" | "assistant"; content: string }>)
        .slice(-6)
        .map((h) => ({ role: h.role, content: h.content })),
      { role: "user" as const, content: prompt as string },
    ];

    // 7. Use the shared fast student model.
    const userMessage = messages
      .map((message) => `${message.role === "assistant" ? "Tutor" : "Student"}: ${message.content}`)
      .join("\n\n");
    const modelResult = await callStudentTextModel({
      system: systemPrompt,
      user: userMessage,
      maxTokens: 400,
    });
    const res = wantsStream
      ? new Response([
        `data: ${JSON.stringify({ type: "message_start", message: { usage: { input_tokens: 0 } } })}`,
        `data: ${JSON.stringify({ type: "content_block_delta", delta: { type: "text_delta", text: modelResult.content } })}`,
        `data: ${JSON.stringify({ type: "message_delta", usage: { output_tokens: modelResult.tokens } })}`,
        "",
      ].join("\n\n"), { status: 200 })
      : new Response(JSON.stringify({
        content: [{ type: "text", text: modelResult.content }],
        usage: { input_tokens: 0, output_tokens: modelResult.tokens },
      }), { status: 200, headers: { "Content-Type": "application/json" } });

    // 7b. Streaming path: forward simplified SSE text deltas to the client
    //     while accumulating tokens for the same fire-and-forget logging.
    if (wantsStream && res.ok && res.body) {
      const upstream = res.body.getReader();
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      let buffer = "";
      let inputTokens = 0;
      let outputTokens = 0;

      const streamBody = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await upstream.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";
              for (const line of lines) {
                if (!line.startsWith("data:")) continue;
                const payload = line.slice(5).trim();
                if (!payload) continue;
                try {
                  const event = JSON.parse(payload) as {
                    type?: string;
                    delta?: { type?: string; text?: string };
                    message?: { usage?: { input_tokens?: number } };
                    usage?: { output_tokens?: number };
                  };
                  if (event.type === "content_block_delta" && event.delta?.text) {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`),
                    );
                  }
                  if (event.type === "message_start" && event.message?.usage?.input_tokens) {
                    inputTokens = event.message.usage.input_tokens;
                  }
                  if (event.type === "message_delta" && event.usage?.output_tokens) {
                    outputTokens = event.usage.output_tokens;
                  }
                } catch {
                  // skip malformed upstream lines
                }
              }
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          } finally {
            controller.close();
            const totalTokens = inputTokens + outputTokens;
            Promise.resolve()
              .then(async () => {
                await logInteraction(
                  {
                    ownerId,
                    assignmentId: (assignmentId as string | null | undefined) ?? null,
                    feature: "math_step",
                    model: modelResult.model,
                    promptSummary: (prompt as string).slice(0, 200),
                    tokensUsed: totalTokens,
                  },
                  supabase,
                );
                await incrementTokens(ownerId, totalTokens, supabase);
              })
              .catch((e) => console.warn("post-stream side effects failed", e));
          }
        },
      });

      return new Response(streamBody, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error("Anthropic error:", errText);
      return new Response(JSON.stringify({ error: "AI request failed" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await res.json() as {
      content: Array<{ type: string; text: string }>;
      usage?: { input_tokens: number; output_tokens: number };
    };
    const content = data.content?.[0]?.text ?? "";
    const tokens =
      (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0);

    // 8. Fire-and-forget: log to ai_interactions + increment token counter.
    //    Must NOT block the response (AI-SAFETY-01 constraint).
    Promise.resolve()
      .then(async () => {
        await logInteraction(
          {
            ownerId,
            assignmentId: (assignmentId as string | null | undefined) ?? null,
            feature: "math_step",
            model: modelResult.model,
            promptSummary: (prompt as string).slice(0, 200),
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
    console.error("math-step error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
