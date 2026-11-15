import { describe, expect, it, vi } from 'vitest';
import { integratedProviderBytesSha256, parseIntegratedProviderResponse, type IntegratedProviderCapture } from './integrated-provider-response';

// Protocol-only synthetic bytes. These are not teaching tasks, references or evaluation cases.
function fixture() {
  const requestBody = JSON.stringify({ model: 'frozen-alias', input: 'opaque-input', max_output_tokens: 100, stream: false });
  const body = {
    id: 'resp_fixture', object: 'response', created_at: 100, completed_at: 101, model: 'frozen-snapshot', status: 'completed',
    error: null as null | { code: string; message: string }, incomplete_details: null as null | { reason: string },
    output: [{ id: 'msg_fixture', type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: 'alpha', annotations: [] }] }] as unknown[],
    usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15, input_tokens_details: { cached_tokens: 2 }, output_tokens_details: { reasoning_tokens: 1 } } as Record<string, unknown> | null,
    max_output_tokens: 100,
  };
  const capture: IntegratedProviderCapture = { schema: 'integrated-openai-responses-capture-v1', endpoint: '/v1/responses', transport: 'http_json',
    requestBody, responseBody: JSON.stringify(body), httpStatus: 200, providerRequestId: 'req_fixture', startedAt: '2026-09-29T01:00:00Z', receivedAt: '2026-09-29T01:00:01Z' };
  const expected = { requestBodySha256: integratedProviderBytesSha256(requestBody), requestModel: 'frozen-alias', responseModel: 'frozen-snapshot', maxOutputTokens: 100 };
  return { body, capture, expected, parse: () => parseIntegratedProviderResponse({ ...capture, responseBody: JSON.stringify(body) }, expected) };
}

describe('offline raw Responses API interpretation', () => {
  it('retains exact capture bytes and verified usage while never authenticating execution', () => {
    const f = fixture();
    const fetcher = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('No network'));
    try {
      const response = parseIntegratedProviderResponse(f.capture, f.expected);
      expect(response).toMatchObject({ classification: 'complete', terminal: true, completeText: true, text: 'alpha',
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15, cachedInputTokens: 2, reasoningTokens: 1 } });
      expect(response.original).toEqual(f.capture);
      expect(response.provenance).toMatchObject({ responseBodySha256: integratedProviderBytesSha256(f.capture.responseBody),
        executionAuthorityVerified: false, productionEligible: false, independentAttestationRequired: true });
      expect(fetcher).not.toHaveBeenCalled();
    } finally { fetcher.mockRestore(); }
  });

  it('uses every assistant text part in order and never substitutes SDK convenience text or reasoning', () => {
    const f = fixture();
    f.body.output.unshift({ id: 'rs_fixture', type: 'reasoning', summary: [{ type: 'summary_text', text: 'not an answer' }] });
    f.body.output.push({ id: 'msg_second', type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: ' beta', annotations: [] }, { type: 'output_text', text: ' gamma', annotations: [] }] });
    Object.assign(f.body, { output_text: 'untrusted shortcut' });
    expect(f.parse().text).toBe('alpha beta gamma');
  });

  it.each([
    ['max_output_tokens', 'truncated'], ['max_tokens', 'truncated'], ['content_filter', 'safety_blocked'], ['steered', 'incomplete'], ['future_reason', 'incomplete'],
  ])('keeps incomplete %s text out of completed results', (reason, classification) => {
    const f = fixture(); f.body.status = 'incomplete'; f.body.incomplete_details = { reason }; f.body.usage = null;
    expect(f.parse()).toMatchObject({ classification, terminal: true, completeText: false, text: 'alpha', usage: null, incompleteReason: reason });
  });

  it.each(['queued', 'in_progress'])('does not terminalize %s as success', status => {
    const f = fixture(); f.body.status = status; f.body.usage = null;
    expect(f.parse()).toMatchObject({ classification: 'nonterminal', terminal: false, completeText: false });
  });

  it('keeps mixed refusal and answer text separately, without awarding completion', () => {
    const f = fixture();
    f.body.output.push({ id: 'msg_refusal', type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'refusal', refusal: 'synthetic refusal' }] });
    expect(f.parse()).toMatchObject({ classification: 'refusal', completeText: false, text: 'alpha', refusals: ['synthetic refusal'] });
  });

  it('does not call a tool handoff or empty reasoning-only output a text completion', () => {
    const f = fixture();
    f.body.output.push({ id: 'call_fixture', type: 'function_call', name: 'opaque-tool', arguments: '{}' });
    expect(f.parse()).toMatchObject({ classification: 'unsupported_output', completeText: false, unsupportedOutputTypes: ['function_call'] });
    f.body.output = [{ id: 'rs_fixture', type: 'reasoning', summary: [] }];
    expect(f.parse()).toMatchObject({ classification: 'empty', completeText: false, text: '' });
  });

  it.each(['failed', 'cancelled'])('preserves terminal %s without inventing usage or a timeout', status => {
    const f = fixture(); f.body.status = status; f.body.usage = null;
    if (status === 'failed') f.body.error = { code: 'server_error', message: 'synthetic provider error' };
    expect(f.parse()).toMatchObject({ classification: status === 'failed' ? 'provider_error' : 'cancelled', terminal: true, completeText: false, usage: null });
  });

  it('retains a raw HTTP error without treating its text as a provider answer', () => {
    const f = fixture(); f.capture.httpStatus = 429;
    f.capture.responseBody = JSON.stringify({ error: { message: 'synthetic limit', type: 'rate_limit_error' } });
    expect(parseIntegratedProviderResponse(f.capture, f.expected)).toMatchObject({ classification: 'http_error', terminal: true, providerResponseId: null, text: '', usage: null, completeText: false });
    f.capture.responseBody = JSON.stringify(f.body);
    expect(() => parseIntegratedProviderResponse(f.capture, f.expected)).toThrow('http_error_shape');
  });

  it.each([
    ['model', 'another-snapshot', 'response_model_mismatch'], ['status', 'future_status', 'response_shape'],
    ['usage', null, 'completed_usage_missing'], ['max_output_tokens', 101, 'response_output_limit_mismatch'],
    ['completed_at', 99, 'provider_time_order'], ['incomplete_details', { reason: 'max_output_tokens' }, 'contradictory_completion'],
    ['error', { code: 'server_error', message: 'synthetic' }, 'contradictory_completion'],
  ])('rejects a contradictory %s', (key, value, code) => {
    const f = fixture(); Object.assign(f.body, { [key as string]: value });
    expect(() => f.parse()).toThrow(code as string);
  });

  it.each([
    { input_tokens: '10', output_tokens: 5, total_tokens: 15 },
    { input_tokens: 10, output_tokens: 5, total_tokens: 14 },
    { input_tokens: 10, output_tokens: 101, total_tokens: 111 },
    { input_tokens: 10, output_tokens: -1, total_tokens: 9 },
    { input_tokens: 10, output_tokens: 5.5, total_tokens: 15.5 },
    { input_tokens: 10, output_tokens: 5, total_tokens: 15, input_tokens_details: { cached_tokens: 11 } },
    { input_tokens: 10, output_tokens: 5, total_tokens: 15, output_tokens_details: { reasoning_tokens: 6 } },
    { input_tokens: 10, output_tokens: 0, total_tokens: 10 },
  ])('rejects invalid or contradictory usage %j', usage => {
    const f = fixture(); f.body.usage = usage; expect(() => f.parse()).toThrow();
  });

  it('rejects duplicate items, missing statuses and unfinished completed messages', () => {
    const f = fixture(); f.body.output.push(f.body.output[0]);
    expect(() => f.parse()).toThrow('duplicate_output_id');
    f.body.output.pop(); const message = f.body.output[0] as Record<string, unknown>;
    delete message.status; expect(() => f.parse()).toThrow('message_shape');
    message.status = 'incomplete'; expect(() => f.parse()).toThrow('unfinished_output_in_completed_response');
  });

  it('rejects missing terminal reasons and malformed output structure', () => {
    const f = fixture(); f.body.status = 'incomplete'; expect(() => f.parse()).toThrow('missing_incomplete_reason');
    f.body.status = 'failed'; expect(() => f.parse()).toThrow('missing_provider_error');
    f.body.status = 'completed'; f.body.output = [{ type: 'message', content: [] }]; expect(() => f.parse()).toThrow('output_identity');
  });

  it('binds exact request bytes, configuration, transport and capture time order', () => {
    const f = fixture();
    expect(() => parseIntegratedProviderResponse({ ...f.capture, requestBody: f.capture.requestBody + ' ' }, f.expected)).toThrow('request_digest_mismatch');
    expect(() => parseIntegratedProviderResponse(f.capture, { ...f.expected, maxOutputTokens: 90 })).toThrow('request_configuration_mismatch');
    expect(() => parseIntegratedProviderResponse({ ...f.capture, receivedAt: '2026-09-28T01:00:00Z' }, f.expected)).toThrow('capture_time_order');
    expect(() => parseIntegratedProviderResponse({ ...f.capture, transport: 'sse' }, f.expected)).toThrow('capture_shape');
    expect(() => parseIntegratedProviderResponse({ ...f.capture, executionAuthorityVerified: true }, f.expected)).toThrow('capture_shape');
  });

  it('rejects malformed and oversized raw bytes before treating them as a response', () => {
    const f = fixture();
    expect(() => parseIntegratedProviderResponse({ ...f.capture, responseBody: '{?' }, f.expected)).toThrow('response_json');
    expect(() => parseIntegratedProviderResponse({ ...f.capture, responseBody: JSON.stringify('🙂'.repeat(1_100_000)) }, f.expected)).toThrow('capture_byte_limit');
  });

  it('does not infer truncation solely from reaching the token ceiling', () => {
    const f = fixture(); f.body.usage = { input_tokens: 10, output_tokens: 100, total_tokens: 110 };
    expect(f.parse()).toMatchObject({ classification: 'complete', completeText: true });
  });

  it('matching resealed forged captures still cannot authenticate execution', () => {
    const f = fixture(); f.capture.providerRequestId = 'req_self_supplied';
    f.body.id = 'resp_self_supplied';
    expect(f.parse().provenance).toMatchObject({ executionAuthorityVerified: false, productionEligible: false, independentAttestationRequired: true });
  });
});
