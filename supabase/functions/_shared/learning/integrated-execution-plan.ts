import { z } from 'zod';
import { integratedProviderBytesSha256 as sha256 } from './integrated-provider-response.ts';
const hash = z.string().regex(/^[a-f0-9]{64}$/), uuid = z.string().uuid();
export const integratedSourcePinSchema = z.object({ id: z.string().min(1).max(200), contentHash: hash, sourceSha256: hash }).strict();
const sourceRowsSchema = z.array(z.object({ id: z.string(), owner_id: uuid, assignment_id: uuid, content_hash: hash,
  metadata: z.object({ id: z.string(), ownerId: uuid, assignmentId: uuid, contentHash: hash }).passthrough(),
  pages: z.array(z.object({ page: z.number().int().positive(), pageLabel: z.string(), text: z.string().max(250000) }).passthrough()).min(1).max(1500),
}).passthrough()).max(12);
/** Bind the actual captured source data, independent of caller-declared content hashes. */
export function pinIntegratedExecutionSources(ownerId: string, assignmentId: string,
  pins: Array<{ id: string; contentHash: string }>, raw: unknown) {
  const rows = sourceRowsSchema.parse(raw);
  if (!pins.length || rows.length !== pins.length || new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('source_snapshot_count');
  return pins.map(pin => {
    const row = rows.find(row => row.id === pin.id);
    if (!row || row.owner_id !== ownerId || row.assignment_id !== assignmentId || row.content_hash !== pin.contentHash
      || row.metadata.id !== row.id || row.metadata.ownerId !== ownerId || row.metadata.assignmentId !== assignmentId
      || row.metadata.contentHash !== pin.contentHash || new Set(row.pages.map(page => page.page)).size !== row.pages.length) throw new Error('source_snapshot_scope');
    // Digest the original JSON values; Zod projections must not replace the stored snapshot.
    const original = (raw as Array<{ id: string; metadata: unknown; pages: unknown }>).find(item => item.id === pin.id)!;
    return integratedSourcePinSchema.parse({ ...pin, sourceSha256: integratedExecutionPlanDigest({ metadata: original.metadata, pages: original.pages }) });
  });
}
export function verifyIntegratedExecutionSources(ownerId: string, row: IntegratedExecutionPlan['requests'][number], raw: unknown): boolean {
  try {
    const actual = pinIntegratedExecutionSources(ownerId, row.assignmentId, row.sourcePins, raw);
    return actual.every(pin => pin.sourceSha256 === row.sourcePins.find(item => item.id === pin.id)?.sourceSha256);
  } catch { return false; }
}
/** Only screened answer text and content-free receipt fields may leave the Edge. */
export const integratedReleasedCompletionSchema = z.object({
  schema: z.literal('integrated-screened-completion-v1'), requestBodySha256: hash, responseBodySha256: hash,
  responseModel: z.string().min(1).max(100), providerResponseId: z.string().min(1).max(200),
  text: z.string().min(1).max(4 * 1024 * 1024),
  usage: z.object({ inputTokens: z.number().int().nonnegative(), outputTokens: z.number().int().min(1).max(800), totalTokens: z.number().int().positive(),
    cachedInputTokens: z.number().int().nonnegative().nullable(), reasoningTokens: z.number().int().nonnegative().nullable() }).strict(),
  actualCents: z.number().int().positive(),
}).strict().refine(value => value.usage.totalTokens === value.usage.inputTokens + value.usage.outputTokens, 'usage_total');
export const integratedExecutionPlanSchema = z.object({
  schema: z.literal('integrated-execution-plan-v1'), planSha256: hash, preparedPlanSha256: hash,
  projectUrl: z.string().url().refine(value => new URL(value).protocol === 'https:' && new URL(value).origin === value),
  operatorId: uuid, model: z.string().regex(/^[A-Za-z0-9_.:-]{1,100}$/), responseModel: z.string().regex(/^[A-Za-z0-9_.:-]{1,100}$/),
  inputRate: z.number().positive().max(1_000_000), outputRate: z.number().positive().max(1_000_000),
  priceReviewedAt: z.string().datetime({ offset: true }), expiresAt: z.string().datetime({ offset: true }),
  maxTotalCents: z.number().int().min(1).max(10000), maxBatchCents: z.number().int().min(1).max(1000),
  timeoutMs: z.number().int().min(1000).max(180_000), maxOutputTokens: z.literal(800),
  moderation: z.object({ model: z.literal('omni-moderation-latest'), maxCallsPerCase: z.literal(2), reviewedCentsPerCall: z.literal(0) }).strict(),
  planned: z.number().int().min(1).max(100), notScheduled: z.number().int().min(0).max(100),
  unscheduled: z.array(z.object({ caseId: z.string().min(1).max(100), reason: z.string().min(1).max(100) }).strict()).max(100),
  requests: z.array(z.object({ requestId: uuid, batchId: uuid, caseId: z.string().min(1).max(100), assignmentId: uuid,
    captureSha256: hash, requestBody: z.string().min(1).max(128000), requestBodySha256: hash, reservedCents: z.number().int().min(1).max(1000),
    sourcePins: z.array(integratedSourcePinSchema).min(1).max(12),
  }).strict()).min(1).max(100),
}).strict();
export type IntegratedExecutionPlan = z.infer<typeof integratedExecutionPlanSchema>;
export function integratedExecutionPlanDigest(value: unknown): string {
  const normalized = (item: unknown): unknown => Array.isArray(item) ? item.map(normalized)
    : item && typeof item === 'object' ? Object.fromEntries(Object.keys(item).sort().map(key => [key, normalized((item as Record<string, unknown>)[key])])) : item;
  return sha256(JSON.stringify(normalized(value)));
}
export function integratedReservationCents(requestBody: string, inputRate: number, outputRate: number) {
  return Math.max(1, Math.ceil(((new TextEncoder().encode(requestBody).length + 1024) * inputRate + 800 * outputRate) / 1_000_000));
}
export function verifyIntegratedExecutionPlan(raw: unknown) {
  const plan = integratedExecutionPlanSchema.parse(raw);
  const { planSha256, ...body } = raw as IntegratedExecutionPlan;
  if (integratedExecutionPlanDigest(body) !== planSha256) throw new Error('execution_plan_digest');
  if (plan.planned !== plan.requests.length + plan.notScheduled || plan.unscheduled.length !== plan.notScheduled || new Set(plan.requests.map(row => row.requestId)).size !== plan.requests.length || new Set([...plan.requests, ...plan.unscheduled].map(row => row.caseId)).size !== plan.planned) throw new Error('execution_plan_denominator');
  const batches = new Map<string, number>(); let total = 0;
  for (const row of plan.requests) {
    if (sha256(row.requestBody) !== row.requestBodySha256 || new TextEncoder().encode(row.requestBody).length > 128000 || new Set(row.sourcePins.map(pin => pin.id)).size !== row.sourcePins.length) throw new Error('request_integrity');
    const request = JSON.parse(row.requestBody) as Record<string, unknown>;
    // Text-only exact primary recipe. No tools, stream, attachments, background or alternate endpoint.
    const keys = ['model', 'instructions', 'input', 'max_output_tokens', 'reasoning', 'text', 'store'];
    if (Object.keys(request).length !== keys.length || keys.some(key => !Object.hasOwn(request, key)) ||
      request.model !== plan.model || request.max_output_tokens !== 800 || request.store !== false || typeof request.instructions !== 'string' ||
      JSON.stringify(request.text) !== JSON.stringify({ format: { type: 'json_object' } })) throw new Error('request_configuration');
    const input = z.array(z.object({ role: z.literal('user'), content: z.array(z.object({ type: z.literal('input_text'), text: z.string() }).strict()).length(2) }).strict()).length(1).parse(request.input);
    z.object({ effort: z.enum(['low', 'medium', 'high']) }).strict().parse(request.reasoning);
    if (input[0].content[1].text !== 'Return a valid JSON object matching the requested structure.') throw new Error('request_json_instruction');
    if (row.reservedCents !== integratedReservationCents(row.requestBody, plan.inputRate, plan.outputRate)) throw new Error('request_reservation');
    const batch = (batches.get(row.batchId) ?? 0) + row.reservedCents; batches.set(row.batchId, batch); total += row.reservedCents;
    if (batch > plan.maxBatchCents) throw new Error('batch_ceiling');
  }
  if (total > plan.maxTotalCents) throw new Error('plan_cost_ceiling');
  return plan;
}
