import { withStudentSecurity } from "../_shared/student-handler.ts";
import {
  aiGuardFailureResponse,
  contentByteLength,
  estimateMediaCostUnits,
  guardStudentContent,
  runSafeBudgetedMediaCall,
} from "../_shared/safety.ts";

// REQUIRES: OPENAI_API_KEY in Supabase Edge Function secrets. Run: supabase secrets set OPENAI_API_KEY=sk-...
// NOTE: No logInteraction call here — this is a non-Claude AI call. Whisper usage is auditable via OpenAI dashboard.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  "";
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

const corsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info",
};

Deno.serve(withStudentSecurity("transcribe-voice", async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({
          ok: false,
          code: "not_configured",
          error: "Transcription service is not configured.",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const body = await req.json() as {
      audioStorageKey?: string;
      bucket?: string;
      ownerId?: string;
    };
    const { audioStorageKey, ownerId, bucket = "note-audio" } = body;

    if (!audioStorageKey || !ownerId) {
      return new Response(
        JSON.stringify({ error: "audioStorageKey required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Download audio blob from Supabase Storage
    const { data: blob, error } = await supabase.storage
      .from(bucket)
      .download(audioStorageKey);

    if (error || !blob) {
      return new Response(
        JSON.stringify({
          ok: false,
          code: "audio_not_found",
          error: "Audio was not found.",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }
    if (blob.size <= 0 || blob.size > MAX_AUDIO_BYTES) {
      return new Response(
        JSON.stringify({
          ok: false,
          code: "audio_size_blocked",
          error: "Audio must be smaller than 20 MB.",
        }),
        {
          status: 413,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    // Build FormData for Whisper API
    // Pitfall 2 (Phase 10 research): Storage download may return blob.type === ""
    // or "application/octet-stream". Detect extension from storage key and pick
    // the correct Whisper-supported MIME. Mirror of lib/notes/mime.ts mapping.
    const ext = (audioStorageKey.split(".").pop() ?? "").toLowerCase();
    const mimeByExt: Record<string, string> = {
      m4a: "audio/mp4",
      mp3: "audio/mpeg",
      wav: "audio/wav",
      webm: "audio/webm",
    };
    const resolvedMime = blob.type && blob.type !== "application/octet-stream"
      ? blob.type
      : (mimeByExt[ext] ?? "audio/webm");
    const filename = `audio.${ext || "webm"}`;

    const costUnits = estimateMediaCostUnits({ byteLength: blob.size });
    const guarded = await runSafeBudgetedMediaCall({
      ownerId,
      supabase,
      input: "Transcribe this owned audio note.",
      requestedCostUnits: costUnits,
      invoke: async ({ markProviderUsage }) => {
        const formData = new FormData();
        formData.append(
          "file",
          new File([await blob.arrayBuffer()], filename, {
            type: resolvedMime,
          }),
        );
        formData.append("model", "whisper-1");

        // POST to OpenAI Whisper — no Content-Type header, fetch sets multipart boundary automatically
        const openaiRes = await fetch(
          "https://api.openai.com/v1/audio/transcriptions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: formData,
          },
        );

        if (!openaiRes.ok) {
          const providerError = await openaiRes.text();
          console.error("openai whisper response did not complete", {
            status: openaiRes.status,
            responseBytes: contentByteLength(providerError),
            correlationId: openaiRes.headers.get("x-request-id") ??
              "unavailable",
          });
          throw new Error("openai_whisper_provider_error");
        }

        markProviderUsage();
        let payload: { text?: string };
        try {
          payload = await openaiRes.json() as { text?: string };
        } catch {
          throw new Error("openai_whisper_invalid_response");
        }
        return { text: payload.text ?? "", costUnits };
      },
      getActualCostUnits: (value) => value.costUnits,
    });
    if (!guarded.ok) return aiGuardFailureResponse(guarded, corsHeaders);
    const { text } = guarded.value;
    const outputFailure = await guardStudentContent({
      text: typeof text === "string" ? text : "",
      images: [],
      phase: "output",
    });
    if (outputFailure) {
      return aiGuardFailureResponse(outputFailure, corsHeaders);
    }

    return new Response(JSON.stringify({ ok: true, text }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (err) {
    console.error("transcribe-voice request did not complete", {
      errorName: err instanceof Error ? err.name : "unknown",
    });
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
}));
