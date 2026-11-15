/** Offline diagnostic consistency and review projection. No dispatch or acceptance authority. */
import { z } from 'zod';
import { createHmac } from 'node:crypto';
import { prepareIntegratedRequestPlan } from './integrated-request-plan';
import { integratedProviderBytesSha256 as sha256, parseIntegratedProviderResponse } from './integrated-provider-response';
import { verifyIntegratedExecutionPlan, integratedReleasedCompletionSchema, pinIntegratedExecutionSources } from '@/supabase/functions/_shared/learning/integrated-execution-plan';
import { documentVersionSchema, evidenceAnchorSchema, chunkSchema } from './contracts';
import { sourcePageSchema } from './source-layout';

const hash = z.string().regex(/^[a-f0-9]{64}$/);
const blob = z.object({ text: z.string().max(32 * 1024 * 1024), sha256: hash }).strict();
export const diagnosticReviewInputSchema = z.object({
  schema: z.literal('integrated-diagnostic-review-input-v1'), capture: blob, preparedPlan: blob, executionPlan: blob, run: blob,
  envelopes: z.array(blob).max(100), providerRows: blob.optional(),
  priorRuns: z.array(z.object({ label: z.string().min(1).max(100), artifactSha256: hash }).strict()).max(10),
}).strict();
const runSchema = z.object({ schema: z.literal('integrated-execution-run-v1'), planSha256: hash,
  planned: z.number().int(), accountedRows: z.number().int(), edgeAttempts: z.number().int(), stopped: z.boolean(),
  rows: z.array(z.object({ caseId: z.string(), requestId: z.string().uuid().nullable(), status: z.string(), responseSha256: hash.optional() }).strict()).max(100),
  executionAuthorityVerified: z.literal(false), semanticAcceptance: z.literal(false), productionEligible: z.literal(false),
}).strict();
const envelopeSchema = z.object({ schema: z.literal('integrated-edge-execution-envelope-v1'), planSha256: hash,
  requestId: z.string().uuid(), caseId: z.string(), receivedAt: z.string().datetime({ offset: true }), httpStatus: z.number().int().min(100).max(599),
  rawResponse: z.string().max(16 * 1024 * 1024), responseSha256: hash,
}).strict();
const captureRowSchema = z.object({ input: z.object({ caseId: z.string(), assignmentId: z.string().uuid(), expectedOwnerId: z.string().uuid(), query: z.string(),
  versionPins: z.array(z.object({ id: z.string(), contentHash: hash })) }).passthrough(), status: z.string(), captureSha256: hash.optional(),
  traceSha256: hash.optional(), trace: z.array(z.object({ stage: z.string(), payload: z.unknown() })).optional(), actualPromptAnchors: z.array(evidenceAnchorSchema).optional(),
}).passthrough();
const documentsSchema = z.array(z.object({ id: z.string(), owner_id: z.string().uuid(), assignment_id: z.string().uuid(), content_hash: hash,
  metadata: documentVersionSchema, pages: z.array(sourcePageSchema).min(1).max(1500) }).passthrough()).max(12);
const providerRowsSchema = z.array(z.object({ request_id: z.string().uuid(), owner_id: z.string().uuid(),
  result: z.object({ rawCapture: z.unknown(), rawBodyComplete: z.boolean(), classification: z.string(), usageSaved: z.boolean(), actualCents: z.number().int().nullable() }).passthrough(),
}).passthrough()).max(100);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function requireThat(value: unknown, code: string): asserts value { if (!value) throw new Error(code); }
function decode(value: z.infer<typeof blob>) {
  requireThat(Buffer.byteLength(value.text, 'utf8') <= 32 * 1024 * 1024 && sha256(value.text) === value.sha256, 'artifact_bytes_mismatch');
  return JSON.parse(value.text) as unknown;
}

export function assembleIntegratedDiagnosticReview(raw: unknown, secretKey: string) {
  hash.parse(secretKey);
  const input = diagnosticReviewInputSchema.parse(raw);
  requireThat(Buffer.byteLength(JSON.stringify(input), 'utf8') <= 64 * 1024 * 1024, 'aggregate_input_limit');
  const captureRaw = decode(input.capture), preparedRaw = decode(input.preparedPlan);
  const configuration = z.object({ configuration: z.unknown() }).passthrough().parse(preparedRaw).configuration;
  const prepared = prepareIntegratedRequestPlan(captureRaw, configuration, input.capture.sha256);
  requireThat(same(preparedRaw, prepared), 'prepared_plan_reconstruction_mismatch');
  const plan = verifyIntegratedExecutionPlan(decode(input.executionPlan));
  requireThat(plan.preparedPlanSha256 === prepared.planSha256 && plan.planned === prepared.planned, 'plan_preparation_binding');
  requireThat(plan.model === prepared.configuration.model && plan.responseModel === prepared.configuration.expectedResponseModel, 'prepared_model_binding');
  requireThat(same(plan.requests.map(row => row.caseId), prepared.rows.filter(row => row.request !== null).map(row => row.caseId)), 'planned_request_order');
  const run = runSchema.parse(decode(input.run));
  requireThat(run.planSha256 === plan.planSha256 && run.planned === plan.planned && run.accountedRows === plan.planned && run.rows.length === plan.planned, 'run_denominator');
  requireThat(new Set(run.rows.map(row => row.caseId)).size === plan.planned, 'duplicate_run_case');
  requireThat(same(run.rows.map(row => row.caseId), [...plan.requests, ...plan.unscheduled].map(row => row.caseId)), 'run_request_order');
  const captures = z.object({ rows: z.array(captureRowSchema) }).passthrough().parse(captureRaw).rows;
  const envelopes = input.envelopes.map(value => envelopeSchema.parse(decode(value)));
  requireThat(new Set(envelopes.map(row => row.requestId)).size === envelopes.length, 'duplicate_envelope');
  requireThat(envelopes.every(row => row.planSha256 === plan.planSha256 && plan.requests.some(request => request.requestId === row.requestId && request.caseId === row.caseId) && sha256(row.rawResponse) === row.responseSha256), 'envelope_binding');
  const providerRows = input.providerRows ? providerRowsSchema.parse(decode(input.providerRows)) : [];
  requireThat(new Set(providerRows.map(row => row.request_id)).size === providerRows.length, 'duplicate_provider_receipt');
  requireThat(providerRows.every(row => row.owner_id === plan.operatorId && plan.requests.some(request => request.requestId === row.request_id)), 'provider_receipt_scope');
  const alias = (kind: string, id: string) => kind + '-' + createHmac('sha256', secretKey).update(kind + ':' + id).digest('hex').slice(0, 32);
  const providerIds = new Set<string>(); let attempts = 0, stopped = false, complete = 0, rawVerified = 0;
  const bindings: unknown[] = [];
  const tasks = prepared.rows.map(item => {
    const capture = captures.find(row => row.input.caseId === item.caseId)!;
    const reported = run.rows.find(row => row.caseId === item.caseId);
    requireThat(capture && reported, 'missing_case');
    const unpinnedNoEvidence = capture.status === 'no_evidence' && capture.input.versionPins.length === 0;
    if (capture.status !== 'matched' && capture.status !== 'no_evidence' || unpinnedNoEvidence) {
      requireThat(item.status === 'not_scheduled' && !plan.requests.some(row => row.caseId === item.caseId) && reported.requestId === null &&
        reported.status === 'not_scheduled:' + item.reason && plan.unscheduled.some(row => row.caseId === item.caseId && row.reason === item.reason), 'unavailable_capture_binding');
      // Failed/rejected capture never certifies partial snapshots as source truth.
      // Any present trace checksum must still match; original bytes stay operator-only.
      if (capture.traceSha256 !== undefined) requireThat(capture.trace && sha256(JSON.stringify(capture.trace)) === capture.traceSha256, 'retrieval_trace_digest');
      const taskId = alias('task', item.caseId);
      bindings.push({ taskId, caseId: item.caseId, captureSha256: item.captureSha256, traceSha256: capture.traceSha256 ?? null,
        requestId: null, requestBodySha256: null, envelopeResponseSha256: null, providerResponseBodySha256: null, sourcePins: null });
      return { taskId, question: capture.input.query, studentAttempt: { status: 'not_supplied_in_recipe', content: null },
        sourceTruthScope: unpinnedNoEvidence ? 'unavailable_unpinned_source_capture' : 'unavailable_failed_or_rejected_capture', sources: [],
        retrieval: { status: capture.status, candidateAnchors: [], projectedAnchors: [], actuallySuppliedAnchors: [] },
        executionStatus: reported.status, response: { content: null, released: false }, providerReceiptStatus: 'not_applicable',
        judgment: { status: 'unavailable_no_released_response', pass: null } };
    }
    requireThat(capture.trace && capture.actualPromptAnchors && capture.traceSha256, 'retrieved_trace_required');
    requireThat(sha256(JSON.stringify(capture.trace)) === capture.traceSha256, 'retrieval_trace_digest');
    const events = capture.trace.filter(row => row.stage === 'documents'); requireThat(events.length === 1, 'source_snapshot_required');
    const documents = documentsSchema.parse(events[0].payload);
    const sourcePins = pinIntegratedExecutionSources(item.ownerId, item.assignmentId, capture.input.versionPins, events[0].payload);
    for (const document of documents) requireThat(sha256(JSON.stringify(document.pages)) === document.content_hash, 'source_page_digest');
    const candidateEvents = capture.trace.filter(row => row.stage === 'candidates'); requireThat(candidateEvents.length === 1, 'candidate_trace_required');
    const candidates = z.object({ candidates: z.array(chunkSchema).max(1000) }).passthrough().parse(candidateEvents[0].payload).candidates;
    const validateAnchor = (anchor: z.infer<typeof evidenceAnchorSchema>) => {
      const document = documents.find(row => row.id === anchor.versionId), page = document?.pages.find(row => row.page === anchor.location.page);
      requireThat(document && page && anchor.contentHash === document.content_hash && anchor.location.pageLabel === page.pageLabel &&
        page.text.slice(anchor.location.startOffset, anchor.location.endOffset) === anchor.exactText, 'evidence_anchor');
      return { sourceId: alias('source', anchor.versionId), page: anchor.location.page, start: anchor.location.startOffset, end: anchor.location.endOffset, exactText: anchor.exactText };
    };
    for (const candidate of candidates) requireThat(candidate.ownerId === item.ownerId && candidate.assignmentId === item.assignmentId && documents.some(row => row.id === candidate.versionId) && candidate.anchors.every(anchor => anchor.versionId === candidate.versionId), 'candidate_scope');
    const retrieved = candidates.flatMap(row => row.anchors).map(validateAnchor);
    const projected = capture.actualPromptAnchors.map(validateAnchor);
    const selected = item.request?.suppliedAnchors.map(validateAnchor) ?? [];
    const request = plan.requests.find(row => row.caseId === item.caseId);
    let responseText: string | null = null, providerReceiptStatus = 'not_applicable';
    let envelopeHash: string | null = null, providerResponseHash: string | null = null;
    if (!request) {
      requireThat(item.status === 'not_scheduled' && reported.requestId === null && reported.status === 'not_scheduled:' + item.reason && plan.unscheduled.some(row => row.caseId === item.caseId && row.reason === item.reason), 'unscheduled_binding');
    } else {
      requireThat(item.request && request.assignmentId === item.assignmentId && item.ownerId === plan.operatorId && request.captureSha256 === item.captureSha256 &&
        request.requestBody === item.request.requestBody && request.requestBodySha256 === item.request.requestBodySha256 && same(request.sourcePins, sourcePins) && reported.requestId === request.requestId, 'request_capture_binding');
      const envelope = envelopes.find(row => row.requestId === request.requestId);
      const providerRow = providerRows.find(row => row.request_id === request.requestId);
      if (reported.status === 'captured_complete' || reported.status === 'requires_reconciliation_no_retry') {
        requireThat(!stopped, 'attempt_after_stop'); attempts++;
        requireThat(envelope || reported.status !== 'captured_complete', 'missing_complete_envelope');
        if (envelope) {
          envelopeHash = envelope.responseSha256;
          let body: Record<string, unknown> = {};
          if (reported.status === 'captured_complete') body = z.record(z.string(), z.unknown()).parse(JSON.parse(envelope.rawResponse));
          else {
            // The runner persists transport bytes before trying JSON. Malformed,
            // empty or scalar error bodies are legitimate uncertainty evidence.
            try { const parsed = z.record(z.string(), z.unknown()).safeParse(JSON.parse(envelope.rawResponse)); if (parsed.success) body = parsed.data; } catch { /* Exact bytes remain operator-side. */ }
          }
          if (reported.status === 'captured_complete') {
            requireThat(reported.responseSha256 === envelope.responseSha256 && envelope.httpStatus >= 200 && envelope.httpStatus < 300 && body.ok === true && body.rawSaved === true && body.usageSaved === true && body.classification === 'complete' && body.requestId === request.requestId && body.caseId === item.caseId && body.researchOnly === true && body.semanticAcceptance === false, 'released_envelope_binding');
            const released = integratedReleasedCompletionSchema.parse(body.result);
            requireThat(released.requestBodySha256 === request.requestBodySha256 && released.responseModel === plan.responseModel && !providerIds.has(released.providerResponseId), 'released_response_binding');
            providerIds.add(released.providerResponseId); responseText = released.text; providerResponseHash = released.responseBodySha256; complete++;
            providerReceiptStatus = 'raw_provider_receipt_unavailable';
            if (providerRow) {
              const parsed = parseIntegratedProviderResponse(providerRow.result.rawCapture, { requestBodySha256: request.requestBodySha256, requestModel: plan.model, responseModel: plan.responseModel, maxOutputTokens: 800 });
              requireThat(providerRow.result.rawBodyComplete && providerRow.result.usageSaved && providerRow.result.classification === 'complete' && providerRow.result.actualCents === released.actualCents && parsed.completeText && parsed.text === released.text && parsed.providerResponseId === released.providerResponseId && parsed.provenance.responseBodySha256 === released.responseBodySha256 && same(parsed.usage, released.usage), 'raw_provider_release_mismatch');
              rawVerified++; providerReceiptStatus = 'raw_provider_consistency_verified';
            }
          } else {
            stopped = true;
            requireThat(!(body.providerAttempted === false && providerRow), 'provider_attempt_receipt_contradiction');
            providerReceiptStatus = body.providerAttempted === false ? 'provider_not_attempted_as_reported'
              : providerRow ? 'unreleased_raw_retained_operator_only' : 'raw_provider_receipt_unavailable';
          }
        } else { stopped = true; providerReceiptStatus = 'no_envelope_uncertain'; }
      } else {
        requireThat(!envelope && !providerRow && (reported.status === 'not_attempted_after_stop' && stopped || reported.status === 'not_attempted_approval_expired'), 'unattempted_binding');
        stopped = true;
      }
    }
    const taskId = alias('task', item.caseId);
    bindings.push({ taskId, caseId: item.caseId, captureSha256: item.captureSha256, traceSha256: capture.traceSha256, requestId: request?.requestId ?? null,
      requestBodySha256: request?.requestBodySha256 ?? null, envelopeResponseSha256: envelopeHash, providerResponseBodySha256: providerResponseHash, sourcePins });
    return { taskId, question: capture.input.query, studentAttempt: { status: 'not_supplied_in_recipe', content: null },
      sourceTruthScope: 'captured_assignment_document_snapshots_not_independently_certified',
      sources: documents.map(document => ({ sourceId: alias('source', document.id), instructionRights: document.metadata.instructionRights,
        pages: document.pages.map(page => ({ page: page.page, text: page.text, interpretation: page.interpretation })) })),
      retrieval: { status: capture.status, candidateAnchors: retrieved, projectedAnchors: projected, actuallySuppliedAnchors: selected },
      executionStatus: reported.status, response: { content: responseText, released: responseText !== null }, providerReceiptStatus,
      judgment: { status: responseText === null ? 'unavailable_no_released_response' : 'review_pending', pass: null } };
  });
  requireThat(attempts === run.edgeAttempts && stopped === run.stopped, 'run_attempt_accounting');
  tasks.sort((a, b) => a.taskId.localeCompare(b.taskId));
  const packet = { schema: 'integrated-diagnostic-review-packet-v1', denominator: plan.planned, scheduled: plan.requests.length,
    unscheduled: plan.unscheduled.length, releasedResponses: complete, rawProviderReceiptsVerified: rawVerified, evidenceScope: 'offline_hash_checked_operator_artifacts',
    blindingScope: 'structured_metadata_only_content_unchanged', studentAttemptSupplied: false, semanticAcceptance: false, thresholdMet: false,
    familyIndependenceVerified: false, educatorValidated: false, executionAuthorityVerified: false, productionEligible: false, tasks };
  const mapping = { schema: 'integrated-diagnostic-operator-mapping-v1', handling: 'operator_only_not_encrypted', secretKey,
    planSha256: plan.planSha256, preparedPlanSha256: prepared.planSha256, packetSha256: sha256(JSON.stringify(packet)), bindings,
    priorRuns: input.priorRuns, priorRunsMerged: false, artifacts: input, semanticAcceptance: false, productionEligible: false };
  return { packet, mapping };
}
