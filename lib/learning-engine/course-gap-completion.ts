import { COURSE_ACTIVITY_VERSION, type CourseActivity } from './course-activities'

/** Reuse already mapped passages; never mutate an existing course, skill or activity. */
export function courseGapCompletion(existing: readonly CourseActivity[]): CourseActivity[] {
  const tasks: CourseActivity[] = []
  const prompts = {
    middle_school: 'In the garden notebook, distinguish the recorded growth observation from an explanation about light. Quote the growth observation exactly, identify its source, and explain which other recorded condition limits the explanation.',
    high_school: 'Use the library pilot summary to separate an attendance observation from a causal claim about the shuttle. Quote a sentence that limits the causal claim, identify its source, and explain what evidence would still be needed.',
    college_intro: 'Identify the seminar survey\'s measured outcome and sampling limitation. Quote the relevant source wording exactly, then explain why the observations do not establish an improvement in objective performance.',
  } as const
  for (const level of ['middle_school', 'high_school', 'college_intro'] as const) {
    const courseId = 'english-' + level.replaceAll('_', '-')
    const origin = existing.find(item => item.courseId === courseId && item.skillId === 'english.source_comparison')
    if (!origin || !origin.sources.length) throw new Error('gap_source_missing:' + courseId)
    tasks.push({ id: `${COURSE_ACTIVITY_VERSION}:${courseId}:evidence-boundaries`, courseId, skillId: 'reading.evidence',
      subject: 'reading', level, title: 'Locate evidence and limit the claim', prompt: prompts[level],
      sources: [structuredClone(origin.sources[0])], method: { kind: 'reading_evidence', minimumSources: 1,
        criteria: ['Attribute an exact quotation to the selected passage.', 'Separate the recorded observation from an interpretation or causal claim.', 'Explain a specific limitation using the source rather than adding an unstated result.'] },
      hints: ['Mark what was measured or observed before considering what caused it.', 'Choose a distinctive short quotation and explain its relevance in your own words.'],
      example: { prompt: 'Different example: a playground log reports more visitors during a festival after a new bench was installed.',
        steps: ['The count supports an observation about that recorded period.', 'The festival is an alternative explanation; the count alone does not isolate the bench\'s effect.'] }, review: 'pending', revision: 1 })
  }
  tasks.push({ id: `${COURSE_ACTIVITY_VERSION}:science-middle-school:conservation-particles`, courseId: 'science-middle-school',
    skillId: 'science.conservation', subject: 'science', level: 'middle_school', title: 'Conserve atoms in a particle model',
    prompt: 'Balance H2O2 -> H2O + O2 using positive whole-number coefficients. Keep each formula and its side unchanged. Explain how your coefficients conserve both kinds of atom. This is a symbolic model, not an instruction to perform an experiment.',
    sources: [], method: { kind: 'science_balance', reactants: ['H2O2'], products: ['H2O', 'O2'] },
    hints: ['Count H and O atoms separately. A subscript belongs to the substance and must stay unchanged.', 'Try two particles of H2O2 on the left, then match the H atoms before checking O.'],
    example: { prompt: 'Different example: balance N2 + H2 -> NH3 as a particle-count model.',
      steps: ['Two NH3 particles contain two N atoms and six H atoms.', 'N2 + 3H2 -> 2NH3 preserves those atom counts without changing any formula.'] }, review: 'pending', revision: 1 })
  return tasks
}

/** Gate fixture checks atom conservation only; explanatory reasoning remains review work. */
export const GAP_COMPLETION_GATE_ANSWERS: Readonly<Record<string, string>> = {
  [`${COURSE_ACTIVITY_VERSION}:science-middle-school:conservation-particles`]: '2H2O2 -> 2H2O + O2',
}
