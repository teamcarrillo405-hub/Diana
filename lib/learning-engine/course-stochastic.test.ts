import { describe, expect, it } from 'vitest';
import { loadCourseCatalog } from './course-catalog';
import { courseContentHash } from './course-framework';
import { presentCourseActivity, validateCourseActivities } from './course-activities';
import { runCourseTutor } from './course-tutor';
import { startCourseSession, runCourseSession } from './course-session';
import { buildCoursePaths } from './course-sequence';
import { courseFeedbackSchema } from './course-feedback';
import { stochasticActivities, stochasticCourses } from './course-stochastic';
import { describeStochasticGivens, validateStochasticGivens } from './stochastic-matrix';
const attempt = { mode: 'check' as const, response: '5/8,3/8', confirmed: true, priorSupport: 0 };
async function selected() { return (await loadCourseCatalog()).activities.find(a => a.id === stochasticActivities[0].id)!; }

describe('row-stochastic course integration', () => {
  it('connects three pending activities to a college course and actual navigation', async () => {
    const catalog = await loadCourseCatalog(), activities = catalog.activities.filter(a => a.courseId === stochasticCourses[0].id);
    expect(activities).toHaveLength(3);
    for (const activity of activities) {
      expect(activity).toMatchObject({ review: 'pending', level: 'college_advanced', method: { kind: 'math_row_stochastic' } });
      if (activity.method.kind !== 'math_row_stochastic') throw Error('method');
      expect(validateStochasticGivens(activity.method.specification).ok).toBe(true);
      expect(activity.prompt).toContain(describeStochasticGivens(activity.method.specification));
    }
    const paths = buildCoursePaths(catalog.framework, catalog.activities);
    expect(paths.find(p => p.activityId === activities[0].id)?.nextId).toBe(activities[1].id);
  });
  it('exposes declared givens and a review rubric, never a computed answer field', async () => {
    const activity = await selected(), presented = presentCourseActivity(activity);
    expect(presented).toMatchObject({ transitionGivens: { convention: 'row_vector_p_times_P' }, rubric: { automaticScoring: false, review: 'pending' } });
    for (const key of ['expected', 'answer', 'example', 'hints', 'specification']) expect(presented).not.toHaveProperty(key);
  });
  it('checks all authored results without claiming understanding or knowledge eligibility', async () => {
    const catalog = await loadCourseCatalog();
    // Independently computed exact dot products for original curriculum tasks, not evaluation labels.
    const responses = ['5/8,3/8', '13/30,17/30', '9/40,131/300,203/600'];
    for (let i = 0; i < 3; i++) {
      const activity = catalog.activities.find(a => a.id === stochasticActivities[i].id)!;
      const feedback = await runCourseTutor(activity, { ...attempt, response: responses[i] });
      expect(courseFeedbackSchema.parse(feedback)).toMatchObject({ status: 'checked', outcome: 'matches', providerCalled: false, eligibleForKnowledge: false });
    }
  });
  it.each(['check','hint','example'] as const)('blocks conflicting supplied rows before %s', async mode => {
    const activity = await selected();
    if (activity.method.kind !== 'math_row_stochastic') throw Error('method');
    const conflict = { ...activity, method: { ...activity.method, specification: { ...activity.method.specification, matrix: [['1/4','1/4'],['0','1']] } } };
    const result = await runCourseTutor(conflict, { ...attempt, mode });
    expect(result).toMatchObject({ status: 'unsupported', outcome: 'unverified', assistance: 'unchanged', eligibleForKnowledge: false });
    expect(result.guidance).toContain('Row 1'); expect(result.nextQuestion).toContain('source'); expect(result.steps).toEqual([]);
  });
  it('preserves save and transcription confirmation without grading them', async () => {
    const activity = await selected();
    expect(await runCourseTutor(activity, { ...attempt, mode: 'save' })).toMatchObject({ status: 'saved', outcome: 'unverified' });
    expect(await runCourseTutor(activity, { ...attempt, confirmed: false })).toMatchObject({ status: 'needs_confirmation', outcome: 'unverified' });
    expect(await runCourseTutor(activity, { ...attempt, mode: 'hint' })).toMatchObject({ status: 'help', assistance: 'hinted', outcome: 'unverified' });
  });
  it('runs through the same versioned session path used by the course route', async () => {
    const activity = await selected(), id = '10000000-0000-4000-8000-000000000001', classId = '10000000-0000-4000-8000-000000000002';
    const state = await startCourseSession(id, classId, activity.id);
    const response = { mode: 'check' as const, response: attempt.response, confirmed: true, modality: 'typed' as const, expectedRevision: state.revision };
    const result = await runCourseSession(state, response);
    expect(result.feedback.outcome).toBe('matches');
    expect(result.state.observations.find(o => o.id === 'response')?.text).toBe(attempt.response);
    await expect(runCourseSession({ ...state, exerciseVersionId: '0'.repeat(64) }, response)).rejects.toThrow();
  });
  it('binds any changed matrix to a different activity version', async () => {
    const catalog = await loadCourseCatalog(), original = stochasticActivities[0];
    if (original.method.kind !== 'math_row_stochastic') throw Error('method');
    const changed = { ...original, method: { ...original.method, specification: { ...original.method.specification, initial: ['0','1'] } } };
    const [versioned] = await validateCourseActivities(catalog.framework, [changed]);
    expect(versioned.versionId).not.toBe((await selected()).versionId);
    expect(await courseContentHash(original)).not.toBe(await courseContentHash(changed));
  });
});
