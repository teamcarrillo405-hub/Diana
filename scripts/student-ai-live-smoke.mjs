import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

const env = loadEnv(".env.local");
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const qaEmail = "diana-ai-helper-smoke@local.test";
const qaPassword = `Diana-AI-Smoke-${new Date().getUTCFullYear()}!`;
const cleanup = { noteId: null, inboxIds: [], outsiderUserId: null };

try {
  const qaUser = await ensureUser(qaEmail, qaPassword, "Diana AI Helper Smoke");
  await ensureProfile(qaUser.id, "Diana AI Helper Smoke");
  const accessToken = await signIn(qaEmail, qaPassword);

  const { data: note, error: noteError } = await admin
    .from("notes")
    .insert({
      owner_id: qaUser.id,
      title: "Photosynthesis review",
      body_text: "Plants use light energy, carbon dioxide, and water to make glucose and release oxygen.",
    })
    .select("id")
    .single();
  if (noteError || !note) throw new Error(noteError?.message ?? "Could not create QA note.");
  cleanup.noteId = note.id;

  const { data: inboxItem, error: inboxError } = await admin
    .from("inbox_items")
    .insert({
      owner_id: qaUser.id,
      raw: "Biology worksheet on photosynthesis due Friday",
      capture_mode: "text",
    })
    .select("id")
    .single();
  if (inboxError || !inboxItem) throw new Error(inboxError?.message ?? "Could not create QA inbox item.");
  cleanup.inboxIds.push(inboxItem.id);

  const outsiderEmail = `diana-ai-outsider-${crypto.randomUUID()}@local.test`;
  const outsider = await ensureUser(outsiderEmail, qaPassword, "Diana AI Outsider");
  cleanup.outsiderUserId = outsider.id;
  const { data: outsiderItem, error: outsiderItemError } = await admin
    .from("inbox_items")
    .insert({ owner_id: outsider.id, raw: "Private algebra capture", capture_mode: "text" })
    .select("id")
    .single();
  if (outsiderItemError || !outsiderItem) {
    throw new Error(outsiderItemError?.message ?? "Could not create outsider inbox item.");
  }
  cleanup.inboxIds.push(outsiderItem.id);

  const cases = [
    {
      label: "citation generator",
      fn: "citation-gen",
      body: {
        ownerId: qaUser.id,
        aiMode: "green",
        sourceType: "paste",
        sourceText: "National Aeronautics and Space Administration. Climate Change: How Do We Know? NASA, 2026.",
        formats: ["mla"],
      },
      validate: (body) => body.citations && typeof body.citations === "object",
    },
    {
      label: "analogous math example",
      fn: "math-example",
      body: { ownerId: qaUser.id, problem: "Solve 3x + 5 = 20", subject: "algebra", aiMode: "green" },
      validate: hasText("content"),
    },
    {
      label: "math tutor step",
      fn: "math-step",
      body: { ownerId: qaUser.id, history: [], prompt: "What should I do first for 4x - 7 = 13?", aiMode: "green" },
      validate: hasText("content"),
    },
    {
      label: "note tags",
      fn: "note-tags",
      body: { ownerId: qaUser.id, noteId: note.id },
      validate: (body) => Array.isArray(body.tags),
    },
    {
      label: "reading level",
      fn: "reading-level",
      body: {
        ownerId: qaUser.id,
        aiMode: "green",
        target: "simpler",
        text: "Photosynthesis is the process by which plants convert light energy into chemical energy stored in glucose.",
      },
      validate: hasText("text"),
    },
    {
      label: "study artifact",
      fn: "study-artifacts",
      body: {
        ownerId: qaUser.id,
        aiMode: "green",
        artifactType: "study_guide",
        studyMode: "guided_steps",
        sourceType: "note",
        sourceTitle: "Photosynthesis review",
        sourceText: "Plants use light energy, carbon dioxide, and water to make glucose and release oxygen during photosynthesis.",
        classContext: "Biology review",
      },
      validate: hasText("content"),
    },
    {
      label: "task breakdown",
      fn: "task-breakdown",
      body: {
        ownerId: qaUser.id,
        title: "Biology lab report",
        description: "Write the hypothesis, summarize the data, and explain the conclusion.",
        kind: "lab",
        estimatedMinutes: 45,
        aiMode: "green",
      },
      validate: hasText("content"),
    },
    {
      label: "visual tool",
      fn: "visual-tools",
      body: {
        ownerId: qaUser.id,
        noteId: note.id,
        aiMode: "green",
        mode: "mind_map",
        noteTitle: "Photosynthesis review",
        text: "Light energy enters the chloroplast. Water and carbon dioxide are inputs. Glucose and oxygen are outputs.",
      },
      validate: hasText("content"),
    },
    {
      label: "vocabulary support",
      fn: "vocab-hover",
      body: { ownerId: qaUser.id, word: "photosynthesis", context: "Plants use photosynthesis to store energy.", aiMode: "green" },
      validate: (body) => typeof body.definition === "string" || typeof body.studentFriendly === "string",
    },
    {
      label: "weekly reflection",
      fn: "weekly-reflection",
      body: { ownerId: qaUser.id, reflection: "Breaking my biology notes into small questions helped me start sooner.", mood: "good" },
      validate: hasText("reflection"),
    },
    {
      label: "writing co-author",
      fn: "writing-cowrite",
      body: {
        ownerId: qaUser.id,
        aiMode: "green",
        mode: "cowrite",
        draft: "The character begins to understand that family stories shape how he sees his identity.",
        prompt: "Explain how family stories affect the character's identity.",
      },
      validate: hasText("content"),
    },
    {
      label: "owned inbox classification",
      fn: "classify-inbox",
      body: { inboxItemId: inboxItem.id },
      validate: (body) => body.ok === true && typeof body.confidence === "number",
    },
  ];

  const results = await Promise.all(cases.map((testCase) => runCase(testCase, accessToken)));
  const ownershipResult = await invoke("classify-inbox", { inboxItemId: outsiderItem.id }, accessToken);
  const ownershipBody = await readJson(ownershipResult);
  results.push({
    label: "inbox ownership boundary",
    status: ownershipResult.status,
    ok: ownershipResult.status === 404 && ownershipBody.error === "Item not found",
    latencyMs: null,
    note: ownershipResult.status === 404 ? "cross-student item hidden" : "ownership boundary not enforced",
  });

  for (const result of results) {
    console.log(`${result.ok ? "PASS" : "FAIL"} | ${result.label} | ${result.status} | ${result.latencyMs ?? "n/a"}ms | ${result.note}`);
  }
  const failed = results.filter((result) => !result.ok);
  console.log(JSON.stringify({ total: results.length, passed: results.length - failed.length, failed: failed.length }, null, 2));
  if (failed.length > 0) process.exitCode = 1;
} finally {
  if (cleanup.inboxIds.length > 0) await admin.from("inbox_items").delete().in("id", cleanup.inboxIds);
  if (cleanup.noteId) await admin.from("notes").delete().eq("id", cleanup.noteId);
  if (cleanup.outsiderUserId) await admin.auth.admin.deleteUser(cleanup.outsiderUserId);
}

async function runCase(testCase, accessToken) {
  const started = performance.now();
  const response = await invoke(testCase.fn, testCase.body, accessToken);
  const latencyMs = Math.round(performance.now() - started);
  const body = await readJson(response);
  const toneIssue = /\b(wrong|incorrect|failed|you missed|behind)\b/i.test(JSON.stringify(body));
  const valid = response.ok && testCase.validate(body) && !toneIssue;
  return {
    label: testCase.label,
    status: response.status,
    ok: valid,
    latencyMs,
    note: toneIssue ? "tone rule violation" : response.ok ? (valid ? "response valid" : "unexpected response shape") : String(body.error ?? "request rejected"),
  };
}

async function invoke(functionName, body, accessToken) {
  return fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: serviceRoleKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function hasText(field) {
  return (body) => typeof body[field] === "string" && body[field].trim().length >= 10;
}

async function ensureUser(email, password, displayName) {
  const existing = await findUser(email);
  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, { password });
    if (error || !data.user) throw new Error(error?.message ?? "Could not refresh QA user.");
    return data.user;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName, date_of_birth: "2010-09-01", timezone: "America/Los_Angeles" },
  });
  if (error || !data.user) throw new Error(error?.message ?? "Could not create QA user.");
  return data.user;
}

async function findUser(email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < 1000) return null;
  }
  return null;
}

async function ensureProfile(userId, displayName) {
  const { error } = await admin.from("profiles").upsert({
    user_id: userId,
    display_name: displayName,
    date_of_birth: "2010-09-01",
    age_bracket: "13_to_17",
    timezone: "America/Los_Angeles",
    onboarded_at: new Date().toISOString(),
    consent_ai: true,
    daily_token_budget: 200_000,
    tokens_used_today: 0,
    token_reset_date: new Date().toISOString().slice(0, 10),
    interests: ["basketball", "music", "digital_art", "technology"],
    session_mood: "good",
  }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

async function signIn(email, password) {
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(error?.message ?? "Could not sign in QA user.");
  return data.session.access_token;
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
