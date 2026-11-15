import { describe, expect, it } from 'vitest'
import { mkdtempSync, readFileSync, rmSync, truncateSync } from 'node:fs'
import { resolve } from 'node:path'
import { integratedHash as h, integratedTraceDigest, renderIntegratedUser, verifyIntegratedEvaluation,
  type IntegratedBundle, type IntegratedTrace } from './integrated-grounding-evaluation'
import { verifyIntegratedFile } from '../../scripts/learning/integrated-grounding-evaluation'
import { writeFileSync } from 'node:fs'

// Opaque contract-integrity bytes only. This is not an evaluation/training corpus.
const zero = '0'.repeat(64), one = '1'.repeat(64)
const owner = '11111111-1111-4111-8111-111111111111', assignment = '22222222-2222-4222-8222-222222222222'
async function fixture(count = 1): Promise<IntegratedBundle> {
  const exclusions: IntegratedBundle['exclusions'] = { schema: 'integrated-exclusions-v1', inventoryComplete: true, custodianId: 'custodian', reviewReference: 'opaque-reference',
    artifacts: [{ artifactSha256: one, role: 'development', componentIds: ['excluded-component'], familyIds: ['excluded-family'] }] }
  const pages = [{ number: 1, text: 'opaque-contract-bytes' }]
  const manifest: IntegratedBundle['manifest'] = { schema: 'integrated-grounding-v1', runId: 'contract-only', scope: 'authored-confirmed-text',
    corpusSha256: zero, exclusionSha256: await h(exclusions), codeSha256: one, system: 'opaque-system', model: 'stub-only', options: { temperature: 0, seed: 1, maxOutputTokens: 20 },
    ownerId: owner, assignmentId: assignment, familyReview: { authorId: 'author', reviewerId: 'family-reviewer', reviewReference: 'opaque-reference', complete: true, authorFreshContext: true },
    families: [{ id: 'family', componentId: 'component', documentFamily: 'doc', templateFamily: 'template', reasoningFamily: 'reasoning' }],
    sources: [{ id: 'source', versionId: one, contentHash: await h(pages), componentId: 'component', ownerId: owner, assignmentId: assignment, provenance: 'authored_synthetic', confirmed: true, pages }],
    cases: [] }
  for (let i = 0; i < count; i++) {
    const input = { query: 'opaque-query-' + i, studentAttempt: 'opaque-attempt', sourceIds: ['source'] }
    manifest.cases.push({ id: 'case-' + i, familyId: 'family', subject: 'contract', band: 'contract', ...input, inputSha256: await h(input) })
  }
  manifest.corpusSha256 = await h({ families: manifest.families, sources: manifest.sources, cases: manifest.cases })
  const manifestSha256 = await h(manifest)
  const traces: IntegratedTrace[] = []
  for (const c of manifest.cases) {
    const anchor = { sourceId: 'source', versionId: one, contentHash: manifest.sources[0].contentHash, page: 1, start: 0, end: 6, exactText: 'opaque' }
    const retrieval = { query: c.query, status: 'matched' as const, method: 'keyword' as const, candidates: [anchor], selected: [anchor], durationMs: 1 }
    const request = { model: manifest.model, options: manifest.options, system: manifest.system, user: renderIntegratedUser(c, retrieval.selected) }
    const response = { status: 'complete' as const, content: 'opaque-output', done: true, doneReason: 'stop', model: manifest.model, inputTokens: 4, outputTokens: 3, durationMs: 2 }
    const execution = { runId: manifest.runId, caseId: c.id, requestId: 'request-' + c.id, requestSha256: await h(request), responseSha256: await h(response),
      providerResponseId: 'stub-receipt-' + c.id, status: response.status, model: manifest.model, actualCents: 0, startedAt: '2026-09-29T00:00:00Z', completedAt: '2026-09-29T00:00:01Z', attempt: 1 as const, settled: true }
    const t: IntegratedTrace = { caseId: c.id, manifestSha256, inputSha256: c.inputSha256, retrieval, retrievalSha256: await h(retrieval), evidenceSha256: await h(retrieval.selected),
      request, requestSha256: await h(request), response, responseSha256: await h(response), execution, executionSha256: await h(execution), traceSha256: zero, judgments: [] }
    await reseal(t)
    traces.push(t)
  }
  return { manifest, exclusions, traces }
}
async function reseal(t: IntegratedTrace) {
  t.retrievalSha256 = await h(t.retrieval); t.evidenceSha256 = await h(t.retrieval.selected)
  t.requestSha256 = await h(t.request); t.responseSha256 = await h(t.response)
  t.execution.requestSha256 = t.requestSha256; t.execution.responseSha256 = t.responseSha256
  t.executionSha256 = await h(t.execution); t.traceSha256 = await integratedTraceDigest(t)
  t.judgments = ['rater-1', 'rater-2'].map(reviewerId => ({ reviewerId, kind: 'ai_engineering', contextDisclosure: 'Contract test only', traceSha256: t.traceSha256,
    responseSha256: t.responseSha256, notes: 'Opaque contract assertion', dimensions: { accuracy: true, teaching: true, evidence: true, restraint: true, premiseIntegrity: true } }))
}
const verify = async (b: IntegratedBundle) => verifyIntegratedEvaluation(b, { manifestSha256: await h(b.manifest), exclusionSha256: await h(b.exclusions) })

describe('offline integrated contract, no held-out content or model IO', () => {
  it('validates complete frozen traces without granting production or educator approval', async () => {
    expect(await verify(await fixture())).toMatchObject({ status: 'incomplete', denominator: 1, passes: 1, thresholdMet: false, submittedJudgmentThresholdMet: true,
      reviewerAuthorityVerified: false, executionAuthorityVerified: false, productionEligible: false, educatorValidated: false, semanticFamilyIndependenceProven: false })
  })
  it('preserves missing cases in denominator and marks missing judgments incomplete', async () => {
    const b = await fixture(2); b.traces.pop(); b.traces[0].judgments = []
    expect(await verify(b)).toMatchObject({ status: 'incomplete', denominator: 2, passes: 0, thresholdMet: false })
  })
  it('enforces the exact 95 percent threshold without rounding up a sub-threshold count', async () => {
    const b = await fixture(20)
    b.traces[0].judgments.forEach(j => { j.dimensions.accuracy = false })
    expect(await verify(b)).toMatchObject({ passes: 19, requiredPasses: 19, submittedJudgmentThresholdMet: true, thresholdMet: false })
    b.traces[1].judgments.forEach(j => { j.dimensions.accuracy = false })
    b.claimedThresholdMet = true
    expect(await verify(b)).toMatchObject({ status: 'invalid', passes: 18, thresholdMet: false, errors: ['false_threshold_claim'] })
  })
  it.each(['version', 'scope', 'quote', 'prompt', 'model', 'receipt', 'truncation'])('rejects resealed %s tampering', async mode => {
    const b = await fixture(), t = b.traces[0]
    if (mode === 'version') t.retrieval.candidates[0].versionId = zero
    if (mode === 'scope') t.retrieval.candidates[0].sourceId = 'not-authorized'
    if (mode === 'quote') t.retrieval.candidates[0].exactText = 'forged'
    if (mode === 'prompt') t.request.user += 'private expected-answer field'
    if (mode === 'model') t.response.model = 'other-model'
    if (mode === 'receipt') t.execution.caseId = 'other-case'
    if (mode === 'truncation') t.response.outputTokens = b.manifest.options.maxOutputTokens
    await reseal(t)
    expect(await verify(b)).toMatchObject({ status: 'invalid', thresholdMet: false })
  })
  it('rejects missing execution receipts and extra confidence fields', async () => {
    const b = await fixture()
    const raw = JSON.parse(JSON.stringify(b)); delete raw.traces[0].execution
    await expect(verifyIntegratedEvaluation(raw, { manifestSha256: await h(b.manifest), exclusionSha256: await h(b.exclusions) })).rejects.toThrow()
    await expect(verifyIntegratedEvaluation({ ...b, learnedConfidence: 0.99 }, { manifestSha256: await h(b.manifest), exclusionSha256: await h(b.exclusions) })).rejects.toThrow()
  })
  it('rejects family/component exclusion overlap even when new hashes are supplied', async () => {
    const b = await fixture(); b.exclusions.artifacts[0].componentIds.push('component'); b.manifest.exclusionSha256 = await h(b.exclusions)
    const report = await verify(b)
    expect(report.errors).toContain('excluded_family:family'); expect(report.errors).toContain('excluded_source:source')
  })
  it('rejects changed trusted manifest, duplicate trace and duplicate request identity', async () => {
    const b = await fixture(), pin = await h(b.manifest); b.manifest.system += ' changed'
    expect((await verifyIntegratedEvaluation(b, { manifestSha256: pin, exclusionSha256: await h(b.exclusions) })).errors).toContain('manifest_digest_mismatch')
    b.traces.push(b.traces[0]); expect((await verify(b)).errors).toContain('duplicate_trace_or_request')
  })
  it('rejects reused provider responses even when distinct requests and hashes are otherwise valid', async () => {
    const b = await fixture(2)
    b.traces[1].execution.providerResponseId = b.traces[0].execution.providerResponseId
    await reseal(b.traces[1])
    const report = await verify(b)
    expect(report.errors).toContain('duplicate_provider_response')
    expect(report).toMatchObject({ status: 'invalid', passes: 0, observedRate: 0, thresholdMet: false, submittedJudgmentThresholdMet: false })
    expect(report.rows.every(row => row.state === 'invalid' && !row.pass)).toBe(true)
  })
  it.each(['manifest-pin', 'source-content', 'exclusion'])('invalidates every row when global %s integrity fails', async failure => {
    const b = await fixture(2)
    const trusted = { manifestSha256: await h(b.manifest), exclusionSha256: await h(b.exclusions) }
    if (failure === 'manifest-pin') trusted.manifestSha256 = zero
    if (failure === 'source-content') {
      b.manifest.sources[0].pages[0].text += ' changed outside selected span'
      b.manifest.corpusSha256 = await h({ families: b.manifest.families, sources: b.manifest.sources, cases: b.manifest.cases })
      trusted.manifestSha256 = await h(b.manifest)
      for (const trace of b.traces) { trace.manifestSha256 = trusted.manifestSha256; await reseal(trace) }
    }
    if (failure === 'exclusion') b.exclusions.inventoryComplete = false
    const report = await verifyIntegratedEvaluation(b, trusted)
    expect(report).toMatchObject({ status: 'invalid', denominator: 2, passes: 0, observedRate: 0, submittedJudgmentThresholdMet: false, thresholdMet: false })
    expect(report.rows.every(row => row.state === 'invalid' && !row.pass)).toBe(true)
    if (failure === 'source-content') expect(report.errors).toContain('source_digest:source')
  })
  it('keeps errors, timeouts, explicit truncation and unsettled charges out of acceptance', async () => {
    const b = await fixture(), t = b.traces[0]
    t.response.status = 'timeout'; t.response.content = null; t.response.done = false; t.execution.status = 'timeout'; t.execution.settled = false
    await reseal(t)
    expect(await verify(b)).toMatchObject({ status: 'incomplete', denominator: 1, passes: 0, unavailableIntegrity: true, thresholdMet: false })
  })
  it('cannot use reviewer disagreement or fabricated premises as a pass', async () => {
    const b = await fixture(); b.traces[0].judgments[0].dimensions.premiseIntegrity = false
    expect(await verify(b)).toMatchObject({ status: 'incomplete', passes: 0, thresholdMet: false })
    b.traces[0].judgments[1].dimensions.premiseIntegrity = false
    expect(await verify(b)).toMatchObject({ confirmedFabrication: true, thresholdMet: false })
  })
  it('CLI writes an exclusive report and never overwrites source or existing output', async () => {
    const dir = mkdtempSync(resolve('artifacts', 'integrated-contract-test-'))
    try {
      const b = await fixture(), input = resolve(dir, 'input.json'), output = resolve(dir, 'report.json')
      writeFileSync(input, JSON.stringify(b))
      const args = ['verify', input, '--manifest-sha256', await h(b.manifest), '--exclusion-sha256', await h(b.exclusions), output]
      expect((await verifyIntegratedFile(args)).submittedJudgmentThresholdMet).toBe(true)
      await expect(verifyIntegratedFile(args)).rejects.toThrow()
      expect(JSON.parse(readFileSync(input, 'utf8'))).toEqual(b)
      truncateSync(input, 16 * 1024 * 1024 + 1)
      await expect(verifyIntegratedFile([...args.slice(0, 6), resolve(dir, 'oversize-report.json')])).rejects.toThrow('16 MiB')
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })
})
