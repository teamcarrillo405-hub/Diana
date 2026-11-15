import { verifyIntegratedExecutionPlan, integratedReleasedCompletionSchema, type IntegratedExecutionPlan } from './integrated-execution-plan.ts';
import { beginExperimentProvider, cancelUnstartedExperiment, recordExperimentUsage, recordExperimentOutputState, validateExperimentUsage,
  type ExperimentAccountingClient, type ExperimentAccountingContext } from './experiment-accounting.ts';
import { integratedProviderBytesSha256 as sha256, parseIntegratedProviderResponse, type IntegratedProviderCapture } from './integrated-provider-response.ts';
import { parseResult } from '../study-buddy-prompt.ts';
import type { IntegratedAssistanceReadiness } from './integrated-assistance-readiness.ts';

export type IntegratedExecutionClient = ExperimentAccountingClient & {
  from(table: string): { insert(value: Record<string, unknown>): PromiseLike<{ error: unknown }> };
};
type Auth = { ownerId: string; serviceClient: IntegratedExecutionClient; userClient: ExperimentAccountingClient };
type GuardInput<T> = { ownerId: string; supabase: IntegratedExecutionClient; input: string; systemPrompt: string;
  maxOutputTokens: number; idempotencyKey: string; invoke: () => Promise<T>; getTokens: (value: T) => number; getOutput: (value: T) => string };
export type IntegratedExecutionDependencies = {
  plan: unknown; env: (key: string) => string | undefined; now?: () => number;
  authenticate: (request: Request, assignmentId: string) => Promise<Auth | Response>;
  assistanceReadiness: (auth: Auth, row: IntegratedExecutionPlan['requests'][number], plan: IntegratedExecutionPlan) => Promise<IntegratedAssistanceReadiness>;
  verifySources: (auth: Auth, row: IntegratedExecutionPlan['requests'][number]) => Promise<boolean>;
  recordAssistance: (auth: Auth, row: IntegratedExecutionPlan['requests'][number], system: string, user: string, plan: IntegratedExecutionPlan) => Promise<void>;
  guard: <T>(input: GuardInput<T>) => Promise<{ ok: true; value: T } | { ok: false; kind: string; status: number }>;
  fetch: typeof fetch;
  moderationState?: () => { calls: number; unavailable: number };
  logInteraction?: (params: { ownerId: string; assignmentId: string; feature: 'learning_experiment'; model: string; tokensUsed: number; inputBytes: number; outputBytes: number }, client: IntegratedExecutionClient) => Promise<unknown>;
};
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
async function boundedBody(response: Response, limit: number) {
  const reader = response.body?.getReader(); if (!reader) return { text: '', complete: true };
  const parts: Uint8Array[] = []; let bytes = 0, complete = true;
  try { while (true) { const next = await reader.read(); if (next.done) break;
    if (bytes + next.value.length > limit) { parts.push(next.value.slice(0, limit - bytes)); complete = false; break; }
    parts.push(next.value); bytes += next.value.length;
  } } finally { await reader.cancel().catch(() => undefined); }
  const all = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0)); let offset = 0;
  for (const part of parts) { all.set(part, offset); offset += part.length; }
  try { return { text: new TextDecoder('utf-8', { fatal: true }).decode(all), complete }; }
  catch { return { text: new TextDecoder().decode(all), complete: false }; }
}
/** One HTTP request can consume exactly one server-frozen case. No automatic retry/replay. */
export function createIntegratedExecutionHandler(deps: IntegratedExecutionDependencies) {
  const now = deps.now ?? Date.now;
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
    if (deps.env('DIANA_INTEGRATED_EXECUTION_ENABLED') !== 'true') return json({ error: 'research_unavailable' }, 404);
    let context: ExperimentAccountingContext | undefined, client: IntegratedExecutionClient | undefined;
    let started = false, usageSaved = false, rawSaved = false, terminalRecorded = false;
    let providerStartRequested = false, cancellationAttempted = false, reservedManifestHash: string | undefined;
    let classification = 'not_started';
    const stopBeforeProvider = async (value: Record<string, unknown>, status: number) => {
      if (!context || !client || !reservedManifestHash || providerStartRequested) return json(value, status);
      if (cancellationAttempted) return json({ ...value, error: 'execution_needs_reconciliation', reservationSettlement: 'unconfirmed' }, 503);
      cancellationAttempted = true;
      try {
        await cancelUnstartedExperiment(client, context.requestId, reservedManifestHash);
        return json({ ...value, reservationSettlement: 'settled_zero', providerStartRequested: false }, status);
      } catch {
        return json({ ...value, stopReason: value.error, error: 'execution_needs_reconciliation',
          reservationSettlement: 'unconfirmed', providerStartRequested: false }, 503);
      }
    };
    try {
      const plan = verifyIntegratedExecutionPlan(deps.plan);
      if (deps.env('DIANA_INTEGRATED_EXECUTION_PLAN_HASH') !== plan.planSha256 || deps.env('DIANA_INTEGRATED_EXECUTION_OPERATOR_ID') !== plan.operatorId ||
        deps.env('SUPABASE_URL') !== plan.projectUrl) return json({ error: 'exact_approval_required' }, 403);
      const reviewed = Date.parse(plan.priceReviewedAt), expires = Date.parse(plan.expiresAt);
      if (reviewed > now() + 60000 || now() - reviewed > 86400000 || expires <= now() || expires > reviewed + 86400000 || !deps.env('OPENAI_API_KEY')?.trim()) return json({ error: 'configuration_expired_or_missing' }, 503);
      const body = await boundedBody(new Response(request.body), 1024);
      if (!body.complete) return json({ error: 'request_limit' }, 400);
      const input = JSON.parse(body.text) as Record<string, unknown>;
      if (!input || Object.keys(input).length !== 2 || input.planSha256 !== plan.planSha256 || typeof input.requestId !== 'string') return json({ error: 'invalid_request' }, 400);
      const row = plan.requests.find(row => row.requestId === input.requestId);
      if (!row) return json({ error: 'unknown_case' }, 400);
      const auth = await deps.authenticate(request, row.assignmentId);
      if (auth instanceof Response) return auth;
      if (auth.ownerId !== plan.operatorId) return json({ error: 'operator_mismatch' }, 403);
      // Check the database gate before reserving cents or entering the moderation/token guard.
      // A ready read does not waive the fresh mandatory receipt immediately before dispatch.
      let assistanceReadiness: IntegratedAssistanceReadiness = 'unavailable';
      try { assistanceReadiness = await deps.assistanceReadiness(auth, row, plan); } catch { /* Fail closed below. */ }
      if (assistanceReadiness !== 'ready') return json({
        error: assistanceReadiness === 'staged' ? 'assistance_enforcement_staged'
          : assistanceReadiness === 'unauthorized' ? 'research_assistance_not_authorized' : 'assistance_readiness_unavailable',
        providerAttempted: false, reservationAttempted: false,
      }, 503);
      if (!await deps.verifySources(auth, row)) return json({ error: 'source_pins_unavailable' }, 409);
      client = auth.serviceClient;
      const inputHash = sha256(JSON.stringify({ planSha256: plan.planSha256, requestId: row.requestId, ownerId: auth.ownerId, requestBodySha256: row.requestBodySha256 }));
      const reservation = await client.rpc('learning_reserve_experiment', { p_id: row.requestId, p_manifest_hash: plan.planSha256,
        p_cents: row.reservedCents, p_batch_id: row.batchId, p_batch_cap: plan.maxBatchCents });
      if (reservation.error || reservation.data !== true) return json({ error: 'attempt_or_budget_unavailable' }, 409);
      context = { requestId: row.requestId, ownerId: auth.ownerId, inputHash, model: plan.model,
        inputRate: plan.inputRate, outputRate: plan.outputRate, priceReviewedAt: plan.priceReviewedAt };
      reservedManifestHash = plan.planSha256;
      const accounting = context, service = client;
      const recipe = JSON.parse(row.requestBody) as { instructions: string; input: [{ content: [{ text: string }] }] };
      const beforeScreening = await deps.authenticate(request, row.assignmentId);
      if (beforeScreening instanceof Response || beforeScreening.ownerId !== plan.operatorId || !await deps.verifySources(beforeScreening, row)) return stopBeforeProvider({ error: 'policy_changed_before_screening' }, 403);
      const guarded = await deps.guard({ ownerId: auth.ownerId, supabase: service, input: recipe.input[0].content[0].text,
        systemPrompt: recipe.instructions, maxOutputTokens: 800, idempotencyKey: 'integrated-execution:' + row.requestId,
        invoke: async () => {
          // Fresh consent/deletion/class policy and current source availability after moderation wait.
          const current = await deps.authenticate(request, row.assignmentId);
          if (current instanceof Response || current.ownerId !== plan.operatorId || !await deps.verifySources(current, row) || now() >= expires || now() - reviewed > 86400000) throw new Error('policy_or_approval_changed');
          await deps.recordAssistance(current, row, recipe.instructions, recipe.input[0].content[0].text, plan);
          // Mark before awaiting: an RPC timeout/false/error may hide a commit.
          providerStartRequested = true;
          await beginExperimentProvider(service, accounting); started = true; classification = 'generation_error';
          const startedAt = new Date(now()).toISOString();
          const response = await deps.fetch('https://api.openai.com/v1/responses', { method: 'POST', redirect: 'error',
            headers: { Authorization: 'Bearer ' + deps.env('OPENAI_API_KEY'), 'Content-Type': 'application/json' },
            body: row.requestBody, signal: AbortSignal.timeout(plan.timeoutMs) });
          const raw = await boundedBody(response, 4 * 1024 * 1024);
          const capture: IntegratedProviderCapture = { schema: 'integrated-openai-responses-capture-v1', endpoint: '/v1/responses', transport: 'http_json',
            requestBody: row.requestBody, responseBody: raw.text, httpStatus: response.status, providerRequestId: response.headers.get('x-request-id'), startedAt, receivedAt: new Date(now()).toISOString() };
          let measured: { id: string; model: string; usage: { input_tokens: number; output_tokens: number; total_tokens: number } } | null = null;
          try { measured = JSON.parse(raw.text); if (!measured) throw new Error('missing'); validateExperimentUsage(measured); }
          catch { measured = null; }
          // Completion/moderation do not waive measured cost. An unexpected model
          // has unapproved pricing, so its tokens remain raw evidence and cents stay reserved.
          let actualCents: number | null = null, usageError = false;
          if (measured && raw.complete && measured.model === plan.responseModel) { try { actualCents = await recordExperimentUsage(service, accounting, measured); usageSaved = true; } catch { usageError = true; } }
          let parsed: ReturnType<typeof parseIntegratedProviderResponse> | null = null;
          try { if (!raw.complete) throw new Error('partial'); parsed = parseIntegratedProviderResponse(capture, { requestBodySha256: row.requestBodySha256, requestModel: plan.model, responseModel: plan.responseModel, maxOutputTokens: 800 }); classification = parsed.classification; }
          catch { classification = 'capture_invalid'; }
          const tutor = parsed?.completeText ? parseResult(parsed.text) : null;
          if (tutor?.usedFallback) classification = 'invalid_tutor_shape';
          const stored = await service.from('learning_experiment_outputs').insert({ request_id: row.requestId, owner_id: auth.ownerId, input_hash: inputHash,
            manifest: { schema: plan.schema, planSha256: plan.planSha256, caseId: row.caseId, captureSha256: row.captureSha256 },
            result: { rawCapture: capture, rawBodyComplete: raw.complete, classification, usageSaved, actualCents, moderationBeforeOutputScreening: deps.moderationState?.() ?? null,
              responseBodySha256: sha256(raw.text), researchOnly: true, semanticAcceptance: false } });
          if (stored.error) throw new Error('raw_capture_storage'); rawSaved = true;
          if (usageError || !raw.complete) throw new Error('usage_or_raw_capture_unavailable');
          if (!parsed?.completeText || !usageSaved) throw new Error('terminal_not_deliverable');
          if (!tutor || tutor.usedFallback) throw new Error('invalid_tutor_shape');
          return { parsed, response: tutor.response, text: parsed.text, tokens: parsed.usage!.totalTokens, actualCents };
        }, getTokens: value => value.tokens, getOutput: value => value.text });
      if (!guarded.ok) {
        if (started) { await recordExperimentOutputState(service, accounting, guarded.kind === 'safety' ? 'blocked' : guarded.kind === 'screening' ? 'screening_unavailable' : 'accounting_error'); terminalRecorded = true; }
        return stopBeforeProvider({ error: 'guard_withheld_output', kind: guarded.kind, usageSaved, rawSaved,
          providerAttempted: started, providerStartRequested, moderation: deps.moderationState?.() ?? null }, guarded.status);
      }
      const beforeRelease = await deps.authenticate(request, row.assignmentId);
      if (beforeRelease instanceof Response || beforeRelease.ownerId !== plan.operatorId || !await deps.verifySources(beforeRelease, row)) {
        await recordExperimentOutputState(service, accounting, 'blocked'); terminalRecorded = true;
        return json({ error: 'policy_changed_before_release', usageSaved, rawSaved, moderation: deps.moderationState?.() ?? null }, 403);
      }
      await recordExperimentOutputState(service, accounting, 'released'); terminalRecorded = true;
      void Promise.resolve().then(() => deps.logInteraction?.({ ownerId: auth.ownerId, assignmentId: row.assignmentId,
        feature: 'learning_experiment', model: plan.responseModel, tokensUsed: guarded.value.tokens,
        inputBytes: new TextEncoder().encode(row.requestBody).length, outputBytes: new TextEncoder().encode(guarded.value.text).length }, service)).catch(() => undefined);
      const released = integratedReleasedCompletionSchema.parse({ schema: 'integrated-screened-completion-v1',
        requestBodySha256: row.requestBodySha256, responseBodySha256: guarded.value.parsed.provenance.responseBodySha256,
        responseModel: plan.responseModel, providerResponseId: guarded.value.parsed.providerResponseId,
        text: guarded.value.text, usage: guarded.value.parsed.usage, actualCents: guarded.value.actualCents });
      return json({ ok: true, requestId: row.requestId, caseId: row.caseId, classification, result: released,
        rawSaved, usageSaved, moderation: deps.moderationState?.() ?? null, researchOnly: true, semanticAcceptance: false });
    } catch {
      if (started && context && client && !terminalRecorded) await recordExperimentOutputState(client, context, usageSaved ? 'accounting_error' : 'generation_error').catch(() => undefined);
      return stopBeforeProvider({ error: 'execution_needs_reconciliation', classification, providerAttempted: started,
        providerStartRequested, usageSaved, rawSaved, moderation: deps.moderationState?.() ?? null }, 503);
    }
  };
}
