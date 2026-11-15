import { z } from 'zod';
import { integratedProviderBytesSha256 as sha256 } from './integrated-provider-response';
import { integratedReservationCents, verifyIntegratedExecutionPlan, integratedExecutionPlanDigest, integratedSourcePinSchema } from '@/supabase/functions/_shared/learning/integrated-execution-plan';
const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const integratedExecutionQuoteSchema = z.object({
  schema: z.literal('integrated-execution-quote-v1'), preparedPlanSha256: hash, operatorId: z.string().uuid(),
  projectUrl: z.string().url(),
  inputRate: z.number().positive().max(1_000_000), outputRate: z.number().positive().max(1_000_000),
  priceReviewedAt: z.string().datetime({ offset: true }), expiresAt: z.string().datetime({ offset: true }),
  maxTotalCents: z.number().int().min(1).max(10000), maxBatchCents: z.number().int().min(1).max(1000),
  timeoutMs: z.number().int().min(1000).max(180000),
  moderation: z.object({ model: z.literal('omni-moderation-latest'), maxCallsPerCase: z.literal(2), reviewedCentsPerCall: z.literal(0) }).strict(),
}).strict();
function uuid(value: string) { const h = sha256(value); return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h[16], 16) & 3) | 8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`; }
/** Builds an approval candidate, never grants authorization or dispatches a model. */
export function compileIntegratedExecutionPlan(raw: unknown, quoteRaw: unknown) {
  const quote = integratedExecutionQuoteSchema.parse(quoteRaw);
  const prepared = z.object({ schema: z.literal('integrated-primary-request-plan-v1'), planSha256: hash,
    planned: z.number().int().min(1).max(100), preparedRequests: z.number().int(), notScheduled: z.number().int(),
    configuration: z.object({ model: z.string(), expectedResponseModel: z.string(), maxOutputTokens: z.literal(800) }).passthrough(),
    rows: z.array(z.object({ caseId: z.string(), assignmentId: z.string().uuid(), ownerId: z.string().uuid(), sourcePins: z.array(integratedSourcePinSchema.partial({ sourceSha256: true })),
      captureSha256: hash.nullable(), status: z.enum(['prepared_not_authorized', 'not_scheduled']), request: z.object({ requestBody: z.string(), requestBodySha256: hash }).passthrough().nullable() }).passthrough()),
    providerCalls: z.literal(0), dispatchAuthorized: z.literal(false),
  }).passthrough().parse(raw);
  const { planSha256, ...body } = raw as Record<string, unknown>;
  if (sha256(JSON.stringify(body)) !== planSha256 || planSha256 !== quote.preparedPlanSha256 || prepared.rows.length !== prepared.planned) throw new Error('prepared_plan_integrity');
  const requests = [], unscheduled = []; let batch = 0, batchCents = 0;
  for (const row of prepared.rows) {
    if (row.ownerId !== quote.operatorId) throw new Error('operator_scope');
    if (row.status === 'not_scheduled') { if (row.request !== null || typeof row.reason !== 'string') throw new Error('unscheduled_request'); unscheduled.push({ caseId: row.caseId, reason: row.reason }); continue; }
    if (!row.request || !row.captureSha256) throw new Error('prepared_request_missing');
    const reservedCents = integratedReservationCents(row.request.requestBody, quote.inputRate, quote.outputRate);
    if (reservedCents > quote.maxBatchCents) throw new Error('case_cost_ceiling');
    if (batchCents + reservedCents > quote.maxBatchCents) { batch++; batchCents = 0; }
    batchCents += reservedCents;
    requests.push({ requestId: uuid(`integrated-request-v1:${planSha256}:${row.caseId}`), batchId: uuid(`integrated-batch-v1:${planSha256}:${batch}`),
      caseId: row.caseId, assignmentId: row.assignmentId, captureSha256: row.captureSha256,
      requestBody: row.request.requestBody, requestBodySha256: row.request.requestBodySha256, reservedCents, sourcePins: row.sourcePins });
  }
  if (requests.length !== prepared.preparedRequests || prepared.notScheduled !== prepared.planned - requests.length) throw new Error('prepared_denominator');
  const plan = { schema: 'integrated-execution-plan-v1', preparedPlanSha256: quote.preparedPlanSha256, operatorId: quote.operatorId,
    projectUrl: quote.projectUrl,
    model: prepared.configuration.model, responseModel: prepared.configuration.expectedResponseModel,
    inputRate: quote.inputRate, outputRate: quote.outputRate, priceReviewedAt: quote.priceReviewedAt, expiresAt: quote.expiresAt,
    maxTotalCents: quote.maxTotalCents, maxBatchCents: quote.maxBatchCents, timeoutMs: quote.timeoutMs, maxOutputTokens: 800,
    moderation: quote.moderation, planned: prepared.planned, notScheduled: prepared.notScheduled, unscheduled, requests };
  return verifyIntegratedExecutionPlan({ ...plan, planSha256: integratedExecutionPlanDigest(plan) });
}
