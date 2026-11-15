// Content-free accounting. Never accept prompts, generated text, or moderation text here.
export interface ExperimentAccountingClient {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
}
export type ExperimentUsage = {
  id: string;
  model: string;
  usage: { input_tokens: number; output_tokens: number; total_tokens: number };
};
export type ExperimentAccountingContext = {
  requestId: string; ownerId: string; inputHash: string; model: string;
  inputRate: number; outputRate: number; priceReviewedAt: string;
};
export function validateExperimentUsage(raw: unknown): asserts raw is ExperimentUsage {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid experiment usage receipt.");
  const value = raw as Record<string, unknown>;
  if (typeof value.id !== "string" || !/^[A-Za-z0-9_.:-]{1,200}$/.test(value.id)
    || typeof value.model !== "string" || !/^[A-Za-z0-9_.:-]{1,100}$/.test(value.model)
    || !value.usage || typeof value.usage !== "object" || Array.isArray(value.usage)) throw new Error("Invalid experiment usage receipt.");
  const usage = value.usage as Record<string, unknown>;
  // Responses includes nested cache/reasoning details alongside the billing counters.
  // Charge the three declared counters at the pinned rates; never persist ancillary
  // fields here or infer a discount from them. The capture parser checks delivery.
  const counters = [usage.input_tokens, usage.output_tokens, usage.total_tokens];
  if (!counters.every(n => typeof n === "number" && Number.isSafeInteger(n) && n >= 0 && n <= 10_000_000)
    || usage.total_tokens !== (usage.input_tokens as number) + (usage.output_tokens as number)
    || usage.total_tokens === 0) throw new Error("Invalid experiment usage receipt.");
}
export async function beginExperimentProvider(client: ExperimentAccountingClient, context: ExperimentAccountingContext): Promise<void> {
  const result = await client.rpc("learning_start_experiment_provider", {
    p_id: context.requestId, p_owner_id: context.ownerId, p_input_hash: context.inputHash,
    p_requested_model: context.model, p_input_rate: context.inputRate, p_output_rate: context.outputRate,
    p_price_reviewed_at: context.priceReviewedAt,
  });
  if (result.error || result.data !== true) throw new Error("Experiment provider start was not recorded.");
}
/** Only a caller that has not invoked the monetary provider-start fence may use this. */
export async function cancelUnstartedExperiment(client: ExperimentAccountingClient, requestId: string, manifestHash: string): Promise<void> {
  const result = await client.rpc("learning_cancel_unstarted_experiment", { p_id: requestId, p_manifest_hash: manifestHash });
  if (result.error || result.data !== true) throw new Error("Unstarted experiment cancellation needs reconciliation.");
}
export async function recordExperimentUsage(client: ExperimentAccountingClient, context: ExperimentAccountingContext, value: ExperimentUsage): Promise<number> {
  validateExperimentUsage(value);
  const result = await client.rpc("learning_record_experiment_usage", {
    p_id: context.requestId, p_owner_id: context.ownerId, p_input_hash: context.inputHash,
    p_provider_response_id: value.id, p_resolved_model: value.model,
    p_input_tokens: value.usage.input_tokens, p_output_tokens: value.usage.output_tokens,
    p_total_tokens: value.usage.total_tokens,
  });
  if (result.error || typeof result.data !== "number" || !Number.isSafeInteger(result.data) || result.data < 1) {
    throw new Error("Experiment usage receipt needs reconciliation.");
  }
  return result.data;
}
export type ExperimentOutputState = "released" | "blocked" | "screening_unavailable" | "generation_error" | "accounting_error";
export async function recordExperimentOutputState(client: ExperimentAccountingClient, context: ExperimentAccountingContext, state: ExperimentOutputState): Promise<void> {
  const result = await client.rpc("learning_record_experiment_output_state", {
    p_id: context.requestId, p_owner_id: context.ownerId, p_input_hash: context.inputHash, p_state: state,
  });
  if (result.error || result.data !== true) throw new Error("Experiment output status needs reconciliation.");
}
