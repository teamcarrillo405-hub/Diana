// supabase/functions/citation-gen/index.ts
// F11: Citation generator — Haiku 4.5, returns MLA 9 / APA 7 / Chicago as JSON.
// ai_mode: 'red' returns 403; 'yellow' is ALLOWED (yellow = citation-help only).
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

const CITATION_PROMPT = `You are a citation formatter. The student gives you
source information; you return formatted citations.
- Use MLA 9, APA 7, and Chicago (notes-bibliography) styles — only the styles requested.
- If the source is a URL, extract: title, author (if present), site name, publication date, access date (today).
- If the source is a book, extract: title, author, publisher, year.
- If the source is pasted text, do your best to identify quoted source metadata; if you can't, say what's missing in one short sentence per missing field.
- Output as JSON: { "mla": "...", "apa": "...", "chicago": "..." } — only the requested formats.
- Never invent author names or dates. If a field is unknown, leave it as in the spec ("n.d." for APA, etc.).
- Calm tone in any prose notes.`;

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
      aiMode?: unknown;
      sourceType?: unknown;
      sourceText?: unknown;
      formats?: unknown;
    };

    const { ownerId, assignmentId, aiMode, sourceType, sourceText, formats } = body;

    if (typeof ownerId !== "string" || !ownerId) {
      return new Response(JSON.stringify({ error: "ownerId required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (
      typeof sourceType !== "string" ||
      !["url", "book", "paste"].includes(sourceType)
    ) {
      return new Response(
        JSON.stringify({ error: "sourceType must be 'url', 'book', or 'paste'" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
    if (typeof sourceText !== "string" || !sourceText) {
      return new Response(JSON.stringify({ error: "sourceText required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (
      !Array.isArray(formats) ||
      formats.length === 0 ||
      !(formats as string[]).every((f) => ["mla", "apa", "chicago"].includes(f))
    ) {
      return new Response(
        JSON.stringify({
          error: "formats must be a non-empty array of 'mla', 'apa', 'chicago'",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // 2. aiMode check — only 'red' blocks citation-gen.
    //    'yellow' is ALLOWED (F16 traffic-light: yellow = citation-help only).
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
          error: "You've used your AI quota for today \u2014 resets at midnight.",
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // 5. Compose system prompt — no F17/F18 (citations are not Socratic),
    //    MINOR_SAFETY always on (student could paste off-topic content).
    const systemPrompt = composeSystemPrompt(CITATION_PROMPT, {
      includeRefuseRedirect: false,
      includeFrustration: false,
      includeMinorSafety: true,
    });

    // 6. Build user message
    const userMsg = `Source type: ${sourceType}
Requested formats: ${(formats as string[]).join(", ")}
Source content:
${(sourceText as string).slice(0, 8000)}`;

    const messages = [
      { role: "user" as const, content: userMsg },
    ];

    // 7. Call Anthropic Haiku 4.5 — pure text-transform, no reasoning needed, cheap
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 600,
        system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
        messages,
      }),
    });

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
    const rawContent = data.content?.[0]?.text ?? "{}";
    const tokens =
      (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0);

    // 8. Parse citations JSON (graceful fallback on parse error)
    let citations: Record<string, string>;
    try {
      // Strip markdown code fences if model wraps in ```json
      const clean = rawContent.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
      citations = JSON.parse(clean) as Record<string, string>;
    } catch {
      console.error("Failed to parse citation JSON:", rawContent);
      citations = { raw: rawContent };
    }

    // 9. Fire-and-forget: log to ai_interactions + increment token counter.
    //    Must NOT block the response (AI-SAFETY-01 constraint).
    Promise.resolve()
      .then(async () => {
        await logInteraction(
          {
            ownerId,
            assignmentId: (assignmentId as string | null | undefined) ?? null,
            feature: "citation_gen",
            model: "claude-haiku-4-5",
            promptSummary: (sourceText as string).slice(0, 200),
            tokensUsed: tokens,
          },
          supabase,
        );
        await incrementTokens(ownerId, tokens, supabase);
      })
      .catch((e) => console.warn("post-response side effects failed", e));

    // 10. Return citations as JSON
    return new Response(JSON.stringify({ citations }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("citation-gen error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
