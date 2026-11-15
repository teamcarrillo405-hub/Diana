/** Pure, development-only experiment accounting. No network, secrets, or approval grant. */
export const HYBRID_BENCHMARK_VERSION = 'diana-hybrid-benchmark-plan-v1' as const
export const HYBRID_BENCHMARK_LIMITS = Object.freeze({
  model: 'gpt-6-astra' as const,
  cases: 96,
  batchSize: 24,
  batches: 4,
  maxInputBytes: 12_000,
  inputOverheadTokens: 1024,
  maxOutputTokens: 4096,
  inputCentsPerMillion: 1250,
  outputCentsPerMillion: 5000,
  batchCapCents: 1000,
  totalCapCents: 4000,
  priceValidityMs: 24 * 60 * 60 * 1000,
})

export type HybridBenchmarkInput = Readonly<{ caseId: string; system: string; user: string }>
export type HybridPriceSnapshot = Readonly<{
  model: 'gpt-6-astra'
  inputCentsPerMillion: number
  cacheWriteCentsPerMillion: number
  outputCentsPerMillion: number
  verifiedAt: string
  sourceUrl: string
  sourceSha256: string
}>
export type HybridPlanSpec = Readonly<{
  inputs: readonly HybridBenchmarkInput[]
  corpusSha256: string
  promptSha256: string
  codeSha256: string
  priceSnapshot: HybridPriceSnapshot
  createdAt: string
}>
export type HybridPlannedCall = Readonly<{
  caseId: string
  caseIndex: number
  batchIndex: number
  inputBytes: number
  inputSha256: string
  reservationCents: number
}>
export type HybridBenchmarkPlan = Readonly<{
  schema: typeof HYBRID_BENCHMARK_VERSION
  status: 'prepared-awaiting-model-and-budget-approval'
  partition: 'development'
  corpusKind: 'authored-synthetic'
  productionEligible: false
  createdAt: string
  expiresAt: string
  corpusSha256: string
  promptSha256: string
  codeSha256: string
  priceSnapshot: HybridPriceSnapshot
  safetyServices: Readonly<{
    model: 'omni-moderation-latest'
    maxRequests: 192
    unitCostCents: 0
    noRetries: true
  }>
  request: Readonly<{
    model: 'gpt-6-astra'
    reasoning: Readonly<{ effort: 'high' }>
    service_tier: 'default'
    store: false
    tools: readonly []
    max_output_tokens: 4096
  }>
  policy: Readonly<{
    maxInputBytes: 12000
    inputOverheadTokens: 1024
    reservationInputCentsPerMillion: 1250
    reservationOutputCentsPerMillion: 5000
    providerRetries: 0
    attemptsPerCase: 1
    retainIncompleteAndUncertainAttempts: true
    selectBestAttempt: false
    hardCapCents: 4000
  }>
  calls: readonly HybridPlannedCall[]
  batches: readonly Readonly<{ batchIndex: number; cases: 24; reservationCents: number; capCents: 1000 }>[]
  quoteCents: number
  fingerprint: string
}>

function requireContract(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Hybrid benchmark contract: ${message}`)
}
function integer(value: unknown, label: string, minimum = 0): asserts value is number {
  requireContract(typeof value === 'number' && Number.isSafeInteger(value) && !Object.is(value, -0) && value >= minimum, `invalid ${label}`)
}
function hash(value: unknown, label: string): asserts value is string {
  requireContract(typeof value === 'string' && /^[a-f0-9]{64}$/.test(value), `invalid ${label}`)
}
function text(value: unknown, label: string): asserts value is string {
  requireContract(typeof value === 'string' && value.trim().length > 0, `empty or non-string ${label}`)
  for (const point of value) {
    const code = point.codePointAt(0)!
    requireContract(code < 0xd800 || code > 0xdfff, `unpaired UTF-16 surrogate in ${label}`)
  }
}
function timestamp(value: unknown): number {
  requireContract(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value), 'timestamp must be canonical UTC ISO with milliseconds')
  const parsed = Date.parse(value)
  requireContract(Number.isFinite(parsed) && new Date(parsed).toISOString() === value, 'invalid UTC timestamp')
  return parsed
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze)
    Object.freeze(value)
  }
  return value
}

/** Sorted JSON, without undefined, nonfinite numbers, class instances or silent coercion. */
export function canonicalHybridJson(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'number') {
    requireContract(Number.isFinite(value) && !Object.is(value, -0), 'noncanonical JSON number')
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    requireContract(value.every((_, index) => Object.hasOwn(value, index)) && Object.keys(value).length === value.length, 'sparse or decorated array')
    return `[${value.map(canonicalHybridJson).join(',')}]`
  }
  requireContract(typeof value === 'object' && value !== null && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null), 'non-JSON value')
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalHybridJson((value as Record<string, unknown>)[key])}`).join(',')}}`
}

export async function hashHybridValue(value: unknown): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalHybridJson(value)))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

export function hybridInputBytes(input: HybridBenchmarkInput): number {
  requireContract(input && typeof input === 'object', 'input must be an object')
  requireContract(Object.keys(input).sort().join(',') === 'caseId,system,user', 'input fields must be exactly caseId/system/user')
  text(input.caseId, 'case ID')
  requireContract(input.caseId.length <= 160 && /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(input.caseId), 'invalid case ID')
  text(input.system, 'system message')
  text(input.user, 'user message')
  const encoder = new TextEncoder()
  const bytes = encoder.encode(input.system).byteLength + encoder.encode(input.user).byteLength
  requireContract(bytes <= HYBRID_BENCHMARK_LIMITS.maxInputBytes, 'system plus user UTF-8 input exceeds 12000 bytes')
  return bytes
}

/** One token per input byte plus fixed framing overhead; no cache discount assumed. */
export function reserveHybridCallCents(inputBytes: number): number {
  integer(inputBytes, 'input bytes', 1)
  requireContract(inputBytes <= HYBRID_BENCHMARK_LIMITS.maxInputBytes, 'input exceeds fixed byte limit')
  const numerator = (inputBytes + 1024) * 1250 + 4096 * 5000
  return Math.ceil(numerator / 1_000_000)
}

export function validateHybridPriceSnapshot(snapshot: HybridPriceSnapshot, at: string): void {
  requireContract(snapshot && typeof snapshot === 'object', 'missing price snapshot')
  requireContract(Object.keys(snapshot).sort().join(',') === 'cacheWriteCentsPerMillion,inputCentsPerMillion,model,outputCentsPerMillion,sourceSha256,sourceUrl,verifiedAt', 'unexpected price snapshot fields')
  requireContract(snapshot.model === 'gpt-6-astra', 'price belongs to another model')
  integer(snapshot.inputCentsPerMillion, 'input price', 1)
  integer(snapshot.cacheWriteCentsPerMillion, 'cache-write price', 1)
  integer(snapshot.outputCentsPerMillion, 'output price', 1)
  requireContract(Math.max(snapshot.inputCentsPerMillion, snapshot.cacheWriteCentsPerMillion) <= 1250 && snapshot.outputCentsPerMillion <= 5000, 'current price exceeds reserved rate; prepare a new approved budget')
  const checked = timestamp(snapshot.verifiedAt)
  const current = timestamp(at)
  requireContract(current >= checked && current - checked < HYBRID_BENCHMARK_LIMITS.priceValidityMs, 'price snapshot is stale or from the future')
  requireContract(['https://developers.openai.com/api/docs/pricing', 'https://developers.openai.com/api/docs/models/gpt-6-astra'].includes(snapshot.sourceUrl), 'price source must be the exact official pricing/model page')
  hash(snapshot.sourceSha256, 'price evidence SHA256')
}

export async function buildHybridBenchmarkPlan(spec: HybridPlanSpec): Promise<HybridBenchmarkPlan> {
  requireContract(spec && typeof spec === 'object', 'plan specification is required')
  // Snapshot before the first asynchronous digest so caller mutation cannot race the quote.
  spec = JSON.parse(canonicalHybridJson(spec)) as HybridPlanSpec
  requireContract(Object.keys(spec).sort().join(',') === 'codeSha256,corpusSha256,createdAt,inputs,priceSnapshot,promptSha256', 'unexpected plan specification fields')
  hash(spec.corpusSha256, 'corpus SHA256')
  hash(spec.promptSha256, 'prompt SHA256')
  hash(spec.codeSha256, 'code SHA256')
  timestamp(spec.createdAt)
  validateHybridPriceSnapshot(spec.priceSnapshot, spec.createdAt)
  requireContract(Array.isArray(spec.inputs) && spec.inputs.length === 96, 'exactly 96 authored development inputs are required')
  requireContract(new Set(spec.inputs.map(input => input.caseId)).size === 96, 'duplicate case IDs')
  const calls = await Promise.all(spec.inputs.map(async (input, caseIndex) => {
    const inputBytes = hybridInputBytes(input)
    return { caseId: input.caseId, caseIndex, batchIndex: Math.floor(caseIndex / 24), inputBytes,
      inputSha256: await hashHybridValue({ system: input.system, user: input.user }),
      reservationCents: reserveHybridCallCents(inputBytes) }
  }))
  const batches = Array.from({ length: 4 }, (_, batchIndex) => ({ batchIndex, cases: 24 as const,
    reservationCents: calls.filter(call => call.batchIndex === batchIndex).reduce((sum, call) => sum + call.reservationCents, 0), capCents: 1000 as const }))
  const quoteCents = batches.reduce((sum, batch) => sum + batch.reservationCents, 0)
  requireContract(batches.every(batch => batch.reservationCents <= 1000) && quoteCents <= 4000, 'quote exceeds the fixed batch or whole-plan hard cap')
  const payload = {
    schema: HYBRID_BENCHMARK_VERSION, status: 'prepared-awaiting-model-and-budget-approval' as const,
    partition: 'development' as const, corpusKind: 'authored-synthetic' as const, productionEligible: false as const,
    createdAt: spec.createdAt, expiresAt: new Date(timestamp(spec.priceSnapshot.verifiedAt) + HYBRID_BENCHMARK_LIMITS.priceValidityMs).toISOString(),
    corpusSha256: spec.corpusSha256, promptSha256: spec.promptSha256, codeSha256: spec.codeSha256,
    priceSnapshot: { ...spec.priceSnapshot },
    safetyServices: { model: 'omni-moderation-latest' as const, maxRequests: 192 as const,
      unitCostCents: 0 as const, noRetries: true as const },
    request: { model: 'gpt-6-astra' as const, reasoning: { effort: 'high' as const }, service_tier: 'default' as const,
      store: false as const, tools: [] as [], max_output_tokens: 4096 as const },
    policy: { maxInputBytes: 12000 as const, inputOverheadTokens: 1024 as const,
      reservationInputCentsPerMillion: 1250 as const, reservationOutputCentsPerMillion: 5000 as const,
      providerRetries: 0 as const, attemptsPerCase: 1 as const, retainIncompleteAndUncertainAttempts: true as const,
      selectBestAttempt: false as const, hardCapCents: 4000 as const },
    calls, batches, quoteCents,
  }
  return freeze({ ...payload, fingerprint: await hashHybridValue(payload) })
}

/** Call before dispatch with actual frozen inputs; this validates a plan, never authorizes spend. */
export async function validateHybridBenchmarkPlan(plan: HybridBenchmarkPlan, inputs: readonly HybridBenchmarkInput[], at: string): Promise<void> {
  requireContract(plan && typeof plan === 'object', 'missing plan')
  requireContract(timestamp(at) >= timestamp(plan.createdAt) && timestamp(at) < timestamp(plan.expiresAt), 'plan is not currently valid')
  validateHybridPriceSnapshot(plan.priceSnapshot, at)
  const expected = await buildHybridBenchmarkPlan({ inputs, corpusSha256: plan.corpusSha256, promptSha256: plan.promptSha256,
    codeSha256: plan.codeSha256, priceSnapshot: plan.priceSnapshot, createdAt: plan.createdAt })
  requireContract(canonicalHybridJson(plan) === canonicalHybridJson(expected), 'plan fingerprint, input binding, quote, or fixed policy changed')
}

export type HybridAttemptStatus = 'reserved' | 'completed' | 'failed' | 'uncertain'
export type HybridResponseDisposition = 'teaching' | 'scaffold' | 'clarification' | 'abstention'
export type HybridAttempt = Readonly<{
  caseId: string; attemptId: string; reservedAt: string; reservationCents: number; batchIndex: number
  status: HybridAttemptStatus; settledAt?: string; latencyMs?: number; actualCostCents?: number
  disposition?: HybridResponseDisposition; responseSha256?: string; errorCode?: string
}>
export type HybridAttemptLedger = Readonly<{ schema: 'diana-hybrid-attempt-ledger-v1'; planFingerprint: string; attempts: readonly HybridAttempt[] }>

export function emptyHybridAttemptLedger(plan: HybridBenchmarkPlan): HybridAttemptLedger {
  hash(plan.fingerprint, 'plan fingerprint')
  return freeze({ schema: 'diana-hybrid-attempt-ledger-v1', planFingerprint: plan.fingerprint, attempts: [] })
}
function checkLedger(plan: HybridBenchmarkPlan, ledger: HybridAttemptLedger): void {
  requireContract(ledger.schema === 'diana-hybrid-attempt-ledger-v1' && ledger.planFingerprint === plan.fingerprint && Array.isArray(ledger.attempts), 'ledger belongs to another plan')
  requireContract(new Set(ledger.attempts.map(row => row.caseId)).size === ledger.attempts.length && new Set(ledger.attempts.map(row => row.attemptId)).size === ledger.attempts.length, 'duplicate attempt or case; retries are prohibited')
  for (const attempt of ledger.attempts) {
    const call = plan.calls.find(item => item.caseId === attempt.caseId)
    requireContract(call && attempt.reservationCents === call.reservationCents && attempt.batchIndex === call.batchIndex, 'attempt reservation differs from frozen plan')
    text(attempt.attemptId, 'attempt ID')
    requireContract(['reserved', 'completed', 'failed', 'uncertain'].includes(attempt.status), 'invalid attempt status')
    requireContract(timestamp(attempt.reservedAt) >= timestamp(plan.createdAt) && timestamp(attempt.reservedAt) < timestamp(plan.expiresAt), 'attempt reserved outside plan validity')
    if (attempt.status === 'reserved') requireContract(attempt.settledAt === undefined, 'reserved attempt cannot already be settled')
    else {
      requireContract(timestamp(attempt.settledAt) >= timestamp(attempt.reservedAt), 'settlement predates reservation')
      integer(attempt.latencyMs, 'latency')
    }
    if (attempt.actualCostCents !== undefined) {
      integer(attempt.actualCostCents, 'actual cost')
      requireContract(attempt.actualCostCents <= attempt.reservationCents, 'actual cost exceeds reservation; stop dispatch and reconcile')
    }
    if (attempt.status === 'completed') {
      hash(attempt.responseSha256, 'response SHA256')
      requireContract(attempt.actualCostCents !== undefined && ['teaching', 'scaffold', 'clarification', 'abstention'].includes(attempt.disposition ?? ''), 'completed response lacks cost or disposition')
      requireContract(attempt.errorCode === undefined, 'completed response cannot contain an error')
    }
  }
  requireContract(ledger.attempts.reduce((sum, row) => sum + row.reservationCents, 0) <= plan.quoteCents && ledger.attempts.reduce((sum, row) => sum + row.reservationCents, 0) <= 4000, 'ledger exceeds batch quote')
  for (let index = 0; index < 4; index++) requireContract(ledger.attempts.filter(row => row.batchIndex === index).reduce((sum, row) => sum + row.reservationCents, 0) <= 1000, 'ledger exceeds per-batch cap')
}

/** Persist this new ledger BEFORE dispatch. Uncertain requests retain their full reservation. */
export function reserveHybridAttempt(plan: HybridBenchmarkPlan, ledger: HybridAttemptLedger, caseId: string, attemptId: string, at: string): HybridAttemptLedger {
  checkLedger(plan, ledger)
  requireContract(timestamp(at) >= timestamp(plan.createdAt) && timestamp(at) < timestamp(plan.expiresAt), 'dispatch outside plan validity')
  requireContract(!ledger.attempts.some(row => row.caseId === caseId || row.attemptId === attemptId), 'case already attempted; no retry or select-best')
  const call = plan.calls.find(row => row.caseId === caseId)
  requireContract(call, 'case not in frozen plan')
  const result: HybridAttemptLedger = { ...ledger, attempts: [...ledger.attempts, { caseId, attemptId, reservedAt: at,
    reservationCents: call.reservationCents, batchIndex: call.batchIndex, status: 'reserved' }] }
  checkLedger(plan, result)
  return freeze(result)
}

export type HybridAttemptSettlement = Readonly<{ status: 'completed' | 'failed' | 'uncertain'; settledAt: string; latencyMs: number;
  actualCostCents?: number; disposition?: HybridResponseDisposition; responseSha256?: string; errorCode?: string }>

export function settleHybridAttempt(plan: HybridBenchmarkPlan, ledger: HybridAttemptLedger, attemptId: string, settlement: HybridAttemptSettlement): HybridAttemptLedger {
  checkLedger(plan, ledger)
  const attempt = ledger.attempts.find(row => row.attemptId === attemptId)
  requireContract(attempt?.status === 'reserved', 'only one settlement of a reserved attempt is permitted')
  requireContract(settlement && typeof settlement === 'object' && Object.keys(settlement).every(key => ['status', 'settledAt', 'latencyMs', 'actualCostCents', 'disposition', 'responseSha256', 'errorCode'].includes(key)), 'unexpected settlement field')
  requireContract(['completed', 'failed', 'uncertain'].includes(settlement.status), 'invalid settlement status')
  const result = { ...ledger, attempts: ledger.attempts.map(row => row.attemptId === attemptId ? { ...row, ...settlement } : row) }
  checkLedger(plan, result)
  return freeze(result)
}

export type HybridQualityReview = Readonly<{ caseId: string; responseSha256: string; passed: boolean }>
export function summarizeHybridBenchmark(plan: HybridBenchmarkPlan, ledger: HybridAttemptLedger, reviews: readonly HybridQualityReview[] = []) {
  checkLedger(plan, ledger)
  requireContract(new Set(reviews.map(row => row.caseId)).size === reviews.length, 'duplicate quality review')
  const completed = ledger.attempts.filter(row => row.status === 'completed')
  for (const review of reviews) {
    const attempt = completed.find(row => row.caseId === review.caseId)
    requireContract(attempt && review.responseSha256 === attempt.responseSha256 && typeof review.passed === 'boolean', 'quality review is not bound to a completed response')
  }
  const abstentions = completed.filter(row => row.disposition === 'abstention').length
  const successfulTeaching = completed.filter(row => (row.disposition === 'teaching' || row.disposition === 'scaffold') && reviews.some(review => review.caseId === row.caseId && review.passed)).length
  return freeze({ expectedCases: 96, attemptedCases: ledger.attempts.length, completedCases: completed.length,
    coverageRate: completed.length / 96, errorCases: ledger.attempts.filter(row => row.status === 'failed').length,
    uncertainCases: ledger.attempts.filter(row => row.status === 'uncertain' || row.status === 'reserved').length,
    reservedCents: ledger.attempts.reduce((sum, row) => sum + row.reservationCents, 0),
    knownActualCents: ledger.attempts.reduce((sum, row) => sum + (row.actualCostCents ?? 0), 0),
    actualCostComplete: ledger.attempts.every(row => row.actualCostCents !== undefined),
    completedMeanLatencyMs: completed.length ? completed.reduce((sum, row) => sum + row.latencyMs!, 0) / completed.length : null,
    reviewedCases: reviews.length, reviewedPasses: reviews.filter(row => row.passed).length,
    completePopulationPassRate: reviews.filter(row => row.passed).length / 96,
    abstentions, successfulTeachingCases: successfulTeaching,
    completePopulationTeachingPassRate: successfulTeaching / 96,
    allAbstention: completed.length > 0 && abstentions === completed.length,
    qualitySuccess: false as const, qualityAcceptanceRequiresIndependentReview: true as const,
    productionEligible: false as const, populationAccuracyProven: false as const })
}
