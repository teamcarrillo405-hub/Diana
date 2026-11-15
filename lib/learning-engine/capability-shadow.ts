import 'server-only'
import { CAPABILITY_REGISTRY_VERSION } from './capability-registry'
import { CAPABILITY_ROUTER_VERSION, routeCapability, type CapabilityRouteRequest, type CapabilityServerContext } from './capability-router'
import type { LocalTutorInput, LocalTutorResult } from './local-tutor'
import type { VersionedActivity } from './course-activities'
import type { CourseFeedback } from './course-tutor'
import { courseContentHash } from './course-framework'
import { problemReadiness, type ProblemState } from './problem-state'

type ActualFeedback = LocalTutorResult | CourseFeedback
/** Fixed-size internal event. No student IDs, text, source IDs/hashes, answers or error messages. */
export type CapabilityShadowReceipt = Readonly<{
  schema: 'diana-capability-shadow-v1'
  routerVersion: typeof CAPABILITY_ROUTER_VERSION
  registryVersion: typeof CAPABILITY_REGISTRY_VERSION
  adapter: 'local_tutor' | 'course_tutor'
  observation: 'compared' | 'unavailable'
  route: Awaited<ReturnType<typeof routeCapability>>['route'] | null
  reason: Awaited<ReturnType<typeof routeCapability>>['reason'] | null
  claimScope: 'bounded_result' | 'source_correspondence' | 'guided_scaffold' | null
  sourceCount: number
  feedbackEqual: boolean | null
  providerCalled: false
  authoritative: false
}>

async function observe(adapter: CapabilityShadowReceipt['adapter'], prepare: () => Promise<{
  context: CapabilityServerContext; request: CapabilityRouteRequest
}>, actual: ActualFeedback): Promise<CapabilityShadowReceipt> {
  const base = { schema: 'diana-capability-shadow-v1' as const, routerVersion: CAPABILITY_ROUTER_VERSION,
    registryVersion: CAPABILITY_REGISTRY_VERSION, adapter, providerCalled: false as const, authoritative: false as const }
  let receipt: CapabilityShadowReceipt
  try {
    const { context, request } = await prepare()
    const decision = await routeCapability(context, request)
    receipt = { ...base, observation: 'compared', route: decision.route, reason: decision.reason,
      claimScope: decision.capability?.claimScope ?? null, sourceCount: context.evidence.sources.length,
      feedbackEqual: decision.feedback ? JSON.stringify(decision.feedback) === JSON.stringify(actual) : null }
  } catch {
    receipt = { ...base, observation: 'unavailable', route: null, reason: null, claimScope: null,
      sourceCount: 0, feedbackEqual: null }
  }
  // Observability must not turn a durable, successful tutor response into a client error.
  try { console.info('learning_capability_shadow', JSON.stringify(receipt)) } catch { /* Best-effort server log only. */ }
  return Object.freeze(receipt)
}

/** Call only after the owned-source lookup, policy gate, normal tutor and durable save. */
export function observeLocalTutorShadow(input: LocalTutorInput, state: ProblemState,
  document: { id: string; contentHash: string }, actual: LocalTutorResult): Promise<CapabilityShadowReceipt> {
  return observe('local_tutor', async () => {
    const readiness = problemReadiness(state)
    return { context: { registryVersion: CAPABILITY_REGISTRY_VERSION, eligibility: 'allowed',
      expectedRecord: { id: state.scope.exerciseId, versionId: state.exerciseVersionId ?? '' },
      evidence: { state: readiness.status === 'conflict' ? 'conflicting' : input.sourcePages?.length ? 'consistent' : 'missing',
        sources: (input.sourcePages ?? []).map(page => ({ id: `${document.id}:${page.page}`, versionSha256: document.contentHash,
          origin: page.interpretation === 'original' ? 'original_source' as const
            : page.interpretation === 'confirmed' ? 'confirmed_transcription' as const : 'model_extraction' as const })) } },
    request: { adapter: 'local_tutor', input } }
  }, actual)
}

/** The selected catalog activity and state have already passed runCourseSession validation. */
export function observeCourseTutorShadow(activity: VersionedActivity, state: ProblemState,
  input: { mode: 'check' | 'hint' | 'example' | 'save'; response: string; confirmed: boolean; priorSupport: number },
  actual: CourseFeedback): Promise<CapabilityShadowReceipt> {
  return observe('course_tutor', async () => {
    const readiness = problemReadiness(state)
    const sources: CapabilityServerContext['evidence']['sources'] = activity.sources.length
      ? await Promise.all(activity.sources.map(async source => ({ id: source.id, versionSha256: await courseContentHash(source),
        origin: source.authorship === 'diana_authored' ? 'stored_specification' as const
          : source.nativePdf ? 'original_source' as const : 'confirmed_transcription' as const })))
      : [{ id: activity.id, versionSha256: activity.versionId, origin: 'stored_specification' }]
    return { context: { registryVersion: CAPABILITY_REGISTRY_VERSION, eligibility: 'allowed',
      expectedRecord: { id: state.scope.exerciseId, versionId: state.exerciseVersionId ?? '' },
      evidence: { state: readiness.status === 'conflict' ? 'conflicting' : 'consistent', sources } },
    request: { adapter: 'course_tutor', activity, input } }
  }, actual)
}
