import { withStudentSecurity } from "../_shared/student-handler.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  aiGuardFailureResponse,
  contentByteLength,
  estimateMediaCostUnits,
  runSafeBudgetedMediaCall,
} from "../_shared/safety.ts";

// REQUIRES: OPENAI_API_KEY for provider="openai".
// REQUIRES: ELEVENLABS_API_KEY for provider="elevenlabs".

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  "";

const OPENAI_VOICES = new Set([
  "alloy",
  "echo",
  "fable",
  "onyx",
  "nova",
  "shimmer",
]);
const ELEVENLABS_DEFAULT_VOICE = "EXAVITQu4vr4xnSDxMaL";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

type Provider = "openai" | "elevenlabs";

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clampNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const n = typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
  return Math.min(Math.max(n, min), max);
}

function providerFrom(value: unknown): Provider {
  return value === "elevenlabs" ? "elevenlabs" : "openai";
}

function safeOpenAiVoice(value: unknown): string {
  return typeof value === "string" && OPENAI_VOICES.has(value) ? value : "nova";
}

function safeElevenLabsVoice(value: unknown): string {
  if (typeof value !== "string") return ELEVENLABS_DEFAULT_VOICE;
  const trimmed = value.trim();
  return /^[A-Za-z0-9_-]{10,80}$/.test(trimmed)
    ? trimmed
    : ELEVENLABS_DEFAULT_VOICE;
}

Deno.serve(withStudentSecurity("tts-generate", async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json() as {
      text?: string;
      provider?: Provider;
      voice?: string;
      speed?: number;
      ownerId?: string;
    };

    if (!body.text || body.text.trim().length < 1 || !body.ownerId) {
      return jsonResponse({ error: "text required" }, 400);
    }
    if (body.text.length > 4000) {
      return jsonResponse({ error: "text too long" }, 413);
    }

    const provider = providerFrom(body.provider);
    const input = body.text;
    if (provider === "elevenlabs" && !ELEVENLABS_API_KEY) {
      return jsonResponse({ error: "ElevenLabs TTS is not configured" }, 503);
    }
    if (provider === "openai" && !OPENAI_API_KEY) {
      return jsonResponse({ error: "OpenAI TTS is not configured" }, 503);
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const costUnits = estimateMediaCostUnits({ characterLength: input.length });
    const guarded = await runSafeBudgetedMediaCall({
      ownerId: body.ownerId,
      supabase,
      input,
      requestedCostUnits: costUnits,
      invoke: ({ markProviderUsage }) =>
        provider === "elevenlabs"
          ? generateElevenLabsSpeech({
            text: input,
            voiceId: safeElevenLabsVoice(body.voice),
            speed: clampNumber(body.speed, 1, 0.7, 1.2),
            markProviderUsage,
          })
          : generateOpenAiSpeech({
            text: input,
            voice: safeOpenAiVoice(body.voice),
            speed: clampNumber(body.speed, 1, 0.75, 1.5),
            markProviderUsage,
          }),
      getActualCostUnits: () => costUnits,
    });
    if (!guarded.ok) return aiGuardFailureResponse(guarded, corsHeaders);
    return guarded.value;
  } catch (err) {
    console.error("tts-generate error:", err);
    return jsonResponse({ error: "Internal error" }, 500);
  }
}));

async function generateOpenAiSpeech({
  text,
  voice,
  speed,
  markProviderUsage,
}: {
  text: string;
  voice: string;
  speed: number;
  markProviderUsage: () => void;
}) {
  const openaiRes = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      input: text,
      voice,
      speed,
      response_format: "mp3",
    }),
  });

  if (!openaiRes.ok) {
    const providerError = await openaiRes.text();
    console.error("openai tts response did not complete", {
      status: openaiRes.status,
      responseBytes: contentByteLength(providerError),
      correlationId: openaiRes.headers.get("x-request-id") ?? "unavailable",
    });
    throw new Error("openai_tts_provider_error");
  }

  markProviderUsage();
  return audioResponse(openaiRes.body);
}

async function generateElevenLabsSpeech({
  text,
  voiceId,
  speed,
  markProviderUsage,
}: {
  text: string;
  voiceId: string;
  speed: number;
  markProviderUsage: () => void;
}) {
  const elevenRes = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_flash_v2_5",
        voice_settings: {
          stability: 0.55,
          similarity_boost: 0.75,
          style: 0,
          use_speaker_boost: true,
          speed,
        },
      }),
    },
  );

  if (!elevenRes.ok) {
    const providerError = await elevenRes.text();
    console.error("elevenlabs tts response did not complete", {
      status: elevenRes.status,
      responseBytes: contentByteLength(providerError),
      correlationId: elevenRes.headers.get("request-id") ?? "unavailable",
    });
    throw new Error("elevenlabs_tts_provider_error");
  }

  markProviderUsage();
  return audioResponse(elevenRes.body);
}

function audioResponse(body: ReadableStream<Uint8Array> | null) {
  return new Response(body, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
