// supabase/functions/reading-scaffold/index.ts
// F07: Reading comprehension scaffolds — pre/mid/post.
// Pitfall 5: aiMode='red' returns 403 (defense in depth — client also hides buttons).
// Model: claude-sonnet-4-6 (comprehension needs reasoning quality, not Haiku).
// Never produces numeric scores per F07 spec.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

const PROMPTS: Record<"pre" | "mid" | "post", string> = {
  pre: `You are helping a high school student who has dyslexia prepare to read an assignment.
List 5–8 vocabulary words from this text that might be unfamiliar to a 9th–12th grader.
For each word: the word, a plain-language definition (1 sentence), and how it is used in context.
Do NOT summarize the text. Do NOT give away the main argument.
Format as a simple list. Calm, encouraging tone. No scores.`,

  mid: `You are helping a high school student who has dyslexia check in during reading.
In 2–4 sentences, describe what has happened so far in plain language.
Then ask one open-ended question to help them think about what they just read.
Keep it encouraging. Do not answer the question for them. No scores.`,

  post: `You are helping a high school student who has dyslexia review what they read.
Write 3 retrieval questions about the main ideas. Each question should be answerable from the text.
Questions only — no answers. No numeric scores. Calm, encouraging tone.`,
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  const { type, text, aiMode } = await req.json() as {
    type: "pre" | "mid" | "post";
    text: string;
    aiMode: string;
  };

  // Pitfall 5: server-side aiMode guard (defense in depth)
  if (aiMode === "red") {
    return new Response(JSON.stringify({ error: "AI disabled for this class" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!PROMPTS[type]) {
    return new Response(JSON.stringify({ error: "Invalid scaffold type" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Truncate text: pre uses first 1500 chars (vocab from opening); mid/post use 4000 chars
  const truncatedText = type === "pre" ? text.slice(0, 1500) : text.slice(0, 4000);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: PROMPTS[type],
      messages: [{ role: "user", content: `Reading text:\n\n${truncatedText}` }],
    }),
  });

  const data = await res.json() as { content: Array<{ type: string; text: string }> };
  const content = data.content?.[0]?.text ?? "";

  return new Response(JSON.stringify({ content }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
