// REQUIRES: OPENAI_API_KEY in Supabase Edge Function secrets.
// No Supabase client needed — this function doesn't touch the DB.

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

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
      text?: string;
      voice?: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
    };
    const { text, voice = "nova" } = body;

    if (!text || text.trim().length < 1) {
      return new Response(JSON.stringify({ error: "text required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Pitfall 2: hard-cap at 4000 chars (leaves 96-char headroom against the 4096 OpenAI limit)
    const input = text.slice(0, 4000);

    const openaiRes = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input,
        voice,
        response_format: "mp3",
      }),
    });

    if (!openaiRes.ok) {
      console.error("openai tts error:", await openaiRes.text());
      return new Response(JSON.stringify({ error: "TTS failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Return binary stream directly — Cache-Control: no-store because these are dynamic per-text calls
    return new Response(openaiRes.body, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("tts-generate error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
