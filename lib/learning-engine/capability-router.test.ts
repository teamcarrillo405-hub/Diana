import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CAPABILITIES } from './course-activities'
import { loadCourseCatalog } from './course-catalog'
import { courseLevelSchema } from './course-domains'
import { problemSpecificationSchema } from './problem-specification'
import { CAPABILITY_REGISTRY, CAPABILITY_REGISTRY_VERSION, findCapability, QUALIFIED_LANGUAGE_MODELS } from './capability-registry'
import { routeCapability, type CapabilityServerContext, type CapabilityRouteRequest } from './capability-router'

const version = 'b'.repeat(64)
function context(id = 'exercise-1', versionId = version): CapabilityServerContext {
  return { registryVersion: CAPABILITY_REGISTRY_VERSION, eligibility: 'allowed', expectedRecord: { id, versionId },
    evidence: { state: 'consistent', sources: [{ id: 'stored-exercise', versionSha256: version, origin: 'stored_specification' }] } }
}
function local(spec: unknown = { kind: 'equation_value', equation: '3x+5=20', solutionSetComplete: false }, response = '5'): CapabilityRouteRequest {
  return { adapter: 'local_tutor', input: {
    exercise: { id: 'exercise-1', versionId: version, skillId: 'math.linear_equations', prompt: 'Use the confirmed specification.',
      specification: problemSpecificationSchema.parse(spec), reviewed: false, sourceConfirmed: true },
    attempt: { problemId: 'exercise-1', versionId: version, response, confirmed: true, assistance: 'independent', priorHelpCount: 0 }, mode: 'check',
  } }
}
beforeEach(() => { vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network forbidden')) })
afterEach(() => { expect(globalThis.fetch).not.toHaveBeenCalled(); vi.restoreAllMocks() })

describe('compiled capability inventory', () => {
  it('covers every actual method and specification with explicit finite claim scopes and source-only evidence', () => {
    expect(CAPABILITY_REGISTRY).toHaveLength(problemSpecificationSchema.options.length + Object.keys(CAPABILITIES).length)
    for (const entry of CAPABILITY_REGISTRY) {
      expect(entry.limits.length).toBeGreaterThan(10)
      expect(entry.evidence.sourcePaths.length).toBeGreaterThan(0)
      expect(entry.evidence.evaluatorPaths.length).toBeGreaterThan(0)
      expect(entry.evidence.executionVerified).toBe(false)
      expect(entry.evidence.semanticQualityQualified).toBe(false)
      expect(Object.isFrozen(entry.evidence)).toBe(true)
    }
    expect(findCapability('course_tutor', 'reading_evidence')?.claimScope).toBe('source_correspondence')
    expect(findCapability('course_tutor', 'writing_revision')?.claimScope).toBe('guided_scaffold')
    expect(findCapability('local_tutor', 'unrestricted_math')).toBeNull()
    expect(QUALIFIED_LANGUAGE_MODELS).toEqual([])
    expect(Object.isFrozen(QUALIFIED_LANGUAGE_MODELS)).toBe(true)
  })
})

describe('inactive capability router', () => {
  it('runs the existing checker and preserves provisional review and non-mastery limits', async () => {
    const matching = await routeCapability(context(), local())
    expect(matching).toMatchObject({ route: 'bounded_local_check', claims: ['bounded_result_matches'],
      providerCalled: false, modelQualified: false, productionActivated: false, eligibleForKnowledge: false, interpretationVerified: false })
    expect(matching.feedback).toMatchObject({ status: 'needs_review', escalation: 'educator_review' })
    expect((await routeCapability(context(), local(undefined, '6'))).claims).toEqual(['bounded_result_needs_revision'])
  })

  it('applies policy denial before trying a checker or malformed request', async () => {
    expect(await routeCapability({ ...context(), eligibility: 'denied' }, { forged: true })).toMatchObject({ route: 'unavailable', reason: 'policy_denied', feedback: null, claims: [] })
  })

  it('requires coherent confirmed evidence and notices conflicting versions of the same source', async () => {
    for (const state of ['missing', 'conflicting'] as const) {
      expect((await routeCapability({ ...context(), evidence: { ...context().evidence, state } }, local())).route).toBe('clarify')
    }
    expect((await routeCapability({ ...context(), evidence: { state: 'consistent', sources: [] } }, local())).reason).toBe('missing_evidence')
    expect((await routeCapability({ ...context(), evidence: { state: 'consistent', sources: [{ ...context().evidence.sources[0], origin: 'model_extraction' }] } }, local())).reason).toBe('unconfirmed_evidence')
    expect((await routeCapability({ ...context(), evidence: { state: 'consistent', sources: [context().evidence.sources[0], { ...context().evidence.sources[0], versionSha256: 'c'.repeat(64) }] } }, local())).reason).toBe('conflicting_evidence')
  })

  it('rejects foreign and stale record, attempt and registry versions', async () => {
    expect((await routeCapability(context('other'), local())).reason).toBe('record_mismatch')
    expect((await routeCapability(context('exercise-1', 'c'.repeat(64)), local())).reason).toBe('record_mismatch')
    expect((await routeCapability({ ...context(), registryVersion: 'older' }, local())).reason).toBe('invalid_context')
    const request = local()
    if (request.adapter !== 'local_tutor') throw new Error('fixture')
    request.input.attempt.versionId = 'c'.repeat(64)
    expect((await routeCapability(context(), request)).reason).toBe('record_mismatch')
    request.input.attempt.versionId = version
    request.input.attempt.confirmed = false
    expect((await routeCapability(context(), request)).reason).toBe('unconfirmed_attempt')
  })

  it('lets actual math bounds override a known capability and never escalates to a provider', async () => {
    for (const spec of [
      { kind: 'solution_set', equation: 'x^2=2' },
      { kind: 'geometry_measure', shape: 'right_triangle_hypotenuse', givens: ['1', '1'], unit: 'cm' },
      { kind: 'special_angle', fn: 'sin', degrees: 45 },
      { kind: 'equivalent_expression', reference: 'x^9' },
    ]) {
      const result = await routeCapability(context(), local(spec, '1'))
      expect(result).toMatchObject({ route: 'review', reason: 'checker_unsupported', claims: [], providerCalled: false })
    }
    const invalid = local()
    if (invalid.adapter !== 'local_tutor') throw new Error('fixture')
    Object.assign(invalid.input.exercise.specification, { kind: 'proof' })
    expect((await routeCapability(context(), invalid)).route).toBe('unavailable')
    expect((await routeCapability(context(), local(undefined, 'an unreadable answer'))).route).toBe('review')
  })

  it('never accepts caller model qualification, confidence, activation or API eligibility as authority', async () => {
    for (const forged of [
      { qualifiedModels: [{ id: 'anything', passed: true }] }, { confidence: 1 },
      { modelQualification: { baselinePassed: true, holdoutPassed: true } }, { apiEligible: true },
    ]) expect(await routeCapability({ ...context(), ...forged }, local())).toMatchObject({ route: 'unavailable', reason: 'invalid_context', modelQualified: false })
    expect((await routeCapability(context(), { ...local(), qualification: 'passed' })).reason).toBe('invalid_request')
  })

  it('routes every course method identically across all four level labels', async () => {
    const { activities } = await loadCourseCatalog()
    for (const method of Object.keys(CAPABILITIES)) {
      const activity = activities.find(row => row.method.kind === method)
      expect(activity, method).toBeDefined()
      const checkInput = { mode: 'check', response: '2', confirmed: true, priorSupport: 0 }
      const baseline = await routeCapability(context(activity!.id, activity!.versionId), { adapter: 'course_tutor', activity, input: checkInput })
      for (const level of courseLevelSchema.options) {
        const result = await routeCapability(context(activity!.id, activity!.versionId), {
          adapter: 'course_tutor', activity: { ...activity, level },
          input: { mode: 'hint', response: '', confirmed: true, priorSupport: 0 },
        })
        expect(result, `${method}:${level}`).toMatchObject({ route: 'local_scaffold', claims: ['scaffold_provided'], providerCalled: false, eligibleForKnowledge: false })
        const check = await routeCapability(context(activity!.id, activity!.versionId), { adapter: 'course_tutor', activity: { ...activity, level }, input: checkInput })
        expect({ route: check.route, reason: check.reason, claims: check.claims }, `${method}:${level}`)
          .toEqual({ route: baseline.route, reason: baseline.reason, claims: baseline.claims })
      }
    }
  })

  it('keeps source correspondence and writing/science rubrics separate from correctness', async () => {
    const { activities } = await loadCourseCatalog()
    for (const method of ['reading_evidence', 'history_sources', 'writing_revision', 'science_explanation']) {
      const activity = activities.find(row => row.method.kind === method)!
      const result = await routeCapability(context(activity.id, activity.versionId), { adapter: 'course_tutor', activity,
        input: { mode: 'check', response: 'My unsupported claim contains "A quotation not found in the source."', confirmed: true, priorSupport: 0 } })
      expect(result.route).toBe(['reading_evidence', 'history_sources'].includes(method) ? 'source_correspondence' : 'local_scaffold')
      expect(result.claims).not.toContain('bounded_result_matches')
      expect(result.feedback).toMatchObject({ outcome: 'unverified', eligibleForKnowledge: false })
    }
  })

  it('does not convert unsupported course arithmetic or saved work into checked results', async () => {
    const activity = (await loadCourseCatalog()).activities.find(row => row.method.kind === 'science_quantity')!
    const base = { adapter: 'course_tutor', activity, input: { mode: 'check', response: '2.50 m/s', confirmed: true, priorSupport: 0 } }
    expect((await routeCapability(context(activity.id, activity.versionId), base)).route).toBe('review')
    expect(await routeCapability(context(activity.id, activity.versionId), { ...base, input: { ...base.input, mode: 'save' } })).toMatchObject({ reason: 'saved_without_assessment', claims: [] })
  })
})
