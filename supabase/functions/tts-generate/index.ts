// REQUIRES: OPENAI_API_KEY for provider="openai".
// REQUIRES: ELEVENLABS_API_KEY for provider="elevenlabs".

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY") ?? "";

const OPENAI_VOICES = new Set(["alloy", "echo", "fable", "onyx", "nova", "shimmer"]);
const ELEVENLABS_DEFAULT_VOICE = "JBFqnCBsd6RMkjVDRZzb";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

type Provider = "openai" | "elevenlabs";

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : fallback;
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
  return /^[A-Za-z0-9_-]{10,80}$/.test(trimmed) ? trimmed : ELEVENLABS_DEFAULT_VOICE;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json() as {
      text?: string;
      provider?: Provider;
      voice?: string;
      speed?: number;
    };

    if (!body.text || body.text.trim().length < 1) {
      return jsonResponse({ error: "text required" }, 400);
    }

    const provider = providerFrom(body.provider);
    const input = body.text.slice(0, 4000);

    if (provider === "elevenlabs") {
      return await generateElevenLabsSpeech({
        text: input,
        voiceId: safeElevenLabsVoice(body.voice),
        speed: clampNumber(body.speed, 1, 0.7, 1.2),
      });
    }

    return await generateOpenAiSpeech({
      text: input,
      voice: safeOpenAiVoice(body.voice),
      speed: clampNumber(body.speed, 1, 0.75, 1.5),
    });
  } catch (err) {
    console.error("tts-generate error:", err);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});

async function generateOpenAiSpeech({
  text,
  voice,
  speed,
}: {
  text: string;
  voice: string;
  speed: number;
}) {
  if (!OPENAI_API_KEY) {
    return jsonResponse({ error: "OpenAI TTS is not configured" }, 503);
  }

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
    console.error("openai tts error:", await openaiRes.text());
    return jsonResponse({ error: "TTS not available right now" }, 500);
  }

  return audioResponse(openaiRes.body);
}

async function generateElevenLabsSpeech({
  text,
  voiceId,
  speed,
}: {
  text: string;
  voiceId: string;
  speed: number;
}) {
  if (!ELEVENLABS_API_KEY) {
    return jsonResponse({ error: "ElevenLabs TTS is not configured" }, 503);
  }

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
    console.error("elevenlabs tts error:", await elevenRes.text());
    return jsonResponse({ error: "TTS not available right now" }, 500);
  }

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
