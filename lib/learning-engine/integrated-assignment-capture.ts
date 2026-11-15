import 'server-only';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import type { LearningDatabase } from './database';
import { studyBuddyEligibility } from '@/lib/assignment-help/study-buddy-eligibility';
import { retrieveForAssignment, curriculumPromptContext } from './server';
import { curriculumPromptAnchors } from './curriculum-prompt-context';
import { integratedProviderBytesSha256 as sha256 } from './integrated-provider-response';
import { documentVersionSchema } from './contracts';
import { sourcePageSchema } from './source-layout';

export const integratedAssignmentCaptureInput = z.object({
  schema: z.literal('integrated-assignment-retrieval-request-v1'),
  caseId: z.string().min(1).max(100), expectedOwnerId: z.string().uuid(), assignmentId: z.string().uuid(),
  query: z.string().trim().min(1).max(1000),
  versionPins: z.array(z.object({ id: z.string().min(1).max(200), contentHash: z.string().regex(/^[a-f0-9]{64}$/) }).strict()).max(12),
}).strict().refine(value => new Set(value.versionPins.map(pin => pin.id)).size === value.versionPins.length, 'duplicate_version_pin');
export type IntegratedAssignmentCaptureInput = z.infer<typeof integratedAssignmentCaptureInput>;
type Trace = { stage: 'documents' | 'lexical_query' | 'candidates' | 'validated'; payload: unknown };
/** Client injection is internal. HTTP callers never select a client, owner or execution label. */
export async function captureIntegratedAssignmentRetrieval(client: SupabaseClient<LearningDatabase>, raw: unknown) {
  const input = integratedAssignmentCaptureInput.parse(raw);
  const trace: Trace[] = [];
  const startedAt = new Date().toISOString();
  const common = { schema: 'integrated-assignment-retrieval-capture-v1', input, startedAt,
    providerCalls: 0, embeddingCalls: 0, moderationCalls: 0, assistanceReleased: false,
    receipt: 'not_requested_no_assistance_released', productionEligible: false,
    evidenceAuthority: 'server_observation_not_independent_attestation' };
  const finish = <T extends object>(payload: T) => {
    const body = { ...common, ...payload, trace, completedAt: new Date().toISOString() };
    return { ...body, captureSha256: sha256(JSON.stringify(body)) };
  };
  // Server-verified user identity, never decoded from a supplied token or trusted from a body.
  const authenticated = await client.auth.getUser().catch(() => null);
  if (!authenticated || authenticated.error || !authenticated.data.user) return finish({ kind: 'rejected' as const, status: 'authentication_rejected' });
  const ownerId = authenticated.data.user.id;
  if (ownerId !== input.expectedOwnerId) return finish({ kind: 'rejected' as const, status: 'owner_rejected' });
  const eligibility = await studyBuddyEligibility(client as unknown as SupabaseClient<Database>, { ownerId, assignmentId: input.assignmentId, classId: null });
  if (!eligibility.ok) return finish({ kind: 'rejected' as const, status: 'policy_rejected', policyStatus: eligibility.status });
  const result = await retrieveForAssignment({ ownerId, assignmentId: input.assignmentId, classId: eligibility.classId,
    query: input.query, versionIds: input.versionPins.map(pin => pin.id), allowSemanticFallback: false }, {
    client, observe(stage, payload) { trace.push({ stage, payload: structuredClone(payload) }); },
  });
  const documents = trace.find(event => event.stage === 'documents')?.payload;
  const selected = z.array(z.object({ id: z.string(), content_hash: z.string(), owner_id: z.string(), assignment_id: z.string().nullable() }).passthrough()).safeParse(documents);
  if (selected.success) {
    for (const row of selected.data) {
      const version = documentVersionSchema.safeParse(row.metadata);
      const pages = z.array(sourcePageSchema).min(1).max(1500).safeParse(row.pages);
      if (!version.success || !pages.success || row.owner_id !== ownerId || row.assignment_id !== input.assignmentId ||
        version.data.id !== row.id || version.data.ownerId !== ownerId || version.data.assignmentId !== input.assignmentId ||
        version.data.contentHash !== row.content_hash || sha256(JSON.stringify(pages.data)) !== row.content_hash ||
        new Set(pages.data.map(page => page.page)).size !== pages.data.length) return finish({ kind: 'rejected' as const, status: 'source_integrity_rejected' });
    }
  }
  // The product tolerates missing pins. Research capture requires every frozen pin exactly.
  if (input.versionPins.length && (!selected.success || selected.data.length !== input.versionPins.length || input.versionPins.some(pin =>
    !selected.data.some(row => row.id === pin.id && row.content_hash === pin.contentHash && row.owner_id === ownerId && row.assignment_id === input.assignmentId)))) {
    return finish({ kind: 'rejected' as const, status: 'version_rejected' });
  }
  const promptContext = curriculumPromptContext(result);
  const actualPromptAnchors = curriculumPromptAnchors(result);
  return finish({ kind: 'retrieved' as const, status: result.status, authenticatedOwnerId: ownerId, classId: eligibility.classId,
    selection: input.versionPins.length ? 'exact_pinned_versions' : 'current_product_versions_unfrozen',
    result, promptContext, actualPromptAnchors,
    promptContextSha256: sha256(promptContext), evidenceSha256: sha256(JSON.stringify(actualPromptAnchors)),
    traceSha256: sha256(JSON.stringify(trace)),
    promptStage: 'curriculum_renderer_before_final_provider_prompt',
  });
}

/** Preserve every planned row, including rejected/error rows, in the denominator. */
export async function captureIntegratedAssignmentBatch(client: SupabaseClient<LearningDatabase>, raw: unknown[]) {
  const inputs = z.array(integratedAssignmentCaptureInput).min(1).max(100).parse(raw);
  if (new Set(inputs.map(input => input.caseId)).size !== inputs.length) throw new Error('duplicate_case_id');
  const rows = [];
  for (const input of inputs) {
    try { rows.push(await captureIntegratedAssignmentRetrieval(client, input)); }
    catch { rows.push({ input, caseId: input.caseId, status: 'capture_error', providerCalls: 0, assistanceReleased: false }); }
  }
  return { schema: 'integrated-assignment-retrieval-batch-v1', planned: inputs.length, completed: rows.length,
    plannedInputsSha256: sha256(JSON.stringify(inputs)), rows, providerCalls: 0, productionEligible: false };
}
