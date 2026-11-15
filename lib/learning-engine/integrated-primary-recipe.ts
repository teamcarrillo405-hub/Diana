import { STUDY_BUDDY_PROMPT, buildUserPrompt } from '@/supabase/functions/_shared/study-buddy-prompt';
import { composeSystemPrompt } from '@/supabase/functions/_shared/system-prompts';
import { buildStudentResponseRequest } from '@/supabase/functions/_shared/student-response-request';
import { selectHomeworkModelTier } from '@/supabase/functions/_shared/homework-model-tier';
import { integratedProviderBytesSha256 as sha256 } from './integrated-provider-response';
import type { EvidenceAnchor } from './contracts';

/** Bounded curriculum-only research recipe, using the primary Edge formatter and serializer.
 * It does not reconstruct Work UI/student memory/specialist context or claim full route parity.
 * Model is separately frozen by the operator; it is never selected by an HTTP request.
 */
export function prepareIntegratedPrimaryRecipe(input: { promptContext: string; actualPromptAnchors: EvidenceAnchor[]; query: string }, model: string) {
  if (!model.trim() || model.length > 200) throw new Error('frozen_model_required');
  const source = input.promptContext.trim().slice(0, 20_000);
  const question = input.query.trim().slice(0, 1000);
  const routing = { sourceChars: source.length, studentWorkChars: 0, hasRubric: false };
  const quality = selectHomeworkModelTier({ task: 'study_buddy', ...routing });
  const system = composeSystemPrompt(STUDY_BUDDY_PROMPT, { includeRefuseRedirect: true, includeFrustration: true, includeMinorSafety: true });
  const user = buildUserPrompt({ mode: 'hint', tutorPersona: 'diana', tutorStyle: 'socratic', complexity: 'balanced',
    source, question, conversation: [], routing, sourceAnchors: [], specialistContext: '' });
  const requestBody = JSON.stringify(buildStudentResponseRequest({ model, system, user, maxTokens: 800, quality, json: true }));
  // Only anchors whose entire serialized record survives final source clipping count as supplied.
  const supplied = input.actualPromptAnchors.filter(anchor => source.includes(JSON.stringify(anchor)));
  return { schema: 'integrated-primary-edge-recipe-v1', scope: 'curriculum_only_empty_work_and_conversation',
    model, quality, maxOutputTokens: 800, system, user, sourceAfterFinalClipping: source, suppliedAnchors: supplied,
    omittedAnchorCount: input.actualPromptAnchors.length - supplied.length, requestBody,
    requestBodySha256: sha256(requestBody), sourceSha256: sha256(source), evidenceSha256: sha256(JSON.stringify(supplied)),
    providerDispatchEnabled: false, productionEligible: false };
}
