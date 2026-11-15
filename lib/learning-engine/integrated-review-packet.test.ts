import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, truncateSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildIntegratedReviewPacket } from './integrated-review-packet'
import { buildIntegratedReviewFiles } from '../../scripts/learning/integrated-review-packet'
import { integratedHash as hash, integratedTraceDigest, renderIntegratedUser, type IntegratedBundle } from './integrated-grounding-evaluation'

// Opaque protocol-integrity bytes only; not an educational, training or held-out corpus.
const zeros = '0'.repeat(64), secret = 'a'.repeat(64)
async function fixture(): Promise<IntegratedBundle> {
  const pages = [{ number: 1, text: 'opaque 😀 bytes\nremaining bytes' }]
  const exclusions: IntegratedBundle['exclusions'] = { schema: 'integrated-exclusions-v1', inventoryComplete: true,
    custodianId: 'hidden-custodian', reviewReference: 'hidden-exclusion-review',
    artifacts: [{ artifactSha256: zeros, role: 'development', componentIds: ['excluded'], familyIds: ['excluded'] }] }
  const input = { query: 'opaque query', studentAttempt: 'opaque attempt', sourceIds: ['hidden-source'] }
  const manifest: IntegratedBundle['manifest'] = {
    schema: 'integrated-grounding-v1', runId: 'hidden-run', scope: 'authored-confirmed-text', corpusSha256: zeros,
    exclusionSha256: await hash(exclusions), codeSha256: zeros, system: 'hidden-system', model: 'hidden-model',
    options: { temperature: 0, seed: 3, maxOutputTokens: 10 },
    ownerId: '11111111-1111-4111-8111-111111111111', assignmentId: '22222222-2222-4222-8222-222222222222',
    familyReview: { authorId: 'hidden-author', reviewerId: 'hidden-reviewer', reviewReference: 'hidden-review', complete: true, authorFreshContext: true },
    families: [{ id: 'hidden-family', componentId: 'component', documentFamily: 'document', templateFamily: 'template', reasoningFamily: 'reasoning' }],
    sources: [{ id: 'hidden-source', versionId: zeros, contentHash: await hash(pages), componentId: 'component',
      ownerId: '11111111-1111-4111-8111-111111111111', assignmentId: '22222222-2222-4222-8222-222222222222', provenance: 'authored_synthetic', confirmed: true, pages }],
    cases: [0, 1].map(i => ({ id: 'hidden-case-' + i, familyId: 'hidden-family', subject: 'protocol', band: 'protocol', ...input, inputSha256: zeros })),
  }
  for (const item of manifest.cases) item.inputSha256 = await hash(input)
  manifest.corpusSha256 = await hash({ families: manifest.families, sources: manifest.sources, cases: manifest.cases })
  const traces: IntegratedBundle['traces'] = []
  for (const item of manifest.cases) {
    const anchor = { sourceId: 'hidden-source', versionId: zeros, contentHash: manifest.sources[0].contentHash, page: 1, start: 7, end: 9, exactText: '😀' }
    const retrieval = { query: item.query, status: 'matched' as const, method: 'keyword' as const, candidates: [anchor], selected: [anchor], durationMs: 1 }
    const request = { model: manifest.model, options: manifest.options, system: manifest.system, user: renderIntegratedUser(item, retrieval.selected) }
    const response = { status: 'complete' as const, content: 'opaque delivered bytes', done: true, doneReason: 'stop', model: manifest.model, inputTokens: 1, outputTokens: 1, durationMs: 1 }
    const execution = { runId: manifest.runId, caseId: item.id, requestId: 'hidden-request-' + item.id, requestSha256: await hash(request), responseSha256: await hash(response),
      providerResponseId: 'hidden-provider-' + item.id, status: response.status, model: manifest.model, actualCents: 7,
      startedAt: '2026-09-29T00:00:00Z', completedAt: '2026-09-29T00:00:01Z', attempt: 1 as const, settled: true }
    traces.push({ caseId: item.id, manifestSha256: await hash(manifest), inputSha256: item.inputSha256,
      retrieval, retrievalSha256: await hash(retrieval), evidenceSha256: await hash(retrieval.selected), request, requestSha256: await hash(request),
      response, responseSha256: await hash(response), execution, executionSha256: await hash(execution), traceSha256: zeros, judgments: [] })
  }
  const bundle = { manifest, exclusions, traces }
  await reseal(bundle)
  return bundle
}
async function reseal(bundle: IntegratedBundle) {
  for (const trace of bundle.traces) {
    trace.retrievalSha256 = await hash(trace.retrieval); trace.evidenceSha256 = await hash(trace.retrieval.selected)
    trace.requestSha256 = await hash(trace.request); trace.responseSha256 = await hash(trace.response)
    trace.execution.requestSha256 = trace.requestSha256; trace.execution.responseSha256 = trace.responseSha256
    trace.executionSha256 = await hash(trace.execution); trace.traceSha256 = await integratedTraceDigest(trace)
  }
}
const pins = async (bundle: IntegratedBundle) => ({ manifestSha256: await hash(bundle.manifest), exclusionSha256: await hash(bundle.exclusions) })
const build = async (bundle: IntegratedBundle, key = secret) => buildIntegratedReviewPacket(bundle, await pins(bundle), key)

describe('offline blinded review packet', () => {
  it('retains exact full truth, UTF-16 evidence and delivered text; hides structured metadata', async () => {
    const bundle = await fixture(), before = JSON.stringify(bundle), result = await build(bundle)
    expect(JSON.stringify(bundle)).toBe(before)
    expect(result.packet.denominator).toBe(2)
    const task = result.packet.tasks[0]
    expect(task.question).toBe(bundle.manifest.cases[0].query)
    expect(task.studentAttempt).toBe(bundle.manifest.cases[0].studentAttempt)
    expect(task.declaredSources[0].pages).toEqual(bundle.manifest.sources[0].pages)
    expect(task.retrievedEvidence.selected[0]).toMatchObject({ start: 7, end: 9, exactText: '😀' })
    expect(task.deliveredResponse.content).toBe(bundle.traces[0].response.content)
    expect(JSON.stringify(result.packet)).not.toContain('hidden-')
    expect(JSON.stringify(result.packet)).not.toContain(secret)
    expect(result.mapping.bindings[0]).toMatchObject({ taskSha256: await hash(task) })
    expect(result.packetSha256).toBe(await hash(result.packet))
    expect(result.mappingSha256).toBe(await hash(result.mapping))
    expect(result.packet).toMatchObject({ humanAuthorityVerified: false, productionEligible: false, thresholdMet: false, semanticFamilyIndependenceProven: false })
  })
  it('is repeatable for a private key and changes opaque assignments with a fresh key', async () => {
    const bundle = await fixture()
    expect(await build(bundle)).toEqual(await build(bundle))
    expect((await build(bundle)).packet.tasks.map(t => t.taskId)).not.toEqual((await build(bundle, 'b'.repeat(64))).packet.tasks.map(t => t.taskId))
    await expect(build(bundle, 'public-name')).rejects.toThrow()
  })
  it('omits other reviews while binding the full submitted bundle in operator mapping', async () => {
    const bundle = await fixture(), trace = bundle.traces[0]
    trace.judgments = [{ reviewerId: 'hidden-rater', kind: 'ai_engineering', contextDisclosure: 'hidden-context', traceSha256: trace.traceSha256,
      responseSha256: trace.responseSha256, notes: 'hidden-notes', dimensions: { accuracy: false, teaching: false, evidence: false, restraint: false, premiseIntegrity: false } }]
    const result = await build(bundle)
    expect(JSON.stringify(result.packet)).not.toContain('hidden-')
    expect(result.mapping.bundleSha256).toBe(await hash(bundle))
    expect(result.mapping.unresolved).toContain('review_authority_unverified')
  })
  it.each(['missing', 'duplicate', 'unknown', 'provider-reuse', 'offset', 'version', 'provenance', 'pin', 'claim', 'exclusion'])('rejects %s integrity failures', async mode => {
    const bundle = await fixture(), trusted = await pins(bundle)
    if (mode === 'missing') bundle.traces.pop()
    if (mode === 'duplicate') bundle.traces.push(bundle.traces[0])
    if (mode === 'unknown') bundle.traces[0].caseId = 'unknown'
    if (mode === 'provider-reuse') bundle.traces[1].execution.providerResponseId = bundle.traces[0].execution.providerResponseId
    if (mode === 'offset') bundle.traces[0].retrieval.candidates[0].end = 10
    if (mode === 'version') bundle.traces[0].retrieval.candidates[0].versionId = 'b'.repeat(64)
    if (mode === 'provenance') Object.assign(bundle.manifest.sources[0], { provenance: 'private_upload' })
    if (mode === 'pin') trusted.manifestSha256 = zeros
    if (mode === 'claim') bundle.claimedThresholdMet = true
    if (mode === 'exclusion') bundle.exclusions.inventoryComplete = false
    await reseal(bundle)
    await expect(buildIntegratedReviewPacket(bundle, trusted, secret)).rejects.toThrow()
  })
  it('keeps explicit truncated/error outcomes in the denominator without acceptance', async () => {
    const bundle = await fixture()
    for (const trace of bundle.traces) {
      trace.response.status = 'truncated'; trace.response.done = false; trace.response.doneReason = 'length'
      trace.response.outputTokens = bundle.manifest.options.maxOutputTokens; trace.execution.status = 'truncated'
    }
    await reseal(bundle)
    const result = await build(bundle)
    expect(result.packet.denominator).toBe(2)
    expect(result.packet.tasks.every(t => t.deliveredResponse.status === 'truncated')).toBe(true)
    expect(result.packet.thresholdMet).toBe(false)
    bundle.traces[0].response.status = 'complete'; bundle.traces[0].execution.status = 'complete'
    await reseal(bundle)
    await expect(build(bundle)).rejects.toThrow('incomplete_completion')
  })
  it('keeps untrusted termination metadata containing identifying information operator-only', async () => {
    const bundle = await fixture(), trace = bundle.traces[0]
    trace.response.status = 'error'; trace.response.done = false; trace.execution.status = 'error'
    trace.response.doneReason = 'hidden-model hidden-request hidden-condition cost=7'
    await reseal(bundle)
    const result = await build(bundle)
    expect(JSON.stringify(result.packet)).not.toContain('hidden-')
    expect(JSON.stringify(result.packet)).not.toContain('cost=7')
    expect(result.mapping.bindings.some(binding => binding.rawDoneReason === trace.response.doneReason)).toBe(true)
  })
  it('writes exclusive separated outputs and rejects oversized input and routing flags', async () => {
    mkdirSync(resolve('artifacts'), { recursive: true })
    const directory = mkdtempSync(resolve('artifacts', 'integrated-review-contract-'))
    try {
      const bundle = await fixture(), input = resolve(directory, 'bundle.json'), output = resolve(directory, 'packet')
      writeFileSync(input, JSON.stringify(bundle))
      const trusted = await pins(bundle)
      const args = ['build', input, '--manifest-sha256', trusted.manifestSha256, '--exclusion-sha256', trusted.exclusionSha256, '--output', output]
      const receipt = await buildIntegratedReviewFiles(args)
      const packet = JSON.parse(readFileSync(resolve(output, 'reviewer', 'packet.json'), 'utf8'))
      const mapping = JSON.parse(readFileSync(resolve(output, 'operator-only', 'mapping.json'), 'utf8'))
      expect(await hash(packet)).toBe(receipt.packetSha256); expect(await hash(mapping)).toBe(receipt.mappingSha256)
      expect(JSON.parse(readFileSync(resolve(output, 'operator-only', 'completion.json'), 'utf8'))).toEqual(receipt)
      await expect(buildIntegratedReviewFiles(args)).rejects.toThrow()
      await expect(buildIntegratedReviewFiles([...args, '--model', 'remote'])).rejects.toThrow('Usage')
      truncateSync(input, 16 * 1024 * 1024 + 1)
      await expect(buildIntegratedReviewFiles([...args.slice(0, 7), resolve(directory, 'oversize')])).rejects.toThrow('16 MiB')
    } finally { rmSync(directory, { recursive: true, force: true }) }
  })
})
