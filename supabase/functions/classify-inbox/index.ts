import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

type ClassRow = { id: string; name: string };

type ClassifyResult = {
  suggestedClassId: string | null;
  suggestedKind: string | null;
  suggestedDueAt: string | null;
  confidence: number;
  reasoning: string;
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

  try {
    const { inboxItemId } = await req.json() as { inboxItemId: string };
    if (!inboxItemId) {
      return new Response(JSON.stringify({ error: "inboxItemId required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Fetch the inbox item
    const { data: item, error: itemError } = await supabase
      .from("inbox_items")
      .select("id, owner_id, raw, capture_mode, photo_storage_key, status")
      .eq("id", inboxItemId)
      .single();

    if (itemError || !item) {
      return new Response(JSON.stringify({ error: "Item not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Fetch user's classes for classification context
    const { data: classes } = await supabase
      .from("classes")
      .select("id, name")
      .eq("owner_id", item.owner_id)
      .order("name", { ascending: true });

    const classListText = (classes as ClassRow[] | null ?? [])
      .map((c) => `- ${c.name} (id: ${c.id})`)
      .join("\n");

    // 3. Build the Claude Haiku 4.5 request
    type MessageContent = { type: string; text?: string; source?: { type: string; media_type: string; data: string } };
    const messageContent: MessageContent[] = [];

    // If photo, download and encode as base64
    if (item.photo_storage_key) {
      const { data: blob, error: dlError } = await supabase.storage
        .from("inbox-photos")
        .download(item.photo_storage_key);

      if (!dlError && blob) {
        const arrayBuffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const base64 = btoa(String.fromCharCode(...bytes));
        const mediaType = blob.type || "image/jpeg";

        messageContent.push({
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType,
            data: base64,
          },
        });
      }
    }

    const systemPrompt = `You are helping a high school student with ADHD organize their homework.
Your job is to classify a captured note or photo into a class and assignment type.

Available classes:
${classListText || "No classes yet"}

Assignment types: essay, lab, problem_set, presentation, test_prep, reading, other

Rules:
- Extract the class name and assignment type from the capture
- Extract a due date if mentioned (ISO 8601 format, or null if not mentioned)
- Set confidence between 0 and 1 based on how certain you are
- If confidence < 0.7, set suggestedClassId to null
- Only use class IDs from the list above — never invent IDs
- Return ONLY valid JSON, no markdown, no explanation

Return format:
{"suggestedClassId":"<uuid or null>","suggestedKind":"<kind>","suggestedDueAt":"<ISO8601 or null>","confidence":0.0,"reasoning":"<brief>"}`;

    messageContent.push({
      type: "text",
      text: `Classify this student capture:\n\n"${item.raw}"`,
    });

    // 4. Call Claude Haiku 4.5
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 256,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: messageContent,
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic error:", errText);
      return new Response(JSON.stringify({ error: "AI classification failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const anthropicData = await anthropicRes.json() as {
      content: Array<{ type: string; text: string }>;
    };
    const rawText = anthropicData.content?.[0]?.text ?? "{}";

    // 5. Parse response JSON
    let result: ClassifyResult;
    try {
      result = JSON.parse(rawText) as ClassifyResult;
    } catch {
      console.error("Failed to parse AI response:", rawText);
      result = {
        suggestedClassId: null,
        suggestedKind: null,
        suggestedDueAt: null,
        confidence: 0,
        reasoning: "Parse error",
      };
    }

    // 6. Update inbox_items row with classification results
    const { error: updateError } = await supabase
      .from("inbox_items")
      .update({
        suggested_class_id: result.suggestedClassId ?? null,
        suggested_kind: result.suggestedKind ?? null,
        suggested_due_at: result.suggestedDueAt ?? null,
        suggestion_confidence: result.confidence ?? 0,
        status: "classified",
        updated_at: new Date().toISOString(),
      })
      .eq("id", inboxItemId);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        suggestedClassId: result.suggestedClassId,
        suggestedKind: result.suggestedKind,
        suggestedDueAt: result.suggestedDueAt,
        confidence: result.confidence,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err) {
    console.error("classify-inbox error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
