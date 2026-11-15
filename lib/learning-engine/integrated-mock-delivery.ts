import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import type { LearningDatabase } from './database';
import { studyBuddyEligibility } from '@/lib/assignment-help/study-buddy-eligibility';
import { captureIntegratedAssignmentRetrieval } from './integrated-assignment-capture';
import { prepareIntegratedPrimaryRecipe } from './integrated-primary-recipe';
import { recordAssignmentAssistance, type StudyBuddyAssistanceClient } from './study-buddy-assistance';
import { parseIntegratedProviderResponse, type IntegratedProviderCapture } from './integrated-provider-response';
import { parseResult } from '@/supabase/functions/_shared/study-buddy-prompt';

/** Internal synthetic transport seam only. No route or CLI can supply this callback. */
export async function runIntegratedMockDelivery(client: SupabaseClient<LearningDatabase>, input: unknown,
  config: { model: string; requestId: string; responseModel: string },
  mockResponse: (requestBody: string) => Promise<IntegratedProviderCapture>) {
  const retrieval = await captureIntegratedAssignmentRetrieval(client, input);
  const base = { execution: 'synthetic_mock_transport', retrieval, providerCalls: 0, productionEligible: false, executionAuthorityVerified: false };
  if (retrieval.kind !== 'retrieved' || retrieval.status !== 'matched') return { ...base, status: 'retrieval_not_deliverable', delivered: false };
  const recipe = prepareIntegratedPrimaryRecipe({ ...retrieval, query: retrieval.input.query }, config.model);
  const current = await studyBuddyEligibility(client as unknown as SupabaseClient<Database>, { ownerId: retrieval.authenticatedOwnerId, assignmentId: retrieval.input.assignmentId, classId: retrieval.classId });
  if (!current.ok) return { ...base, recipe, status: 'policy_rejected_before_delivery', delivered: false };
  try {
    const receipt = await recordAssignmentAssistance(client as unknown as StudyBuddyAssistanceClient, {
      ownerId: retrieval.authenticatedOwnerId, assignmentId: retrieval.input.assignmentId, requestId: config.requestId,
      selectedProblemId: null, channel: 'local', kind: 'hint',
    }, { contextVersion: 'integrated-mock-delivery-v1', input: retrieval.input, traceSha256: retrieval.traceSha256, requestBody: recipe.requestBody });
    if (receipt.status !== 'recorded') return { ...base, recipe, status: 'receipt_required', delivered: false };
    const raw = await mockResponse(recipe.requestBody);
    const parsed = parseIntegratedProviderResponse(raw, { requestBodySha256: recipe.requestBodySha256, requestModel: config.model,
      responseModel: config.responseModel, maxOutputTokens: recipe.maxOutputTokens });
    if (!parsed.completeText) return { ...base, recipe, receipt, parsed, status: parsed.classification, delivered: false };
    const delivery = parseResult(parsed.text);
    return { ...base, recipe, receipt, parsed, status: delivery.usedFallback ? 'invalid_tutor_shape' : 'synthetic_delivery_complete',
      delivered: !delivery.usedFallback, response: delivery.usedFallback ? null : delivery.response,
      verification: 'ai_guidance', masteryClaim: false };
  } catch { return { ...base, recipe, status: 'receipt_or_capture_rejected', delivered: false }; }
}
