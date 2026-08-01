// Service-role budget accounting and deterministic safety checks for Edge Functions.

import {
  callStudentTextModel,
  type StudentModelPart,
  type StudentModelQuality,
  type StudentModelResult,
} from "./student-model.ts";

// PostgREST builders are PromiseLike chains rather than native Promise objects.
// deno-lint-ignore no-explicit-any
type RpcResult = { data: any; error: any };

interface SupabaseLike {
  // deno-lint-ignore no-explicit-any
  from(table: string): any;
  rpc(
    functionName: string,
    args: Record<string, unknown>,
  ): PromiseLike<RpcResult>;
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
    | "agent_coach"
    | "assignment_review";
  model: string;
  /** @deprecated Raw prompt summaries are intentionally ignored by logInteraction. */
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

export type TokenReservation = {
  allowed: boolean;
  reservationId: string | null;
  reservedTokens: number;
  remainingTokens: number;
  status: string;
};

export type ProviderCallContext = {
  /** @deprecated The provider-start fence is committed before invoke runs. */
  markProviderUsage: () => void;
};

type BudgetKind = "token" | "media_cost_unit";
type UsageState = "consumed" | "not_consumed";

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

export interface BudgetCheck {
  allowed: boolean;
  remaining: number;
}

export type SafetyMediaInput = {
  mediaType: string;
  data: string;
};

export type StructuredModerationRequest = {
  text: string;
  images: SafetyMediaInput[];
  phase: "input" | "output";
  /** Original student context used only to recognize a bounded academic frame. */
  contextText?: string;
};

export type StructuredModerator = (
  request: StructuredModerationRequest,
) => Promise<SafetyScreenResult>;

const REDIRECTS: Record<StudentSafetyCategory, string> = {
  immediate_danger:
    "I want to help you stay safe. Please tell a trusted adult who can be with you now. In the U.S., call or text 988 for a crisis counselor. If you might act now or someone is in immediate danger, call 911 or your local emergency number.",
  abuse_or_exploitation:
    "What you described deserves help from a safe adult. Please tell a trusted adult such as a parent, guardian, counselor, teacher, or nurse. In the U.S., you can also call or text Childhelp at 800-422-4453. If you are in immediate danger, call 911 or your local emergency number.",
  sexual_content:
    "I can help with age-appropriate health, safety, or class questions, but not explicit sexual content. We can return to the assignment or talk through a safe question.",
  violent_wrongdoing:
    "I cannot help plan harm. Put distance between yourself and any weapon or unsafe situation, and tell a trusted adult now. If anyone is in immediate danger, call 911 or your local emergency number.",
  illegal_wrongdoing:
    "I cannot help plan illegal or unsafe actions. I can help with the underlying class topic, digital safety, or a lawful next step.",
  sensitive_data:
    "Please remove passwords, account keys, financial details, exact addresses, or government ID numbers. I can help once the private details are left out.",
};

const CONFUSABLES: Record<string, string> = {
  "\u0430": "a",
  "\u0435": "e",
  "\u0456": "i",
  "\u03b9": "i",
  "\u043e": "o",
  "\u0440": "p",
  "\u0441": "c",
  "\u0455": "s",
  "\u0445": "x",
  "\u0443": "y",
};

const ACADEMIC_CONTEXT =
  /\b(?:anatomy|analy[sz](?:e|is)|article|assignment|biology|book|case study|character|class|course|cybersecurity|essay|figurative|health|histor(?:y|ical)|literature|medical|metaphor|narrator|novel|passage|play|poem|quote|research|textbook)\b/iu;
const ACADEMIC_QUOTATION_CONTEXT =
  /\b(?:analy[sz](?:e|is)|character|figurative|metaphor|narrator|passage|quote|says|speaker)\b/iu;
const IMMINENCE_CONTEXT =
  /\b(?:now|right now|today|tonight|this minute|soon|have a plan|made a plan)\b/iu;
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

const SENSITIVE_PATTERNS: RegExp[] = [
  /\bmy (?:password|passcode)\s*(?:is|:|=)\s*\S+/iu,
  /\b(?:api key|secret key|access token)\s*(?:is|:|=)\s*[A-Za-z0-9_./+=-]{12,}\b/iu,
  /\bsk-[A-Za-z0-9_-]{12,}\b/u,
  /\b\d{3}-\d{2}-\d{4}\b/u,
  /\bmy (?:home )?address is\s+\d{1,6}\s+[\p{L}\d .'-]{2,60}\b(?:street|st|avenue|ave|road|rd|lane|ln|drive|dr|boulevard|blvd)\b/iu,
];

export function screenStudentInput(content: unknown): SafetyScreenResult {
  const normalized = normalizeSafetyText(contentToText(content));
  const compact = normalized.replace(/[^a-z0-9]+/gu, "");
  const academicFraming = ACADEMIC_CONTEXT.test(normalized) &&
    ACADEMIC_QUOTATION_CONTEXT.test(normalized) &&
    !IMMINENCE_CONTEXT.test(normalized);
  const immediateDanger = [
    /(?:iwantto|iwill|iplanto|imgoingto|iamgoingto)(?:kill|hurt)myself/u,
    /(?:iwantto|iwill|iplanto|imgoingto|iamgoingto)(?:endmylife|die)/u,
    /(?:howcani|howdoi|tellmehowto)(?:kill|hurt)myself/u,
    /(?:imsuicidal|iamsuicidal)(?:now|today|tonight)?/u,
    /(?:istarvemyself|imakemyself(?:throwup|vomit)|ihavenoteatenfordays)/u,
  ].some((pattern) => pattern.test(compact));

  if (immediateDanger && !academicFraming) {
    return blocked("immediate_danger");
  }
  const actionableHarm = actionableHarmCategory(normalized);
  if (actionableHarm) return blocked(actionableHarm);
  return screenSensitiveData(normalized);
}

export function screenStudentOutput(content: unknown): SafetyScreenResult {
  const normalized = normalizeSafetyText(contentToText(content));
  const actionableHarm = actionableHarmCategory(normalized);
  return actionableHarm ? blocked(actionableHarm) : screenSensitiveData(normalized);
}

function normalizeSafetyText(content: string): string {
  return content
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/gu, "")
    .replace(
      /[\u0430\u0435\u0456\u03b9\u043e\u0440\u0441\u0455\u0445\u0443]/gu,
      (character) => CONFUSABLES[character] ?? character,
    )
    .replace(/\s+/gu, " ")
    .trim();
}

function screenSensitiveData(normalized: string): SafetyScreenResult {
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(normalized)) return blocked("sensitive_data");
  }
  return { safe: true };
}

function actionableHarmCategory(
  normalized: string,
): "violent_wrongdoing" | "illegal_wrongdoing" | null {
  if (DIRECT_WRONGDOING.test(normalized)) {
    return /\b(?:hurt|kill)\b/iu.test(normalized)
      ? "violent_wrongdoing"
      : "illegal_wrongdoing";
  }
  if (VIOLENT_RECIPE.test(normalized)) return "violent_wrongdoing";
  if (
    NON_OPERATIONAL_BOUND.test(normalized) &&
    DEFENSIVE_PURPOSE.test(normalized)
  ) return null;
  if (!ACTION_REQUEST.test(normalized)) return null;
  if (VIOLENT_CONSTRUCTION.test(normalized)) return "violent_wrongdoing";
  if (CYBER_CONSTRUCTION.test(normalized) || RANSOMWARE_EFFECT.test(normalized)) {
    return "illegal_wrongdoing";
  }
  return null;
}

function hasActionableHarmRequest(normalized: string): boolean {
  return actionableHarmCategory(normalized) !== null;
}

function blocked(category: StudentSafetyCategory): SafetyScreenResult {
  return { safe: false, category, redirect: REDIRECTS[category] };
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

type ModerationCategoryRule = {
  providerCategory: string;
  studentCategory: StudentSafetyCategory;
  academicBlockThreshold: number;
};

const MODERATION_CATEGORY_RULES: ModerationCategoryRule[] = [
  { providerCategory: "self-harm/intent", studentCategory: "immediate_danger", academicBlockThreshold: 0.5 },
  { providerCategory: "self-harm/instructions", studentCategory: "immediate_danger", academicBlockThreshold: 0.5 },
  { providerCategory: "self-harm", studentCategory: "immediate_danger", academicBlockThreshold: 0.85 },
  { providerCategory: "sexual/minors", studentCategory: "abuse_or_exploitation", academicBlockThreshold: 0.35 },
  { providerCategory: "sexual", studentCategory: "sexual_content", academicBlockThreshold: 0.85 },
  { providerCategory: "illicit/violent", studentCategory: "violent_wrongdoing", academicBlockThreshold: 0.65 },
  { providerCategory: "harassment/threatening", studentCategory: "violent_wrongdoing", academicBlockThreshold: 0.75 },
  { providerCategory: "hate/threatening", studentCategory: "violent_wrongdoing", academicBlockThreshold: 0.75 },
  { providerCategory: "violence/graphic", studentCategory: "violent_wrongdoing", academicBlockThreshold: 0.85 },
  { providerCategory: "violence", studentCategory: "violent_wrongdoing", academicBlockThreshold: 0.9 },
  { providerCategory: "illicit", studentCategory: "illegal_wrongdoing", academicBlockThreshold: 0.8 },
];

export async function moderateStudentContent(
  request: StructuredModerationRequest,
  fetcher: typeof fetch = fetch,
  apiKey: string = Deno.env.get("OPENAI_API_KEY") ?? "",
): Promise<SafetyScreenResult> {
  if (!apiKey) throw new Error("student_moderation_not_configured");

  const input: Array<Record<string, unknown>> = [];
  if (request.text.length > 0) input.push({ type: "text", text: request.text });
  for (const image of request.images) {
    if (
      !/^image\/(?:gif|jpeg|png|webp)$/iu.test(image.mediaType) ||
      image.data.length === 0
    ) {
      throw new Error("student_image_screening_unsupported");
    }
    input.push({
      type: "image_url",
      image_url: { url: `data:${image.mediaType};base64,${image.data}` },
    });
  }
  if (input.length === 0) input.push({ type: "text", text: "" });

  const response = await fetcher("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "omni-moderation-latest", input }),
  });

  if (!response.ok) {
    console.warn("student moderation request did not complete", {
      status: response.status,
      correlationId: safeCorrelationId(response.headers.get("x-request-id")),
    });
    throw new Error("student_moderation_unavailable");
  }

  const payload = await response.json() as {
    results?: Array<
      {
        flagged?: boolean;
        categories?: Record<string, boolean>;
        category_scores?: Record<string, number>;
        category_applied_input_types?: Record<string, string[]>;
      }
    >;
  };
  const results = payload.results;
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error("student_moderation_invalid_response");
  }

  const normalizedContext = normalizeSafetyText(
    `${request.contextText ?? ""}\n${request.text}`,
  );
  const academicContext = ACADEMIC_CONTEXT.test(normalizedContext) &&
    !IMMINENCE_CONTEXT.test(normalizedContext) &&
    !hasActionableHarmRequest(normalizedContext);

  for (const result of results) {
    if (!result || !result.categories || typeof result.flagged !== "boolean") {
      throw new Error("student_moderation_invalid_response");
    }

    const flaggedCategories = Object.entries(result.categories)
      .filter(([, flagged]) => flagged === true)
      .map(([category]) => category);
    for (const providerCategory of flaggedCategories) {
      const rule = MODERATION_CATEGORY_RULES.find((candidate) =>
        candidate.providerCategory === providerCategory
      );
      if (!rule) return blocked("illegal_wrongdoing");

      const score = result.category_scores?.[providerCategory];
      const appliedInputs = result.category_applied_input_types?.[providerCategory];
      if (
        !academicContext ||
        !Number.isFinite(score) ||
        (appliedInputs !== undefined &&
          (!Array.isArray(appliedInputs) ||
            appliedInputs.some((type) => type !== "text" && type !== "image"))) ||
        Number(score) >= rule.academicBlockThreshold
      ) {
        return blocked(rule.studentCategory);
      }
    }

    if (result.flagged && flaggedCategories.length === 0) {
      return blocked("illegal_wrongdoing");
    }
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
      message:
        "AI is taking a short pause while the safety check completes. Please try again.",
    };
  }
}

export function estimateTokenReservation({
  systemPrompt,
  input,
  maxOutputTokens,
  mediaCount = 0,
}: {
  systemPrompt: string;
  input: unknown;
  maxOutputTokens: number;
  mediaCount?: number;
}): number {
  const promptBytes =
    new TextEncoder().encode(`${systemPrompt}\n${contentToText(input)}`)
      .byteLength;
  const outputCeiling = Math.max(0, Math.ceil(maxOutputTokens));
  const mediaCeiling = Math.max(0, Math.ceil(mediaCount)) * 8192;
  return Math.min(
    1_000_000,
    Math.max(1, promptBytes + outputCeiling + mediaCeiling + 256),
  );
}

export function estimateMediaCostUnits({
  byteLength = 0,
  characterLength = 0,
}: {
  byteLength?: number;
  characterLength?: number;
}): number {
  const boundedBytes = Math.min(
    25 * 1024 * 1024,
    Math.max(0, Math.ceil(byteLength)),
  );
  const boundedCharacters = Math.min(
    10_000,
    Math.max(0, Math.ceil(characterLength)),
  );
  return Math.min(
    1_000_000,
    Math.max(256, Math.ceil(boundedBytes / 256), boundedCharacters),
  );
}

export async function reserveTokenBudget(
  ownerId: string,
  requestedTokens: number,
  supabase: SupabaseLike,
  idempotencyKey: string = crypto.randomUUID(),
): Promise<TokenReservation> {
  const { data, error } = await supabase.rpc("reserve_ai_token_budget", {
    p_owner_id: ownerId,
    p_idempotency_key: idempotencyKey,
    p_requested_tokens: Math.max(1, Math.ceil(requestedTokens)),
  });
  if (error) {
    return {
      allowed: false,
      reservationId: null,
      reservedTokens: 0,
      remainingTokens: 0,
      status: "accounting_unavailable",
    };
  }

  const row = firstRow(data);
  const status = typeof row?.reservation_status === "string"
    ? row.reservation_status
    : "accounting_unavailable";
  const reservationId = typeof row?.reservation_id === "string"
    ? row.reservation_id
    : null;
  return {
    allowed: row?.allowed === true && status === "active" &&
      reservationId !== null,
    reservationId,
    reservedTokens: toNonNegativeInteger(row?.reserved_tokens),
    remainingTokens: toNonNegativeInteger(row?.remaining_tokens),
    status,
  };
}

export async function reserveMediaCostBudget(
  ownerId: string,
  requestedCostUnits: number,
  supabase: SupabaseLike,
  idempotencyKey: string = crypto.randomUUID(),
): Promise<TokenReservation> {
  const { data, error } = await supabase.rpc("reserve_ai_media_cost_budget", {
    p_owner_id: ownerId,
    p_idempotency_key: idempotencyKey,
    p_requested_cost_units: Math.max(1, Math.ceil(requestedCostUnits)),
  });
  if (error) return unavailableReservation();

  const row = firstRow(data);
  const status = typeof row?.reservation_status === "string"
    ? row.reservation_status
    : "accounting_unavailable";
  const reservationId = typeof row?.reservation_id === "string"
    ? row.reservation_id
    : null;
  return {
    allowed: row?.allowed === true && status === "active" &&
      reservationId !== null,
    reservationId,
    reservedTokens: toNonNegativeInteger(row?.reserved_cost_units),
    remainingTokens: toNonNegativeInteger(row?.remaining_cost_units),
    status,
  };
}

// Compatibility gate for existing handlers. It is deliberately read-only;
// reserve_ai_token_budget performs the authoritative reset and budget decision.
export async function checkTokenBudget(
  ownerId: string,
  supabase: SupabaseLike,
): Promise<BudgetCheck> {
  const { data } = await supabase
    .from("profiles")
    .select("daily_token_budget, tokens_used_today, token_reset_date")
    .eq("user_id", ownerId)
    .single();
  if (!data) return { allowed: false, remaining: 0 };
  const budget = toNonNegativeInteger(data.daily_token_budget);
  const used = data.token_reset_date === new Date().toISOString().slice(0, 10)
    ? toNonNegativeInteger(data.tokens_used_today)
    : 0;
  const remaining = Math.max(0, budget - used);
  // Do not deny here: an apparently exhausted counter may contain an expired
  // reservation that the locked RPC will reclaim. The RPC is authoritative.
  return { allowed: budget > 0, remaining };
}

// Daily reset now happens atomically inside reserve_ai_token_budget.
export async function resetBudgetIfNewDay(
  _ownerId: string,
  _supabase: SupabaseLike,
): Promise<void> {}

// Usage is settled by callSafeStudentTextModel or runSafeBudgetedAiCall.
export async function incrementTokens(
  _ownerId: string,
  _delta: number,
  _supabase: SupabaseLike,
): Promise<void> {}

export async function settleTokenBudget(
  reservationId: string,
  actualTokens: number,
  supabase: SupabaseLike,
): Promise<void> {
  await settleBudget("token", reservationId, actualTokens, supabase);
}

export async function releaseTokenBudget(
  reservationId: string,
  supabase: SupabaseLike,
): Promise<void> {
  await releaseBudget("token", reservationId, supabase);
}

export async function settleMediaCostBudget(
  reservationId: string,
  actualCostUnits: number,
  supabase: SupabaseLike,
): Promise<void> {
  await settleBudget(
    "media_cost_unit",
    reservationId,
    actualCostUnits,
    supabase,
  );
}

export async function releaseMediaCostBudget(
  reservationId: string,
  supabase: SupabaseLike,
): Promise<void> {
  await releaseBudget("media_cost_unit", reservationId, supabase);
}

export async function markBudgetProviderStarted(
  kind: BudgetKind,
  reservationId: string,
  providerStartKey: string,
  supabase: SupabaseLike,
): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let data: unknown;
    let error: unknown;
    try {
      ({ data, error } = await supabase.rpc(
        "mark_ai_budget_provider_started",
        {
          p_reservation_kind: kind,
          p_reservation_id: reservationId,
          p_provider_start_key: providerStartKey,
        },
      ));
    } catch {
      continue;
    }
    if (error) continue;
    const row = firstRow(data);
    if (
      row?.reservation_id === reservationId &&
      row?.reservation_status === "active" &&
      row?.provider_start_status === "started" &&
      typeof row?.provider_started_at === "string"
    ) {
      return true;
    }
  }
  return false;
}

export async function runSafeBudgetedAiCall<T>({
  ownerId,
  supabase,
  input,
  systemPrompt,
  maxOutputTokens,
  mediaCount = 0,
  media = [],
  invoke,
  getTokens = defaultTokens,
  getOutput = defaultOutput,
  getUsageState,
  idempotencyKey,
  moderator = moderateStudentContent,
  reservationUnits,
}: {
  ownerId: string;
  supabase: SupabaseLike;
  input: unknown;
  systemPrompt: string;
  maxOutputTokens: number;
  mediaCount?: number;
  media?: SafetyMediaInput[];
  invoke: (context: ProviderCallContext) => Promise<T>;
  getTokens?: (value: T) => number;
  getOutput?: (value: T) => unknown;
  getUsageState?: (value: T) => UsageState;
  idempotencyKey?: string;
  moderator?: StructuredModerator;
  reservationUnits?: number;
}): Promise<AiGuardResult<T>> {
  const inputText = contentToText(input);
  const inputFailure = await guardStudentContent({
    text: inputText,
    images: media,
    phase: "input",
  }, moderator);
  if (inputFailure) return inputFailure;

  const reservation = await reserveTokenBudget(
    ownerId,
    reservationUnits ?? estimateTokenReservation({
      systemPrompt,
      input,
      maxOutputTokens,
      mediaCount: Math.max(mediaCount, media.length),
    }),
    supabase,
    idempotencyKey,
  );

  if (!reservation.allowed || !reservation.reservationId) {
    if (
      reservation.status === "accounting_unavailable" ||
      reservation.status === "profile_not_found"
    ) {
      return {
        ok: false,
        kind: "accounting",
        status: 503,
        code: "token_accounting_unavailable",
        message:
          "AI is taking a short pause while usage is checked. Please try again.",
      };
    }
    return {
      ok: false,
      kind: "budget",
      status: 429,
      code: "daily_token_budget_reached",
      message: "Your AI time is used for today. It resets at midnight UTC.",
    };
  }

  const providerStartKey = crypto.randomUUID();
  const providerStarted = await markBudgetProviderStarted(
    "token",
    reservation.reservationId,
    providerStartKey,
    supabase,
  );
  if (!providerStarted) {
    await releaseKnownNotConsumedBudget(
      "token",
      reservation.reservationId,
      providerStartKey,
      supabase,
    ).catch(() => undefined);
    return {
      ok: false,
      kind: "accounting",
      status: 503,
      code: "provider_start_not_recorded",
      message:
        "AI is taking a short pause while usage is checked. Please try again.",
    };
  }

  let value: T;
  try {
    value = await invoke({
      // Compatibility callback for provider adapters. The durable marker has
      // already committed, so this must not control accounting state.
      markProviderUsage: () => undefined,
    });
  } catch (error) {
    await settleTokenBudget(
      reservation.reservationId,
      reservation.reservedTokens,
      supabase,
    );
    throw error;
  }

  // A response marked as a local fallback still follows a provider request.
  // Keep the full reservation when the provider does not report usage.
  const reportedTokens = getUsageState?.(value) === "not_consumed"
    ? 0
    : toNonNegativeInteger(getTokens(value));
  const outputFailure = await guardStudentContent({
    text: contentToText(getOutput(value)),
    images: [],
    phase: "output",
    contextText: inputText,
  }, moderator);
  await settleTokenBudget(
    reservation.reservationId,
    reportedTokens > 0 ? reportedTokens : reservation.reservedTokens,
    supabase,
  );
  if (outputFailure) return outputFailure;

  return { ok: true, value, reservationId: reservation.reservationId };
}

export async function runSafeBudgetedMediaCall<T>({
  ownerId,
  supabase,
  input,
  requestedCostUnits,
  invoke,
  getActualCostUnits = () => requestedCostUnits,
  idempotencyKey,
  moderator = moderateStudentContent,
}: {
  ownerId: string;
  supabase: SupabaseLike;
  input: unknown;
  requestedCostUnits: number;
  invoke: (context: ProviderCallContext) => Promise<T>;
  getActualCostUnits?: (value: T) => number;
  idempotencyKey?: string;
  moderator?: StructuredModerator;
}): Promise<AiGuardResult<T>> {
  const inputFailure = await guardStudentContent({
    text: contentToText(input),
    images: [],
    phase: "input",
  }, moderator);
  if (inputFailure) return inputFailure;

  const reservation = await reserveMediaCostBudget(
    ownerId,
    requestedCostUnits,
    supabase,
    idempotencyKey,
  );
  const failure = reservationFailure(
    reservation,
    "media_cost_accounting_unavailable",
  );
  if (failure) return failure;

  const reservationId = reservation.reservationId as string;
  const providerStartKey = crypto.randomUUID();
  const providerStarted = await markBudgetProviderStarted(
    "media_cost_unit",
    reservationId,
    providerStartKey,
    supabase,
  );
  if (!providerStarted) {
    await releaseKnownNotConsumedBudget(
      "media_cost_unit",
      reservationId,
      providerStartKey,
      supabase,
    ).catch(() => undefined);
    return {
      ok: false,
      kind: "accounting",
      status: 503,
      code: "provider_start_not_recorded",
      message:
        "AI is taking a short pause while usage is checked. Please try again.",
    };
  }

  let value: T;
  try {
    value = await invoke({
      markProviderUsage: () => undefined,
    });
  } catch (error) {
    await settleMediaCostBudget(
      reservationId,
      reservation.reservedTokens,
      supabase,
    );
    throw error;
  }

  const reportedUnits = toNonNegativeInteger(getActualCostUnits(value));
  await settleMediaCostBudget(
    reservationId,
    reportedUnits > 0 ? reportedUnits : reservation.reservedTokens,
    supabase,
  );

  return { ok: true, value, reservationId };
}

export async function callSafeStudentTextModel({
  ownerId,
  supabase,
  system,
  user,
  maxTokens,
  quality,
  json,
  parts,
  fallbackContent,
  timeoutMs,
  moderator,
}: {
  ownerId: string;
  supabase: SupabaseLike;
  system: string;
  user: string;
  maxTokens: number;
  quality?: StudentModelQuality;
  json?: boolean;
  parts?: StudentModelPart[];
  fallbackContent?: string;
  timeoutMs?: number;
  moderator?: StructuredModerator;
}): Promise<StudentModelResult> {
  const textParts =
    parts?.filter((part) => part.type === "text").map((part) => part.text) ??
      [];
  const imageParts = parts?.filter((
    part,
  ): part is Extract<StudentModelPart, { type: "image" }> =>
    part.type === "image"
  ) ?? [];
  const guarded = await runSafeBudgetedAiCall({
    ownerId,
    supabase,
    input: [user, ...textParts],
    systemPrompt: system,
    maxOutputTokens: maxTokens,
    mediaCount: imageParts.length,
    media: imageParts.map((part) => ({
      mediaType: part.mediaType,
      data: part.data,
    })),
    invoke: ({ markProviderUsage }) =>
      callStudentTextModel({
        system,
        user,
        maxTokens,
        quality,
        json,
        parts,
        fallbackContent,
        timeoutMs,
        markProviderUsage,
      }),
    getOutput: (value) => value.moderationContent ?? value.content,
    getUsageState: (value) =>
      value.model.endsWith(":fallback") ? "not_consumed" : "consumed",
    moderator,
  });

  if (!guarded.ok) throw aiGuardFailureResponse(guarded);
  return guarded.value;
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

export function aiGuardFailureResponse(
  failure: AiGuardFailure,
  headers: Record<string, string> = {},
): Response {
  return new Response(
    JSON.stringify({
      error: failure.code,
      message: failure.message,
      content: failure.kind === "safety" ? failure.message : undefined,
    }),
    {
      status: failure.status,
      headers: { ...headers, "Content-Type": "application/json" },
    },
  );
}

function unavailableReservation(): TokenReservation {
  return {
    allowed: false,
    reservationId: null,
    reservedTokens: 0,
    remainingTokens: 0,
    status: "accounting_unavailable",
  };
}

function reservationFailure(
  reservation: TokenReservation,
  accountingCode: string,
): AiGuardFailure | null {
  if (reservation.allowed && reservation.reservationId) return null;
  if (
    reservation.status === "accounting_unavailable" ||
    reservation.status === "profile_not_found"
  ) {
    return {
      ok: false,
      kind: "accounting",
      status: 503,
      code: accountingCode,
      message:
        "AI is taking a short pause while usage is checked. Please try again.",
    };
  }
  return {
    ok: false,
    kind: "budget",
    status: 429,
    code: "daily_media_cost_budget_reached",
    message: "Your media AI time is used for today. It resets at midnight UTC.",
  };
}

async function settleBudget(
  kind: BudgetKind,
  reservationId: string,
  actualUnits: number,
  supabase: SupabaseLike,
): Promise<void> {
  const units = toNonNegativeInteger(actualUnits);
  const rpcName = kind === "token"
    ? "settle_ai_token_budget"
    : "settle_ai_media_cost_budget";
  const args = kind === "token"
    ? { p_reservation_id: reservationId, p_actual_tokens: units }
    : { p_reservation_id: reservationId, p_actual_cost_units: units };
  let failureDetail = "settlement RPC did not complete";

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let data: unknown;
    let error: unknown;
    try {
      ({ data, error } = await supabase.rpc(rpcName, args));
    } catch {
      failureDetail = "settlement RPC transport failure";
      continue;
    }
    if (error) {
      failureDetail = "settlement RPC returned an error";
      continue;
    }
    const row = firstRow(data);
    const returnedActual = kind === "token"
      ? row?.actual_tokens
      : row?.actual_cost_units;
    const returnedCharged = kind === "token"
      ? row?.charged_tokens
      : row?.charged_cost_units;
    if (
      row?.reservation_id === reservationId &&
      (row?.reservation_status === "settled" ||
        row?.reservation_status === "settled_late") &&
      toNonNegativeInteger(returnedActual) === units &&
      toNonNegativeInteger(returnedCharged) === units
    ) {
      return;
    }
    failureDetail = `settlement RPC returned status ${
      String(row?.reservation_status ?? "missing")
    }`;
  }

  const reconciliationStatus = await queueBudgetReconciliation(
    kind,
    reservationId,
    units,
    failureDetail,
    supabase,
  );
  if (reconciliationStatus === "already_settled") return;
  throw new Error("AI usage settlement is pending reconciliation");
}

async function releaseBudget(
  kind: BudgetKind,
  reservationId: string,
  supabase: SupabaseLike,
): Promise<void> {
  const rpcName = kind === "token"
    ? "release_ai_token_budget"
    : "release_ai_media_cost_budget";
  let lastStatus = "missing";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let data: unknown;
    let error: unknown;
    try {
      ({ data, error } = await supabase.rpc(rpcName, {
        p_reservation_id: reservationId,
      }));
    } catch {
      continue;
    }
    if (error) continue;
    const row = firstRow(data);
    lastStatus = String(row?.reservation_status ?? "missing");
    if (
      row?.reservation_id === reservationId &&
      (lastStatus === "released" || lastStatus === "expired")
    ) {
      return;
    }
  }
  throw new Error(`AI usage release returned status ${lastStatus}`);
}

async function releaseKnownNotConsumedBudget(
  kind: BudgetKind,
  reservationId: string,
  providerStartKey: string,
  supabase: SupabaseLike,
): Promise<void> {
  let lastStatus = "missing";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let data: unknown;
    let error: unknown;
    try {
      ({ data, error } = await supabase.rpc(
        "release_ai_budget_known_not_consumed",
        {
          p_reservation_kind: kind,
          p_reservation_id: reservationId,
          p_provider_start_key: providerStartKey,
        },
      ));
    } catch {
      continue;
    }
    if (error) continue;
    const row = firstRow(data);
    lastStatus = String(row?.reservation_status ?? "missing");
    if (
      row?.reservation_id === reservationId &&
      (lastStatus === "released" || lastStatus === "expired")
    ) {
      return;
    }
  }
  throw new Error(`known-not-consumed release returned status ${lastStatus}`);
}

async function queueBudgetReconciliation(
  kind: BudgetKind,
  reservationId: string,
  actualUnits: number,
  failureDetail: string,
  supabase: SupabaseLike,
): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let data: unknown;
    let error: unknown;
    try {
      ({ data, error } = await supabase.rpc(
        "queue_ai_budget_reconciliation",
        {
          p_reservation_kind: kind,
          p_reservation_id: reservationId,
          p_actual_units: actualUnits,
          p_last_error: failureDetail,
        },
      ));
    } catch {
      continue;
    }
    if (error) continue;
    const row = firstRow(data);
    if (
      row?.reconciliation_status === "pending" &&
      typeof row?.reconciliation_id === "string"
    ) {
      return "pending";
    }
    if (row?.reconciliation_status === "already_settled") {
      return "already_settled";
    }
  }
  throw new Error("AI usage reconciliation could not be recorded");
}

// deno-lint-ignore no-explicit-any
function firstRow(data: any): any {
  return Array.isArray(data) ? data[0] : data;
}

function toNonNegativeInteger(value: unknown): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

function defaultTokens<T>(value: T): number {
  return toNonNegativeInteger((value as { tokens?: unknown })?.tokens);
}

function defaultOutput<T>(value: T): unknown {
  return (value as { content?: unknown })?.content ?? value;
}

export function contentByteLength(content: unknown): number {
  return new TextEncoder().encode(contentToText(content)).byteLength;
}

function safeCorrelationId(value: string | null | undefined): string {
  const candidate = value?.trim() ?? "";
  return /^[A-Za-z0-9._:-]{1,128}$/u.test(candidate)
    ? candidate
    : "unavailable";
}

function interactionMetadata(params: LogParams): string {
  const requestedCorrelationId = safeCorrelationId(params.correlationId);
  const correlationId = requestedCorrelationId === "unavailable"
    ? crypto.randomUUID()
    : requestedCorrelationId;
  const fields = [
    `feature=${params.feature}`,
    `correlation_id=${correlationId}`,
  ];
  if (params.inputBytes !== undefined) {
    fields.push(`input_bytes=${toNonNegativeInteger(params.inputBytes)}`);
  }
  if (params.outputBytes !== undefined) {
    fields.push(`output_bytes=${toNonNegativeInteger(params.outputBytes)}`);
  }
  return fields.join(";");
}

export async function logInteraction(
  params: LogParams,
  supabase: SupabaseLike,
): Promise<void> {
  try {
    const { error } = await supabase.from("ai_interactions").insert({
      owner_id: params.ownerId,
      assignment_id: params.assignmentId ?? null,
      feature: params.feature,
      model: params.model,
      prompt_summary: interactionMetadata(params),
      tokens_used: toNonNegativeInteger(params.tokensUsed),
    });
    if (error) console.warn("ai_interactions log did not complete");
  } catch {
    console.warn("ai_interactions log did not complete");
  }
}
