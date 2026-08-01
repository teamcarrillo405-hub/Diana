import { withStudentSecurity } from "../_shared/student-handler.ts";

// supabase/functions/extract-note-doc/index.ts
//
// Phase 11: F04-PHOTO / F08-NOTE — photo & PDF extraction Edge Function.
//
// Flow: download file from note-docs bucket -> chunked base64 -> GPT-4o
// (image_url block for jpg/png/webp/gif, file block for pdf)
// -> write notes.body_text + notes.doc_storage_key -> fire-and-forget
// transcribe-note (existing Claude cleanup pipeline; unchanged).
//
// REQUIRES:
//   OPENAI_API_KEY in Supabase Edge Function secrets
//   note-docs Storage bucket (created in Wave 3)
//   migration 0019 applied
//
// Pitfall guards:
//   1 (HEIC at API): UI converts HEIC to JPEG before upload; we 400 if it slips through.
//   2 (btoa stack overflow): uint8ArrayToBase64 chunks at 8192 bytes.
//   3 (32 MB API limit): 20 MB upload limit upstream keeps base64 under 26.6 MB.
//   4 (blob.type empty): MIME resolved from storageKey extension, never from blob.type.
//   5 (less-than-20-chars guard): skip Claude cleanup chain for near-empty results.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  aiGuardFailureResponse,
  checkTokenBudget,
  resetBudgetIfNewDay,
  logInteraction,
  runSafeBudgetedAiCall,
} from "../_shared/safety.ts";

const OPENAI_API_KEY      = Deno.env.get("OPENAI_API_KEY") ?? "";
const SUPABASE_URL        = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Pitfall 4: resolve MIME from extension, not blob.type.
const MIME_BY_EXT: Record<string, string> = {
  jpg:  "image/jpeg",
  jpeg: "image/jpeg",
  png:  "image/png",
  webp: "image/webp",
  gif:  "image/gif",
  pdf:  "application/pdf",
};

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
const PDF_EXTS   = new Set(["pdf"]);

const MIN_EXTRACT_CHARS = 20;

const IMAGE_EXTRACT_PROMPT = `Extract all handwritten or printed text visible in this student class-notes photo.

Preserve the student original words exactly. Do not correct spelling or grammar.
If a section is unclear, write [unclear] as a placeholder.
Output the extracted text only — no preamble, no JSON wrapper, no markdown fence.`;

const PDF_EXTRACT_PROMPT = `Extract all text content from this document.

Preserve headings, lists, and paragraph breaks as plain text.
Output the extracted text only — no preamble, no JSON wrapper, no markdown fence.`;

// Pitfall 2: btoa(String.fromCharCode(...new Uint8Array(buf))) overflows for large arrays.
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

Deno.serve(withStudentSecurity("extract-note-doc", async (req: Request) => {
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
      return jsonResponse({ ok: false, error: "storageKey and noteId required" }, 200);
    }

    // Extension routing — DO NOT trust blob.type (Pitfall 4).
    const ext = (storageKey.split(".").pop() ?? "").toLowerCase();
    if (ext === "heic" || ext === "heif") {
      return jsonResponse({ ok: false, error: "Please share this photo as JPEG." }, 200);
    }
    const isImage = IMAGE_EXTS.has(ext);
    const isPdf   = PDF_EXTS.has(ext);
    if (!isImage && !isPdf) {
      return jsonResponse({ ok: false, error: "Pick a photo (.jpg, .png, .webp, .gif) or .pdf file." }, 200);
    }
    const mimeType = MIME_BY_EXT[ext];

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: note, error: noteErr } = await supabase
      .from("notes")
      .select("id, owner_id")
      .eq("id", noteId)
      .single();
    if (noteErr || !note) {
      return jsonResponse({ ok: false, error: "Note not found" }, 200);
    }
    const ownerId = note.owner_id as string;

    // Token budget gate.
    await resetBudgetIfNewDay(ownerId, supabase);
    const budget = await checkTokenBudget(ownerId, supabase);
    if (!budget.allowed) {
      return jsonResponse({ ok: false, error: "Daily token budget reached. Try again tomorrow." }, 200);
    }

    // Download the doc bytes.
    const { data: blob, error: dlError } = await supabase.storage
      .from(bucket)
      .download(storageKey);
    if (dlError || !blob) {
      return jsonResponse({ ok: false, error: "File not found in storage" }, 200);
    }

    // Chunked base64 (Pitfall 2).
    const arrayBuf    = await blob.arrayBuffer();
    const base64Data  = uint8ArrayToBase64(new Uint8Array(arrayBuf));

    // Build GPT-4o content block — image_url for photos, file for PDFs.
    const fileBlock = isPdf
      ? {
          type: "file" as const,
          file: { file_data: `data:${mimeType};base64,${base64Data}`, filename: "document.pdf" },
        }
      : {
          type: "image_url" as const,
          image_url: { url: `data:${mimeType};base64,${base64Data}`, detail: "high" as const },
        };

    const systemPrompt = isPdf ? PDF_EXTRACT_PROMPT : IMAGE_EXTRACT_PROMPT;
    const userText     = isPdf
      ? "Extract all text from this document."
      : "Extract all visible text from this photo of student class notes.";
    const maxTokens    = isPdf ? 4000 : 2000;

    const guardedExtraction = await runSafeBudgetedAiCall({
      ownerId,
      supabase,
      input: userText,
      systemPrompt,
      maxOutputTokens: maxTokens,
      mediaCount: 1,
      media: isPdf ? [] : [{ mediaType: mimeType, data: base64Data }],
      invoke: async ({ markProviderUsage }) => {
        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o",
            max_tokens: maxTokens,
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: [fileBlock, { type: "text", text: userText }],
              },
            ],
          }),
        });
        if (!openaiRes.ok) {
          console.error("openai extract-note-doc request did not complete", openaiRes.status);
          throw new Error("The document reader could not process this file");
        }
        markProviderUsage();
        let openaiData: {
          choices?: Array<{ message?: { content?: string } }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };
        try {
          openaiData = await openaiRes.json() as typeof openaiData;
        } catch {
          throw new Error("extract_note_provider_invalid_json");
        }
        return {
          content: (openaiData.choices?.[0]?.message?.content ?? "").trim(),
          tokens: Number(openaiData.usage?.prompt_tokens ?? 0) + Number(openaiData.usage?.completion_tokens ?? 0),
        };
      },
    });
    if (!guardedExtraction.ok) return aiGuardFailureResponse(guardedExtraction);
    const extracted = guardedExtraction.value.content;
    const totalTokens = guardedExtraction.value.tokens;

    // Pitfall 5: very short text -> save storageKey + tiny body, skip cleanup.
    if (extracted.length < MIN_EXTRACT_CHARS) {
      await supabase
        .from("notes")
        .update({
          body_text:       extracted,
          doc_storage_key: storageKey,
          updated_at:      new Date().toISOString(),
        })
        .eq("id", noteId)
        .eq("owner_id", ownerId);

      void logInteraction(
        {
          ownerId,
          feature: "doc_extract",
          model:   "gpt-4o",
          promptSummary: isPdf ? "doc_extract:pdf:short" : "doc_extract:image:short",
          tokensUsed: totalTokens,
        },
        supabase,
      ).catch(() => console.warn("logInteraction (short) did not complete"));

      return jsonResponse({ ok: true, text: "", tooShort: true });
    }

    // Happy path: write body_text + doc_storage_key.
    const { error: updErr } = await supabase
      .from("notes")
      .update({
        body_text:       extracted,
        doc_storage_key: storageKey,
        updated_at:      new Date().toISOString(),
      })
      .eq("id", noteId)
      .eq("owner_id", ownerId);
    if (updErr) {
      console.error("notes update did not complete");
      return jsonResponse({ ok: false, error: "We couldn't save the extracted note yet." }, 200);
    }

    // Preserve the authenticated student JWT across the follow-up call. A
    // service-role invocation is intentionally not accepted by student guards.
    const authorization = req.headers.get("Authorization") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
    void fetch(`${SUPABASE_URL}/functions/v1/transcribe-note`, {
      method: "POST",
      headers: {
        Authorization: authorization,
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ noteId }),
    }).catch(() => console.warn("transcribe-note kickoff did not complete"));

    void logInteraction(
      {
        ownerId,
        feature: "doc_extract",
        model:   "gpt-4o",
        promptSummary: isPdf ? "doc_extract:pdf" : "doc_extract:image",
        tokensUsed: totalTokens,
      },
      supabase,
    ).catch(() => console.warn("logInteraction did not complete"));

    return jsonResponse({ ok: true, text: extracted });
  } catch {
    console.error("extract-note-doc request did not complete");
    return jsonResponse({ ok: false, error: "Something went wrong. Try again." }, 200);
  }
}));
