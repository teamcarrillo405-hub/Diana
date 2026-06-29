import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

const env = loadEnv(".env.local");
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const qaEmail = "diana-ai-helper-smoke@local.test";
const qaPassword = `Diana-AI-Smoke-${new Date().getUTCFullYear()}!`;
const ownerId = await ensureQaUser();
await ensureQaProfile(ownerId);

const cases = [
  {
    label: "English 9 writing rule",
    fn: "writing-aid",
    body: { prompt: "My paragraph have a quote but it dont explain why identity matters.", aiMode: "green" },
    validate: textValidator(["Want to try rewriting yours?"]),
  },
  {
    label: "English 9 reading pre",
    fn: "reading-scaffold",
    body: {
      type: "pre",
      text: "The narrator describes identity as something shaped by family stories, school expectations, and the pressure to fit in.",
      aiMode: "green",
    },
    validate: textValidator([]),
  },
  {
    label: "English 9 reading post",
    fn: "reading-scaffold",
    body: {
      type: "post",
      text: "In the chapter, the character changes how he sees his name after hearing stories from his grandmother and comparing them to school.",
      aiMode: "green",
    },
    validate: textValidator(["?"]),
  },
  {
    label: "Algebra I linear equation",
    fn: "math-scaffold",
    body: { subject: "algebra", problemText: "Solve 3(x - 2) + 4 = 19. Show each inverse operation.", aiMode: "green" },
    validate: jsonStringValidator(["steps", "commonError"]),
  },
  {
    label: "Algebra I graphing",
    fn: "math-scaffold",
    body: { subject: "algebra", problemText: "Graph y = -2x + 5 and identify the slope and y-intercept.", aiMode: "green" },
    validate: jsonStringValidator(["graphSketch", "steps"]),
  },
  {
    label: "Geometry proof",
    fn: "math-scaffold",
    body: { subject: "geometry", problemText: "Given parallel lines cut by a transversal, prove the alternate interior angles are congruent.", aiMode: "green" },
    validate: jsonStringValidator(["steps"]),
  },
  {
    label: "Biology hypothesis",
    fn: "science-scaffold",
    body: { mode: "hypothesis", prompt: "How does light level affect plant growth over two weeks?", classContext: "Biology 9 lab design", aiMode: "green" },
    validate: jsonStringValidator(["cards", "checkPrompt"]),
  },
  {
    label: "Biology diagram",
    fn: "science-scaffold",
    body: { mode: "diagram", prompt: "Cell organelle diagram: nucleus, mitochondria, ribosome, cell membrane, chloroplast.", classContext: "Label and explain function", aiMode: "green" },
    validate: jsonStringValidator(["cards", "title"]),
  },
  {
    label: "Chemistry balancing",
    fn: "science-scaffold",
    body: { mode: "chemistry_balance", prompt: "Balance Fe + O2 -> Fe2O3 without giving the final coefficients.", classContext: "Intro chemistry", aiMode: "green" },
    validate: jsonStringValidator(["cards", "checkPrompt"]),
  },
  {
    label: "World History source",
    fn: "history-scaffold",
    body: { mode: "primary_source", sourceText: "A river civilization source says canals helped farms grow surplus grain near the city.", classContext: "Mesopotamia source notes", aiMode: "green" },
    validate: jsonStringValidator(["cards", "checkPrompt"]),
  },
  {
    label: "World History cause effect",
    fn: "history-scaffold",
    body: { mode: "cause_effect", sourceText: "Explain how river flooding affected farming, jobs, trade, and city growth.", classContext: "Early civilizations", aiMode: "green" },
    validate: jsonStringValidator(["causeEffect", "cards"]),
  },
  {
    label: "Civics current event",
    fn: "history-scaffold",
    body: { mode: "current_events", sourceText: "Compare a historical public-health policy debate with a current school policy debate.", classContext: "Civics discussion prep", aiMode: "green" },
    validate: jsonStringValidator(["currentConnections", "checkPrompt"]),
  },
  {
    label: "Spanish vocabulary",
    fn: "language-scaffold",
    body: { mode: "vocabulary", targetLanguage: "Spanish", sourceText: "clase, libro, tarea, escuchar, hablar", classContext: "Spanish I classroom words", aiMode: "green" },
    validate: jsonStringValidator(["vocabularyCards", "checkPrompt"]),
  },
  {
    label: "Spanish speaking",
    fn: "language-scaffold",
    body: { mode: "speaking", targetLanguage: "Spanish", spokenText: "Me llamo Grayson. Estoy bien. Soy estudiante.", classContext: "Introduce yourself", aiMode: "green" },
    validate: jsonStringValidator(["speakingPrompts", "targetLanguage"]),
  },
  {
    label: "Computer Science debug",
    fn: "cs-scaffold",
    body: { mode: "error_hint", language: "python", code: "for i in range(5)\n    print(i)", runtimeError: "SyntaxError: expected ':'", prompt: "Find the smallest fix without giving full code.", aiMode: "green" },
    validate: jsonStringValidator(["cards", "checkPrompt"]),
  },
  {
    label: "Computer Science project",
    fn: "cs-scaffold",
    body: { mode: "project_scaffold", language: "javascript", prompt: "Build a simple quiz app with questions, scoring, and a restart button.", classContext: "Freshman coding project", aiMode: "green" },
    validate: jsonStringValidator(["milestones", "cards"]),
  },
  {
    label: "Health SMART goal",
    fn: "health-scaffold",
    body: { mode: "sleep_recovery", prompt: "Create a sleep routine plan for a student who has homework and basketball practice.", classContext: "Health class SMART goal", aiMode: "green" },
    validate: jsonStringValidator(["cards", "checklist"], "raw"),
  },
  {
    label: "Arts reflection",
    fn: "arts-scaffold",
    body: { mode: "art_reflection", prompt: "Write an artist statement plan for a digital citizenship poster using blue and yellow contrast.", classContext: "Digital art class", aiMode: "green" },
    validate: jsonStringValidator(["cards", "checklist"], "raw"),
  },
  {
    label: "AP US History FRQ",
    fn: "ap-scaffold",
    body: { subject: "us_history", mode: "frq_outline", prompt: "Evaluate the extent to which industrialization changed labor between 1865 and 1900.", classContext: "APUSH LEQ practice", aiMode: "green" },
    validate: jsonStringValidator(["outline", "checklist"], "raw"),
  },
  {
    label: "AP Biology MCQ",
    fn: "ap-scaffold",
    body: { subject: "biology", mode: "mcq_practice", prompt: "Cell membrane transport and osmosis practice.", classContext: "AP Bio Unit 2", aiMode: "green" },
    validate: jsonStringValidator(["questions", "checklist"], "raw"),
  },
];

const results = [];
for (const testCase of cases) {
  const started = performance.now();
  const response = await invoke(testCase.fn, {
    ownerId,
    assignmentId: randomUUID(),
    ...testCase.body,
  });
  const latencyMs = Math.round(performance.now() - started);
  const result = await inspectResponse(testCase, response, latencyMs);
  results.push(result);
  console.log(`${result.ok ? "PASS" : "FAIL"} | ${result.label} | ${result.status} | ${result.latencyMs}ms | ${result.note}`);
}

const passCount = results.filter((result) => result.ok).length;
const latencies = results.map((result) => result.latencyMs).sort((a, b) => a - b);
const p50 = percentile(latencies, 0.5);
const p95 = latencies[Math.min(latencies.length - 1, Math.ceil(latencies.length * 0.95) - 1)];
const maxLatencyMs = latencies.at(-1) ?? 0;
const goldStandard = {
  successRate: passCount / results.length,
  p50LatencyMs: p50,
  p95LatencyMs: p95,
  maxLatencyMs,
  pass:
    passCount === results.length &&
    p50 <= 4_000 &&
    p95 <= 8_000 &&
    maxLatencyMs <= 12_000,
};
console.log(JSON.stringify({
  ownerId,
  total: results.length,
  passCount,
  failCount: results.length - passCount,
  p50LatencyMs: p50,
  p95LatencyMs: p95,
  maxLatencyMs,
  goldStandard,
  results,
}, null, 2));

if (!goldStandard.pass) process.exitCode = 1;

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

async function inspectResponse(testCase, response, latencyMs) {
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = {};
  }

  const content = typeof body.content === "string" ? body.content : typeof body.raw === "string" ? body.raw : "";
  const banned = /\b(wrong|incorrect|failed|you missed|behind)\b/i.test(content);
  const validation = response.ok ? testCase.validate(body) : { ok: false, note: body.error ?? "non-200 response" };

  return {
    label: testCase.label,
    functionName: testCase.fn,
    status: response.status,
    latencyMs,
    ok: response.ok && validation.ok && !banned,
    note: banned ? "tone violation in response" : validation.note,
  };
}

function textValidator(requiredSnippets) {
  return (body) => {
    const content = typeof body.content === "string" ? body.content : "";
    if (content.length < 20) return { ok: false, note: "short content" };
    const missing = requiredSnippets.filter((snippet) => !content.toLowerCase().includes(snippet.toLowerCase()));
    return missing.length === 0 ? { ok: true, note: "text ok" } : { ok: false, note: `missing ${missing.join(", ")}` };
  };
}

function jsonStringValidator(requiredKeys, field = "content") {
  return (body) => {
    const raw = typeof body[field] === "string" ? body[field] : "";
    if (raw.length < 5) return { ok: false, note: "empty JSON string" };
    try {
      const parsed = JSON.parse(raw);
      const missing = requiredKeys.filter((key) => !(key in parsed));
      return missing.length === 0 ? { ok: true, note: "json ok" } : { ok: false, note: `missing ${missing.join(", ")}` };
    } catch {
      return { ok: false, note: "invalid JSON" };
    }
  };
}

async function ensureQaUser() {
  const existing = await findUserByEmail(qaEmail);
  if (existing) return existing.id;

  const { data, error } = await supabase.auth.admin.createUser({
    email: qaEmail,
    password: qaPassword,
    email_confirm: true,
    user_metadata: {
      display_name: "Diana AI Helper Smoke",
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
    display_name: "Diana AI Helper Smoke",
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

function percentile(sortedNumbers, fraction) {
  if (sortedNumbers.length === 0) return 0;
  return sortedNumbers[Math.min(sortedNumbers.length - 1, Math.ceil(sortedNumbers.length * fraction) - 1)];
}
