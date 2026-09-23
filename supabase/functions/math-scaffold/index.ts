import { withStudentSecurity } from "../_shared/student-handler.ts";

// supabase/functions/math-scaffold/index.ts
// Phase 16: structured Socratic math scaffold with optional photo extraction.
// AI mode: red/yellow both block content-generating math help.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  aiGuardFailureResponse,
  callSafeStudentTextModel,
  checkTokenBudget,
  incrementTokens,
  logInteraction,
  resetBudgetIfNewDay,
  runSafeBudgetedAiCall,
  type SafetyMediaInput,
} from "../_shared/safety.ts";
import { buildPersonalizationPrompt, composeSystemPrompt } from "../_shared/system-prompts.ts";
import { adaptationLineForOwner } from "../_shared/adaptation.ts";

const VALID_SUBJECTS = new Set([
  "algebra",
  "geometry",
  "precalculus",
  "calculus",
  "statistics",
  "physics",
  "chemistry",
]);

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

const PHOTO_PROMPT = `Read this math problem photo.
Return JSON only with:
{
  "problemText": "the full visible math problem in plain text",
  "latex": "a compact LaTeX version if useful, otherwise null"
}
Do not solve the problem. If something is unclear, write [unclear].`;

const SCAFFOLD_PROMPT = `You are Diana's Phase 16 math scaffold engine for a high-school student.

You build a whiteboard-style step board. You never reveal the final numeric, algebraic, graph, or written answer.

Return exactly one JSON object with this shape:
{
  "extractedProblem": string,
  "latex": string | null,
  "subject": "algebra" | "geometry" | "precalculus" | "calculus" | "statistics" | "physics" | "chemistry",
  "steps": [
    {
      "id": string,
      "label": string,
      "prompt": string,
      "unitHint": string | null,
      "studentCheck": string | null
    }
  ],
  "commonError": string,
  "unitTracker": [
    { "quantity": string, "unit": string, "note": string }
  ],
  "graphSketch": null | {
    "prompt": string,
    "xBehavior": string,
    "yBehavior": string
  }
}

Rules:
- 4 to 7 steps, each a prompt the student can act on.
- Do not complete the student's next line for them.
- For "show an example", this function should still scaffold their own problem, not solve it.
- commonError should name one likely mix-up and how to check it without saying the student made it.
- unitTracker is required for physics, chemistry, rates, dimensions, or word problems with units.
- graphSketch is required when the problem asks to graph/sketch or includes y=, f(x)=, intercepts, asymptotes, derivatives, or curve behavior.
- Keep labels short and calm. No exclamation marks. No shame/scolding words.`;

function corsHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "Access-Control-Allow-Headers": "authorization, content-type",
    ...extra,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders({ "Content-Type": "application/json" }),
  });
}

function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    binary += String.fromCharCode(...uint8Array.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function loadProblemPhoto(
  // deno-lint-ignore no-explicit-any
  supabase: { storage: any },
  storageKey: string,
  bucket: string,
): Promise<SafetyMediaInput> {
  const ext = (storageKey.split(".").pop() ?? "").toLowerCase();
  const mimeType = MIME_BY_EXT[ext];
  if (!mimeType) {
    throw new Error("Pick a .jpg, .png, .webp, or .gif photo.");
  }

  const { data: blob, error } = await supabase.storage.from(bucket).download(storageKey);
  if (error || !blob) throw new Error("Photo not found in storage.");
  return {
    mediaType: mimeType,
    data: uint8ArrayToBase64(new Uint8Array(await blob.arrayBuffer())),
  };
}

async function extractProblemFromPhoto(
  image: SafetyMediaInput,
  markProviderUsage: () => void,
): Promise<{ problemText: string; latex: string | null; tokens: number; moderationContent: string }> {
  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY") ?? ""}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 700,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PHOTO_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${image.mediaType};base64,${image.data}`, detail: "high" },
            },
            { type: "text", text: "Extract the problem only. Do not solve it." },
          ],
        },
      ],
    }),
  });

  if (!openaiRes.ok) {
    console.error("math photo extraction request did not complete", openaiRes.status);
    throw new Error("We couldn't read that photo. Try a clearer crop.");
  }

  markProviderUsage();
  let openaiData: {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  try {
    openaiData = await openaiRes.json() as typeof openaiData;
  } catch {
    throw new Error("math_photo_provider_invalid_json");
  }
  const raw = openaiData.choices?.[0]?.message?.content ?? "{}";
  let parsed: { problemText?: unknown; latex?: unknown };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    throw new Error("math_photo_content_invalid_json");
  }
  const problemText = typeof parsed.problemText === "string" ? parsed.problemText.trim() : "";
  if (problemText.length < 3) throw new Error("We couldn't read enough math from that photo.");
  const tokens = Number(openaiData.usage?.prompt_tokens ?? 0) + Number(openaiData.usage?.completion_tokens ?? 0);
  return {
    problemText,
    latex: typeof parsed.latex === "string" && parsed.latex.trim().length > 0 ? parsed.latex.trim() : null,
    tokens,
    moderationContent: raw,
  };
}

Deno.serve(withStudentSecurity("math-scaffold", async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const body = await req.json() as {
      ownerId?: unknown;
      assignmentId?: unknown;
      aiMode?: unknown;
      subject?: unknown;
      problemText?: unknown;
      storageKey?: unknown;
      bucket?: unknown;
    };

    const ownerId = typeof body.ownerId === "string" ? body.ownerId : "";
    const assignmentId = typeof body.assignmentId === "string" ? body.assignmentId : null;
    const subject = typeof body.subject === "string" && VALID_SUBJECTS.has(body.subject)
      ? body.subject
      : "algebra";
    const storageKey = typeof body.storageKey === "string" && body.storageKey.length > 0
      ? body.storageKey
      : null;
    const bucket = typeof body.bucket === "string" && body.bucket.length > 0
      ? body.bucket
      : "note-docs";

    if (!ownerId) return jsonResponse({ error: "ownerId required" }, 400);
    if (body.aiMode === "red" || body.aiMode === "yellow") {
      return jsonResponse({ error: "AI not available for this class" }, 403);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await resetBudgetIfNewDay(ownerId, supabase);
    const { allowed } = await checkTokenBudget(ownerId, supabase);
    if (!allowed) {
      return jsonResponse({ error: "You've used your AI quota for today — resets at midnight." }, 429);
    }

    let problemText = typeof body.problemText === "string" ? body.problemText.trim().slice(0, 2400) : "";
    let latex: string | null = null;
    let photoTokens = 0;
    if (storageKey) {
      const image = await loadProblemPhoto(supabase, storageKey, bucket);
      const guardedPhoto = await runSafeBudgetedAiCall({
        ownerId,
        supabase,
        input: "Extract the problem only. Do not solve it.",
        systemPrompt: PHOTO_PROMPT,
        maxOutputTokens: 700,
        mediaCount: 1,
        media: [image],
        invoke: ({ markProviderUsage }) => extractProblemFromPhoto(image, markProviderUsage),
        getOutput: (value) => value.moderationContent,
      });
      if (!guardedPhoto.ok) return aiGuardFailureResponse(guardedPhoto);
      const extracted = guardedPhoto.value;
      problemText = extracted.problemText.slice(0, 2400);
      latex = extracted.latex;
      photoTokens = extracted.tokens;
    }

    if (problemText.length < 1) {
      return jsonResponse({ error: "problemText or photo required" }, 400);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("interests, session_mood")
      .eq("user_id", ownerId)
      .single();

    const personalization = buildPersonalizationPrompt({
      interests: Array.isArray(profile?.interests) ? profile.interests : [],
      sessionMood: typeof profile?.session_mood === "string" ? profile.session_mood : null,
    });

    const systemPrompt = composeSystemPrompt(SCAFFOLD_PROMPT, {
      includeRefuseRedirect: true,
      includeFrustration: true,
      includeMinorSafety: true,
      personalization: [personalization, await adaptationLineForOwner(ownerId, supabase)].filter(Boolean).join("\n") || null,
    });

    const userMessage = [
      `Subject: ${subject}`,
      latex ? `Extracted LaTeX: ${latex}` : "",
      "Problem:",
      problemText,
    ].filter(Boolean).join("\n");

    const ai = await callSafeStudentTextModel({
      ownerId,
      supabase,
      system: systemPrompt,
      user: userMessage,
      maxTokens: 650,
      json: true,
    });
    const content = ai.content;
    const tokens = photoTokens + ai.tokens;

    Promise.resolve()
      .then(async () => {
        await logInteraction(
          {
            ownerId,
            assignmentId,
            feature: "math_scaffold",
            model: storageKey ? `gpt-4o + ${ai.model}` : ai.model,
            promptSummary: problemText.slice(0, 200),
            tokensUsed: tokens,
          },
          supabase,
        );
        await incrementTokens(ownerId, tokens, supabase);
      })
      .catch(() => console.warn("post-response side effects did not complete"));

    return jsonResponse({
      content,
      extractedProblem: problemText,
      latex,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("math-scaffold request did not complete");
    return jsonResponse({ error: "Math help is unavailable right now." }, 500);
  }
}));
