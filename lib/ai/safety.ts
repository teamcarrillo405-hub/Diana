import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export interface BudgetCheck {
  allowed: boolean;
  remaining: number;
}

export interface LogParams {
  ownerId: string;
  assignmentId?: string | null;
  feature:
    | "math_step"
    | "writing_aid"
    | "writing_cowrite"
    | "citation_gen"
    | "classify_inbox"
    | "reading_scaffold"
    | "reading_level"
    | "science_scaffold"
    | "history_scaffold"
    | "cs_scaffold"
    | "language_scaffold"
    | "transcribe_note"
    | "stt_transcribe"
    | "tts_generate"
    | "task_breakdown"
    | "math_example"
    | "math_scaffold"
    | "visual_tool"
    | "vocab_hover"
    | "doc_extract"
    | "note_synthesis"
    | "note_tags"
    | "weekly_reflection"
    | "arts_scaffold"
    | "health_scaffold"
    | "ap_scaffold"
    | "study_artifacts"
    | "study_buddy"
    | "break_down"
    | "voice_candidate"
    | "agent_coach"
    | "assignment_review";
  model: string;
  /** @deprecated Raw prompt content is intentionally ignored. */
  promptSummary?: string;
  correlationId?: string;
  inputBytes?: number;
  outputBytes?: number;
  tokensUsed: number;
}

export type StudentSafetyCategory =
  | "immediate_danger"
  | "abuse_or_exploitation"
  | "sexual_content"
  | "violent_wrongdoing"
  | "illegal_wrongdoing"
  | "sensitive_data";

export type SafetyScreenResult =
  | { safe: true }
  | { safe: false; category: StudentSafetyCategory; redirect: string };

export type StructuredModerationRequest = {
  text: string;
  phase: "input" | "output";
  contextText?: string;
};

export type StructuredModerator = (
  request: StructuredModerationRequest,
) => Promise<SafetyScreenResult>;

export type AiGuardFailure = {
  ok: false;
  kind: "budget" | "accounting" | "safety" | "screening";
  status: number;
  code: string;
  message: string;
  category?: StudentSafetyCategory;
};

export type AiGuardResult<T> =
  | { ok: true; value: T; reservationId: string }
  | AiGuardFailure;

type SupabaseLike = SupabaseClient<Database>;

const REDIRECTS: Record<StudentSafetyCategory, string> = {
  immediate_danger:
    "I want to help you stay safe. Please tell a trusted adult who can be with you now. In the U.S., call or text 988 for a crisis counselor. If you might act now or someone is in immediate danger, call 911 or your local emergency number.",
  abuse_or_exploitation:
    "What you described deserves help from a safe adult. Please tell a trusted adult such as a parent, guardian, counselor, teacher, or nurse.",
  sexual_content:
    "I can help with age-appropriate health, safety, or class questions, but not explicit sexual content. We can return to the assignment or talk through a safe question.",
  violent_wrongdoing:
    "I cannot help plan harm. Put distance between yourself and any weapon or unsafe situation, and tell a trusted adult now. If anyone is in immediate danger, call 911 or your local emergency number.",
  illegal_wrongdoing:
    "I cannot help plan illegal or unsafe actions. I can help with the underlying class topic, digital safety, or a lawful next step.",
  sensitive_data:
    "Please remove passwords, account keys, financial details, exact addresses, or government ID numbers. I can help once the private details are left out.",
};

const ACTION_REQUEST =
  /\b(?:explain|describe|show|tell|teach|outline|detail|write|give|provide|walk\s+(?:me\s+)?through|help\s+(?:me\s+)?(?:to)?|how\s+(?:can|could|do|would|should)\s+(?:i|we)|(?:step[- ]by[- ]step|instructions?|tutorial|procedure)\s+(?:for|to|on))\b/iu;
const NON_OPERATIONAL_BOUND =
  /\b(?:at a high level|high[- ]level|non[- ]operational|without (?:code|commands?|instructions?|operational steps)|no (?:code|commands?|instructions?|operational steps))\b/iu;
const DEFENSIVE_PURPOSE =
  /\b(?:how|ways?)\s+(?:defenders?|teams?|schools?|organizations?)\s+(?:can\s+)?(?:detect|prevent|mitigate|contain|respond|recover|protect)\b|\b(?:detect|prevent|mitigate|contain|respond to|recover from|protect against)\s+(?:ransomware|malware|malicious software|attacks?|file[- ]locking behavior)\b/iu;
const VIOLENT_RECIPE =
  /\b(?:recipe|formula|blueprint)\s+(?:for|to (?:make|create|build))\s+(?:an?\s+)?(?:bomb|explosive|weapon|poison|toxic gas)\b/iu;
const VIOLENT_CONSTRUCTION =
  /\b(?:build|building|make|making|create|creating|assemble|assembling|construct|constructing|weaponize|weaponizing|mix|mixing)\b[\s\S]{0,48}\b(?:bomb|explosive|weapon|poison|toxic gas)\b/iu;
const CYBER_CONSTRUCTION =
  /\b(?:build|building|make|making|create|creating|code|coding|develop|developing|deploy|deploying|spread|spreading|install|installing|write|writing)\b[\s\S]{0,48}\b(?:ransomware|malware|keylogger|botnet|rootkit|credential stealer|phishing (?:page|kit)|exploit payload)\b/iu;
const RANSOMWARE_EFFECT =
  /\b(?:silently|secretly|covertly|without (?:notice|warning))?\s*(?:lock|locks|locking|encrypt|encrypts|encrypting|scramble|scrambles|scrambling)\b[\s\S]{0,64}\b(?:files?|documents?|data|drive)\b[\s\S]{0,64}\b(?:until|unless)\b[\s\S]{0,32}\b(?:pay|pays|paid|payment|ransom|money)\b/iu;
const DIRECT_WRONGDOING =
  /\b(?:bypass|evade)\s+(?:the\s+)?(?:filter|security|detection)|(?:attack|hack|phish|steal from|hurt|kill)\s+(?:a|an|my|our|the|this|that)\b/iu;
const SENSITIVE_PATTERNS = [
  /\bmy (?:password|passcode)\s*(?:is|:|=)\s*\S+/iu,
  /\b(?:api key|secret key|access token)\s*(?:is|:|=)\s*[A-Za-z0-9_./+=-]{12,}\b/iu,
  /\bsk-[A-Za-z0-9_-]{12,}\b/u,
  /\b\d{3}-\d{2}-\d{4}\b/u,
];

const MODERATION_RULES: Array<{
  providerCategory: string;
  studentCategory: StudentSafetyCategory;
  academicBlockThreshold: number;
}> = [
  { providerCategory: "self-harm/intent", studentCategory: "immediate_danger", academicBlockThreshold: 0.5 },
  { providerCategory: "self-harm/instructions", studentCategory: "immediate_danger", academicBlockThreshold: 0.5 },
  { providerCategory: "self-harm", studentCategory: "immediate_danger", academicBlockThreshold: 0.85 },
  { providerCategory: "sexual/minors", studentCategory: "abuse_or_exploitation", academicBlockThreshold: 0.35 },
  { providerCategory: "sexual", studentCategory: "sexual_content", academicBlockThreshold: 0.85 },
  { providerCategory: "illicit/violent", studentCategory: "violent_wrongdoing", academicBlockThreshold: 0.65 },
  { providerCategory: "violence", studentCategory: "violent_wrongdoing", academicBlockThreshold: 0.9 },
  { providerCategory: "illicit", studentCategory: "illegal_wrongdoing", academicBlockThreshold: 0.8 },
];
const ACADEMIC_CONTEXT =
  /\b(?:analy[sz](?:e|is)|assignment|biology|book|case study|character|class|course|cybersecurity|essay|health|histor(?:y|ical)|literature|medical|passage|poem|research|textbook)\b/iu;

function normalizedSafetyText(content: unknown): string {
  return contentToText(content).normalize("NFKC").toLocaleLowerCase("en-US")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/gu, "").replace(/\s+/gu, " ").trim();
}

function actionableCategory(text: string): "violent_wrongdoing" | "illegal_wrongdoing" | null {
  if (DIRECT_WRONGDOING.test(text)) {
    return /\b(?:hurt|kill)\b/iu.test(text) ? "violent_wrongdoing" : "illegal_wrongdoing";
  }
  if (VIOLENT_RECIPE.test(text)) return "violent_wrongdoing";
  if (NON_OPERATIONAL_BOUND.test(text) && DEFENSIVE_PURPOSE.test(text)) return null;
  if (!ACTION_REQUEST.test(text)) return null;
  if (VIOLENT_CONSTRUCTION.test(text)) return "violent_wrongdoing";
  if (CYBER_CONSTRUCTION.test(text) || RANSOMWARE_EFFECT.test(text)) {
    return "illegal_wrongdoing";
  }
  return null;
}

function blocked(category: StudentSafetyCategory): SafetyScreenResult {
  return { safe: false, category, redirect: REDIRECTS[category] };
}

export function screenStudentInput(content: unknown): SafetyScreenResult {
  const text = normalizedSafetyText(content);
  const compact = text.replace(/[^a-z0-9]+/gu, "");
  if ([
    /(?:iwantto|iwill|iplanto|imgoingto|iamgoingto)(?:kill|hurt)myself/u,
    /(?:iwantto|iwill|iplanto|imgoingto|iamgoingto)(?:endmylife|die)/u,
    /(?:howcani|howdoi|tellmehowto)(?:kill|hurt)myself/u,
  ].some((pattern) => pattern.test(compact))) return blocked("immediate_danger");
  const actionable = actionableCategory(text);
  if (actionable) return blocked(actionable);
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(text)) return blocked("sensitive_data");
  }
  return { safe: true };
}

export function screenStudentOutput(content: unknown): SafetyScreenResult {
  const text = normalizedSafetyText(content);
  const actionable = actionableCategory(text);
  if (actionable) return blocked(actionable);
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(text)) return blocked("sensitive_data");
  }
  return { safe: true };
}

export async function moderateStudentContent(
  request: StructuredModerationRequest,
  fetcher: typeof fetch = fetch,
  apiKey: string = process.env.OPENAI_API_KEY ?? "",
): Promise<SafetyScreenResult> {
  if (!apiKey) throw new Error("student_moderation_not_configured");
  const response = await fetcher("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "omni-moderation-latest", input: request.text }),
  });
  if (!response.ok) throw new Error("student_moderation_unavailable");
  let payload: {
    results?: Array<{
      flagged?: boolean;
      categories?: Record<string, boolean>;
      category_scores?: Record<string, number>;
    }>;
  };
  try {
    payload = await response.json() as typeof payload;
  } catch {
    throw new Error("student_moderation_invalid_response");
  }
  if (!Array.isArray(payload.results) || payload.results.length === 0) {
    throw new Error("student_moderation_invalid_response");
  }
  const context = normalizedSafetyText(`${request.contextText ?? ""}\n${request.text}`);
  const academicContext = ACADEMIC_CONTEXT.test(context) && actionableCategory(context) === null;
  for (const result of payload.results) {
    if (!result || typeof result.flagged !== "boolean" || !result.categories) {
      throw new Error("student_moderation_invalid_response");
    }
    const flaggedCategories = Object.entries(result.categories)
      .filter(([, flagged]) => flagged)
      .map(([category]) => category);
    for (const category of flaggedCategories) {
      const rule = MODERATION_RULES.find((candidate) => candidate.providerCategory === category);
      if (!rule) return blocked("illegal_wrongdoing");
      const score = result.category_scores?.[category];
      if (!academicContext || !Number.isFinite(score) || Number(score) >= rule.academicBlockThreshold) {
        return blocked(rule.studentCategory);
      }
    }
    if (result.flagged && flaggedCategories.length === 0) return blocked("illegal_wrongdoing");
  }
  return { safe: true };
}

export async function guardStudentContent(
  request: StructuredModerationRequest,
  moderator: StructuredModerator = moderateStudentContent,
): Promise<AiGuardFailure | null> {
  const deterministic = request.phase === "input"
    ? screenStudentInput(request.text)
    : screenStudentOutput(request.text);
  if (!deterministic.safe) return safetyFailure(deterministic);
  try {
    const structured = await moderator(request);
    return structured.safe ? null : safetyFailure(structured);
  } catch {
    return {
      ok: false,
      kind: "screening",
      status: 503,
      code: "safety_screen_unavailable",
      message: "AI is taking a short pause while the safety check completes. Please try again.",
    };
  }
}

function boundedByteCount(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(10_000_000, Math.floor(value!))) : 0;
}

function safeCorrelationId(value: string | undefined): string {
  if (!value) return "unavailable";
  const safe = value.trim().slice(0, 64);
  return /^[a-z0-9._:-]+$/iu.test(safe) ? safe : "unavailable";
}

function interactionMetadata(params: LogParams): string {
  return [
    `feature=${params.feature}`,
    `correlation_id=${safeCorrelationId(params.correlationId)}`,
    `input_bytes=${boundedByteCount(params.inputBytes)}`,
    `output_bytes=${boundedByteCount(params.outputBytes)}`,
  ].join(";");
}

/** Returns 'YYYY-MM-DD' in UTC — daily reset boundary is UTC-consistent for v1. */
export function todayIsoDate(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Check whether the user has remaining token budget for today.
 * remaining = max(0, daily_token_budget - tokens_used_today).
 * allowed = remaining > 0.
 */
export async function checkTokenBudget(
  userId: string,
  supabase: SupabaseClient<Database>,
): Promise<BudgetCheck> {
  const { data } = await supabase
    .from("profiles")
    .select("daily_token_budget, tokens_used_today")
    .eq("user_id", userId)
    .single();
  if (!data) return { allowed: false, remaining: 0 };
  const budget = Number(data.daily_token_budget ?? 0);
  const used = Number(data.tokens_used_today ?? 0);
  const remaining = Math.max(0, budget - used);
  return { allowed: remaining > 0, remaining };
}

/**
 * Reset the daily token counter if today (UTC) differs from the stored reset date.
 * No-op when already reset today.
 */
export async function resetBudgetIfNewDay(
  userId: string,
  supabase: SupabaseClient<Database>,
): Promise<void> {
  const { data } = await supabase
    .from("profiles")
    .select("token_reset_date")
    .eq("user_id", userId)
    .single();
  if (!data) return;
  const today = todayIsoDate();
  if (data.token_reset_date !== today) {
    await supabase
      .from("profiles")
      .update({ tokens_used_today: 0, token_reset_date: today })
      .eq("user_id", userId);
  }
}

/** Best-effort soft-budget increment for authenticated server routes. */
export async function incrementTokens(
  userId: string,
  delta: number,
  supabase: SupabaseClient<Database>,
): Promise<void> {
  const { data } = await supabase
    .from("profiles")
    .select("tokens_used_today")
    .eq("user_id", userId)
    .single();
  if (!data) return;
  const next = Number(data.tokens_used_today ?? 0) + Math.max(0, delta);
  await supabase
    .from("profiles")
    .update({ tokens_used_today: next })
    .eq("user_id", userId);
}

export function estimateTokenReservation({
  systemPrompt,
  input,
  maxOutputTokens,
}: {
  systemPrompt: string;
  input: unknown;
  maxOutputTokens: number;
}): number {
  const promptBytes = new TextEncoder().encode(
    `${systemPrompt}\n${contentToText(input)}`,
  ).byteLength;
  return Math.min(
    1_000_000,
    Math.max(1, promptBytes + Math.max(0, Math.ceil(maxOutputTokens)) + 256),
  );
}

export async function runSafeBudgetedAiCall<T>({
  ownerId,
  supabase,
  input,
  systemPrompt,
  maxOutputTokens,
  invoke,
  getTokens = defaultTokens,
  getOutput = defaultOutput,
  idempotencyKey = crypto.randomUUID(),
  moderator = moderateStudentContent,
}: {
  ownerId: string;
  supabase: SupabaseLike;
  input: unknown;
  systemPrompt: string;
  maxOutputTokens: number;
  invoke: () => Promise<T>;
  getTokens?: (value: T) => number;
  getOutput?: (value: T) => unknown;
  idempotencyKey?: string;
  moderator?: StructuredModerator;
}): Promise<AiGuardResult<T>> {
  const inputText = contentToText(input);
  const inputFailure = await guardStudentContent({ text: inputText, phase: "input" }, moderator);
  if (inputFailure) return inputFailure;

  const requestedTokens = estimateTokenReservation({ systemPrompt, input, maxOutputTokens });
  const store = supabase as any;
  const reservation = await rpcRow(store, "reserve_ai_token_budget", {
    p_owner_id: ownerId,
    p_idempotency_key: idempotencyKey,
    p_requested_tokens: requestedTokens,
  });
  const reservationId = typeof reservation?.reservation_id === "string"
    ? reservation.reservation_id
    : null;
  if (
    reservation?.allowed !== true ||
    reservation?.reservation_status !== "active" ||
    !reservationId
  ) {
    const accountingUnavailable = !reservation ||
      reservation?.reservation_status === "accounting_unavailable" ||
      reservation?.reservation_status === "profile_not_found";
    return accountingUnavailable
      ? {
          ok: false,
          kind: "accounting",
          status: 503,
          code: "token_accounting_unavailable",
          message: "AI is taking a short pause while usage is checked. Please try again.",
        }
      : {
          ok: false,
          kind: "budget",
          status: 429,
          code: "daily_token_budget_reached",
          message: "Diana study help is paused for today. Try again tomorrow.",
        };
  }
  const reservedTokens = toNonNegativeInteger(reservation.reserved_tokens) || requestedTokens;

  const providerStartKey = crypto.randomUUID();
  const providerStarted = await markProviderStarted(
    store,
    reservationId,
    providerStartKey,
  );
  if (!providerStarted) {
    await releaseKnownNotConsumed(store, reservationId, providerStartKey).catch(() => undefined);
    return {
      ok: false,
      kind: "accounting",
      status: 503,
      code: "provider_start_not_recorded",
      message: "AI is taking a short pause while usage is checked. Please try again.",
    };
  }

  let value: T;
  try {
    value = await invoke();
  } catch (error) {
    await settleReservation(store, reservationId, reservedTokens);
    throw error;
  }

  const reportedTokens = toNonNegativeInteger(getTokens(value));
  const outputFailure = await guardStudentContent({
    text: contentToText(getOutput(value)),
    phase: "output",
    contextText: inputText,
  }, moderator);
  await settleReservation(
    store,
    reservationId,
    reportedTokens > 0 ? reportedTokens : reservedTokens,
  );
  if (outputFailure) return outputFailure;
  return { ok: true, value, reservationId };
}

async function markProviderStarted(
  store: any,
  reservationId: string,
  providerStartKey: string,
): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const row = await rpcRow(store, "mark_ai_budget_provider_started", {
      p_reservation_kind: "token",
      p_reservation_id: reservationId,
      p_provider_start_key: providerStartKey,
    });
    if (
      row?.reservation_id === reservationId &&
      row?.reservation_status === "active" &&
      row?.provider_start_status === "started" &&
      typeof row?.provider_started_at === "string"
    ) return true;
  }
  return false;
}

async function releaseKnownNotConsumed(
  store: any,
  reservationId: string,
  providerStartKey: string,
): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const row = await rpcRow(store, "release_ai_budget_known_not_consumed", {
      p_reservation_kind: "token",
      p_reservation_id: reservationId,
      p_provider_start_key: providerStartKey,
    });
    if (row?.reservation_id === reservationId && row?.reservation_status === "released") return;
  }
  throw new Error("known_not_consumed_release_pending");
}

async function settleReservation(
  store: any,
  reservationId: string,
  actualTokens: number,
): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const row = await rpcRow(store, "settle_ai_token_budget", {
      p_reservation_id: reservationId,
      p_actual_tokens: actualTokens,
    });
    if (
      row?.reservation_id === reservationId &&
      (row?.reservation_status === "settled" || row?.reservation_status === "settled_late") &&
      toNonNegativeInteger(row?.charged_tokens) >= actualTokens
    ) return;
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const row = await rpcRow(store, "queue_ai_budget_reconciliation", {
      p_reservation_kind: "token",
      p_reservation_id: reservationId,
      p_actual_units: actualTokens,
      p_last_error: "settlement_unavailable",
    });
    if (row?.reconciliation_status === "already_settled") return;
    if (row?.reconciliation_status === "pending" && typeof row?.reconciliation_id === "string") {
      throw new Error("token_settlement_pending_reconciliation");
    }
  }
  // The provider-start marker remains active. Database expiry converts it to
  // a conservative full charge, so this transport failure can never refund it.
  throw new Error("token_settlement_reconciliation_unavailable");
}

async function rpcRow(
  store: any,
  name: string,
  args: Record<string, unknown>,
): Promise<any | null> {
  try {
    const { data, error } = await store.rpc(name, args);
    if (error) return null;
    return Array.isArray(data) ? data[0] ?? null : data ?? null;
  } catch {
    return null;
  }
}

function safetyFailure(
  result: Exclude<SafetyScreenResult, { safe: true }>,
): AiGuardFailure {
  return {
    ok: false,
    kind: "safety",
    status: 422,
    code: "safety_redirect",
    message: result.redirect,
    category: result.category,
  };
}

function contentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(contentToText).join("\n");
  if (content && typeof content === "object") {
    try {
      return JSON.stringify(content);
    } catch {
      return "";
    }
  }
  return "";
}

function toNonNegativeInteger(value: unknown): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

function defaultTokens<T>(value: T): number {
  return toNonNegativeInteger((value as { tokens?: unknown })?.tokens);
}

function defaultOutput<T>(value: T): unknown {
  return (value as { moderationContent?: unknown; content?: unknown })?.moderationContent ??
    (value as { content?: unknown })?.content ?? value;
}

/**
 * Fire-and-forget insert into ai_interactions.
 * NEVER throws — a failed log must not break the user-facing AI response.
 */
export async function logInteraction(
  params: LogParams,
  supabase: SupabaseClient<Database>,
): Promise<void> {
  try {
    await supabase.from("ai_interactions").insert({
      owner_id: params.ownerId,
      assignment_id: params.assignmentId ?? null,
      feature: params.feature,
      model: params.model,
      prompt_summary: interactionMetadata(params),
      tokens_used: params.tokensUsed,
    });
  } catch {
    console.warn("ai_interactions log did not complete");
  }
}
