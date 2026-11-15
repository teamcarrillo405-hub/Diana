import { z } from 'zod'
import { CAPABILITY_REGISTRY_VERSION, findCapability, type CapabilityRecord } from './capability-registry'
import { localTutorInputSchema, runLocalTutor, type LocalTutorResult } from './local-tutor'
import { activitySchema, type VersionedActivity } from './course-activities'
import { courseResponseSchema, runCourseTutor, type CourseFeedback } from './course-tutor'

export const CAPABILITY_ROUTER_VERSION = 'diana-capability-router-shadow-v1' as const
const digest = z.string().regex(/^[a-f0-9]{64}$/)
const identity = z.string().min(1).max(200)
const contextSchema = z.object({
  registryVersion: z.literal(CAPABILITY_REGISTRY_VERSION),
  eligibility: z.enum(['allowed', 'denied']),
  expectedRecord: z.object({ id: identity, versionId: digest }).strict(),
  evidence: z.object({
    state: z.enum(['consistent', 'missing', 'conflicting']),
    sources: z.array(z.object({ id: identity, versionSha256: digest,
      origin: z.enum(['stored_specification', 'original_source', 'confirmed_transcription', 'model_extraction']),
    }).strict()).max(12),
  }).strict(),
}).strict()
export type CapabilityServerContext = z.infer<typeof contextSchema>
const requestSchema = z.discriminatedUnion('adapter', [
  z.object({ adapter: z.literal('local_tutor'), input: localTutorInputSchema }).strict(),
  z.object({ adapter: z.literal('course_tutor'), activity: activitySchema.extend({ versionId: digest }).strict(),
    input: courseResponseSchema }).strict(),
])
export type CapabilityRouteRequest = z.infer<typeof requestSchema>
export type CapabilityRoute = 'unavailable' | 'clarify' | 'bounded_local_check' | 'source_correspondence' | 'local_scaffold' | 'review'
export type CapabilityRouteReason = 'policy_denied' | 'invalid_context' | 'invalid_request' | 'missing_evidence'
  | 'conflicting_evidence' | 'unconfirmed_evidence' | 'record_mismatch' | 'unconfirmed_attempt'
  | 'unknown_capability' | 'checker_unsupported' | 'confirmation_required' | 'bounded_observation'
  | 'correspondence_only' | 'scaffold_only' | 'saved_without_assessment'
export type CapabilityEmittedClaim = 'bounded_result_matches' | 'bounded_result_needs_revision'
  | 'source_correspondence_observed' | 'scaffold_provided'
export type CapabilityDecision = Readonly<{
  routerVersion: typeof CAPABILITY_ROUTER_VERSION
  registryVersion: typeof CAPABILITY_REGISTRY_VERSION
  mode: 'inactive_foundation'
  route: CapabilityRoute
  reason: CapabilityRouteReason
  capability: CapabilityRecord | null
  claims: readonly CapabilityEmittedClaim[]
  evidence: CapabilityServerContext['evidence']['sources']
  feedback: LocalTutorResult | CourseFeedback | null
  providerCalled: false
  modelQualified: false
  productionActivated: false
  eligibleForKnowledge: false
  interpretationVerified: false
}>

/**
 * Server-only trust boundary by contract: callers must resolve ownership, catalog versions,
 * source identity and policy themselves. Parsing cannot establish those facts from browser JSON.
 * No network or fallback model dispatch. This function is not wired into student routes.
 */
export async function routeCapability(rawContext: unknown, rawRequest: unknown): Promise<CapabilityDecision> {
  const context = contextSchema.safeParse(rawContext)
  const decision = (route: CapabilityRoute, reason: CapabilityRouteReason, capability: CapabilityRecord | null = null,
    feedback: CapabilityDecision['feedback'] = null, claims: CapabilityEmittedClaim[] = []): CapabilityDecision => ({
    routerVersion: CAPABILITY_ROUTER_VERSION, registryVersion: CAPABILITY_REGISTRY_VERSION, mode: 'inactive_foundation',
    route, reason, capability, claims,
    evidence: context.success ? context.data.evidence.sources.map(source => ({ ...source })) : [], feedback,
    providerCalled: false, modelQualified: false, productionActivated: false,
    eligibleForKnowledge: false, interpretationVerified: false,
  })
  if (!context.success) return decision('unavailable', 'invalid_context')
  const server = context.data
  if (server.eligibility === 'denied') return decision('unavailable', 'policy_denied')
  if (server.evidence.state === 'conflicting') return decision('clarify', 'conflicting_evidence')
  const sourceVersions = new Map<string, string>()
  for (const source of server.evidence.sources) {
    if (sourceVersions.has(source.id) && sourceVersions.get(source.id) !== source.versionSha256) return decision('clarify', 'conflicting_evidence')
    sourceVersions.set(source.id, source.versionSha256)
  }
  if (server.evidence.state === 'missing' || server.evidence.sources.length === 0) return decision('clarify', 'missing_evidence')
  if (server.evidence.sources.some(source => source.origin === 'model_extraction')) return decision('clarify', 'unconfirmed_evidence')
  const parsed = requestSchema.safeParse(rawRequest)
  if (!parsed.success) return decision('unavailable', 'invalid_request')
  const request = parsed.data
  const record = request.adapter === 'local_tutor' ? request.input.exercise : request.activity
  if (record.id !== server.expectedRecord.id || record.versionId !== server.expectedRecord.versionId) return decision('clarify', 'record_mismatch')
  const method = request.adapter === 'local_tutor' ? request.input.exercise.specification.kind : request.activity.method.kind
  const capability = findCapability(request.adapter, method)
  if (!capability) return decision('unavailable', 'unknown_capability')

  if (request.adapter === 'local_tutor') {
    const input = request.input
    if (input.attempt.problemId !== record.id || input.attempt.versionId !== record.versionId) return decision('clarify', 'record_mismatch', capability)
    if (!input.exercise.sourceConfirmed || !input.attempt.confirmed) return decision('clarify', 'unconfirmed_attempt', capability)
    const feedback = await runLocalTutor(input)
    if (feedback.status === 'needs_confirmation') return decision('clarify', 'confirmation_required', capability, feedback)
    if (feedback.status === 'unsupported' || feedback.assessment?.status === 'unsupported') return decision('review', 'checker_unsupported', capability, feedback)
    if (feedback.action !== 'check') return decision('local_scaffold', 'scaffold_only', capability, feedback, ['scaffold_provided'])
    if (capability.claimScope === 'source_correspondence') return decision('source_correspondence', 'correspondence_only', capability, feedback,
      feedback.assessment ? ['source_correspondence_observed'] : [])
    if (!feedback.assessment || feedback.assessment.status !== 'supported') return decision('review', 'checker_unsupported', capability, feedback)
    return decision('bounded_local_check', 'bounded_observation', capability, feedback,
      feedback.assessment.outcome === 'supported' ? ['bounded_result_matches']
        : feedback.assessment.outcome === 'revise' ? ['bounded_result_needs_revision'] : [])
  }

  if (!request.input.confirmed) return decision('clarify', 'unconfirmed_attempt', capability)
  let feedback: CourseFeedback
  try {
    feedback = await runCourseTutor(request.activity as VersionedActivity, request.input)
  } catch {
    // Malformed/out-of-bounds checker specifications cannot fall through to a model.
    return decision('review', 'checker_unsupported', capability)
  }
  if (feedback.status === 'needs_confirmation') return decision('clarify', 'confirmation_required', capability, feedback)
  if (feedback.status === 'unsupported') return decision('review', 'checker_unsupported', capability, feedback)
  if (feedback.status === 'saved') return decision('local_scaffold', 'saved_without_assessment', capability, feedback)
  if (request.input.mode !== 'check' || capability.claimScope === 'guided_scaffold') return decision('local_scaffold', 'scaffold_only', capability, feedback, ['scaffold_provided'])
  if (capability.claimScope === 'source_correspondence') return decision('source_correspondence', 'correspondence_only', capability, feedback, ['source_correspondence_observed'])
  if (feedback.outcome === 'unverified') return decision('review', 'checker_unsupported', capability, feedback)
  return decision('bounded_local_check', 'bounded_observation', capability, feedback,
    feedback.outcome === 'matches' ? ['bounded_result_matches'] : ['bounded_result_needs_revision'])
}
