import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  checkTokenBudget,
  incrementTokens,
  logInteraction,
  resetBudgetIfNewDay,
} from "../_shared/safety.ts";
import { callStudentTextModel, type StudentModelPart } from "../_shared/student-model.ts";
import { composeSystemPrompt } from "../_shared/system-prompts.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const ALLOWED_KINDS = new Set([
  "essay",
  "lab",
  "problem_set",
  "presentation",
  "test_prep",
  "reading",
  "other",
]);

const CLASSIFY_PROMPT = `You help a high-school student organize a captured assignment note or photo.
Return exactly one JSON object:
{
  "suggestedClassId": string | null,
  "suggestedKind": "essay" | "lab" | "problem_set" | "presentation" | "test_prep" | "reading" | "other" | null,
  "suggestedDueAt": string | null,
  "confidence": number,
  "reasoning": string
}

Rules:
- Only use a class ID from the provided class list.
- Use an ISO 8601 due date only when the capture states one.
- Set confidence from 0 to 1.
- Use null for the class when confidence is below 0.7.
- Never invent a class, due date, or assignment detail.
- Keep reasoning to one short, neutral sentence.`;

type ClassRow = { id: string; name: string };

type ClassifyResult = {
  suggestedClassId: string | null;
  suggestedKind: string | null;
  suggestedDueAt: string | null;
  confidence: number;
  reasoning: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authorization = req.headers.get("Authorization") ?? "";
    if (!authorization) return json({ error: "Sign in required" }, 401);

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData.user) return json({ error: "Sign in required" }, 401);

    const body = await req.json() as { inboxItemId?: unknown };
    const inboxItemId = typeof body.inboxItemId === "string" ? body.inboxItemId : "";
    if (!inboxItemId) return json({ error: "inboxItemId required" }, 400);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: item, error: itemError } = await supabase
      .from("inbox_items")
      .select("id, owner_id, raw, capture_mode, photo_storage_key, status")
      .eq("id", inboxItemId)
      .single();

    if (itemError || !item || item.owner_id !== authData.user.id) {
      return json({ error: "Item not found" }, 404);
    }

    await resetBudgetIfNewDay(item.owner_id, supabase);
    const { allowed } = await checkTokenBudget(item.owner_id, supabase);
    if (!allowed) return json({ error: "AI quota resets at midnight." }, 429);

    const { data: classes } = await supabase
      .from("classes")
      .select("id, name")
      .eq("owner_id", item.owner_id)
      .order("name", { ascending: true });

    const classRows = (classes as ClassRow[] | null) ?? [];
    const classListText = classRows.map((klass) => `- ${klass.name} (id: ${klass.id})`).join("\n");
    const parts: StudentModelPart[] = [];

    if (item.photo_storage_key) {
      const { data: blob, error: downloadError } = await supabase.storage
        .from("inbox-photos")
        .download(item.photo_storage_key);
      if (!downloadError && blob) {
        parts.push({
          type: "image",
          mediaType: blob.type || "image/jpeg",
          data: bytesToBase64(new Uint8Array(await blob.arrayBuffer())),
        });
      }
    }

    const userText = [
      `Available classes:\n${classListText || "No classes yet"}`,
      `Capture mode: ${item.capture_mode || "text"}`,
      `Capture text:\n${String(item.raw || "").slice(0, 5000)}`,
    ].join("\n\n");
    parts.push({ type: "text", text: userText });

    const fallback = JSON.stringify({
      suggestedClassId: null,
      suggestedKind: null,
      suggestedDueAt: null,
      confidence: 0,
      reasoning: "Review the class and due date before saving.",
    });
    const system = composeSystemPrompt(CLASSIFY_PROMPT, {
      includeRefuseRedirect: false,
      includeFrustration: false,
      includeMinorSafety: true,
    });
    const modelResult = await callStudentTextModel({
      system,
      user: userText,
      parts,
      maxTokens: 300,
      json: true,
      fallbackContent: fallback,
    });
    const result = normalizeResult(modelResult.content, classRows);

    const { error: updateError } = await supabase
      .from("inbox_items")
      .update({
        suggested_class_id: result.suggestedClassId,
        suggested_kind: result.suggestedKind,
        suggested_due_at: result.suggestedDueAt,
        suggestion_confidence: result.confidence,
        status: "classified",
        updated_at: new Date().toISOString(),
      })
      .eq("id", inboxItemId)
      .eq("owner_id", authData.user.id);

    if (updateError) return json({ error: "Classification could not be saved" }, 500);

    Promise.resolve()
      .then(async () => {
        await logInteraction({
          ownerId: item.owner_id,
          assignmentId: null,
          feature: "classify_inbox",
          model: modelResult.model,
          promptSummary: String(item.raw || "").slice(0, 200),
          tokensUsed: modelResult.tokens,
        }, supabase);
        await incrementTokens(item.owner_id, modelResult.tokens, supabase);
      })
      .catch((error) => console.warn("classify-inbox side effects did not complete", error));

    return json({ ok: true, ...result });
  } catch (error) {
    console.error("classify-inbox error:", error);
    return json({ error: "Internal error" }, 500);
  }
});

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 8192) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  }
  return btoa(binary);
}

function normalizeResult(raw: string, classes: ClassRow[]): ClassifyResult {
  let parsed: Partial<ClassifyResult> = {};
  try {
    parsed = JSON.parse(raw) as Partial<ClassifyResult>;
  } catch {
    parsed = {};
  }

  const confidenceValue = Number(parsed.confidence);
  const confidence = Number.isFinite(confidenceValue)
    ? Math.max(0, Math.min(1, confidenceValue))
    : 0;
  const classIds = new Set(classes.map((klass) => klass.id));
  const suggestedClassId = confidence >= 0.7 && typeof parsed.suggestedClassId === "string" &&
      classIds.has(parsed.suggestedClassId)
    ? parsed.suggestedClassId
    : null;
  const suggestedKind = typeof parsed.suggestedKind === "string" && ALLOWED_KINDS.has(parsed.suggestedKind)
    ? parsed.suggestedKind
    : null;
  const suggestedDueAt = normalizeDueAt(parsed.suggestedDueAt);

  return {
    suggestedClassId,
    suggestedKind,
    suggestedDueAt,
    confidence,
    reasoning: typeof parsed.reasoning === "string" && parsed.reasoning.trim()
      ? parsed.reasoning.trim().slice(0, 240)
      : "Review the class and due date before saving.",
  };
}

function normalizeDueAt(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
