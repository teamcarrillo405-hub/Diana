import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import preserved from './course-path-routing-baseline.json'
import { loadCourseCatalog } from './course-catalog'
import { computingActivities, computingActivityPhases, computingCompetencies, computingCourses, computingTransferActivityIds } from './course-computing'
import { GAP_COMPLETION_GATE_ANSWERS } from './course-gap-completion'
import { offlineCurriculumCoverageReport } from './curriculum-coverage-plan'
import { transferOriginActivityIds } from './course-transfer'
import { buildCoursePaths } from './course-sequence'
import { presentCourseActivity, validateCourseActivities } from './course-activities'
import { runCourseTutor } from './course-tutor'
import { responseRubric } from './response-rubric'
import { practiceSubjectForClass } from './course-domains'
import { courseContentHash } from './course-framework'

const stochasticAdditionIds = [
  'course-practice-v2:math-row-stochastic-college-advanced:orientation',
  'course-practice-v2:math-row-stochastic-college-advanced:mixture',
  'course-practice-v2:math-row-stochastic-college-advanced:three-state-transfer',
]

describe('draft computing instruction and mapped gap completion', () => {
  it('preserves the 112- and 152-activity baselines with only three declared stochastic additions', async () => {
    const { activities } = await loadCourseCatalog()
    expect(Object.keys(preserved)).toHaveLength(112)
    expect(activities).toHaveLength(155)
    for (const [id, version] of Object.entries(preserved)) expect(activities.find(item => item.id === id)?.versionId, id).toBe(version)
    const preceding = activities.filter(item => !stochasticAdditionIds.includes(item.id))
    expect(preceding).toHaveLength(152)
    expect(preceding.filter(item => !Object.hasOwn(preserved, item.id))).toHaveLength(40)
    expect(activities.filter(item => stochasticAdditionIds.includes(item.id)).map(item => item.id).sort()).toEqual([...stochasticAdditionIds].sort())
    // Frozen before the stochastic change: stochastic-curriculum-before-20260929.json,
    // raw SHA-256 6eb0d827f02a542af96445b30977b716bf9cb606cf87ca02ac928225c8c7b599.
    // Pin all prior IDs, versions and full content hashes without a release-artifact runtime dependency.
    const hashes = await Promise.all(preceding.map(async item => [item.id, item.versionId, await courseContentHash(item)]))
    hashes.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)
    expect(createHash('sha256').update(JSON.stringify(hashes)).digest('hex')).toBe('25fe5d99a65127846d8a30c4b124fb2f5b346191b24b21da721ac5b0b1bf64d6')
  })
  it('fills the four declared non-reference skill gaps and every computing band without claiming completeness', async () => {
    const { framework, activities } = await loadCourseCatalog()
    const report = offlineCurriculumCoverageReport(framework, activities, new Set(Object.keys(transferOriginActivityIds)))
    expect(report.summary.missingMappedSkillSlots).toBe(28)
    expect(report.summary.unmappedCells).toEqual([])
    expect(report.summary.coursesWithoutActivities).toEqual(['precalculus-reference'])
    expect(computingCourses.map(course => course.level)).toEqual(['middle_school', 'high_school', 'college_intro', 'college_advanced'])
    expect(report.planning.completeCurriculum).toBe(false)
    expect(report.planning.educatorApproved).toBe(false)
  })
  it('recognizes explicit computing course labels before the generic science match', () => {
    expect(practiceSubjectForClass(null, 'Computer Science')).toBe('computing')
    expect(practiceSubjectForClass('computing', 'Introduction')).toBe('computing')
    expect(practiceSubjectForClass(null, 'Programming')).toBe('computing')
    expect(practiceSubjectForClass(null, 'Biology')).toBe('science')
  })
  it('gives each computing skill instruction, practice and a correctly bound transfer in prerequisite order', async () => {
    expect(computingCompetencies).toHaveLength(12)
    expect(computingActivities).toHaveLength(36)
    const { framework, activities } = await loadCourseCatalog(), paths = buildCoursePaths(framework, activities)
    for (const skill of computingCompetencies) {
      const selected = computingActivities.filter(activity => activity.skillId === skill.id)
      expect(selected.map(activity => computingActivityPhases[activity.id])).toEqual(['instruction', 'practice', 'transfer'])
      const [instruction, practice, transfer] = selected
      expect(paths.find(path => path.activityId === instruction.id)?.nextId).toBe(practice.id)
      expect(paths.find(path => path.activityId === practice.id)?.transferId).toBe(transfer.id)
      expect(paths.find(path => path.activityId === transfer.id)?.returnId).toBe(practice.id)
      expect(computingTransferActivityIds[transfer.id]).toBe(practice.id)
      for (const prerequisite of skill.prerequisites) expect(computingCompetencies.findIndex(item => item.id === prerequisite)).toBeLessThan(computingCompetencies.indexOf(skill))
    }
  })
  it('never infers a correctness verdict from computing responses or executes their submitted code', async () => {
    const { activities } = await loadCourseCatalog()
    for (const activity of activities.filter(item => item.subject === 'computing')) {
      const check = await runCourseTutor(activity, { mode: 'check', response: 'fetch("https://invalid.example"); while(true){}', confirmed: true, priorSupport: 0 })
      expect(check).toMatchObject({ outcome: 'unverified', eligibleForKnowledge: false, providerCalled: false, assistance: 'unchanged', checkMode: 'guided_rubric' })
      expect(check.guidance).toContain('does not execute code')
      expect(check.steps).toEqual('criteria' in activity.method ? activity.method.criteria : [])
      expect(responseRubric(activity)).toMatchObject({ automaticScoring: false, review: 'pending' })
      const presented = presentCourseActivity(activity)
      expect(presented).not.toHaveProperty('example')
      expect(presented).not.toHaveProperty('hints')
      expect(activity.sources.every(source => source.authorship === 'diana_authored' && source.trainingPermission === 'excluded')).toBe(true)
      expect(activity.review).toBe('pending')
    }
  })
  it('retains confirmation, requested assistance and save boundaries for the new computing kind', async () => {
    const { activities } = await loadCourseCatalog(), activity = activities.find(item => item.subject === 'computing')!
    const input = { response: 'attempt', confirmed: false, priorSupport: 0 }
    expect(await runCourseTutor(activity, { ...input, mode: 'check' })).toMatchObject({ status: 'needs_confirmation', outcome: 'unverified' })
    expect(await runCourseTutor(activity, { ...input, confirmed: true, mode: 'hint' })).toMatchObject({ assistance: 'hinted', eligibleForKnowledge: false })
    expect(await runCourseTutor(activity, { ...input, confirmed: true, mode: 'example' })).toMatchObject({ assistance: 'example_assisted', eligibleForKnowledge: false })
    expect(await runCourseTutor(activity, { ...input, mode: 'save' })).toMatchObject({ status: 'saved', eligibleForKnowledge: false })
  })
  it('requires computing sources and refuses cross-subject method aliases', async () => {
    const { framework } = await loadCourseCatalog(), original = computingActivities[0]
    await expect(validateCourseActivities(framework, [{ ...original, sources: [] }])).rejects.toThrow('source_required')
    await expect(validateCourseActivities(framework, [{ ...original, method: { kind: 'writing_revision', criteria: ['one', 'two'] } }])).rejects.toThrow('activity_method_mismatch')
  })
  it('checks conservation only and retains rubric uncertainty for source interpretation', async () => {
    const { activities } = await loadCourseCatalog()
    const [id, answer] = Object.entries(GAP_COMPLETION_GATE_ANSWERS)[0]
    const activity = activities.find(item => item.id === id)!
    const input = { mode: 'check' as const, response: answer, confirmed: true, priorSupport: 0 }
    expect(await runCourseTutor(activity, input)).toMatchObject({ outcome: 'matches', eligibleForKnowledge: false })
    expect(await runCourseTutor(activity, { ...input, response: 'H2O2 -> H2O + O2' })).toMatchObject({ outcome: 'revise' })
    expect(await runCourseTutor(activity, { ...input, response: 'H2O2 -> H2 + O2' })).toMatchObject({ outcome: 'unverified', status: 'unsupported' })
    for (const gap of activities.filter(item => item.id.endsWith(':evidence-boundaries'))) {
      expect(await runCourseTutor(gap, { ...input, response: '"' + gap.sources[0].text + '"' })).toMatchObject({ outcome: 'unverified', eligibleForKnowledge: false })
    }
  })
})
