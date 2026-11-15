import { describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { assembleIntegratedDiagnosticReview } from './integrated-diagnostic-review';
import { prepareIntegratedRequestPlan } from './integrated-request-plan';
import { compileIntegratedExecutionPlan } from './integrated-execution-plan';
import { integratedProviderBytesSha256 as sha } from './integrated-provider-response';
import { curriculumPromptAnchors, renderCurriculumPromptContext } from './curriculum-prompt-context';
import { RETRIEVAL_VERSION, type RetrievalResult } from './contracts';
import { integratedDiagnosticReviewCli } from '../../scripts/learning/integrated-diagnostic-review';
import { integratedExecutionPlanDigest } from '@/supabase/functions/_shared/learning/integrated-execution-plan';

// Opaque protocol fixtures only; these are not held-out evaluation tasks.
const owner = '11111111-1111-4111-8111-111111111111', assignment = '22222222-2222-4222-8222-222222222222';
const key = 'f'.repeat(64);
const blob = (value: unknown) => { const text = JSON.stringify(value); return { text, sha256: sha(text) }; };
function fixture(captureFailure: 'capture_error' | 'policy_rejected' | 'no_source' | null = null) {
  const pages = [{ page: 1, pageLabel: '1', text: 'Opaque fixture payload.', interpretation: 'original' as const }];
  const versionId = 'a'.repeat(64), contentHash = sha(JSON.stringify(pages));
  const metadata = { id: versionId, documentId: 'fixture-document', ownerId: owner, assignmentId: assignment, classId: null, title: 'Fixture', edition: '', subject: 'math', contentHash,
    extractionVersion: 'structured-text-v1', instructionRights: 'owner_provided', trainingPermission: 'excluded', parentVersionId: null };
  const documents = [{ id: versionId, owner_id: owner, assignment_id: assignment, content_hash: contentHash, metadata, pages }];
  const anchor = { versionId, blockId: 'b'.repeat(64), contentHash, location: { page: 1, pageLabel: '1', startOffset: 0, endOffset: pages[0].text.length }, exactText: pages[0].text };
  const chunk = { id: 'c'.repeat(64), versionId, ownerId: owner, assignmentId: assignment, classId: null, subject: 'math' as const, text: pages[0].text, anchors: [anchor], skillIds: [], problemNumber: null };
  const rows = [0, 1, 2].map(index => {
    const matched = index < 2;
    const input = { caseId: `opaque-${index}`, expectedOwnerId: owner, assignmentId: assignment, query: `Protocol fixture ${index}`, versionPins: index === 2 && captureFailure === 'no_source' ? [] : [{ id: versionId, contentHash }] };
    if (index === 2 && captureFailure === 'capture_error') return { input, caseId: input.caseId, status: 'capture_error', providerCalls: 0, assistanceReleased: false };
    if (index === 2 && captureFailure === 'policy_rejected') {
      const rejected = { input, status: 'policy_rejected', trace: [] };
      return { ...rejected, captureSha256: sha(JSON.stringify(rejected)) };
    }
    const result: RetrievalResult = { version: RETRIEVAL_VERSION, status: matched ? 'matched' : 'no_evidence', method: 'keyword', chunks: matched ? [{ ...chunk, score: 1 }] : [] };
    const trace = [{ stage: 'documents', payload: index === 2 && captureFailure === 'no_source' ? [] : documents }, { stage: 'candidates', payload: { candidates: matched ? [chunk] : [] } }];
    const promptContext = renderCurriculumPromptContext(result), actualPromptAnchors = curriculumPromptAnchors(result);
    const row = { input, status: result.status, selection: 'exact_pinned_versions', authenticatedOwnerId: owner, result, trace,
      promptContext, actualPromptAnchors, promptContextSha256: sha(promptContext), evidenceSha256: sha(JSON.stringify(actualPromptAnchors)), traceSha256: sha(JSON.stringify(trace)) };
    return { ...row, captureSha256: sha(JSON.stringify(row)) };
  });
  const capture = blob({ schema: 'integrated-assignment-retrieval-batch-v1', execution: 'authenticated_supabase_lexical_retrieval_no_generation', planned: 3, completed: 3,
    plannedInputsSha256: sha(JSON.stringify(rows.map(row => row.input))), rows, providerCalls: 0, productionEligible: false });
  const configuration = { schema: 'integrated-request-plan-configuration-v1', id: '33333333-3333-4333-8333-333333333333', model: 'fixture-model', expectedResponseModel: 'fixture-model', expectedCaseCount: 3,
    maxOutputTokens: 800, maxRequestBytes: 128000, captureFileSha256: capture.sha256 };
  const prepared = prepareIntegratedRequestPlan(JSON.parse(capture.text), configuration, capture.sha256);
  const plan = compileIntegratedExecutionPlan(prepared, { schema: 'integrated-execution-quote-v1', preparedPlanSha256: prepared.planSha256, operatorId: owner,
    projectUrl: 'https://fixture.invalid', inputRate: 1, outputRate: 1, priceReviewedAt: '2026-09-29T00:00:00Z', expiresAt: '2026-09-30T00:00:00Z', maxTotalCents: 100, maxBatchCents: 100,
    timeoutMs: 30000, moderation: { model: 'omni-moderation-latest', maxCallsPerCase: 2, reviewedCentsPerCall: 0 } });
  const providerRows: unknown[] = [];
  const envelopes = plan.requests.map((request, i) => {
    const text = JSON.stringify({ fixture: i });
    const responseBody = JSON.stringify({ id: `resp_fixture_${i}`, object: 'response', created_at: 1, model: plan.responseModel, status: 'completed', error: null, incomplete_details: null,
      output: [{ id: `msg_${i}`, type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text, annotations: [] }] }], usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120 } });
    const rawCapture = { schema: 'integrated-openai-responses-capture-v1', endpoint: '/v1/responses', transport: 'http_json', requestBody: request.requestBody, responseBody, httpStatus: 200,
      providerRequestId: `fixture-request-${i}`, startedAt: '2026-09-29T01:00:00Z', receivedAt: '2026-09-29T01:00:01Z' };
    providerRows.push({ request_id: request.requestId, owner_id: owner, result: { rawCapture, rawBodyComplete: true, classification: 'complete', usageSaved: true, actualCents: 1 } });
    const rawResponse = JSON.stringify({ ok: true, requestId: request.requestId, caseId: request.caseId, classification: 'complete', rawSaved: true, usageSaved: true, researchOnly: true, semanticAcceptance: false,
      result: { schema: 'integrated-screened-completion-v1', requestBodySha256: request.requestBodySha256, responseBodySha256: sha(responseBody), responseModel: plan.responseModel,
        providerResponseId: `resp_fixture_${i}`, text, usage: { inputTokens: 100, outputTokens: 20, totalTokens: 120, cachedInputTokens: null, reasoningTokens: null }, actualCents: 1 } });
    return blob({ schema: 'integrated-edge-execution-envelope-v1', planSha256: plan.planSha256, requestId: request.requestId, caseId: request.caseId, receivedAt: '2026-09-29T01:00:02Z', httpStatus: 200, rawResponse, responseSha256: sha(rawResponse) });
  });
  const run = { schema: 'integrated-execution-run-v1', planSha256: plan.planSha256, planned: 3, accountedRows: 3, edgeAttempts: 2, stopped: false,
    rows: [...plan.requests.map((request, index) => ({ caseId: request.caseId, requestId: request.requestId, status: 'captured_complete', responseSha256: JSON.parse(envelopes[index].text).responseSha256 })),
      { caseId: 'opaque-2', requestId: null, status: 'not_scheduled:' + (captureFailure === 'no_source' ? 'no_evidence' : captureFailure ?? 'no_evidence') }], executionAuthorityVerified: false, semanticAcceptance: false, productionEligible: false };
  return { schema: 'integrated-diagnostic-review-input-v1', capture, preparedPlan: blob(prepared), executionPlan: blob(plan), run: blob(run), envelopes, providerRows: blob(providerRows), priorRuns: [{ label: 'prior-stopped', artifactSha256: 'd'.repeat(64) }] };
}

describe('diagnostic artifact binding', () => {
  it('keeps all rows and only actually released text, without manufactured judgments', () => {
    const result = assembleIntegratedDiagnosticReview(fixture(), key);
    expect(result.packet).toMatchObject({ denominator: 3, releasedResponses: 2, unscheduled: 1, rawProviderReceiptsVerified: 2, semanticAcceptance: false, thresholdMet: false, familyIndependenceVerified: false });
    expect(result.packet.tasks.find(row => !row.response.released)?.judgment).toEqual({ status: 'unavailable_no_released_response', pass: null });
    expect(JSON.stringify(result.packet)).not.toMatch(/fixture-model|resp_fixture|11111111|opaque-0|prior-stopped/);
    expect(result.mapping.priorRunsMerged).toBe(false);
  });
  it('labels missing raw provider exports unavailable without inventing a receipt', () => {
    const input = fixture(); const { providerRows: _rows, ...withoutRaw } = input;
    const result = assembleIntegratedDiagnosticReview(withoutRaw, key);
    expect(result.packet.rawProviderReceiptsVerified).toBe(0);
    expect(result.packet.tasks.filter(row => row.response.released).every(row => row.providerReceiptStatus === 'raw_provider_receipt_unavailable')).toBe(true);
  });
  it.each(['capture_error', 'policy_rejected'] as const)('retains unavailable capture denominator rows without certifying missing snapshots: %s', reason => {
    const result = assembleIntegratedDiagnosticReview(fixture(reason), key);
    expect(result.packet.denominator).toBe(3);
    const row = result.packet.tasks.find(task => task.executionStatus === 'not_scheduled:' + reason)!;
    expect(row.sources).toEqual([]); expect(row.judgment.pass).toBeNull();
    expect(row.sourceTruthScope).toBe('unavailable_failed_or_rejected_capture');
  });
  it('retains an unpinned empty-source no-evidence capture without inventing source pins', () => {
    const result = assembleIntegratedDiagnosticReview(fixture('no_source'), key);
    expect(result.packet.denominator).toBe(3);
    const row = result.packet.tasks.find(task => task.executionStatus === 'not_scheduled:no_evidence')!;
    expect(row.sources).toEqual([]); expect(row.retrieval.actuallySuppliedAnchors).toEqual([]);
    expect(row.sourceTruthScope).toBe('unavailable_unpinned_source_capture'); expect(row.judgment.pass).toBeNull();
  });
  it('rejects a resealed execution plan with a changed configured response model', () => {
    const input = fixture(), plan = JSON.parse(input.executionPlan.text);
    plan.responseModel = 'changed-model'; const { planSha256: _hash, ...body } = plan;
    plan.planSha256 = integratedExecutionPlanDigest(body); input.executionPlan = blob(plan);
    expect(() => assembleIntegratedDiagnosticReview(input, key)).toThrow('prepared_model_binding');
  });
  it('rejects reordered reported execution rows', () => {
    const input = fixture(), run = JSON.parse(input.run.text); [run.rows[0], run.rows[1]] = [run.rows[1], run.rows[0]]; input.run = blob(run);
    expect(() => assembleIntegratedDiagnosticReview(input, key)).toThrow('run_request_order');
  });
  it('rejects byte tampering and missing complete envelopes', () => {
    const input = fixture(); input.capture.text += ' ';
    expect(() => assembleIntegratedDiagnosticReview(input, key)).toThrow('artifact_bytes_mismatch');
    const missing = fixture(); missing.envelopes.pop();
    expect(() => assembleIntegratedDiagnosticReview(missing, key)).toThrow('missing_complete_envelope');
  });
  it('rejects a dropped denominator row and a prior-run envelope substituted into this run', () => {
    const input = fixture(); const run = JSON.parse(input.run.text); run.rows.pop(); input.run = blob(run);
    expect(() => assembleIntegratedDiagnosticReview(input, key)).toThrow('run_denominator');
    const mixed = fixture(); const envelope = JSON.parse(mixed.envelopes[0].text); envelope.planSha256 = '0'.repeat(64); mixed.envelopes[0] = blob(envelope);
    expect(() => assembleIntegratedDiagnosticReview(mixed, key)).toThrow('envelope_binding');
  });
  it('rejects changed source text even if the outer file is resealed', () => {
    const input = fixture(), capture = JSON.parse(input.capture.text); capture.rows[0].trace[0].payload[0].pages[0].text += '!'; input.capture = blob(capture);
    expect(() => assembleIntegratedDiagnosticReview(input, key)).toThrow();
  });
  it('rejects raw truncation hidden under a complete released envelope', () => {
    const input = fixture(), rows = JSON.parse(input.providerRows.text), raw = JSON.parse(rows[0].result.rawCapture.responseBody);
    raw.status = 'incomplete'; raw.incomplete_details = { reason: 'max_output_tokens' }; rows[0].result.rawCapture.responseBody = JSON.stringify(raw); input.providerRows = blob(rows);
    expect(() => assembleIntegratedDiagnosticReview(input, key)).toThrow('raw_provider_release_mismatch');
  });
  it('rejects duplicate and foreign provider receipts', () => {
    const input = fixture(), rows = JSON.parse(input.providerRows.text); rows.push(rows[0]); input.providerRows = blob(rows);
    expect(() => assembleIntegratedDiagnosticReview(input, key)).toThrow('duplicate_provider_receipt');
    rows.pop(); rows[0].owner_id = assignment; input.providerRows = blob(rows);
    expect(() => assembleIntegratedDiagnosticReview(input, key)).toThrow('provider_receipt_scope');
  });
  it('rejects the same provider response identity reused across distinct requests', () => {
    const input = fixture(), envelope = JSON.parse(input.envelopes[1].text), body = JSON.parse(envelope.rawResponse), run = JSON.parse(input.run.text);
    body.result.providerResponseId = 'resp_fixture_0'; envelope.rawResponse = JSON.stringify(body); envelope.responseSha256 = sha(envelope.rawResponse);
    input.envelopes[1] = blob(envelope); run.rows[1].responseSha256 = envelope.responseSha256; input.run = blob(run);
    expect(() => assembleIntegratedDiagnosticReview(input, key)).toThrow('released_response_binding');
  });
  it('preserves a stopped run separately, with no invented answer for the unattempted case', () => {
    const input = fixture(), run = JSON.parse(input.run.text), envelope = JSON.parse(input.envelopes[0].text);
    envelope.httpStatus = 503; envelope.rawResponse = JSON.stringify({ error: 'fixture_error', providerAttempted: false }); envelope.responseSha256 = sha(envelope.rawResponse);
    input.envelopes = [blob(envelope)]; input.providerRows = blob([]); run.edgeAttempts = 1; run.stopped = true;
    run.rows[0] = { caseId: 'opaque-0', requestId: run.rows[0].requestId, status: 'requires_reconciliation_no_retry' };
    run.rows[1] = { caseId: 'opaque-1', requestId: run.rows[1].requestId, status: 'not_attempted_after_stop' }; input.run = blob(run);
    const result = assembleIntegratedDiagnosticReview(input, key);
    expect(result.packet.releasedResponses).toBe(0); expect(result.packet.denominator).toBe(3);
    expect(result.packet.tasks.some(row => row.providerReceiptStatus === 'provider_not_attempted_as_reported')).toBe(true);
  });
  it.each(['<html>upstream error</html>', '', '42', 'null'])('retains opaque uncertain transport bodies in the denominator: %s', rawResponse => {
    const input = fixture(), run = JSON.parse(input.run.text), envelope = JSON.parse(input.envelopes[0].text);
    envelope.httpStatus = 503; envelope.rawResponse = rawResponse; envelope.responseSha256 = sha(rawResponse);
    input.envelopes = [blob(envelope)]; input.providerRows = blob([]); run.edgeAttempts = 1; run.stopped = true;
    run.rows[0] = { caseId: 'opaque-0', requestId: run.rows[0].requestId, status: 'requires_reconciliation_no_retry' };
    run.rows[1] = { caseId: 'opaque-1', requestId: run.rows[1].requestId, status: 'not_attempted_after_stop' }; input.run = blob(run);
    const result = assembleIntegratedDiagnosticReview(input, key);
    expect(result.packet.denominator).toBe(3); expect(result.packet.releasedResponses).toBe(0);
    expect(result.mapping.artifacts.envelopes[0].text).toBe(input.envelopes[0].text);
  });
  it('writes exclusive offline output and refuses rerun or descriptor tampering', async () => {
    await mkdir(join(process.cwd(), 'artifacts'), { recursive: true });
    const directory = await mkdtemp(join(process.cwd(), 'artifacts', 'diagnostic-contract-'));
    try {
      const input = fixture(), files: Record<string, unknown> = { schema: 'integrated-diagnostic-review-files-v1', priorRuns: input.priorRuns };
      for (const name of ['capture', 'preparedPlan', 'executionPlan', 'run', 'providerRows'] as const) {
        const path = join(directory, name + '.json'); await writeFile(path, input[name].text); files[name] = { path, sha256: input[name].sha256 };
      }
      files.envelopes = await Promise.all(input.envelopes.map(async (value, index) => { const path = join(directory, index + '.json'); await writeFile(path, value.text); return { path, sha256: value.sha256 }; }));
      const descriptor = join(directory, 'files.json'), text = JSON.stringify(files); await writeFile(descriptor, text);
      const args = ['assemble', descriptor, '--input-sha256', sha(text), '--output', join(directory, 'output')];
      expect(await integratedDiagnosticReviewCli(args)).toMatchObject({ denominator: 3, releasedResponses: 2, thresholdMet: false });
      expect(JSON.parse(await readFile(join(directory, 'output/reviewer/packet.json'), 'utf8')).tasks).toHaveLength(3);
      await expect(integratedDiagnosticReviewCli(args)).rejects.toThrow(); args[3] = '0'.repeat(64);
      await expect(integratedDiagnosticReviewCli(args)).rejects.toThrow('descriptor_digest');
    } finally { await rm(directory, { recursive: true }); }
  });
});
