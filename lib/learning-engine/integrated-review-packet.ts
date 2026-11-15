/** Offline metadata blinding. No case authoring, model dispatch or review acceptance. */
import { z } from 'zod'
import { integratedBundleSchema, integratedHash, verifyIntegratedEvaluation } from './integrated-grounding-evaluation'

export type IntegratedReviewPins = { manifestSha256: string; exclusionSha256: string }
const keySchema = z.string().regex(/^[a-f0-9]{64}$/)

/** secretKey must be fresh operator-held cryptographic randomness, never a public run ID. */
export async function buildIntegratedReviewPacket(raw: unknown, trusted: IntegratedReviewPins, secretKey: string) {
  keySchema.parse(secretKey)
  const bundle = integratedBundleSchema.parse(raw)
  const verification = await verifyIntegratedEvaluation(bundle, trusted)
  if (verification.errors.length) throw new Error('Bundle integrity rejected: ' + verification.errors.join(', '))
  if (bundle.traces.length !== bundle.manifest.cases.length || verification.incomplete.some(code => code.startsWith('missing_trace:'))) {
    throw new Error('Every declared case requires exactly one trace')
  }
  const alias = async (kind: string, value: string) => kind + '-' + (await integratedHash({ secretKey, kind, value })).slice(0, 32)
  const sources = new Map(await Promise.all(bundle.manifest.sources.map(async source => [source.id, await alias('source', source.id)] as const)))
  const entries = await Promise.all(bundle.manifest.cases.map(async item => {
    const trace = bundle.traces.find(value => value.caseId === item.id)!
    const taskId = await alias('task', item.id)
    const evidence = (value: typeof trace.retrieval.selected[number]) => ({
      sourceId: sources.get(value.sourceId)!, page: value.page, start: value.start, end: value.end, exactText: value.exactText,
    })
    const task = {
      taskId, question: item.query, studentAttempt: item.studentAttempt,
      declaredSources: item.sourceIds.map(id => {
        const source = bundle.manifest.sources.find(value => value.id === id)!
        return { sourceId: sources.get(id)!, provenance: source.provenance, confirmed: source.confirmed,
          pages: source.pages.map(page => ({ number: page.number, text: page.text })) }
      }),
      retrievedEvidence: { status: trace.retrieval.status, candidates: trace.retrieval.candidates.map(evidence), selected: trace.retrieval.selected.map(evidence) },
      deliveredResponse: { status: trace.response.status, content: trace.response.content, done: trace.response.done },
    }
    return { task, binding: { taskId, taskSha256: await integratedHash(task), caseId: item.id,
      inputSha256: item.inputSha256, traceSha256: trace.traceSha256, requestSha256: trace.requestSha256,
      responseSha256: trace.responseSha256, executionSha256: trace.executionSha256,
      retrievalSha256: trace.retrievalSha256, evidenceSha256: trace.evidenceSha256,
      requestId: trace.execution.requestId, providerResponseId: trace.execution.providerResponseId, rawDoneReason: trace.response.doneReason } }
  }))
  entries.sort((a, b) => a.task.taskId.localeCompare(b.task.taskId))
  if (new Set(entries.map(entry => entry.task.taskId)).size !== entries.length || new Set(sources.values()).size !== sources.size) throw new Error('Opaque identity collision')
  const packet = {
    schema: 'integrated-blinded-review-packet-v1', denominator: entries.length,
    evidenceScope: 'offline_hash_checked_declared_artifacts', blindingScope: 'structured_metadata_only',
    humanAuthorityVerified: false, semanticFamilyIndependenceProven: false, productionEligible: false, thresholdMet: false,
    instructions: [
      'Review every task, including missing content and noncomplete responses. Unavailable judgments remain incomplete.',
      'Source pages are full declared truth for this task; selected evidence is exactly what the recorded request received.',
      'Offsets use JavaScript UTF-16 code units. Opaque source aliases replace identifiers only in structured evidence.',
      'Question, attempt, source text and delivered response are unchanged and may self-identify. Blinding is metadata-only.',
      'No educator, execution or independent family authority is established by this packet.',
    ],
    tasks: entries.map(entry => entry.task),
  } as const
  const packetSha256 = await integratedHash(packet)
  const mapping = {
    schema: 'integrated-review-operator-mapping-v1', handling: 'operator_only_not_encrypted', secretKey,
    packetSha256, bundleSha256: await integratedHash(bundle), ...trusted,
    runId: bundle.manifest.runId, ownerId: bundle.manifest.ownerId, assignmentId: bundle.manifest.assignmentId,
    denominator: entries.length, bindings: entries.map(entry => entry.binding),
    sourceBindings: bundle.manifest.sources.map(source => ({ sourceId: sources.get(source.id)!, originalSourceId: source.id,
      versionId: source.versionId, contentHash: source.contentHash })),
    unresolved: verification.incomplete, humanAuthorityVerified: false, productionEligible: false,
  } as const
  return { packet, packetSha256, mapping, mappingSha256: await integratedHash(mapping) }
}
