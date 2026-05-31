// supabase/functions/extract-note-doc/index.ts
//
// Phase 11: F04-PHOTO / F08-NOTE — photo & PDF extraction Edge Function.
//
// Flow: download file from note-docs bucket -> chunked base64 -> Claude
// Sonnet 4.6 (image block for jpg/png/webp/gif, document block for pdf)
// -> write notes.body_text + notes.doc_storage_key -> fire-and-forget
// transcribe-note (existing Claude cleanup pipeline; unchanged).
//
// REQUIRES:
//   ANTHROPIC_API_KEY in Supabase Edge Function secrets
//   note-docs Storage bucket (created out-of-band in Wave 3)
//   migration 0019 applied
//
// Pitfall guards in this file:
//   1 (HEIC at Claude): we DO NOT accept heic/heif here — UI converts to JPEG before upload.
//     If a heic key sneaks through anyway, we return 400 with a calm error.
//   2 (btoa stack overflow): uint8ArrayToBase64 chunks at 8192 bytes.
//   3 (32 MB API limit): 20 MB upload limit upstream means base64 stays under 26.6 MB.
//   4 (blob.type empty): MIME resolved from storageKey extension, never from blob.type.
//   5 (less-than-20-chars guard): mirrors Phase 10 Pitfall 7 — refuse Claude cleanup chain.
//
// Mirrors transcribe-voice/index.ts pattern: AWAIT extraction, FIRE-AND-FORGET
// transcribe-note cleanup (Phase 5 pattern).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  checkTokenBudget,
  resetBudgetIfNewDay,
  incrementTokens,
  logInteraction,
} from "../_shared/safety.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Pitfall 4: blob.type can be "" or "application/octet-stream" — resolve by ext.
const MIME_BY_EXT: Record<string, string> = {
  jpg:  "image/jpeg",
  jpeg: "image/jpeg",
  png:  "image/png",
  webp: "image/webp",
  gif:  "image/gif",
  pdf:  "application/pdf",
};

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
const PDF_EXTS = new Set(["pdf"]);

const MIN_EXTRACT_CHARS = 20;

const IMAGE_EXTRACT_PROMPT = `Extract all handwritten or printed text visible in this student class-notes photo.

Preserve the student original words exactly. Do not correct spelling or grammar.
If a section is unclear, write [unclear] as a placeholder.
Output the extracted text only — no preamble, no JSON wrapper, no markdown fence.`;

const PDF_EXTRACT_PROMPT = `Extract all text content from this document.

Preserve headings, lists, and paragraph breaks as plain text.
Output the extracted text only — no preamble, no JSON wrapper, no markdown fence.`;

// Pitfall 2: btoa(String.fromCharCode(...new Uint8Array(buf))) overflows the
// call stack for large arrays. Chunked encode at 8192 bytes is safe.
function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    binary += String.fromCharCode(...uint8Array.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function corsHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const body = (await req.json()) as {
      storageKey?: string;
      noteId?: string;
      bucket?: string;
    };
    const { storageKey, noteId, bucket = "note-docs" } = body;

    if (!storageKey || !noteId) {
      return jsonResponse({ error: "storageKey and noteId required" }, 400);
    }

    // Extension routing — DO NOT trust blob.type (Pitfall 4).
    const ext = (storageKey.split(".").pop() ?? "").toLowerCase();
    if (ext === "heic" || ext === "heif") {
      // HEIC should never reach here — UI converts to JPEG first (Pitfall 1).
      return jsonResponse({ error: "Please share this photo as JPEG." }, 400);
    }
    const isImage = IMAGE_EXTS.has(ext);
    const isPdf = PDF_EXTS.has(ext);
    if (!isImage && !isPdf) {
      return jsonResponse({ error: "Pick a photo (.jpg, .png, .webp, .gif) or .pdf file." }, 400);
    }
    const mimeType = MIME_BY_EXT[ext];

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Belt-and-suspenders: confirm note ownership before any work.
    const { data: note, error: noteErr } = await supabase
      .from("notes")
      .select("id, owner_id")
      .eq("id", noteId)
      .single();
    if (noteErr || !note) {
      return jsonResponse({ error: "Note not found" }, 404);
    }
    const ownerId = note.owner_id as string;

    // Token budget gate (CLAUDE.md "Adding a new AI feature" step 2).
    await resetBudgetIfNewDay(ownerId, supabase);
    const budget = await checkTokenBudget(ownerId, supabase);
    if (!budget.allowed) {
      return jsonResponse({ error: "Daily token budget reached. Try again tomorrow." }, 402);
    }

    // Download the doc bytes.
    const { data: blob, error: dlError } = await supabase.storage
      .from(bucket)
      .download(storageKey);
    if (dlError || !blob) {
      return jsonResponse({ error: "File not found" }, 404);
    }

    // Chunked base64 (Pitfall 2).
    const arrayBuf = await blob.arrayBuffer();
    const base64Data = uint8ArrayToBase64(new Uint8Array(arrayBuf));

    // Build Claude payload — image block vs document block.
    const contentBlock = isPdf
      ? {
          type: "document" as const,
          source: { type: "base64" as const, media_type: mimeType, data: base64Data },
        }
      : {
          type: "image" as const,
          source: { type: "base64" as const, media_type: mimeType, data: base64Data },
        };

    const userText = isPdf
      ? "Extract all text from this document."
      : "Extract all visible text from this photo of student class notes.";

    const systemPrompt = isPdf ? PDF_EXTRACT_PROMPT : IMAGE_EXTRACT_PROMPT;
    const maxTokens = isPdf ? 4000 : 2000;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [contentBlock, { type: "text", text: userText }],
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("anthropic extract-note-doc error:", errText);
      return jsonResponse({ error: "We couldn't read that file. Try a clearer photo or a smaller PDF." }, 502);
    }

    const anthropicData = (await anthropicRes.json()) as {
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const extracted = (anthropicData.content?.[0]?.text ?? "").trim();
    const inTok = Number(anthropicData.usage?.input_tokens ?? 0);
    const outTok = Number(anthropicData.usage?.output_tokens ?? 0);

    // Pitfall 5: very short text -> save storageKey + tiny body, skip cleanup.
    if (extracted.length < MIN_EXTRACT_CHARS) {
      await supabase
        .from("notes")
        .update({
          body_text:        extracted,
          doc_storage_key:  storageKey,
          updated_at:       new Date().toISOString(),
        })
        .eq("id", noteId)
        .eq("owner_id", ownerId);

      // Fire-and-forget budget bookkeeping even on short result.
      void incrementTokens(ownerId, inTok + outTok, supabase).catch((e) =>
        console.warn("incrementTokens (short) failed", e),
      );
      void logInteraction(
        {
          ownerId,
          feature: "doc_extract",
          model: "claude-sonnet-4-6",
          promptSummary: isPdf ? "doc_extract:pdf:short" : "doc_extract:image:short",
          tokensUsed: inTok + outTok,
        },
        supabase,
      ).catch((e) => console.warn("logInteraction (short) failed", e));

      return jsonResponse({ ok: true, text: "", tooShort: true });
    }

    // Happy path: write body_text + doc_storage_key.
    const { error: updErr } = await supabase
      .from("notes")
      .update({
        body_text:        extracted,
        doc_storage_key:  storageKey,
        updated_at:       new Date().toISOString(),
      })
      .eq("id", noteId)
      .eq("owner_id", ownerId);
    if (updErr) {
      console.error("notes update error:", updErr);
      return jsonResponse({ error: updErr.message }, 500);
    }

    // Fire-and-forget Claude cleanup (Phase 5 transcribe-note pipeline).
    // Identical pattern to triggerAudioTranscription Step 3.
    void supabase.functions
      .invoke("transcribe-note", { body: { noteId } })
      .catch((e) => console.warn("transcribe-note kickoff", e));

    // Fire-and-forget token bookkeeping (CLAUDE.md "Adding a new AI feature" step 5).
    void incrementTokens(ownerId, inTok + outTok, supabase).catch((e) =>
      console.warn("incrementTokens failed", e),
    );
    void logInteraction(
      {
        ownerId,
        feature: "doc_extract",
        model: "claude-sonnet-4-6",
        promptSummary: isPdf ? "doc_extract:pdf" : "doc_extract:image",
        tokensUsed: inTok + outTok,
      },
      supabase,
    ).catch((e) => console.warn("logInteraction failed", e));

    return jsonResponse({ ok: true, text: extracted });
  } catch (err) {
    console.error("extract-note-doc error:", err);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});
