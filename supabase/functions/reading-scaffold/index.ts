// supabase/functions/reading-scaffold/index.ts
// F07: Reading comprehension scaffolds - pre/mid/post.
// ai_mode: 'red' and 'yellow' both return 403 for content-generating support.
// Model: claude-sonnet-4-6 (comprehension needs reasoning quality, not Haiku).
// Never produces numeric scores per F07 spec.
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

const PROMPTS: Record<"pre" | "mid" | "post", string> = {
  pre: `You are helping a high school student who has dyslexia prepare to read an assignment.
List 5-8 vocabulary words from this text that might be unfamiliar to a 9th-12th grader.
For each word: the word, a plain-language definition (1 sentence), and how it is used in context.
Do NOT summarize the text. Do NOT give away the main argument.
Format as a simple list. Calm, encouraging tone. No scores.`,

  mid: `You are helping a high school student who has dyslexia check in during reading.
In 2-4 sentences, describe what has happened so far in plain language.
Then ask one open-ended question to help them think about what they just read.
Keep it encouraging. Do not answer the question for them. No scores.`,

  post: `You are helping a high school student who has dyslexia review what they read.
Write 3 retrieval questions about the main ideas. Each question should be answerable from the text.
Questions only - no answers. No numeric scores. Calm, encouraging tone.`,
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json() as {
      ownerId?: unknown;
      assignmentId?: unknown;
      type?: unknown;
      text?: unknown;
      aiMode?: unknown;
    };

    const ownerId = typeof body.ownerId === "string" ? body.ownerId : "";
    const assignmentId = typeof body.assignmentId === "string" ? body.assignmentId : null;
    const type = body.type as "pre" | "mid" | "post";
    const text = typeof body.text === "string" ? body.text : "";
    const aiMode = typeof body.aiMode === "string" ? body.aiMode : "green";

    if (!ownerId || text.trim().length < 10) return json({ error: "Reading input required" }, 400);
    if (!PROMPTS[type]) return json({ error: "Invalid scaffold type" }, 400);
    if (aiMode === "red" || aiMode === "yellow") {
      return json({ error: "AI not available for this class" }, 403);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await resetBudgetIfNewDay(ownerId, supabase);
    const { allowed } = await checkTokenBudget(ownerId, supabase);
    if (!allowed) return json({ error: "You've used your AI quota for today - resets at midnight." }, 429);

    // Truncate text: pre uses first 1500 chars (vocab from opening); mid/post use 4000 chars.
    const truncatedText = type === "pre" ? text.slice(0, 1500) : text.slice(0, 4000);
    const system = composeSystemPrompt(PROMPTS[type], {
      includeRefuseRedirect: true,
      includeFrustration: true,
      includeMinorSafety: true,
      personalization: await adaptationLineForOwner(ownerId, supabase),
    });

    const ai = await callStudentTextModel({
      system,
      user: `Reading text:\n\n${truncatedText}`,
      maxTokens: 512,
      quality: "quality",
    });
    const content = ai.content;
    const tokens = ai.tokens;

    Promise.resolve()
      .then(async () => {
        await logInteraction({
          ownerId,
          assignmentId,
          feature: "reading_scaffold",
          model: ai.model,
          promptSummary: `${type}: ${text.slice(0, 180)}`,
          tokensUsed: tokens,
        }, supabase);
        await incrementTokens(ownerId, tokens, supabase);
      })
      .catch((e) => console.warn("reading-scaffold side effects failed", e));

    return json({ content });
  } catch (err) {
    console.error("reading-scaffold error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
