import { describe, expect, it } from 'vitest'
import { buildHybridBenchmarkPlan, canonicalHybridJson, emptyHybridAttemptLedger, hashHybridValue,
  hybridInputBytes, reserveHybridAttempt, reserveHybridCallCents, settleHybridAttempt,
  summarizeHybridBenchmark, validateHybridBenchmarkPlan, validateHybridPriceSnapshot,
  type HybridPlanSpec } from './hybrid-benchmark-contract'

const at = '2026-09-29T00:00:00.000Z'
const later = '2026-09-29T00:00:01.000Z'
const sha = (character: string) => character.repeat(64)
function specification(): HybridPlanSpec {
  return { inputs: Array.from({ length: 96 }, (_, i) => ({ caseId: `hybrid-dev-${i}`, system: 'You are a learning coach.', user: `Explain original problem ${i}.` })),
    corpusSha256: sha('a'), promptSha256: sha('b'), codeSha256: sha('c'), createdAt: at,
    priceSnapshot: { model: 'gpt-6-astra', inputCentsPerMillion: 1000, cacheWriteCentsPerMillion: 1250,
      outputCentsPerMillion: 5000, verifiedAt: at, sourceUrl: 'https://developers.openai.com/api/docs/pricing', sourceSha256: sha('d') } }
}
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

describe('hybrid benchmark immutable budget plan', () => {
  it('reserves the entire worst-case output and byte-based input with integer ceilings', () => {
    expect(reserveHybridCallCents(12_000)).toBe(37)
    expect(reserveHybridCallCents(1)).toBe(22)
    for (const invalid of [true, '12000', NaN, Infinity, -1, 0, -0, 1.5, 12_001, Number.MAX_SAFE_INTEGER]) {
      expect(() => reserveHybridCallCents(invalid as number)).toThrow()
    }
  })

  it('counts UTF-8 for both messages, rejects malformed Unicode and unknown request fields', () => {
    expect(hybridInputBytes({ caseId: 'x', system: 'é', user: '😀' })).toBe(6)
    expect(hybridInputBytes({ caseId: 'x', system: 'a', user: 'x'.repeat(11_999) })).toBe(12_000)
    for (const input of [
      { caseId: 'x', system: 'a', user: '😀'.repeat(3000) },
      { caseId: 'x', system: '\ud800', user: 'x' },
      { caseId: 'x', system: 'x', user: '\udfff' },
      { caseId: 'x', system: 'x', user: '' },
      { caseId: '../x', system: 'x', user: 'y' },
      { caseId: 'x', system: 'x', user: 42 },
      { caseId: 'x', system: 'x', user: 'y', tools: [{ name: 'search' }] },
    ]) expect(() => hybridInputBytes(input as Parameters<typeof hybridInputBytes>[0])).toThrow()
  })

  it('quotes four fixed batches and binds an immutable exact request policy', async () => {
    const spec = specification()
    const worst = { ...spec, inputs: spec.inputs.map(row => ({ ...row, system: 's', user: 'x'.repeat(11_999) })) }
    const plan = await buildHybridBenchmarkPlan(worst)
    expect(plan.quoteCents).toBe(3552)
    expect(plan.batches.map(batch => batch.reservationCents)).toEqual([888, 888, 888, 888])
    expect(plan.calls[23].batchIndex).toBe(0)
    expect(plan.calls[24].batchIndex).toBe(1)
    expect(plan.calls[95].batchIndex).toBe(3)
    expect(plan.request).toEqual({ model: 'gpt-6-astra', reasoning: { effort: 'high' }, service_tier: 'default', store: false, tools: [], max_output_tokens: 4096 })
    expect(plan.safetyServices).toEqual({ model: 'omni-moderation-latest', maxRequests: 192, unitCostCents: 0, noRetries: true })
    expect(Object.isFrozen(plan.safetyServices)).toBe(true)
    expect(plan.status).toBe('prepared-awaiting-model-and-budget-approval')
    expect(plan.policy.providerRetries).toBe(0)
    expect(plan.policy.selectBestAttempt).toBe(false)
    expect(Object.isFrozen(plan)).toBe(true)
    expect(Object.isFrozen(plan.calls[0])).toBe(true)
    expect(Object.isFrozen(plan.request.reasoning)).toBe(true)
    await validateHybridBenchmarkPlan(plan, worst.inputs, later)
  })

  it('requires exactly 96 distinct case identities and rejects coercion or protocol overrides', async () => {
    const spec = specification()
    for (const inputs of [spec.inputs.slice(1), [...spec.inputs, spec.inputs[0]], [...spec.inputs.slice(0, 95), spec.inputs[0]]]) {
      await expect(buildHybridBenchmarkPlan({ ...spec, inputs })).rejects.toThrow()
    }
    await expect(buildHybridBenchmarkPlan({ ...spec, model: 'other' } as HybridPlanSpec)).rejects.toThrow()
    await expect(buildHybridBenchmarkPlan({ ...spec, codeSha256: 'c'.repeat(63) })).rejects.toThrow()
    await expect(buildHybridBenchmarkPlan({ ...spec, inputs: null } as unknown as HybridPlanSpec)).rejects.toThrow()
  })

  it('refuses stale, future, changed-model or above-ceiling current price evidence', () => {
    const price = specification().priceSnapshot
    validateHybridPriceSnapshot(price, later)
    for (const changed of [
      { ...price, inputCentsPerMillion: 1251 }, { ...price, cacheWriteCentsPerMillion: 1251 },
      { ...price, outputCentsPerMillion: 5001 }, { ...price, inputCentsPerMillion: true },
      { ...price, outputCentsPerMillion: 0 }, { ...price, model: 'gpt-other' },
      { ...price, verifiedAt: '2026-09-30T00:00:00.000Z' },
      { ...price, verifiedAt: '2026-09-28T00:00:00.000Z' },
      { ...price, verifiedAt: '2026-02-31T00:00:00.000Z' },
      { ...price, verifiedAt: '2026-09-29T00:00:00' },
      { ...price, sourceUrl: 'https://developers.openai.com.evil.example/api/docs/pricing' },
      { ...price, sourceSha256: 'unverified' },
    ]) expect(() => validateHybridPriceSnapshot(changed as typeof price, at)).toThrow()
  })

  it('fingerprints input order, content, corpus, prompt, code and price evidence', async () => {
    const spec = specification()
    const original = await buildHybridBenchmarkPlan(spec)
    expect((await buildHybridBenchmarkPlan(spec)).fingerprint).toBe(original.fingerprint)
    for (const changed of [
      { ...spec, corpusSha256: sha('e') }, { ...spec, promptSha256: sha('e') }, { ...spec, codeSha256: sha('e') },
      { ...spec, priceSnapshot: { ...spec.priceSnapshot, sourceSha256: sha('e') } },
      { ...spec, inputs: [...spec.inputs].reverse() },
      { ...spec, inputs: spec.inputs.map((row, i) => i ? row : { ...row, user: 'Different problem' }) },
    ]) expect((await buildHybridBenchmarkPlan(changed)).fingerprint).not.toBe(original.fingerprint)
    const mutable = clone(spec)
    const pending = buildHybridBenchmarkPlan(mutable)
    ;(mutable.priceSnapshot as { outputCentsPerMillion: number }).outputCentsPerMillion = 99_999
    expect((await pending).fingerprint).toBe(original.fingerprint)
  })

  it('reconstructs quotes and policies even when a tampered plan is rehashed', async () => {
    const spec = specification()
    const plan = await buildHybridBenchmarkPlan(spec)
    const mutations: [string[], unknown][] = [
      [['quoteCents'], 4001], [['calls', '0', 'reservationCents'], 0],
      [['calls', '0', 'inputBytes'], 1], [['calls', '0', 'batchIndex'], 3],
      [['batches', '0', 'reservationCents'], 1001], [['request', 'model'], 'other'],
      [['request', 'max_output_tokens'], 8192], [['request', 'service_tier'], 'priority'],
      [['request', 'store'], true], [['request', 'tools'], [{ type: 'web_search' }]],
      [['policy', 'providerRetries'], 1], [['status'], 'approved'],
      [['safetyServices', 'model'], 'other'], [['safetyServices', 'maxRequests'], 193],
      [['safetyServices', 'unitCostCents'], 1], [['safetyServices', 'noRetries'], false],
    ]
    for (const [path, value] of mutations) {
      const changed = clone(plan)
      let cursor = changed as unknown as Record<string, unknown>
      for (const key of path.slice(0, -1)) cursor = cursor[key] as Record<string, unknown>
      cursor[path[path.length - 1]] = value
      const { fingerprint: _old, ...payload } = changed
      ;(changed as { fingerprint: string }).fingerprint = await hashHybridValue(payload)
      await expect(validateHybridBenchmarkPlan(changed, spec.inputs, later)).rejects.toThrow()
    }
    await expect(validateHybridBenchmarkPlan(plan, spec.inputs, '2026-09-30T00:00:00.000Z')).rejects.toThrow()
    await expect(validateHybridBenchmarkPlan(plan, [...spec.inputs].reverse(), later)).rejects.toThrow()
  })

  it('canonical hashing rejects values which JSON would silently drop or coerce', () => {
    expect(canonicalHybridJson({ z: 1, a: ['é', true] })).toBe('{"a":["é",true],"z":1}')
    for (const invalid of [undefined, NaN, Infinity, -0, new Date(), { a: undefined }, [, 1]]) {
      expect(() => canonicalHybridJson(invalid)).toThrow()
    }
  })
})

describe('hybrid benchmark incomplete-attempt preservation and separated metrics', () => {
  it('keeps uncertain costs reserved and prohibits retries or replacing settled attempts', async () => {
    const plan = await buildHybridBenchmarkPlan(specification())
    const initial = emptyHybridAttemptLedger(plan)
    const reserved = reserveHybridAttempt(plan, initial, plan.calls[0].caseId, 'attempt-1', at)
    expect(initial.attempts).toHaveLength(0)
    const uncertain = settleHybridAttempt(plan, reserved, 'attempt-1', { status: 'uncertain', settledAt: later, latencyMs: 1000, errorCode: 'timeout' })
    expect(summarizeHybridBenchmark(plan, uncertain)).toMatchObject({ uncertainCases: 1, completedCases: 0, reservedCents: plan.calls[0].reservationCents, actualCostComplete: false, qualitySuccess: false })
    expect(() => reserveHybridAttempt(plan, uncertain, plan.calls[0].caseId, 'retry', later)).toThrow()
    expect(() => reserveHybridAttempt(plan, uncertain, plan.calls[1].caseId, 'attempt-1', later)).toThrow()
    expect(() => settleHybridAttempt(plan, uncertain, 'attempt-1', { status: 'completed', settledAt: later, latencyMs: 1000, actualCostCents: 1, responseSha256: sha('e'), disposition: 'teaching' })).toThrow()
  })

  it('rejects forged reservations, cost overruns, incomplete success and invalid latency', async () => {
    const plan = await buildHybridBenchmarkPlan(specification())
    const reserved = reserveHybridAttempt(plan, emptyHybridAttemptLedger(plan), plan.calls[0].caseId, 'attempt', at)
    const settlements = [
      { status: 'completed', settledAt: later, latencyMs: 1000 },
      { status: 'uncertain', settledAt: later, latencyMs: -1 },
      { status: 'failed', settledAt: later, latencyMs: NaN },
      { status: 'failed', settledAt: later, latencyMs: 1000, actualCostCents: 1001 },
      { status: 'failed', settledAt: at, latencyMs: true },
      { status: 'failed', settledAt: '2026-09-28T23:00:00.000Z', latencyMs: 1000 },
      { status: 'failed', settledAt: later, latencyMs: 1000, caseId: 'changed' },
    ]
    for (const value of settlements) expect(() => settleHybridAttempt(plan, reserved, 'attempt', value as Parameters<typeof settleHybridAttempt>[3])).toThrow()
    const forged = clone(reserved)
    ;(forged.attempts[0] as { reservationCents: number }).reservationCents = 0
    expect(() => reserveHybridAttempt(plan, forged, plan.calls[1].caseId, 'second', later)).toThrow()
  })

  it('never reports all abstentions as quality success despite full completion and positive reviews', async () => {
    const plan = await buildHybridBenchmarkPlan(specification())
    let ledger = emptyHybridAttemptLedger(plan)
    for (const call of plan.calls) {
      ledger = reserveHybridAttempt(plan, ledger, call.caseId, `attempt-${call.caseIndex}`, at)
      ledger = settleHybridAttempt(plan, ledger, `attempt-${call.caseIndex}`, { status: 'completed', settledAt: later, latencyMs: 1000, actualCostCents: 2, disposition: 'abstention', responseSha256: sha('e') })
    }
    const reviews = plan.calls.map(call => ({ caseId: call.caseId, responseSha256: sha('e'), passed: true }))
    expect(summarizeHybridBenchmark(plan, ledger, reviews)).toMatchObject({ coverageRate: 1, reviewedPasses: 96, allAbstention: true, successfulTeachingCases: 0, qualitySuccess: false, productionEligible: false })
  })

  it('keeps missing-case denominator and binds quality ratings to exact responses', async () => {
    const plan = await buildHybridBenchmarkPlan(specification())
    let ledger = reserveHybridAttempt(plan, emptyHybridAttemptLedger(plan), plan.calls[0].caseId, 'one', at)
    ledger = settleHybridAttempt(plan, ledger, 'one', { status: 'completed', settledAt: later, latencyMs: 1000, actualCostCents: 2, disposition: 'teaching', responseSha256: sha('e') })
    const review = { caseId: plan.calls[0].caseId, responseSha256: sha('e'), passed: true }
    expect(summarizeHybridBenchmark(plan, ledger, [review])).toMatchObject({ completedCases: 1, coverageRate: 1 / 96, completePopulationPassRate: 1 / 96, qualitySuccess: false })
    expect(() => summarizeHybridBenchmark(plan, ledger, [{ ...review, responseSha256: sha('f') }])).toThrow()
    expect(() => summarizeHybridBenchmark(plan, ledger, [review, review])).toThrow()
    expect(() => summarizeHybridBenchmark(plan, ledger, [{ ...review, passed: 1 } as unknown as typeof review])).toThrow()
  })
})
