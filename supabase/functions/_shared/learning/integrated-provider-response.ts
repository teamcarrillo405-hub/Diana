import { Buffer } from 'node:buffer';
/** Offline Responses API capture parsing. No provider, retrieval, corpus or credential IO. */
import { createHash } from 'node:crypto';
import { z } from 'zod';

const MAX_BYTES = 4 * 1024 * 1024;
const tokenCount = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const identifier = z.string().min(1).max(200);
const digest = z.string().regex(/^[a-f0-9]{64}$/u);
const captureSchema = z.object({
  schema: z.literal('integrated-openai-responses-capture-v1'),
  endpoint: z.literal('/v1/responses'), transport: z.literal('http_json'),
  requestBody: z.string().min(2).max(MAX_BYTES), responseBody: z.string().min(2).max(MAX_BYTES),
  httpStatus: z.number().int().min(100).max(599),
  providerRequestId: identifier.nullable(),
  startedAt: z.string().datetime({ offset: true }), receivedAt: z.string().datetime({ offset: true }),
}).strict();
const expectedSchema = z.object({
  requestBodySha256: digest, requestModel: identifier, responseModel: identifier,
  maxOutputTokens: z.number().int().positive().max(128000),
}).strict();
const requestSchema = z.object({ model: identifier, max_output_tokens: tokenCount, stream: z.literal(false).optional() }).passthrough();
const usageSchema = z.object({
  input_tokens: tokenCount, output_tokens: tokenCount, total_tokens: tokenCount,
  input_tokens_details: z.object({ cached_tokens: tokenCount }).passthrough().optional(),
  output_tokens_details: z.object({ reasoning_tokens: tokenCount }).passthrough().optional(),
}).passthrough();
const messageSchema = z.object({
  id: identifier, type: z.literal('message'), role: z.literal('assistant'),
  status: z.enum(['completed', 'incomplete', 'in_progress']),
  content: z.array(z.discriminatedUnion('type', [
    z.object({ type: z.literal('output_text'), text: z.string(), annotations: z.array(z.unknown()) }).passthrough(),
    z.object({ type: z.literal('refusal'), refusal: z.string().min(1) }).passthrough(),
  ])).max(100),
}).passthrough();
const reasoningSchema = z.object({
  id: identifier, type: z.literal('reasoning'),
  status: z.enum(['completed', 'incomplete', 'in_progress']).optional(),
  summary: z.array(z.object({ type: z.literal('summary_text'), text: z.string() }).passthrough()).max(100),
}).passthrough();
const outputIdentitySchema = z.object({ id: identifier, type: identifier }).passthrough();
const responseSchema = z.object({
  id: z.string().regex(/^resp_[A-Za-z0-9_-]+$/u).max(200), object: z.literal('response'),
  created_at: tokenCount, completed_at: tokenCount.nullable().optional(), model: identifier,
  status: z.enum(['completed', 'incomplete', 'failed', 'cancelled', 'queued', 'in_progress']),
  error: z.object({ code: identifier, message: z.string() }).passthrough().nullable(),
  incomplete_details: z.object({ reason: identifier }).passthrough().nullable(),
  output: z.array(z.unknown()).max(1000), usage: usageSchema.nullable(),
  max_output_tokens: tokenCount.nullable().optional(),
}).passthrough();

export type IntegratedProviderCapture = z.infer<typeof captureSchema>;
export type IntegratedProviderExpectation = z.infer<typeof expectedSchema>;
export class IntegratedProviderResponseError extends Error {
  constructor(readonly code: string) { super(code); }
}
function reject(code: string): never { throw new IntegratedProviderResponseError(code); }
function parse<T extends z.ZodTypeAny>(schema: T, raw: unknown, code: string): z.infer<T> {
  const result = schema.safeParse(raw);
  if (!result.success) reject(code);
  return result.data;
}
function json(text: string, code: string): unknown {
  if (Buffer.byteLength(text, 'utf8') > MAX_BYTES) reject('capture_byte_limit');
  try { return JSON.parse(text); } catch { return reject(code); }
}
export function integratedProviderBytesSha256(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

/**
 * Caller-supplied headers, IDs, timestamps and hashes are declarations, not execution attestation.
 * Request bytes must be pinned separately. Neither a valid parse nor a matching hash authenticates a call.
 * Provider metadata outside the parsed text subset remains in the exact original responseBody.
 */
export function parseIntegratedProviderResponse(raw: unknown, expectedRaw: unknown) {
  const capture = parse(captureSchema, raw, 'capture_shape');
  const expected = parse(expectedSchema, expectedRaw, 'expectation_shape');
  const request = parse(requestSchema, json(capture.requestBody, 'request_json'), 'request_shape');
  const body = json(capture.responseBody, 'response_json');
  const requestBodySha256 = integratedProviderBytesSha256(capture.requestBody);
  const responseBodySha256 = integratedProviderBytesSha256(capture.responseBody);
  if (requestBodySha256 !== expected.requestBodySha256) reject('request_digest_mismatch');
  if (request.model !== expected.requestModel || request.max_output_tokens !== expected.maxOutputTokens) reject('request_configuration_mismatch');
  if (Date.parse(capture.receivedAt) < Date.parse(capture.startedAt)) reject('capture_time_order');
  const provenance = {
    evidenceScope: 'caller_supplied_raw_http_capture_consistency' as const,
    executionAuthorityVerified: false as const, productionEligible: false as const,
    providerRequestId: capture.providerRequestId, requestBodySha256, responseBodySha256,
    requestModel: request.model, expectedResponseModel: expected.responseModel,
    startedAt: capture.startedAt, receivedAt: capture.receivedAt, httpStatus: capture.httpStatus,
    independentAttestationRequired: true as const,
  };
  const original = Object.freeze({ ...capture });
  if (capture.httpStatus < 200 || capture.httpStatus >= 300) {
    parse(z.object({ error: z.object({ message: z.string() }).passthrough() }).passthrough(), body, 'http_error_shape');
    return { original, provenance, providerResponseId: null, providerStatus: null, classification: 'http_error' as const,
      terminal: true, completeText: false, text: '', refusals: [] as string[], usage: null, incompleteReason: null, unsupportedOutputTypes: [] as string[] };
  }
  const response = parse(responseSchema, body, 'response_shape');
  if (response.model !== expected.responseModel) reject('response_model_mismatch');
  if (response.max_output_tokens !== undefined && response.max_output_tokens !== null && response.max_output_tokens !== expected.maxOutputTokens) reject('response_output_limit_mismatch');
  if (response.completed_at !== undefined && response.completed_at !== null && response.completed_at < response.created_at) reject('provider_time_order');
  if (response.status === 'completed' && (response.error !== null || response.incomplete_details !== null)) reject('contradictory_completion');
  if (response.status === 'incomplete' && response.incomplete_details === null) reject('missing_incomplete_reason');
  if (response.status !== 'incomplete' && response.incomplete_details !== null) reject('unexpected_incomplete_reason');
  if (response.status === 'failed' && response.error === null) reject('missing_provider_error');
  if (response.status !== 'failed' && response.error !== null) reject('unexpected_provider_error');

  const usage = response.usage;
  if (usage) {
    if (!Number.isSafeInteger(usage.input_tokens + usage.output_tokens) || usage.total_tokens !== usage.input_tokens + usage.output_tokens) reject('usage_total_mismatch');
    if ((usage.input_tokens_details?.cached_tokens ?? 0) > usage.input_tokens || (usage.output_tokens_details?.reasoning_tokens ?? 0) > usage.output_tokens) reject('usage_detail_overflow');
    if (usage.output_tokens > expected.maxOutputTokens) reject('usage_output_limit');
  } else if (response.status === 'completed') reject('completed_usage_missing');

  const ids = new Set<string>(), text: string[] = [], refusals: string[] = [], unsupportedOutputTypes: string[] = [];
  let unfinishedOutput = false;
  for (const rawOutput of response.output) {
    const item = parse(outputIdentitySchema, rawOutput, 'output_identity');
    if (ids.has(item.id)) reject('duplicate_output_id');
    ids.add(item.id);
    if (item.type === 'message') {
      const message = parse(messageSchema, rawOutput, 'message_shape');
      unfinishedOutput ||= message.status !== 'completed';
      for (const part of message.content) {
        if (part.type === 'output_text') text.push(part.text);
        else refusals.push(part.refusal);
      }
    } else if (item.type === 'reasoning') {
      const reasoning = parse(reasoningSchema, rawOutput, 'reasoning_shape');
      unfinishedOutput ||= reasoning.status !== undefined && reasoning.status !== 'completed';
      // Reasoning summaries/encrypted content are preserved in raw bytes, never presented as an answer.
    } else unsupportedOutputTypes.push(item.type);
  }
  if (response.status === 'completed' && unfinishedOutput) reject('unfinished_output_in_completed_response');
  const combinedText = text.join('');
  if (response.status === 'completed' && combinedText.trim() && usage?.output_tokens === 0) reject('completed_text_without_output_usage');
  const reason = response.incomplete_details?.reason ?? null;
  const terminal = response.status !== 'queued' && response.status !== 'in_progress';
  const classification = !terminal ? 'nonterminal'
    : response.status === 'failed' ? 'provider_error'
      : response.status === 'cancelled' ? 'cancelled'
        : response.status === 'incomplete' ? (reason === 'max_output_tokens' || reason === 'max_tokens' ? 'truncated' : reason === 'content_filter' ? 'safety_blocked' : 'incomplete')
          : refusals.length ? 'refusal'
            : unsupportedOutputTypes.length ? 'unsupported_output'
              : combinedText.trim() ? 'complete' : 'empty';
  return { original, provenance, providerResponseId: response.id, providerStatus: response.status,
    classification, terminal, completeText: classification === 'complete', text: combinedText, refusals,
    usage: usage ? { inputTokens: usage.input_tokens, outputTokens: usage.output_tokens, totalTokens: usage.total_tokens,
      cachedInputTokens: usage.input_tokens_details?.cached_tokens ?? null, reasoningTokens: usage.output_tokens_details?.reasoning_tokens ?? null } : null,
    incompleteReason: reason, unsupportedOutputTypes };
}
