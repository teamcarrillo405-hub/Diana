import { z } from 'zod';
import { integratedProviderBytesSha256 as sha256 } from './integrated-provider-response';
import { prepareIntegratedPrimaryRecipe } from './integrated-primary-recipe';
import { curriculumPromptAnchors, renderCurriculumPromptContext } from './curriculum-prompt-context';
import { chunkSchema, RETRIEVAL_VERSION } from './contracts';
import { pinIntegratedExecutionSources } from '@/supabase/functions/_shared/learning/integrated-execution-plan';

const hash = z.string().regex(/^[a-f0-9]{64}$/);
const retrievalResultSchema = z.object({ version: z.literal(RETRIEVAL_VERSION), status: z.literal('matched'), method: z.enum(['keyword', 'hybrid']), chunks: z.array(chunkSchema.extend({ score: z.number().finite() })).min(1).max(6) });
export const integratedRequestConfiguration = z.object({
  schema: z.literal('integrated-request-plan-configuration-v1'),
  id: z.string().uuid(), model: z.string().min(1).max(200), expectedResponseModel: z.string().min(1).max(200),
  expectedCaseCount: z.number().int().min(1).max(100), maxOutputTokens: z.literal(800),
  maxRequestBytes: z.number().int().positive().max(128_000), captureFileSha256: hash,
}).strict();
const inputSchema = z.object({ caseId: z.string().min(1), expectedOwnerId: z.string().uuid(), assignmentId: z.string().uuid(), query: z.string().min(1).max(1000), versionPins: z.array(z.object({ id: z.string(), contentHash: hash })) }).passthrough();
const captureSchema = z.object({ schema: z.literal('integrated-assignment-retrieval-batch-v1'),
  execution: z.literal('authenticated_supabase_lexical_retrieval_no_generation'), planned: z.number().int(), completed: z.number().int(),
  plannedInputsSha256: hash, providerCalls: z.literal(0), productionEligible: z.literal(false),
  rows: z.array(z.object({ input: inputSchema, status: z.string(), captureSha256: hash.optional() }).passthrough()),
}).passthrough();

/** Compilation of already captured rows, never execution or an approval grant. */
export function prepareIntegratedRequestPlan(raw: unknown, rawConfig: unknown, captureFileSha256: string) {
  const config = integratedRequestConfiguration.parse(rawConfig), batch = captureSchema.parse(raw);
  if (captureFileSha256 !== config.captureFileSha256) throw new Error('capture_file_digest_mismatch');
  if (batch.planned !== config.expectedCaseCount || batch.completed !== batch.planned || batch.rows.length !== batch.planned) throw new Error('capture_denominator_mismatch');
  if (new Set(batch.rows.map(row => row.input.caseId)).size !== batch.planned) throw new Error('duplicate_case_id');
  // Zod parsing may reorder properties: digest exact original rows before any projection.
  const original = raw as { rows: Array<Record<string, unknown>> };
  if (sha256(JSON.stringify(original.rows.map(row => row.input))) !== batch.plannedInputsSha256) throw new Error('planned_inputs_digest_mismatch');
  const rows = batch.rows.map((row, index) => {
    const rawRow = original.rows[index];
    if (row.status !== 'capture_error') {
      const { captureSha256: _digest, ...body } = rawRow;
      if (!row.captureSha256 || sha256(JSON.stringify(body)) !== row.captureSha256) throw new Error('row_digest_mismatch');
    }
    const identity = { caseId: row.input.caseId, assignmentId: row.input.assignmentId, ownerId: row.input.expectedOwnerId, sourcePins: row.input.versionPins, captureSha256: row.captureSha256 ?? null };
    if (row.status !== 'matched') return { ...identity, status: 'not_scheduled', reason: row.status, request: null };
    if (!row.input.versionPins.length || row.selection !== 'exact_pinned_versions' || row.authenticatedOwnerId !== row.input.expectedOwnerId) throw new Error('frozen_scope_required');
    const trace = z.array(z.object({ stage: z.string(), payload: z.unknown() })).parse(row.trace);
    const snapshots = trace.filter(item => item.stage === 'documents');
    if (snapshots.length !== 1) throw new Error('source_snapshot_required');
    const sourcePins = pinIntegratedExecutionSources(identity.ownerId, identity.assignmentId, row.input.versionPins, snapshots[0].payload);
    const documents = snapshots[0].payload as Array<{ id: string; pages: Array<{ page: number; pageLabel: string; text: string }> }>;
    const result = retrievalResultSchema.parse(row.result);
    for (const chunk of result.chunks) {
      const pin = sourcePins.find(pin => pin.id === chunk.versionId);
      if (!pin || chunk.ownerId !== identity.ownerId || chunk.assignmentId !== identity.assignmentId) throw new Error('retrieved_source_scope');
      for (const anchor of chunk.anchors) {
        const page = documents.find(item => item.id === chunk.versionId)?.pages.find(item => item.page === anchor.location.page);
        if (anchor.versionId !== chunk.versionId || anchor.contentHash !== pin.contentHash || !page || page.pageLabel !== anchor.location.pageLabel
          || page.text.slice(anchor.location.startOffset, anchor.location.endOffset) !== anchor.exactText) throw new Error('retrieved_source_anchor');
      }
    }
    const anchors = curriculumPromptAnchors(result), context = renderCurriculumPromptContext(result);
    if (context !== row.promptContext || sha256(context) !== row.promptContextSha256 || sha256(JSON.stringify(anchors)) !== row.evidenceSha256) throw new Error('prompt_projection_mismatch');
    const recipe = prepareIntegratedPrimaryRecipe({ promptContext: context, actualPromptAnchors: anchors, query: row.input.query }, config.model);
    const requestBytes = Buffer.byteLength(recipe.requestBody, 'utf8');
    if (requestBytes > config.maxRequestBytes) throw new Error('request_byte_ceiling');
    return { ...identity, sourcePins, status: 'prepared_not_authorized', reason: null, request: recipe, requestBytes };
  });
  const prepared = rows.filter(row => row.request !== null);
  const body = { schema: 'integrated-primary-request-plan-v1', configuration: config, captureFileSha256,
    planned: batch.planned, preparedRequests: prepared.length, notScheduled: rows.length - prepared.length,
    aggregateRequestBytes: prepared.reduce((sum, row) => sum + (row.requestBytes ?? 0), 0),
    aggregateOutputTokenCeiling: prepared.length * config.maxOutputTokens, rows,
    providerCalls: 0, dispatchAuthorized: false, paidLedgerReserved: false, executionAuthorityVerified: false, productionEligible: false,
    remainingAuthorization: ['independent capture execution verification', 'fresh family-reviewed evaluation inputs', 'exact model/pricing/cost approval', 'server paid ledger reservation and settlement'] };
  return { ...body, planSha256: sha256(JSON.stringify(body)) };
}
