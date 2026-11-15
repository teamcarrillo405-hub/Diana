import { z } from 'zod'
import { courseLevelSchema, domainSchema, type CourseLevel } from './course-domains'
import type { CourseFramework } from './course-framework'
import type { VersionedActivity } from './course-activities'

export const PLANNED_SUBJECTS = ['math', 'reading', 'english', 'science', 'history', 'computing'] as const
export const PLANNED_LEVELS = ['middle_school', 'high_school', 'college_intro', 'college_advanced'] as const
const id = z.string().min(1).max(200)
const skillSchema = z.object({ id, subject: domainSchema, levels: z.array(courseLevelSchema).min(1).max(4), prerequisites: z.array(id).max(30) }).strict()
const courseSchema = z.object({ id, subject: domainSchema, level: courseLevelSchema,
  units: z.array(z.object({ id, skillIds: z.array(id).min(1).max(40) }).strict()).min(1).max(200) }).strict()
export const planningActivitySchema = z.object({ id, courseId: id, skillId: id, subject: domainSchema,
  level: courseLevelSchema, versionId: z.string().regex(/^[a-f0-9]{64}$/), role: z.enum(['instruction', 'transfer']) }).strict()
export type PlanningActivity = z.infer<typeof planningActivitySchema>
const publicationSchema = z.object({ courseId: id, status: z.enum(['draft', 'published', 'withdrawn', 'suspended']) }).strict()
export type PlanningPublication = z.infer<typeof publicationSchema>
type Skill = z.infer<typeof skillSchema>
type Course = z.infer<typeof courseSchema>
type Gap = 'no_authored_instruction' | 'unavailable_instruction' | 'different_level_only'

/** Projection deliberately excludes prompts, sources, examples, answers and rubric text.
 * transferIds must come from the exact catalog origin mapping, not a semantic guess.
 */
export function planningActivityMetadata(activities: readonly VersionedActivity[], transferIds: ReadonlySet<string>): PlanningActivity[] {
  const ids = new Set(activities.map(item => item.id))
  for (const transferId of transferIds) if (!ids.has(transferId)) throw new Error('planning_unknown_transfer')
  return activities.map(({ id, courseId, skillId, subject, level, versionId }) => planningActivitySchema.parse({
    id, courseId, skillId, subject, level, versionId, role: transferIds.has(id) ? 'transfer' : 'instruction',
  }))
}

/** Offline catalog reporting cannot claim to know hosted publication/withdrawal state. */
export function offlineCurriculumCoverageReport(framework: CourseFramework, activities: readonly VersionedActivity[], transferIds: ReadonlySet<string>) {
  const activityInventory = planningActivityMetadata(activities, transferIds)
  const planning = planCurriculumCoverage(framework, activityInventory, [])
  const foundations = planning.courses.flatMap(course => course.steps.filter(step => step.kind === 'foundation'))
  return { version: 'offline-curriculum-coverage-v1' as const,
    publicationEvidence: 'not_loaded_offline' as const, publicationStatesAssumed: false as const,
    activityInventory, planning,
    summary: {
      subjectBandCells: planning.matrix.length,
      unmappedCells: planning.matrix.filter(cell => cell.status === 'unmapped').map(cell => ({ subject: cell.subject, level: cell.level })),
      mappedSkillSlots: planning.courses.reduce((sum, course) => sum + course.mappedSkillCount, 0),
      authoredSkillSlots: planning.courses.reduce((sum, course) => sum + course.authoredMappedSkillCount, 0),
      missingMappedSkillSlots: planning.courses.reduce((sum, course) => sum + course.missingMappedSkillIds.length, 0),
      coursesWithoutActivities: planning.courses.filter(course => !activityInventory.some(item => item.courseId === course.courseId)).map(course => course.courseId),
      externalFoundationSlots: foundations.length,
      missingAuthoredFoundationSlots: foundations.filter(step => step.gap === 'no_authored_instruction').length,
      differentLevelOnlyFoundationSlots: foundations.filter(step => step.gap === 'different_level_only').length,
      foundationsWithUnobservedAvailability: foundations.filter(step => step.gap === 'unavailable_instruction').length,
      publicationStatesLoaded: 0,
    },
  }
}
const unique = <T>(values: readonly T[]) => new Set(values).size === values.length
const lexical = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0
const available = (status: PlanningPublication['status'] | undefined) => status === 'draft' || status === 'published'

/** Engineering inventory and optional authoring order only. No catalog or IO imports are executed.
 * Publication states are observations supplied by the caller after content-hash matching.
 * This function neither authenticates those observations nor changes publication/mastery gates.
 */
export function planCurriculumCoverage(framework: CourseFramework, rawActivities: readonly PlanningActivity[], rawPublications: readonly PlanningPublication[]) {
  if (framework.competencies.length > 10000 || framework.courses.length > 1000 || rawActivities.length > 20000 || rawPublications.length > 1000) throw new Error('planning_input_too_large')
  const skills = framework.competencies.map(({ id, subject, levels, prerequisites }) => skillSchema.parse({ id, subject, levels, prerequisites }))
  const courses = framework.courses.map(({ id, subject, level, units }) => courseSchema.parse({ id, subject, level,
    units: units.map(({ id, skillIds }) => ({ id, skillIds })) }))
  const activities = rawActivities.map(item => planningActivitySchema.parse(item))
  const publications = rawPublications.map(item => publicationSchema.parse(item))
  if (!unique(skills.map(item => item.id)) || !unique(courses.map(item => item.id)) || !unique(activities.map(item => item.id)) || !unique(publications.map(item => item.courseId))) throw new Error('planning_duplicate_identity')
  const bySkill = new Map(skills.map(item => [item.id, item])), byCourse = new Map(courses.map(item => [item.id, item]))
  for (const skill of skills) {
    if (!unique(skill.levels) || !unique(skill.prerequisites)) throw new Error('planning_duplicate_relationship')
    if (skill.prerequisites.some(id => !bySkill.has(id))) throw new Error('planning_unknown_prerequisite')
  }
  // Iterative cycle check also handles long, valid chains without recursive stack overflow.
  topological(skills.map(item => item.id), bySkill, new Map())
  for (const course of courses) {
    if (!unique(course.units.map(item => item.id))) throw new Error('planning_duplicate_unit')
    for (const unit of course.units) {
      if (!unique(unit.skillIds)) throw new Error('planning_duplicate_relationship')
      if (unit.skillIds.some(id => !bySkill.has(id))) throw new Error('planning_unknown_mapped_skill')
    }
  }
  for (const activity of activities) {
    const course = byCourse.get(activity.courseId), skill = bySkill.get(activity.skillId)
    if (!course || !skill || course.level !== activity.level || skill.subject !== activity.subject ||
        !skill.levels.includes(activity.level) || !course.units.some(unit => unit.skillIds.includes(activity.skillId))) throw new Error('planning_activity_scope_mismatch')
  }
  if (publications.some(item => !byCourse.has(item.courseId))) throw new Error('planning_unknown_publication')
  const states = new Map(publications.map(item => [item.courseId, item.status]))
  const byActivitySkill = new Map<string, PlanningActivity[]>(), byActivityCourse = new Map<string, PlanningActivity[]>()
  for (const activity of activities) {
    byActivitySkill.set(activity.skillId, [...(byActivitySkill.get(activity.skillId) ?? []), activity])
    byActivityCourse.set(activity.courseId, [...(byActivityCourse.get(activity.courseId) ?? []), activity])
  }
  let plannedSteps = 0
  const plans = courses.map(course => {
    const plan = planCourse(course, bySkill, byActivitySkill, byActivityCourse, states)
    plannedSteps += plan.steps.length
    if (plannedSteps > 50000) throw new Error('planning_output_too_large')
    return plan
  })
  return {
    version: 'curriculum-coverage-plan-v1' as const,
    completeCurriculum: false as const, educatorApproved: false as const, standardsAligned: false as const,
    learnerReadinessAssessed: false as const, publicationAuthorityVerified: false as const,
    matrix: PLANNED_SUBJECTS.flatMap(subject => PLANNED_LEVELS.map(level => {
      const selected = plans.filter(item => item.subject === subject && item.level === level)
      const courseIds = new Set(selected.map(item => item.courseId)), items = activities.filter(item => courseIds.has(item.courseId))
      const mappedSkillSlots = selected.reduce((sum, item) => sum + item.mappedSkillCount, 0)
      const authoredSkillSlots = selected.reduce((sum, item) => sum + item.authoredMappedSkillCount, 0)
      return { subject, level, courseIds: [...courseIds].sort(lexical), mappedSkillSlots, authoredSkillSlots,
        availableInstructionSkillSlots: selected.reduce((sum, item) => sum + item.availableInstructionMappedSkillCount, 0),
        authoredActivities: items.length, availableActivities: items.filter(item => available(states.get(item.courseId))).length,
        missingMappedSkills: selected.flatMap(item => item.missingMappedSkillIds.map(skillId => ({ courseId: item.courseId, skillId }))),
        status: !selected.length ? 'unmapped' as const : !items.length ? 'mapped_without_activities' as const :
          authoredSkillSlots < mappedSkillSlots ? 'partial_authored' as const : 'mapped_inventory_covered' as const }
    })),
    courses: plans,
    outsideTargetCourseIds: plans.filter(item => item.subject === 'other').map(item => item.courseId).sort(lexical),
    limitations: [
      'Coverage denominates declared course mappings, not a complete grade, degree, standard or real-world curriculum.',
      'Draft is available under current catalog navigation policy; published status here is a supplied observation, not authenticated educator approval.',
      'Different-level activities are listed as alternatives requiring a decision; they never silently satisfy a prerequisite.',
      'Transfer role is supplied by the exact catalog mapping; a distinct ID or hash does not prove semantic novelty.',
      'Sequence is an engineering prerequisite order, not learner readiness, mastery, completion or a forced promotion.',
    ],
  }
}

function topological(ids: string[], bySkill: Map<string, Skill>, rank: Map<string, number>): string[] {
  const included = new Set(ids), remaining = new Map<string, number>(), dependents = new Map<string, string[]>()
  for (const id of ids) {
    const prerequisites = bySkill.get(id)!.prerequisites.filter(item => included.has(item))
    remaining.set(id, prerequisites.length)
    for (const prerequisite of prerequisites) dependents.set(prerequisite, [...(dependents.get(prerequisite) ?? []), id])
  }
  const compare = (a: string, b: string) => (rank.get(a) ?? Infinity) - (rank.get(b) ?? Infinity) || lexical(a, b)
  const queue = ids.filter(id => remaining.get(id) === 0).sort(compare), result: string[] = []
  while (queue.length) {
    const id = queue.shift()!; result.push(id)
    for (const dependent of dependents.get(id) ?? []) {
      remaining.set(dependent, remaining.get(dependent)! - 1)
      if (remaining.get(dependent) === 0) queue.push(dependent)
    }
    queue.sort(compare)
  }
  if (result.length !== ids.length) throw new Error('planning_prerequisite_cycle')
  return result
}

function planCourse(course: Course, bySkill: Map<string, Skill>, byActivitySkill: Map<string, PlanningActivity[]>, byActivityCourse: Map<string, PlanningActivity[]>, states: Map<string, PlanningPublication['status']>) {
  const mapped = [...new Set(course.units.flatMap(unit => unit.skillIds))], included = new Set(mapped)
  const rank = new Map(mapped.map((id, index) => [id, index]))
  const pending = [...mapped]
  while (pending.length) {
    const id = pending.shift()!
    for (const prerequisite of bySkill.get(id)!.prerequisites) {
      if (!included.has(prerequisite)) { included.add(prerequisite); pending.push(prerequisite) }
    }
  }
  const ordered = topological([...included], bySkill, rank), missing = new Map<string, string[]>()
  const steps = ordered.map(skillId => {
    const instruction = (byActivitySkill.get(skillId) ?? []).filter(item => item.role === 'instruction')
    const sameLevel = instruction.filter(item => item.level === course.level)
    const candidates = sameLevel.filter(item => available(states.get(item.courseId)))
      .sort((a, b) => Number(b.courseId === course.id) - Number(a.courseId === course.id) || lexical(a.id, b.id))
    const gap: Gap | null = candidates.length ? null : sameLevel.length ? 'unavailable_instruction' : instruction.length ? 'different_level_only' : 'no_authored_instruction'
    const prerequisiteGapIds = [...new Set(bySkill.get(skillId)!.prerequisites.flatMap(id => missing.get(id) ?? []))].sort(lexical)
    missing.set(skillId, [...prerequisiteGapIds, ...(gap ? [skillId] : [])])
    return { skillId, kind: mapped.includes(skillId) ? 'mapped' as const : 'foundation' as const,
      prerequisiteSkillIds: [...bySkill.get(skillId)!.prerequisites], activityId: candidates[0]?.id ?? null,
      candidateActivityIds: candidates.map(item => item.id),
      activityVersions: candidates.map(item => ({ id: item.id, versionId: item.versionId })),
      differentLevelActivityIds: instruction.filter(item => item.level !== course.level).map(item => item.id).sort(lexical),
      gap, prerequisiteGapIds, sequenceAvailable: gap === null && prerequisiteGapIds.length === 0 }
  })
  const local = byActivityCourse.get(course.id) ?? []
  const authored = new Set(local.map(item => item.skillId))
  const usable = new Set(local.filter(item => item.role === 'instruction' && available(states.get(item.courseId))).map(item => item.skillId))
  return { courseId: course.id, subject: course.subject, level: course.level as CourseLevel,
    publicationStatus: states.get(course.id) ?? 'unrecorded' as const,
    mappedSkillCount: mapped.length, authoredMappedSkillCount: mapped.filter(id => authored.has(id)).length,
    availableInstructionMappedSkillCount: mapped.filter(id => usable.has(id)).length,
    missingMappedSkillIds: mapped.filter(id => !authored.has(id)),
    unmappedPrerequisiteIds: ordered.filter(id => !mapped.includes(id)), steps,
    availableSequenceComplete: available(states.get(course.id)) && steps.every(step => step.sequenceAvailable),
    // All mapped slots remain in the denominator, even when publication is missing or withdrawn.
    mappedInventoryComplete: mapped.every(id => authored.has(id)) }
}
