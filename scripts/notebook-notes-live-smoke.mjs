import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

const env = loadEnv(".env.local");
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceRoleKey || !publishableKey) {
  throw new Error("Supabase URL, publishable key, and service role key are required.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const qaEmail = "diana-notebook-notes-smoke@local.test";
const qaPassword = `Diana-Notebook-Smoke-${new Date().getUTCFullYear()}!`;
const ownerId = await ensureQaUser();
await ensureQaProfile(ownerId);

const classId = await upsertFreshmanClass(ownerId);
const noteId = await createStudentNote(ownerId, classId);

const started = performance.now();
const synthesisRes = await invoke("note-synthesis", {
  ownerId,
  classId,
  query: "Make me a study notebook from my notes. What should I remember for the cell transport quiz?",
});
const synthesisLatencyMs = Math.round(performance.now() - started);
const synthesis = await synthesisRes.json();

const synthesisOk =
  synthesisRes.ok &&
  typeof synthesis.summary === "string" &&
  synthesis.summary.length >= 120 &&
  typeof synthesis.audioOverviewScript === "string" &&
  synthesis.audioOverviewScript.length >= 160 &&
  Array.isArray(synthesis.citations) &&
  synthesis.citations.some((citation) => citation.noteId === noteId);

const toneOk = !/\b(wrong|incorrect|failed|you missed|behind)\b/i.test(
  `${synthesis.summary ?? ""} ${synthesis.audioOverviewScript ?? ""}`,
);

const ttsStarted = performance.now();
const ttsRes = await fetch(`${supabaseUrl}/functions/v1/tts-generate`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${publishableKey}`,
    "apikey": publishableKey,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    text: String(synthesis.audioOverviewScript ?? "").slice(0, 1800),
    provider: "elevenlabs",
    voice: "EXAVITQu4vr4xnSDxMaL",
    speed: 0.95,
  }),
});
const ttsLatencyMs = Math.round(performance.now() - ttsStarted);
const audioBytes = ttsRes.ok ? (await ttsRes.arrayBuffer()).byteLength : 0;

const result = {
  ownerId,
  classId,
  noteId,
  noteTitle: "Biology 9 - Cell Transport Student Notes",
  synthesis: {
    ok: synthesisOk && toneOk,
    status: synthesisRes.status,
    latencyMs: synthesisLatencyMs,
    summaryPreview: preview(synthesis.summary),
    audioOverviewPreview: preview(synthesis.audioOverviewScript),
    citationCount: Array.isArray(synthesis.citations) ? synthesis.citations.length : 0,
    citedSeedNote: Array.isArray(synthesis.citations)
      ? synthesis.citations.some((citation) => citation.noteId === noteId)
      : false,
    toneOk,
  },
  audio: {
    ok: ttsRes.ok && audioBytes > 8_000,
    status: ttsRes.status,
    latencyMs: ttsLatencyMs,
    contentType: ttsRes.headers.get("content-type"),
    bytes: audioBytes,
  },
};

console.log(JSON.stringify(result, null, 2));

if (!result.synthesis.ok || !result.audio.ok) process.exitCode = 1;

async function invoke(functionName, body) {
  return fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${serviceRoleKey}`,
      "apikey": serviceRoleKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function ensureQaUser() {
  const existing = await findUserByEmail(qaEmail);
  if (existing) return existing.id;

  const { data, error } = await supabase.auth.admin.createUser({
    email: qaEmail,
    password: qaPassword,
    email_confirm: true,
    user_metadata: {
      display_name: "Diana Notebook Notes Smoke",
      date_of_birth: "2010-09-01",
      timezone: "America/Los_Angeles",
    },
  });
  if (error || !data.user) throw new Error(error?.message ?? "Could not create QA user.");
  return data.user.id;
}

async function findUserByEmail(email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < 1000) return null;
  }
  return null;
}

async function ensureQaProfile(userId) {
  const { error } = await supabase.from("profiles").upsert({
    user_id: userId,
    display_name: "Diana Notebook Notes Smoke",
    date_of_birth: "2010-09-01",
    age_bracket: "13_to_17",
    timezone: "America/Los_Angeles",
    onboarded_at: new Date().toISOString(),
    consent_ai: true,
    daily_token_budget: 200_000,
    tokens_used_today: 0,
    token_reset_date: new Date().toISOString().slice(0, 10),
    interests: ["basketball", "music", "digital_art", "technology"],
    session_mood: "meh",
  }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

async function upsertFreshmanClass(ownerId) {
  const existing = await supabase
    .from("classes")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("name", "Biology 9")
    .is("archived_at", null)
    .limit(1)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data?.id) {
    const { error } = await supabase
      .from("classes")
      .update({
        ai_mode: "green",
        teacher: "QA Teacher",
        notes: "Freshman biology class for live notebook notes testing.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.data.id)
      .eq("owner_id", ownerId);
    if (error) throw new Error(error.message);
    return existing.data.id;
  }

  const { data, error } = await supabase
    .from("classes")
    .insert({
      owner_id: ownerId,
      name: "Biology 9",
      ai_mode: "green",
      teacher: "QA Teacher",
      color: "emerald",
      notes: "Freshman biology class for live notebook notes testing.",
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not create class.");
  return data.id;
}

async function createStudentNote(ownerId, classId) {
  const title = "Biology 9 - Cell Transport Student Notes";
  const bodyText = [
    "Cell membrane notes from class:",
    "The cell membrane is selectively permeable, which means it lets some particles move through while others need protein channels.",
    "Diffusion moves particles from high concentration to low concentration. It does not use cell energy.",
    "Osmosis is the diffusion of water across a membrane.",
    "Active transport moves particles against the concentration gradient, so the cell uses ATP.",
    "For the quiz, compare passive transport with active transport and explain one example from a plant or animal cell.",
    "Teacher said to remember: direction of movement, whether ATP is used, and which membrane proteins are involved.",
  ].join("\n");

  const { data, error } = await supabase
    .from("notes")
    .insert({
      owner_id: ownerId,
      class_id: classId,
      title,
      body_text: bodyText,
      transcript_text: bodyText,
      outline_json: [
        {
          heading: "Cell transport",
          bullets: [
            "Selective permeability",
            "Diffusion and osmosis are passive",
            "Active transport uses ATP",
            "Quiz compare and contrast",
          ],
        },
      ],
      tags: ["biology", "cell transport", "quiz"],
      ai_suggested_tags: ["diffusion", "osmosis", "active transport"],
      source: "manual",
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not create note.");
  return data.id;
}

function loadEnv(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1).replace(/^["']|["']$/g, "")];
      }),
  );
}

function preview(value) {
  return String(value ?? "").replace(/\s+/g, " ").slice(0, 240);
}
