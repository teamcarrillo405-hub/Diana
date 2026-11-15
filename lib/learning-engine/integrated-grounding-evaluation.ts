/** Offline verification only. No case authoring, retrieval dispatch or model IO. */
import { z } from 'zod'
import { canonicalHybridJson, hashHybridValue } from './hybrid-benchmark-contract'

export const integratedHash = hashHybridValue
export const integratedCanonical = canonicalHybridJson
const id = z.string().min(1).max(160), hash = z.string().regex(/^[a-f0-9]{64}$/)
const strict = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict()
const family = strict({ id, componentId: id, documentFamily: id, templateFamily: id, reasoningFamily: id })
export const integratedExclusionSchema = strict({
  schema: z.literal('integrated-exclusions-v1'), inventoryComplete: z.boolean(),
  custodianId: id, reviewReference: id,
  artifacts: z.array(strict({ artifactSha256: hash, role: z.enum(['train', 'development', 'visible_probe', 'consumed_test', 'reserved_test']),
    componentIds: z.array(id), familyIds: z.array(id) })).min(1).max(10000),
})
export const integratedManifestSchema = strict({
  schema: z.literal('integrated-grounding-v1'), runId: id, scope: z.literal('authored-confirmed-text'),
  corpusSha256: hash, exclusionSha256: hash, codeSha256: hash, system: z.string().min(1).max(12000),
  model: id, options: strict({ temperature: z.number().min(0).max(2), seed: z.number().int(), maxOutputTokens: z.number().int().min(1).max(32000) }),
  ownerId: z.string().uuid(), assignmentId: z.string().uuid(),
  familyReview: strict({ authorId: id, reviewerId: id, reviewReference: id, complete: z.boolean(), authorFreshContext: z.boolean() }),
  families: z.array(family).min(1).max(2000),
  sources: z.array(strict({ id, versionId: hash, contentHash: hash, componentId: id,
    ownerId: z.string().uuid(), assignmentId: z.string().uuid(),
    provenance: z.literal('authored_synthetic'), confirmed: z.literal(true),
    pages: z.array(strict({ number: z.number().int().positive(), text: z.string().max(100000) })).min(1).max(100) })).max(1000),
  cases: z.array(strict({ id, familyId: id, subject: id, band: id, query: z.string().min(1).max(4000),
    studentAttempt: z.string().min(1).max(8000), sourceIds: z.array(id).max(100), inputSha256: hash })).min(1).max(2000),
})
const evidence = strict({ sourceId: id, versionId: hash, contentHash: hash, page: z.number().int().positive(),
  start: z.number().int().nonnegative(), end: z.number().int().positive(), exactText: z.string().min(1).max(1000) })
const retrieval = strict({ query: z.string(), status: z.enum(['matched', 'no_evidence', 'source_conflict', 'unavailable']),
  method: z.enum(['keyword', 'hybrid']), candidates: z.array(evidence).max(40), selected: z.array(evidence).max(6), durationMs: z.number().finite().nonnegative() })
const response = strict({ status: z.enum(['complete', 'error', 'timeout', 'truncated', 'safety_blocked']),
  content: z.string().nullable(), done: z.boolean(), doneReason: z.string(), model: id,
  inputTokens: z.number().int().nonnegative(), outputTokens: z.number().int().nonnegative(), durationMs: z.number().finite().nonnegative() })
const dimensions = strict({ accuracy: z.boolean(), teaching: z.boolean(), evidence: z.boolean(), restraint: z.boolean(), premiseIntegrity: z.boolean() })
const judgment = strict({ reviewerId: id, kind: z.literal('ai_engineering'), contextDisclosure: z.string().min(1).max(2000),
  traceSha256: hash, responseSha256: hash, dimensions, notes: z.string().min(1).max(8000) })
export const integratedTraceSchema = strict({
  caseId: id, manifestSha256: hash, inputSha256: hash,
  retrieval, retrievalSha256: hash, evidenceSha256: hash,
  request: strict({ model: id, options: integratedManifestSchema.shape.options, system: z.string(), user: z.string() }), requestSha256: hash,
  response, responseSha256: hash,
  execution: strict({ runId: id, caseId: id, requestId: id, requestSha256: hash, responseSha256: hash,
    providerResponseId: id.nullable(), status: response.shape.status, model: id, actualCents: z.number().int().nonnegative(),
    startedAt: z.string().datetime(), completedAt: z.string().datetime(), attempt: z.literal(1), settled: z.boolean() }),
  executionSha256: hash, traceSha256: hash, judgments: z.array(judgment).max(2),
})
export const integratedBundleSchema = strict({ manifest: integratedManifestSchema, exclusions: integratedExclusionSchema,
  traces: z.array(integratedTraceSchema).max(2000), claimedThresholdMet: z.boolean().optional() })
export type IntegratedManifest = z.infer<typeof integratedManifestSchema>
export type IntegratedTrace = z.infer<typeof integratedTraceSchema>
export type IntegratedBundle = z.infer<typeof integratedBundleSchema>

/** Evidence serialization is part of this harness version, not the production renderer. */
export function renderIntegratedUser(item: IntegratedManifest['cases'][number], selected: z.infer<typeof evidence>[]) {
  return integratedCanonical({ query: item.query, studentAttempt: item.studentAttempt, evidence: selected })
}
export async function integratedTraceDigest(trace: Omit<IntegratedTrace, 'traceSha256' | 'judgments'> | IntegratedTrace) {
  const { traceSha256: _hash, judgments: _judgments, ...payload } = trace as IntegratedTrace
  return integratedHash(payload)
}
const unique = (values: string[]) => new Set(values).size === values.length
const same = (a: unknown, b: unknown) => integratedCanonical(a) === integratedCanonical(b)

/** Trusted digests must come from the separately frozen operator manifest, not this bundle. */
export async function verifyIntegratedEvaluation(raw: unknown, trusted: { manifestSha256: string; exclusionSha256: string }) {
  const bundle = integratedBundleSchema.parse(raw)
  hash.parse(trusted.manifestSha256); hash.parse(trusted.exclusionSha256)
  const { manifest: m, exclusions: x, traces } = bundle
  const errors: string[] = [], incomplete: string[] = []
  const fail = (condition: boolean, code: string) => { if (!condition) errors.push(code) }
  fail(await integratedHash(m) === trusted.manifestSha256, 'manifest_digest_mismatch')
  fail(await integratedHash({ families: m.families, sources: m.sources, cases: m.cases }) === m.corpusSha256, 'corpus_digest_mismatch')
  fail(await integratedHash(x) === trusted.exclusionSha256 && m.exclusionSha256 === trusted.exclusionSha256, 'exclusion_digest_mismatch')
  fail(x.inventoryComplete, 'exclusion_inventory_incomplete')
  fail(m.familyReview.complete && m.familyReview.authorFreshContext && m.familyReview.authorId !== m.familyReview.reviewerId, 'family_review_ineligible')
  fail(unique(m.cases.map(c => c.id)) && unique(m.sources.map(s => s.id)) && unique(m.families.map(f => f.id)), 'duplicate_manifest_identity')
  fail(unique(traces.map(t => t.caseId)) && unique(traces.map(t => t.execution.requestId)), 'duplicate_trace_or_request')
  fail(unique(traces.flatMap(t => t.execution.providerResponseId === null ? [] : [t.execution.providerResponseId])), 'duplicate_provider_response')
  fail(traces.every(t => m.cases.some(c => c.id === t.caseId)), 'unexpected_trace')
  const excludedComponents = new Set(x.artifacts.flatMap(a => a.componentIds))
  const excludedFamilies = new Set(x.artifacts.flatMap(a => a.familyIds))
  fail(!x.artifacts.some(a => a.artifactSha256 === m.corpusSha256), 'excluded_corpus')
  for (const f of m.families) fail(!excludedComponents.has(f.componentId) && ![f.id, f.documentFamily, f.templateFamily, f.reasoningFamily].some(id => excludedFamilies.has(id)), 'excluded_family:' + f.id)
  for (const s of m.sources) {
    fail(s.ownerId === m.ownerId && s.assignmentId === m.assignmentId, 'source_scope:' + s.id)
    fail(!excludedComponents.has(s.componentId), 'excluded_source:' + s.id)
    fail(unique(s.pages.map(p => String(p.number))) && await integratedHash(s.pages) === s.contentHash, 'source_digest:' + s.id)
  }
  const globalBindingInvalid = errors.length > 0
  const rows: { caseId: string; subject: string; band: string; state: string; pass: boolean }[] = []
  for (const c of m.cases) {
    const errorsBefore = errors.length, incompleteBefore = incomplete.length
    fail(m.families.some(f => f.id === c.familyId) && unique(c.sourceIds) && c.sourceIds.every(id => m.sources.some(s => s.id === id)), 'case_binding:' + c.id)
    fail(await integratedHash({ query: c.query, studentAttempt: c.studentAttempt, sourceIds: c.sourceIds }) === c.inputSha256, 'case_input_digest:' + c.id)
    const t = traces.find(t => t.caseId === c.id)
    let state = 'missing', pass = false
    if (!t) incomplete.push('missing_trace:' + c.id)
    else {
      fail(t.manifestSha256 === trusted.manifestSha256 && t.inputSha256 === c.inputSha256, 'trace_binding:' + c.id)
      fail(await integratedHash(t.retrieval) === t.retrievalSha256 && await integratedHash(t.retrieval.selected) === t.evidenceSha256, 'retrieval_digest:' + c.id)
      fail(t.retrieval.query === c.query, 'retrieval_query:' + c.id)
      fail((t.retrieval.status === 'matched') === (t.retrieval.selected.length > 0), 'retrieval_status:' + c.id)
      fail(unique(t.retrieval.candidates.map(e => integratedCanonical(e))) && unique(t.retrieval.selected.map(e => integratedCanonical(e))), 'duplicate_evidence:' + c.id)
      for (const e of t.retrieval.candidates) {
        const s = m.sources.find(s => s.id === e.sourceId), page = s?.pages.find(p => p.number === e.page)
        fail(!!s && c.sourceIds.includes(e.sourceId) && s.versionId === e.versionId && s.contentHash === e.contentHash &&
          !!page && e.end > e.start && page.text.slice(e.start, e.end) === e.exactText && e.end - e.start === e.exactText.length, 'source_anchor:' + c.id)
      }
      fail(t.retrieval.selected.every(e => t.retrieval.candidates.some(candidate => same(e, candidate))), 'selected_outside_candidates:' + c.id)
      fail(same(t.request, { model: m.model, options: m.options, system: m.system, user: renderIntegratedUser(c, t.retrieval.selected) }) && await integratedHash(t.request) === t.requestSha256, 'request_mismatch:' + c.id)
      fail(await integratedHash(t.response) === t.responseSha256 && await integratedHash(t.execution) === t.executionSha256 && await integratedTraceDigest(t) === t.traceSha256, 'output_or_receipt_digest:' + c.id)
      const e = t.execution, r = t.response
      fail(e.runId === m.runId && e.caseId === c.id && e.requestSha256 === t.requestSha256 && e.responseSha256 === t.responseSha256 &&
        e.status === r.status && e.model === r.model && r.model === m.model && Date.parse(e.completedAt) >= Date.parse(e.startedAt), 'execution_receipt:' + c.id)
      if (!e.settled) incomplete.push('unsettled_execution:' + c.id)
      const completed = r.status === 'complete'
      fail(!completed || (r.done && r.doneReason === 'stop' && !!r.content?.trim() && r.outputTokens > 0 && r.outputTokens < m.options.maxOutputTokens && !!e.providerResponseId), 'incomplete_completion:' + c.id)
      fail(r.outputTokens <= m.options.maxOutputTokens, 'output_limit:' + c.id)
      fail(unique(t.judgments.map(j => j.reviewerId)) && t.judgments.every(j => j.reviewerId !== m.familyReview.authorId &&
        j.traceSha256 === t.traceSha256 && j.responseSha256 === t.responseSha256), 'review_binding:' + c.id)
      if (!completed) state = r.status
      else if (t.judgments.length !== 2) { state = 'review_pending'; incomplete.push('missing_judgment:' + c.id) }
      else if (!same(t.judgments[0].dimensions, t.judgments[1].dimensions)) { state = 'review_disagreement'; incomplete.push('disputed_judgment:' + c.id) }
      else { pass = Object.values(t.judgments[0].dimensions).every(Boolean); state = pass ? 'pass' : 'reviewed_fail' }
    }
    if (globalBindingInvalid || errors.length > errorsBefore) { state = 'invalid'; pass = false }
    if (incomplete.length > incompleteBefore && pass) { state = 'incomplete'; pass = false }
    rows.push({ caseId: c.id, subject: c.subject, band: c.band, state, pass })
  }
  const confirmedFabrication = traces.some(t => t.judgments.length === 2 && t.judgments.every(j => !j.dimensions.premiseIntegrity))
  const unavailableIntegrity = traces.some(t => t.response.content === null || t.response.status !== 'complete')
  const passes = rows.filter(r => r.pass).length, denominator = m.cases.length
  const submittedJudgmentThresholdMet = !errors.length && !incomplete.length && !confirmedFabrication && !unavailableIntegrity && passes >= Math.ceil(0.95 * denominator)
  // A caller can pin self-authored declarations. Hash equality cannot authenticate
  // reviewer credentials, actual execution, or independent family authorship.
  incomplete.push('review_authority_unverified', 'family_authority_unverified', 'execution_authority_unverified')
  if (bundle.claimedThresholdMet === true) errors.push('false_threshold_claim')
  return { schema: 'integrated-grounding-report-v1', manifestSha256: trusted.manifestSha256,
    status: errors.length ? 'invalid' : incomplete.length ? 'incomplete' : 'complete', errors, incomplete,
    denominator, traces: traces.length, passes, requiredPasses: Math.ceil(0.95 * denominator), observedRate: passes / denominator,
    thresholdMet: false, submittedJudgmentThresholdMet: errors.length ? false : submittedJudgmentThresholdMet,
    evidenceScope: 'offline_artifact_consistency_and_submitted_judgments',
    reviewerAuthorityVerified: false, executionAuthorityVerified: false, confirmedFabrication, unavailableIntegrity,
    rows, productionEligible: false, educatorValidated: false, semanticFamilyIndependenceProven: false,
    limits: ['Externally supplied family/reviewer attestations require operator verification.', 'Hash parity establishes artifact consistency, not observed execution or source meaning.', 'Text-only harness renderer is not a production full-pipeline adapter.'] }
}
