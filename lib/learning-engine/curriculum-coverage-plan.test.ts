import { describe, expect, it } from 'vitest'
import type { CourseFramework } from './course-framework'
import type { VersionedActivity } from './course-activities'
import { planCurriculumCoverage, planningActivityMetadata, offlineCurriculumCoverageReport, type PlanningActivity, type PlanningPublication } from './curriculum-coverage-plan'

// Graph/identity contract fixtures only. No lesson prompts, answers or held-out cases.
function fixture() {
  const framework: CourseFramework = {
    schemaVersion: 'diana-course-framework-v2',
    competencies: [
      { id: 'math.base', subject: 'math', title: 'Metadata A', objective: 'Opaque graph node', revision: 1,
        levels: ['middle_school', 'high_school'], prerequisites: [] },
      { id: 'math.target', subject: 'math', title: 'Metadata B', objective: 'Opaque graph node', revision: 1,
        levels: ['high_school'], prerequisites: ['math.base'] },
      { id: 'math.empty', subject: 'math', title: 'Metadata C', objective: 'Opaque graph node', revision: 1,
        levels: ['high_school'], prerequisites: [] },
    ],
    courses: [
      { id: 'main', subject: 'math', level: 'high_school', title: 'Metadata course', revision: 1,
        units: [{ id: 'unit-one', title: 'Metadata unit', skillIds: ['math.target', 'math.empty', 'math.base'] }], sources: [], alignments: [] },
      { id: 'lower', subject: 'math', level: 'middle_school', title: 'Metadata course', revision: 1,
        units: [{ id: 'unit-one', title: 'Metadata unit', skillIds: ['math.base'] }], sources: [], alignments: [] },
    ],
  }
  const activity = (id: string, skillId: string, courseId = 'main', role: PlanningActivity['role'] = 'instruction'): PlanningActivity => ({
    id, courseId, skillId, subject: 'math', level: courseId === 'lower' ? 'middle_school' : 'high_school', versionId: 'a'.repeat(64), role,
  })
  const activities = [activity('target-task', 'math.target'), activity('base-task', 'math.base')]
  const publications: PlanningPublication[] = [{ courseId: 'main', status: 'draft' }, { courseId: 'lower', status: 'draft' }]
  return { framework, activity, activities, publications }
}

describe('curriculum mapping coverage and optional sequence planning', () => {
  it('keeps all 24 subject/band cells, including computing and completely unmapped cells', () => {
    const { framework, activities, publications } = fixture()
    const report = planCurriculumCoverage(framework, activities, publications)
    expect(report.matrix).toHaveLength(24)
    expect(new Set(report.matrix.map(item => `${item.subject}:${item.level}`)).size).toBe(24)
    expect(report.matrix.filter(item => item.subject === 'computing')).toHaveLength(4)
    expect(report.matrix.filter(item => item.subject === 'computing').every(item => item.status === 'unmapped')).toBe(true)
    expect(report.matrix.find(item => item.subject === 'math' && item.level === 'high_school')).toMatchObject({
      mappedSkillSlots: 3, authoredSkillSlots: 2, availableInstructionSkillSlots: 2, status: 'partial_authored',
      missingMappedSkills: [{ courseId: 'main', skillId: 'math.empty' }],
    })
  })
  it('does not inflate skill coverage with duplicate activities or repeated unit mapping', () => {
    const { framework, activity, activities, publications } = fixture()
    framework.courses[0].units.push({ id: 'unit-two', title: 'Repeated map', skillIds: ['math.target'] })
    activities.push(activity('target-task-two', 'math.target'))
    const course = planCurriculumCoverage(framework, activities, publications).courses[0]
    expect(course).toMatchObject({ mappedSkillCount: 3, authoredMappedSkillCount: 2, mappedInventoryComplete: false })
  })
  it('orders prerequisites before dependents even when author unit order and input activities put them later', () => {
    const { framework, activities, publications } = fixture()
    const first = planCurriculumCoverage(framework, activities, publications)
    const second = planCurriculumCoverage(framework, [...activities].reverse(), publications)
    expect(second).toEqual(first)
    const steps = first.courses[0].steps
    expect(steps.findIndex(item => item.skillId === 'math.base')).toBeLessThan(steps.findIndex(item => item.skillId === 'math.target'))
  })
  it('does not silently choose a different-level foundation and propagates its gap', () => {
    const { framework, activity, activities, publications } = fixture()
    framework.courses[0].units[0].skillIds = ['math.target']
    const course = planCurriculumCoverage(framework, [activities[0], activity('lower-base', 'math.base', 'lower')], publications).courses[0]
    expect(course.unmappedPrerequisiteIds).toEqual(['math.base'])
    expect(course.steps[0]).toMatchObject({ skillId: 'math.base', kind: 'foundation', activityId: null,
      gap: 'different_level_only', differentLevelActivityIds: ['lower-base'], sequenceAvailable: false })
    expect(course.steps[1]).toMatchObject({ activityId: 'target-task', prerequisiteGapIds: ['math.base'], sequenceAvailable: false })
    expect(course.availableSequenceComplete).toBe(false)
  })
  it('keeps withdrawn/unrecorded instruction in the denominator but out of proposed sequences', () => {
    const { framework, activities, publications } = fixture()
    for (const status of ['withdrawn', 'suspended'] as const) {
      publications[0].status = status
      const course = planCurriculumCoverage(framework, activities, publications).courses[0]
      expect(course).toMatchObject({ mappedSkillCount: 3, authoredMappedSkillCount: 2, availableInstructionMappedSkillCount: 0, availableSequenceComplete: false })
      expect(course.steps.filter(item => item.skillId !== 'math.empty').every(item => item.gap === 'unavailable_instruction')).toBe(true)
    }
    expect(planCurriculumCoverage(framework, activities, []).courses[0]).toMatchObject({ publicationStatus: 'unrecorded', availableSequenceComplete: false })
  })
  it('counts transfer inventory but never substitutes it for foundational instruction', () => {
    const { framework, activities, publications } = fixture()
    activities[1].role = 'transfer'
    const course = planCurriculumCoverage(framework, activities, publications).courses[0]
    expect(course.authoredMappedSkillCount).toBe(2)
    expect(course.availableInstructionMappedSkillCount).toBe(1)
    expect(course.steps.find(item => item.skillId === 'math.base')).toMatchObject({ activityId: null, gap: 'no_authored_instruction' })
  })
  it('reports mapped inventory completeness without curriculum, learner or educator claims', () => {
    const { framework, activities, publications } = fixture()
    framework.courses[0].units[0].skillIds = ['math.target', 'math.base']
    const report = planCurriculumCoverage(framework, activities, publications)
    expect(report.courses[0]).toMatchObject({ mappedInventoryComplete: true, availableSequenceComplete: true })
    expect(report).toMatchObject({ completeCurriculum: false, educatorApproved: false, standardsAligned: false,
      learnerReadinessAssessed: false, publicationAuthorityVerified: false })
    expect(report).not.toHaveProperty('mastery')
  })
  it('rejects duplicate identity, cycles, missing prerequisites and incompatible activity scope', () => {
    const data = fixture()
    expect(() => planCurriculumCoverage(data.framework, [...data.activities, data.activities[0]], data.publications)).toThrow('planning_duplicate_identity')
    expect(() => planCurriculumCoverage(data.framework, data.activities, [...data.publications, data.publications[0]])).toThrow('planning_duplicate_identity')
    expect(() => planCurriculumCoverage(data.framework, [{ ...data.activities[0], level: 'college_advanced' }], data.publications)).toThrow('planning_activity_scope_mismatch')
    expect(() => planCurriculumCoverage(data.framework, data.activities, [{ courseId: 'absent', status: 'published' }])).toThrow('planning_unknown_publication')
    data.framework.competencies[0].prerequisites = ['math.target']
    expect(() => planCurriculumCoverage(data.framework, data.activities, data.publications)).toThrow('planning_prerequisite_cycle')
    data.framework.competencies[0].prerequisites = ['math.absent']
    expect(() => planCurriculumCoverage(data.framework, data.activities, data.publications)).toThrow('planning_unknown_prerequisite')
  })
  it('projects metadata without answer/source leakage, preserves source hashes and mutates no input', () => {
    const { framework, activities, publications } = fixture()
    const authored = activities.map(({ role: _role, ...item }) => ({ ...item, prompt: 'opaque private field',
      sources: [{ text: 'opaque source' }], hints: ['opaque hint'], method: { expected: 'opaque answer' } })) as unknown as VersionedActivity[]
    const before = JSON.stringify({ framework, authored, publications })
    const projected = planningActivityMetadata(authored, new Set(['base-task']))
    expect(Object.keys(projected[0]).sort()).toEqual(['courseId', 'id', 'level', 'role', 'skillId', 'subject', 'versionId'])
    expect(projected.map(item => item.versionId)).toEqual(authored.map(item => item.versionId))
    const report = planCurriculumCoverage(framework, projected, publications)
    expect(JSON.stringify(report)).not.toContain('opaque private field')
    expect(JSON.stringify(report)).not.toContain('opaque answer')
    expect(JSON.stringify({ framework, authored, publications })).toBe(before)
    expect(() => planningActivityMetadata(authored, new Set(['unknown']))).toThrow('planning_unknown_transfer')
    expect(() => planCurriculumCoverage(framework, [{ ...activities[0], expected: 'forbidden' } as PlanningActivity], publications)).toThrow()
  })
  it('validates long prerequisite chains iteratively without loading authored catalog content', () => {
    const { framework, publications } = fixture()
    framework.competencies = Array.from({ length: 1500 }, (_, i) => ({ id: `math.node-${i}`, subject: 'math',
      title: 'Metadata node', objective: 'Opaque graph node', revision: 1, levels: ['high_school'], prerequisites: i ? [`math.node-${i - 1}`] : [] }))
    framework.courses = [{ ...framework.courses[0], units: [{ id: 'unit-one', title: 'Metadata unit', skillIds: ['math.node-1499'] }] }]
    const plan = planCurriculumCoverage(framework, [], [publications[0]])
    expect(plan.courses[0].steps).toHaveLength(1500)
    expect(plan.courses[0].steps[0].skillId).toBe('math.node-0')
    expect(plan.courses[0].steps.at(-1)?.prerequisiteGapIds).toHaveLength(1499)
  })
  it('offline reporting retains all versioned metadata and never fabricates publication evidence', () => {
    const { framework, activities } = fixture()
    const authored = activities.map(({ role: _role, ...item }) => item) as VersionedActivity[]
    const report = offlineCurriculumCoverageReport(framework, authored, new Set())
    expect(report).toMatchObject({ publicationEvidence: 'not_loaded_offline', publicationStatesAssumed: false,
      summary: { subjectBandCells: 24, mappedSkillSlots: 4, authoredSkillSlots: 2,
        missingMappedSkillSlots: 2, coursesWithoutActivities: ['lower'], publicationStatesLoaded: 0 } })
    expect(report.activityInventory.map(item => [item.id, item.versionId])).toEqual(authored.map(item => [item.id, item.versionId]))
    expect(report.planning.courses.every(course => course.publicationStatus === 'unrecorded' && !course.availableSequenceComplete)).toBe(true)
    expect(report.planning.matrix.every(cell => cell.availableActivities === 0)).toBe(true)
  })
})
