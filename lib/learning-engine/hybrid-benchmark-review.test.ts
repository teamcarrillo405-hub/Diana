/** Synthetic receipt tests only; never reads paid benchmark responses. */
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, sep } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { DIMENSIONS, rawSha, valueSha, buildReviewSnapshot, writeReviewPacket, validatePrimaryReview,
  writeDisputePacket, writeReviewReport, resolveQuality, archiveReviewSources, type ReviewPacket, type PrimaryReview } from '../../scripts/learning/review-hybrid-benchmark'
import { buildHybridBenchmarkPlan, canonicalHybridJson } from './hybrid-benchmark-contract'
import { HYBRID_BENCHMARK_CASES, buildHybridBenchmarkUserPrompt } from './hybrid-benchmark-cases'
import { dispatchFor } from '../../scripts/learning/hybrid-benchmark'

const roots: string[] = [], protocolPath = 'docs/engineering/hybrid-benchmark-review-protocol.md'
const write = (path: string, value: unknown) => writeFileSync(path, canonicalHybridJson(value) + '\n')
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'))
afterEach(() => { for (const root of roots.splice(0)) {
  if (!root.startsWith(resolve(tmpdir(), 'hybrid-review-test-'))) throw new Error('Unsafe test cleanup path')
  rmSync(root, { recursive: true, force: true })
} })
async function fixture(completed = 96) {
  const root = mkdtempSync(resolve(tmpdir(), 'hybrid-review-test-')); roots.push(root)
  const workspace = resolve(root, 'workspace'), run = resolve(root, 'run'), packetDir = resolve(root, 'review')
  mkdirSync(resolve(workspace, 'docs/engineering'), { recursive: true }); mkdirSync(run); mkdirSync(resolve(run, 'attempts'))
  const rubric = readFileSync(resolve(protocolPath)); writeFileSync(resolve(workspace, protocolPath), rubric)
  const closure = { files: { [protocolPath]: rawSha(rubric) }, externalImports: [], excludedGeneratedRegistry: 'unit-test-only' }
  const inputs = HYBRID_BENCHMARK_CASES.map(item => ({ caseId: item.id, system: 'Synthetic test tutoring instructions.', user: buildHybridBenchmarkUserPrompt(item) }))
  const createdAt = new Date(Date.now() - 2000).toISOString()
  const plan = await buildHybridBenchmarkPlan({ inputs, corpusSha256: valueSha(HYBRID_BENCHMARK_CASES),
    promptSha256: 'a'.repeat(64), codeSha256: valueSha(closure), createdAt,
    priceSnapshot: { model: 'gpt-6-astra', inputCentsPerMillion: 1250, cacheWriteCentsPerMillion: 1250, outputCentsPerMillion: 5000,
      verifiedAt: createdAt, sourceUrl: 'https://developers.openai.com/api/docs/pricing', sourceSha256: 'b'.repeat(64) } })
  const dispatch = dispatchFor(plan)
  write(resolve(run, 'plan.json'), plan); write(resolve(run, 'inputs.json'), inputs); write(resolve(run, 'corpus.json'), HYBRID_BENCHMARK_CASES)
  write(resolve(run, 'code-closure.json'), closure); write(resolve(run, 'dispatch.json'), dispatch)
  for (const entry of dispatch.slice(0, completed)) {
    const dir = resolve(run, 'attempts', entry.requestId); mkdirSync(dir)
    write(resolve(dir, 'request.json'), { ...entry, planFingerprint: plan.fingerprint, startedAt: createdAt,
      reservationCents: plan.calls.find(c => c.caseId === entry.caseId)!.reservationCents })
    const feedback = { action: 'hint', feedback: 'Track the supplied quantities.', nextQuestion: 'Which quantity would you inspect first?', sourceQuotes: [], limitations: [] }
    const body = { ok: true, result: { caseId: entry.caseId, requestId: entry.requestId, planSha256: plan.fingerprint,
      resolvedModel: plan.request.model, providerResponseId: 'mock_' + entry.requestId, output: JSON.stringify(feedback), feedback,
      usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120 }, actualCents: 1,
      syntheticInput: true, researchOnly: true, semanticAcceptance: false } }
    const raw = JSON.stringify(body); writeFileSync(resolve(dir, 'response-body.txt'), raw)
    write(resolve(dir, 'response.json'), { accepted: true, status: 200, body, responseSha256: rawSha(raw), latencyMs: 125,
      completedAt: new Date().toISOString(), semanticAcceptance: false })
  }
  await writeReviewPacket(workspace, run, packetDir)
  const packet = read(resolve(packetDir, 'packet.json')) as ReviewPacket
  return { root, workspace, run, packetDir, packet, plan, dispatch }
}
function primary(packet: ReviewPacket, id: string): PrimaryReview {
  return { schema: 'hybrid-primary-review-v1', packetHash: valueSha(packet), rubricSha256: packet.rubricSha256,
    reviewer: { id, kind: 'ai', freshContext: false, credentialedEducator: false, independentOfProducer: true,
      independentOfOtherReview: true, priorProjectExposure: 'Synthetic existing engineering context disclosed.',
      priorOutputExposure: 'Synthetic packet only; no other reviewer ratings seen.' }, savedAt: new Date().toISOString(),
    suspectedKeyErrors: [], ratings: packet.entries.filter(e => e.response !== null).map(e => ({ id: e.id, caseHash: e.caseHash, responseHash: e.responseHash!,
      responseKind: 'scaffolding', dimensions: Object.fromEntries(DIMENSIONS.map(d => [d, { pass: true,
        evidenceQuotes: ['Which quantity would you inspect first?'], rationale: `Synthetic ${d} judgment; inspect the supplied quantity before taking the next step.` }])) as PrimaryReview['ratings'][number]['dimensions'] })) }
}
async function reviews(item: Awaited<ReturnType<typeof fixture>>, mutate?: (a: PrimaryReview, b: PrimaryReview) => void) {
  const a = primary(item.packet, 'reviewer-one'), b = primary(item.packet, 'reviewer-two'); mutate?.(a, b)
  const first = resolve(item.root, 'one.json'), second = resolve(item.root, 'two.json'), disputes = resolve(item.root, 'disputes')
  write(first, a); write(second, b)
  await writeDisputePacket(item.packetDir, first, second, disputes)
  return { a, b, first, second, disputes }
}
describe('hybrid review artifact integrity and frozen development rules', () => {
  it('retains exact executed source for historical review while later workspace code can change', async () => {
    const item = await fixture()
    write(resolve(item.run, 'execution-complete.json'), { planFingerprint: item.plan.fingerprint,
      cases: 96, completedCases: 96, reconciledFailures: 0 })
    await archiveReviewSources(item.workspace, item.run)
    writeFileSync(resolve(item.workspace, protocolPath), 'A later unrelated protocol revision')
    const snapshot = await buildReviewSnapshot(item.workspace, item.run)
    expect(snapshot.packet.rubric).toBe(item.packet.rubric)
    writeFileSync(resolve(item.run, 'frozen-source', protocolPath), 'Corrupt archive')
    await expect(buildReviewSnapshot(item.workspace, item.run)).rejects.toThrow(/archive/)
  })

  it('does not archive an unfinished run as completed evidence', async () => {
    const item = await fixture(95)
    write(resolve(item.run, 'execution-complete.json'), { planFingerprint: item.plan.fingerprint,
      cases: 96, completedCases: 95, reconciledFailures: 0 })
    await expect(archiveReviewSources(item.workspace, item.run)).rejects.toThrow(/Execution must stop/)
  })
  it('binds all 96 exact cases, evaluation fields and prompts without model/cost metadata in the review packet', async () => {
    const item = await fixture(92)
    expect(item.packet.entries).toHaveLength(96)
    expect(item.packet.entries[0].case).toEqual(HYBRID_BENCHMARK_CASES[0])
    expect(item.packet.entries[0].input.user).toBe(buildHybridBenchmarkUserPrompt(HYBRID_BENCHMARK_CASES[0]))
    expect(item.packet.entries.filter(e => e.response === null)).toHaveLength(4)
    expect(JSON.stringify(item.packet)).not.toContain('gpt-6-astra')
    expect(JSON.stringify(item.packet)).not.toContain('actualCents')
    const { a, b } = await reviews(item)
    expect(resolveQuality(item.packet, a, b)).toMatchObject({ passes: 92, denominator: 96, developmentThresholdMet: true, productionEligible: false })
  })
  it('reports failures and unknown charges without exposing rejected response text', async () => {
    const item = await fixture(95), entry = item.dispatch[95], dir = resolve(item.run, 'attempts', entry.requestId)
    mkdirSync(dir); write(resolve(dir, 'request.json'), { ...entry, planFingerprint: item.plan.fingerprint, reservationCents: item.plan.calls[95].reservationCents })
    const body = { ok: false, error: 'Withheld response' }, raw = JSON.stringify(body)
    writeFileSync(resolve(dir, 'response-body.txt'), raw)
    write(resolve(dir, 'response.json'), { accepted: false, status: 503, body, responseSha256: rawSha(raw), latencyMs: 100 })
    const result = await buildReviewSnapshot(item.workspace, item.run)
    expect(result.packet.entries[95].response).toBeNull()
    expect(result.provenance.attempts[95]).toMatchObject({ status: 'failed', actualCents: null })
  })
  it.each(['packetHash', 'rubricSha256', 'caseHash', 'responseHash'])('rejects stale %s ratings', async key => {
    const { packet } = await fixture(); const review = primary(packet, 'one')
    if (key === 'packetHash' || key === 'rubricSha256') review[key] = '0'.repeat(64)
    else review.ratings[0][key as 'caseHash' | 'responseHash'] = '0'.repeat(64)
    expect(() => validatePrimaryReview(review, packet)).toThrow(/Stale/)
  })
  it('requires actual response evidence and complete, duplicate-free ratings', async () => {
    const { packet } = await fixture(95)
    const review = primary(packet, 'one'); review.ratings[0].dimensions.accuracy.evidenceQuotes = ['Invented quotation absent from response']
    expect(() => validatePrimaryReview(review, packet)).toThrow(/quote/)
    const missing = primary(packet, 'one'); missing.ratings.pop(); expect(() => validatePrimaryReview(missing, packet)).toThrow(/Every available/)
    const duplicate = primary(packet, 'one'); duplicate.ratings.push(duplicate.ratings[0]); expect(() => validatePrimaryReview(duplicate, packet)).toThrow(/Duplicate/)
    const absent = primary(packet, 'one'); absent.ratings.push({ ...absent.ratings[0], id: packet.entries[95].id }); expect(() => validatePrimaryReview(absent, packet)).toThrow(/unavailable/)
  })
  it('rejects educator claims or malformed context metadata and bare abstention passing teaching', async () => {
    const { packet } = await fixture(); const review = primary(packet, 'one')
    expect(() => validatePrimaryReview({ ...review, reviewer: { ...review.reviewer, kind: 'educator' } }, packet)).toThrow()
    expect(() => validatePrimaryReview({ ...review, reviewer: { ...review.reviewer, freshContext: 'fresh' } }, packet)).toThrow()
    expect(() => validatePrimaryReview({ ...review, reviewer: { ...review.reviewer, priorProjectExposure: '' } }, packet)).toThrow()
    review.ratings[0].responseKind = 'abstention'; expect(() => validatePrimaryReview(review, packet)).toThrow(/Bare abstention/)
  })
  it('retains suspected answer-key issues as unresolved without changing corpus or awarding a pass', async () => {
    const { packet } = await fixture(), a = primary(packet, 'one'), b = primary(packet, 'two')
    const omitted = a.ratings.shift()!
    a.suspectedKeyErrors.push({ id: omitted.id, caseHash: omitted.caseHash, responseHash: omitted.responseHash, details: 'Synthetic suspected reference error needing independent inspection.' })
    validatePrimaryReview(a, packet)
    expect(resolveQuality(packet, a, b)).toMatchObject({ passes: 95, unresolvedDimensions: 5, developmentThresholdMet: false })
  })
  it('uses 92/96 and zero final fabricated premises with no population or production qualification', async () => {
    const { packet } = await fixture(), a = primary(packet, 'one'), b = primary(packet, 'two')
    for (const review of [a, b]) for (const r of review.ratings.slice(0, 4)) r.dimensions.accuracy.pass = false
    expect(resolveQuality(packet, a, b).developmentThresholdMet).toBe(true)
    b.ratings[4].dimensions.accuracy.pass = false
    expect(resolveQuality(packet, a, b).developmentThresholdMet).toBe(false)
    b.ratings[4].dimensions.accuracy.pass = true
    for (const r of [a.ratings[0], b.ratings[0]]) r.dimensions.premiseIntegrity.pass = false
    expect(resolveQuality(packet, a, b)).toMatchObject({ passes: 92, fabricatedPremises: 1, developmentThresholdMet: false, qualitySuccess: false, populationAccuracyEstablished: false })
  })
  it('requires distinct reviewer identities', async () => {
    const item = await fixture()
    await expect(reviews(item, (a, b) => { b.reviewer.id = a.reviewer.id.toUpperCase() })).rejects.toThrow(/distinct/)
  })
  it.each(['raw', 'corpus', 'rubric', 'new-attempt'])('rejects source drift after the packet is saved: %s', async kind => {
    const item = await fixture(95), a = primary(item.packet, 'one'), b = primary(item.packet, 'two')
    const first = resolve(item.root, 'one.json'), second = resolve(item.root, 'two.json'); write(first, a); write(second, b)
    if (kind === 'raw') writeFileSync(resolve(item.run, 'attempts', item.dispatch[0].requestId, 'response-body.txt'), '{}')
    if (kind === 'corpus') { const corpus = read(resolve(item.run, 'corpus.json')); corpus[0].evaluation.referenceAnswer = 'Changed'; write(resolve(item.run, 'corpus.json'), corpus) }
    if (kind === 'rubric') writeFileSync(resolve(item.workspace, protocolPath), 'Changed criteria')
    if (kind === 'new-attempt') mkdirSync(resolve(item.run, 'attempts', 'unplanned'))
    await expect(writeDisputePacket(item.packetDir, first, second, resolve(item.root, 'disputes'))).rejects.toThrow()
  })
  it('preserves full primaries, resolves only disagreements, and refuses later primary edits', async () => {
    const item = await fixture(), r = await reviews(item, (_a, b) => { b.ratings[0].dimensions.accuracy.pass = false })
    const dispute = read(resolve(r.disputes, 'disputes.json')), receipt = read(resolve(r.disputes, 'receipt.json'))
    expect(dispute.disputes).toHaveLength(1); expect(dispute.entries).toHaveLength(1)
    const unresolved = await writeReviewReport(item.packetDir, r.disputes, null, resolve(item.root, 'unresolved.json'))
    expect(unresolved.quality).toMatchObject({ passes: 95, unresolvedDimensions: 1, developmentThresholdMet: false })
    const adjudication = { schema: 'hybrid-adjudication-v1', packetHash: valueSha(item.packet), rubricSha256: item.packet.rubricSha256,
      disputePacketHash: receipt.disputePacketHash, savedAt: new Date().toISOString(), reviewer: { ...r.a.reviewer, id: 'third-independent-reviewer' },
      ratings: [{ id: r.a.ratings[0].id, caseHash: r.a.ratings[0].caseHash, responseHash: r.a.ratings[0].responseHash,
        dimension: 'accuracy', judgment: r.a.ratings[0].dimensions.accuracy }] }
    const adjudicationFile = resolve(item.root, 'adjudication.json'); write(adjudicationFile, adjudication)
    const report = await writeReviewReport(item.packetDir, r.disputes, adjudicationFile, resolve(item.root, 'report.json'))
    expect(report.quality).toMatchObject({ passes: 96, developmentThresholdMet: true, qualitySuccess: false })
    expect(report.execution).toMatchObject({ attempted: 96, withheldOrUnavailableText: 0, knownActualCents: 96, unknownChargeAttempts: 0 })
    expect(readFileSync(resolve(r.disputes, 'first-review.json'), 'utf8')).toBe(readFileSync(r.first, 'utf8'))
    adjudication.ratings[0].dimension = 'teaching'; write(adjudicationFile, adjudication)
    await expect(writeReviewReport(item.packetDir, r.disputes, adjudicationFile, resolve(item.root, 'bad.json'))).rejects.toThrow(/undisputed/)
    writeFileSync(r.first, '\n', { flag: 'a' })
    await expect(writeReviewReport(item.packetDir, r.disputes, null, resolve(item.root, 'changed.json'))).rejects.toThrow(/changed after comparison/)
  })
  it('never overwrites an existing review output', async () => {
    const item = await fixture()
    await expect(writeReviewPacket(item.workspace, item.run, item.packetDir)).rejects.toThrow()
    const r = await reviews(item), target = resolve(item.root, 'report.json')
    await writeReviewReport(item.packetDir, r.disputes, null, target)
    await expect(writeReviewReport(item.packetDir, r.disputes, null, target)).rejects.toThrow()
  })
  it('keeps an empty crash-reserved attempt uncertain in the denominator', async () => {
    const item = await fixture(95)
    mkdirSync(resolve(item.run, 'attempts', item.dispatch[95].requestId))
    const snapshot = await buildReviewSnapshot(item.workspace, item.run)
    expect(snapshot.provenance.attempts[95]).toMatchObject({ status: 'uncertain', actualCents: null })
    expect(snapshot.packet.entries).toHaveLength(96)
  })
  it('retains a reconciled failed attempt with its durable cost and never exposes rejected text', async () => {
    const item = await fixture(), entry = item.dispatch[95], dir = resolve(item.run, 'attempts', entry.requestId)
    write(resolve(dir, 'interruption.json'), { status: 200, latencyMs: 125, disposition: 'uncertain-or-rejected-no-retry' })
    const verifiedAt = new Date().toISOString()
    write(resolve(dir, 'reconciliation.json'), { action: 'retain-failure-and-continue', planFingerprint: item.plan.fingerprint,
      requestSha256: rawSha(readFileSync(resolve(dir, 'request.json'))), verifiedAt, verifiedBy: 'synthetic-unit-test-operator',
      reservation: { id: entry.requestId, manifest_hash: item.plan.fingerprint, batch_id: entry.batchId,
        reserved_cents: item.plan.calls[95].reservationCents, actual_cents: 1, state: 'settled' },
      receipt: { request_id: entry.requestId, requested_model: item.plan.request.model, resolved_model: item.plan.request.model,
        provider_response_id: 'mock_' + entry.requestId, input_tokens: 100, output_tokens: 20, total_tokens: 120,
        actual_cents: 1, usage_received_at: verifiedAt, output_state: 'accounting_error' } })
    const snapshot = await buildReviewSnapshot(item.workspace, item.run)
    expect(snapshot.provenance.attempts[95]).toMatchObject({ status: 'failed', actualCents: 1 })
    expect(snapshot.packet.entries[95]).toMatchObject({ response: null, responseHash: null })
  })
  it('refuses new review artifacts inside the frozen run', async () => {
    const item = await fixture(), first = resolve(item.root, 'first.json'), second = resolve(item.root, 'second.json')
    write(first, primary(item.packet, 'one')); write(second, primary(item.packet, 'two'))
    await expect(writeDisputePacket(item.packetDir, first, second, resolve(item.run, 'disputes'))).rejects.toThrow(/outside frozen/)
  })
})
