import { COURSE_ACTIVITY_VERSION, type CourseActivity } from './course-activities';
import type { Competency, CourseMap } from './course-framework';
import { describeStochasticGivens, type StochasticSpecification } from './stochastic-matrix';

/** Original draft practice, not an evaluated curriculum or evidence of model quality. */
const courseId = 'math-row-stochastic-college-advanced', skillId = 'math.row_stochastic_step';
export const stochasticCompetencies: Competency[] = [{
  id: skillId, subject: 'math', title: 'Validate and propagate a probability row vector',
  objective: 'Check explicit probability constraints and calculate one exact pP step in a declared finite transition model. Separate arithmetic from the validity of the model.',
  revision: 1, prerequisites: ['math.ratio_foundations', 'math.vectors'], levels: ['college_advanced'],
}];
export const stochasticCourses: CourseMap[] = [{
  id: courseId, title: 'Finite transition models: one exact step', subject: 'math', level: 'college_advanced', revision: 1,
  units: [{ id: courseId + '-unit', title: 'Check assumptions before multiplying', skillIds: [skillId] }], sources: [], alignments: [],
}];
const tasks: { id: string; title: string; context: string; specification: StochasticSpecification }[] = [
  { id: 'orientation', title: 'Follow one row from a known state',
    context: 'A declared two-state process begins entirely in the first state. Validate the givens, then use the first row to check your multiplication. The labels describe an abstract process, not measured frequencies.',
    specification: { convention: 'row_vector_p_times_P', states: ['Holding', 'Moving'], matrix: [['5/8', '3/8'], ['1/4', '3/4']], initial: ['1', '0'] } },
  { id: 'mixture', title: 'Combine contributions from two states',
    context: 'An abstract device model has two states. The initial distribution represents uncertainty over the current state. Check the row sums, then combine contributions to each destination. The model is supplied, not inferred from observations.',
    specification: { convention: 'row_vector_p_times_P', states: ['Idle', 'Busy'], matrix: [['3/5', '2/5'], ['1/10', '9/10']], initial: ['2/3', '1/3'] } },
  { id: 'three-state-transfer', title: 'Extend the calculation to a third state',
    context: 'Apply the same method to a hypothetical three-location routing model. Distinguish the next-location distribution from a prediction of any particular item. No claim about real routing data is being checked.',
    specification: { convention: 'row_vector_p_times_P', states: ['North', 'Central', 'South'], matrix: [['1/2', '1/3', '1/6'], ['1/4', '1/2', '1/4'], ['0', '2/5', '3/5']], initial: ['1/5', '1/2', '3/10'] } },
];
export const stochasticActivities: CourseActivity[] = tasks.map(task => ({
  id: `${COURSE_ACTIVITY_VERSION}:${courseId}:${task.id}`, courseId, skillId, subject: 'math', level: 'college_advanced',
  title: task.title, prompt: `${task.context}\n\n${describeStochasticGivens(task.specification)}`,
  sources: [], method: { kind: 'math_row_stochastic', specification: task.specification },
  hints: ['Check every entry, each row sum, and the initial vector sum before calculating. If they conflict with the declaration, confirm the source instead of adjusting values.',
    'For destination j, compute p_1 P_1j + p_2 P_2j and include all remaining states. Row vectors multiply P on the left.'],
  example: { prompt: 'Different example: state order A, B; P has rows (2/3, 1/3) and (1/3, 2/3), with initial row vector (1/2, 1/2).',
    steps: ['Every given is between 0 and 1. Both rows and the initial vector sum to 1.',
      'For A, combine (1/2)(2/3) + (1/2)(1/3) = 1/2; for B, combine (1/2)(1/3) + (1/2)(2/3) = 1/2.',
      'The output (1/2, 1/2) remains a probability distribution. This exact step does not establish the model from empirical evidence.'] },
  review: 'pending', revision: 1,
}));
