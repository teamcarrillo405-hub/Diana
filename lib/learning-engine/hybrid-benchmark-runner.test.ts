/** Mock-only runner integration. No deployment, provider call, or spend authorization. */
import { createHash, randomUUID } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  HYBRID_EDGE_URL, benchmarkCodeClosure, dispatchFor, executeBenchmark, prepareBenchmark,
  validateBenchmarkApproval, validateSavedHybridResponse, validateTerminalReconciliation, verifyBenchmark,
  type HybridDispatch,
} from '../../scripts/learning/hybrid-benchmark'
import { canonicalHybridJson, hashHybridValue, type HybridBenchmarkPlan } from './hybrid-benchmark-contract'
import { HYBRID_BENCHMARK_CASES } from './hybrid-benchmark-cases'

const projectRoot = process.cwd()
const artifactParent = resolve(projectRoot, 'artifacts/learning-engine/research')
const registryPath = 'supabase/functions/_shared/learning/hybrid-approved-fixtures.ts'
const now = '2026-09-28T23:30:00.000Z'
const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'))
const write = (path: string, value: unknown) => writeFileSync(path, canonicalHybridJson(value) + '\n')
const fixtureRoots: string[] = []

interface Fixture {
  root: string
  workspace: string
  output: string
  approvalFile: string
  plan: HybridBenchmarkPlan
}

async function fixture(): Promise<Fixture> {
  const root = resolve(artifactParent, `hybrid-runner-test-${randomUUID()}`)
  mkdirSync(root)
  fixtureRoots.push(root)
  const workspace = resolve(root, 'workspace')
  mkdirSync(workspace)
  for (const path of Object.keys(benchmarkCodeClosure(projectRoot).files)) {
    const destination = resolve(workspace, path)
    mkdirSync(dirname(destination), { recursive: true })
    copyFileSync(resolve(projectRoot, path), destination)
  }
  // The generated registry is excluded from the hash closure but exists in a checkout.
  copyFileSync(resolve(projectRoot, registryPath), resolve(workspace, registryPath))
  const sourceEvidence = { source: 'Synthetic price fixture for offline unit tests; not actual approval or pricing research.' }
  const priceFile = resolve(root, 'synthetic-price.json')
  write(priceFile, { evidence: sourceEvidence, snapshot: {
    model: 'gpt-6-astra', inputCentsPerMillion: 1250, cacheWriteCentsPerMillion: 1250,
    outputCentsPerMillion: 5000, verifiedAt: now,
    sourceUrl: 'https://developers.openai.com/api/docs/pricing', sourceSha256: await hashHybridValue(sourceEvidence),
  } })
  const output = resolve(root, 'prepared')
  const plan = await prepareBenchmark(workspace, output, priceFile)
  const approvalFile = resolve(root, 'synthetic-approval.json')
  write(approvalFile, approval(plan))
  copyFileSync(resolve(output, 'hybrid-approved-fixtures.ts'), resolve(workspace, registryPath))
  write(resolve(output, 'deployment-verification.json'), {
    planFingerprint: plan.fingerprint, codeSha256: plan.codeSha256,
    registrySha256: digest(readFileSync(resolve(workspace, registryPath))), endpoint: HYBRID_EDGE_URL,
    verifyJwt: true, remoteFilesMatch: true, verifiedAt: now,
  })
  return { root, workspace, output, approvalFile, plan }
}

function approval(plan: HybridBenchmarkPlan) {
  return { approvedAt: now, approvedBy: 'unit-test-operator', hardCapCents: 4000,
    model: plan.request.model, planFingerprint: plan.fingerprint,
    userAuthorization: 'Synthetic mock-only authorization fixture. This is not permission for any real paid call.' }
}

function successBody(entry: HybridDispatch, plan: HybridBenchmarkPlan) {
  const feedback = { action: 'hint', feedback: 'Track the supplied quantities one operation at a time.',
    nextQuestion: 'Which quantity would you inspect first?', sourceQuotes: [], limitations: [] }
  return { ok: true, result: { caseId: entry.caseId, requestId: entry.requestId, planSha256: plan.fingerprint,
    startedAt: now, completedAt: new Date().toISOString(), providerResponseId: `mock_${entry.requestId}`,
    resolvedModel: plan.request.model, output: JSON.stringify(feedback), feedback,
    usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120 }, actualCents: 1,
    syntheticInput: true, researchOnly: true, semanticAcceptance: false } }
}

function mockSuccess(plan: HybridBenchmarkPlan) {
  const dispatch = dispatchFor(plan)
  return vi.fn(async (url: string | URL | Request, options?: RequestInit) => {
    expect(url).toBe(HYBRID_EDGE_URL)
    expect(options?.method).toBe('POST')
    expect(options?.redirect).toBe('error')
    expect(options?.signal).toBeInstanceOf(AbortSignal)
    const request = JSON.parse(String(options?.body))
    expect(Object.keys(request).sort()).toEqual(['planSha256', 'requestId'])
    expect(request.planSha256).toBe(plan.fingerprint)
    const entry = dispatch.find(item => item.requestId === request.requestId)
    expect(entry).toBeDefined()
    return new Response(JSON.stringify(successBody(entry!, plan)), { status: 200 })
  })
}

function savedAttempt(item: Fixture, entry: HybridDispatch, interrupted = false) {
  const directory = resolve(item.output, 'attempts', entry.requestId)
  mkdirSync(directory, { recursive: true })
  write(resolve(directory, 'request.json'), { ...entry, planFingerprint: item.plan.fingerprint,
    startedAt: now, reservationCents: item.plan.calls.find(call => call.caseId === entry.caseId)!.reservationCents })
  if (interrupted) write(resolve(directory, 'interruption.json'), {
    status: 503, completedAt: now, latencyMs: 1, disposition: 'uncertain-or-rejected-no-retry', error: 'SyntheticRejection',
  })
  else sealResponse(directory, successBody(entry, item.plan))
  return directory
}

function sealResponse(directory: string, body: unknown) {
  const raw = JSON.stringify(body)
  writeFileSync(resolve(directory, 'response-body.txt'), raw)
  write(resolve(directory, 'response.json'), { status: 200, body, accepted: true, completedAt: now,
    latencyMs: 1, semanticAcceptance: false, responseSha256: digest(raw) })
}

function reconciliation(item: Fixture, entry: HybridDispatch, directory: string) {
  return { action: 'retain-failure-and-continue', planFingerprint: item.plan.fingerprint,
    requestSha256: digest(readFileSync(resolve(directory, 'request.json'))), verifiedAt: now, verifiedBy: 'synthetic test operator',
    reservation: { id: entry.requestId, manifest_hash: item.plan.fingerprint, batch_id: entry.batchId,
      reserved_cents: item.plan.calls.find(call => call.caseId === entry.caseId)!.reservationCents,
      actual_cents: 1, state: 'settled' },
    receipt: { request_id: entry.requestId, requested_model: item.plan.request.model, resolved_model: item.plan.request.model,
      provider_response_id: 'mock-retained-output', input_tokens: 100, output_tokens: 20, total_tokens: 120,
      actual_cents: 1, usage_received_at: now, output_state: 'generation_error' } }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(now))
  vi.stubEnv('DIANA_HYBRID_OPERATOR_ACCESS_TOKEN', 'synthetic-unit-test-token-with-no-real-authority')
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Network disabled in runner tests') }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.useRealTimers()
  for (const root of fixtureRoots.splice(0)) {
    const rel = relative(artifactParent, root)
    if (!rel.startsWith('hybrid-runner-test-') || rel.includes(sep) || resolve(root) === artifactParent) {
      throw new Error('Unsafe synthetic fixture cleanup path')
    }
    rmSync(root, { recursive: true, force: false })
  }
})

describe('hybrid benchmark runner, with network fully mocked', () => {
  it('prepares an exclusive 96-request registry without evaluator-only content', async () => {
    const item = await fixture()
    const source = readFileSync(resolve(item.output, 'hybrid-approved-fixtures.ts'), 'utf8')
    const declaration = source.indexOf('export const APPROVED_HYBRID_PLAN:')
    const registry = JSON.parse(source.slice(source.indexOf(' = ', declaration) + 3).trim().slice(0, -1))
    const requests = Object.values(registry.requests) as { input: string; caseId: string }[]
    expect(requests).toHaveLength(96)
    for (const request of requests) {
      const input = JSON.parse(request.input)
      expect(input.id).toBe(request.caseId)
      expect(input.studentAttempt).toBeTypeOf('string')
      expect(input).not.toHaveProperty('evaluation')
      expect(input).not.toHaveProperty('referenceAnswer')
      const full = HYBRID_BENCHMARK_CASES.find(candidate => candidate.id === request.caseId)!
      expect(request.input).not.toContain(full.evaluation.referenceAnswer)
    }
    await expect(verifyBenchmark(item.workspace, item.output)).resolves.toMatchObject({ plan: { fingerprint: item.plan.fingerprint } })
    await expect(prepareBenchmark(item.workspace, item.output, resolve(item.root, 'synthetic-price.json'))).rejects.toThrow()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('requires exact-model, exact-plan, explicit-cap approval with an appropriate timestamp', async () => {
    const { plan } = await fixture()
    expect(() => validateBenchmarkApproval(approval(plan), plan)).not.toThrow()
    for (const patch of [{ model: 'another-model' }, { planFingerprint: '0'.repeat(64) }, { hardCapCents: 4001 },
      { hardCapCents: 3999 }, { approvedAt: '2026-09-28T23:29:59.999Z' }, { approvedAt: '2026-09-29T00:00:00.000Z' },
      { userAuthorization: 'yes' }, { extraPermission: true }]) {
      expect(() => validateBenchmarkApproval({ ...approval(plan), ...patch }, plan)).toThrow()
    }
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each(['code', 'input', 'price', 'registry'] as const)('blocks %s tampering before dispatch', async kind => {
    const item = await fixture()
    if (kind === 'code') writeFileSync(resolve(item.workspace, 'scripts/learning/hybrid-benchmark.ts'), '\n// altered fixture\n', { flag: 'a' })
    if (kind === 'input') {
      const path = resolve(item.output, 'inputs.json'), value = read(path)
      value[0].user += '\nUnapproved extra instruction'
      write(path, value)
    }
    if (kind === 'price') {
      const path = resolve(item.output, 'price-evidence.json'), value = read(path)
      value.evidence.source = 'Changed price evidence'
      write(path, value)
    }
    if (kind === 'registry') writeFileSync(resolve(item.output, 'hybrid-approved-fixtures.ts'), '// changed', { flag: 'a' })
    await expect(executeBenchmark(item.workspace, item.output, item.approvalFile)).rejects.toThrow()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('requires a matching deployment attestation with JWT enabled before dispatch', async () => {
    const item = await fixture()
    const path = resolve(item.output, 'deployment-verification.json'), deployment = read(path)
    write(path, { ...deployment, verifyJwt: false })
    await expect(executeBenchmark(item.workspace, item.output, item.approvalFile)).rejects.toThrow(/JWT/)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('retains an uncertain timeout and refuses to repeat that request on resume', async () => {
    const item = await fixture()
    const network = vi.fn(async () => { throw new DOMException('Synthetic timeout', 'TimeoutError') })
    vi.stubGlobal('fetch', network)
    await expect(executeBenchmark(item.workspace, item.output, item.approvalFile)).rejects.toThrow(/No automatic retry/)
    const entry = dispatchFor(item.plan)[0], directory = resolve(item.output, 'attempts', entry.requestId)
    expect(read(resolve(directory, 'request.json')).requestId).toBe(entry.requestId)
    expect(read(resolve(directory, 'interruption.json')).disposition).toBe('uncertain-or-rejected-no-retry')
    expect(existsSync(resolve(directory, 'response.json'))).toBe(false)
    await expect(executeBenchmark(item.workspace, item.output, item.approvalFile)).rejects.toThrow(/automatic retries are forbidden/)
    expect(network).toHaveBeenCalledTimes(1)
    expect(readdirSync(resolve(item.output, 'attempts'))).toHaveLength(1)
  })

  it.each(['digest', 'identity', 'cost'] as const)('rejects saved-response %s tampering on resume', async kind => {
    const item = await fixture(), entry = dispatchFor(item.plan)[0]
    const directory = savedAttempt(item, entry)
    if (kind === 'digest') writeFileSync(resolve(directory, 'response-body.txt'), '{}')
    else {
      const body = successBody(entry, item.plan)
      if (kind === 'identity') body.result.caseId = 'different-case'
      else body.result.actualCents = item.plan.calls[0].reservationCents + 1
      sealResponse(directory, body)
    }
    await expect(executeBenchmark(item.workspace, item.output, item.approvalFile)).rejects.toThrow(/Saved response/)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejects resealed incomplete, wrong-model, inconsistent-usage and understated-cost responses', async () => {
    const item = await fixture(), entry = dispatchFor(item.plan)[0]
    const directory = savedAttempt(item, entry)
    const baseline = successBody(entry, item.plan)
    const variants = [
      { ...baseline.result, output: '' },
      { ...baseline.result, resolvedModel: 'another-model' },
      { ...baseline.result, usage: { input_tokens: 100, output_tokens: 20, total_tokens: 121 } },
      { ...baseline.result, actualCents: 0 },
      { ...baseline.result, feedback: { ...baseline.result.feedback, action: 'unapproved_action' } },
    ]
    for (const result of variants) {
      sealResponse(directory, { ok: true, result })
      expect(() => validateSavedHybridResponse(directory, entry, item.plan)).toThrow()
    }
  })

  it('completes 96 mock requests with fixed identities and no semantic acceptance', async () => {
    const item = await fixture(), network = mockSuccess(item.plan)
    vi.stubGlobal('fetch', network)
    await executeBenchmark(item.workspace, item.output, item.approvalFile)
    expect(network).toHaveBeenCalledTimes(96)
    const ids = network.mock.calls.map(([, options]) => JSON.parse(String(options?.body)).requestId)
    expect(new Set(ids).size).toBe(96)
    expect(read(resolve(item.output, 'execution-complete.json'))).toMatchObject({
      cases: 96, completedCases: 96, reconciledFailures: 0, semanticAcceptance: false, productionEligible: false,
    })
  }, 30_000)

  it('stops before another request when the price-validity window expires during execution', async () => {
    const item = await fixture(), normal = mockSuccess(item.plan)
    const network = vi.fn(async (url: string | URL | Request, options?: RequestInit) => {
      const result = await normal(url, options)
      vi.setSystemTime(new Date(Date.parse(item.plan.expiresAt) + 1))
      return result
    })
    vi.stubGlobal('fetch', network)
    await expect(executeBenchmark(item.workspace, item.output, item.approvalFile)).rejects.toThrow(/valid|stale/)
    expect(network).toHaveBeenCalledTimes(1)
    expect(existsSync(resolve(item.output, 'execution-complete.json'))).toBe(false)
  })

  it('reads a refreshed operator token for each request without adding network calls', async () => {
    const item = await fixture(), normal = mockSuccess(item.plan)
    const authorizations: (string | null)[] = []
    const network = vi.fn(async (url: string | URL | Request, options?: RequestInit) => {
      authorizations.push(new Headers(options?.headers).get('authorization'))
      const response = await normal(url, options)
      if (authorizations.length === 1) {
        vi.stubEnv('DIANA_HYBRID_OPERATOR_ACCESS_TOKEN', 'synthetic-refreshed-token-with-no-real-authority')
      }
      return response
    })
    vi.stubGlobal('fetch', network)
    await executeBenchmark(item.workspace, item.output, item.approvalFile)
    expect(network).toHaveBeenCalledTimes(96)
    expect(authorizations[0]).toBe('Bearer synthetic-unit-test-token-with-no-real-authority')
    expect(authorizations.slice(1)).toEqual(Array(95).fill('Bearer synthetic-refreshed-token-with-no-real-authority'))
    expect(read(resolve(item.output, 'execution-complete.json')).completedCases).toBe(96)
  }, 30_000)

  it('does not reconcile unsettled, mismatched, unknown-usage or overrun failures', async () => {
    const item = await fixture(), entry = dispatchFor(item.plan)[0]
    const directory = savedAttempt(item, entry, true), baseline = reconciliation(item, entry, directory)
    const variants = [
      { ...baseline, requestSha256: '0'.repeat(64) },
      { ...baseline, reservation: { ...baseline.reservation, state: 'reserved' } },
      { ...baseline, reservation: { ...baseline.reservation, actual_cents: baseline.reservation.reserved_cents + 1 } },
      { ...baseline, receipt: { ...baseline.receipt, request_id: 'another-request' } },
      { ...baseline, receipt: { ...baseline.receipt, input_tokens: null } },
      { ...baseline, receipt: { ...baseline.receipt, total_tokens: 0 } },
      { ...baseline, receipt: { ...baseline.receipt, actual_cents: 2 } },
      { ...baseline, receipt: { ...baseline.receipt, output_state: 'released' } },
    ]
    for (const value of variants) {
      write(resolve(directory, 'reconciliation.json'), value)
      expect(() => validateTerminalReconciliation(directory, entry, item.plan)).toThrow()
    }
    expect(fetch).not.toHaveBeenCalled()
  })

  it('retains one settled rejected case as a failure and continues the remaining 95 without retrying it', async () => {
    const item = await fixture(), entry = dispatchFor(item.plan)[0]
    const directory = savedAttempt(item, entry, true)
    write(resolve(directory, 'reconciliation.json'), reconciliation(item, entry, directory))
    expect(validateTerminalReconciliation(directory, entry, item.plan)).toBe(1)
    const network = mockSuccess(item.plan)
    vi.stubGlobal('fetch', network)
    await executeBenchmark(item.workspace, item.output, item.approvalFile)
    expect(network).toHaveBeenCalledTimes(95)
    const ids = network.mock.calls.map(([, options]) => JSON.parse(String(options?.body)).requestId)
    expect(ids).not.toContain(entry.requestId)
    expect(read(resolve(item.output, 'execution-complete.json'))).toMatchObject({
      cases: 96, completedCases: 95, reconciledFailures: 1, semanticAcceptance: false,
    })
    expect(existsSync(resolve(directory, 'response.json'))).toBe(false)
  }, 30_000)
})
