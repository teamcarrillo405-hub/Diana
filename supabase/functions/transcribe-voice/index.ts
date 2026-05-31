// REQUIRES: OPENAI_API_KEY in Supabase Edge Function secrets. Run: supabase secrets set OPENAI_API_KEY=sk-...
// NOTE: No logInteraction call here — this is a non-Claude AI call. Whisper usage is auditable via OpenAI dashboard.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

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
    const body = await req.json() as { audioStorageKey?: string; bucket?: string };
    const { audioStorageKey, bucket = "note-audio" } = body;

    if (!audioStorageKey) {
      return new Response(JSON.stringify({ error: "audioStorageKey required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Download audio blob from Supabase Storage
    const { data: blob, error } = await supabase.storage
      .from(bucket)
      .download(audioStorageKey);

    if (error || !blob) {
      return new Response(JSON.stringify({ error: "Audio not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Build FormData for Whisper API
    // Pitfall 2 (Phase 10 research): Storage download may return blob.type === ""
    // or "application/octet-stream". Detect extension from storage key and pick
    // the correct Whisper-supported MIME. Mirror of lib/notes/mime.ts mapping.
    const ext = (audioStorageKey.split(".").pop() ?? "").toLowerCase();
    const mimeByExt: Record<string, string> = {
      m4a:  "audio/mp4",
      mp3:  "audio/mpeg",
      wav:  "audio/wav",
      webm: "audio/webm",
    };
    const resolvedMime =
      blob.type && blob.type !== "application/octet-stream"
        ? blob.type
        : (mimeByExt[ext] ?? "audio/webm");
    const filename = `audio.${ext || "webm"}`;

    const formData = new FormData();
    formData.append(
      "file",
      new File([await blob.arrayBuffer()], filename, { type: resolvedMime }),
    );
    formData.append("model", "whisper-1");

    // POST to OpenAI Whisper — no Content-Type header, fetch sets multipart boundary automatically
    const openaiRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!openaiRes.ok) {
      console.error("openai whisper error:", await openaiRes.text());
      return new Response(JSON.stringify({ error: "Transcription failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const { text } = await openaiRes.json() as { text: string };

    return new Response(JSON.stringify({ ok: true, text }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("transcribe-voice error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
