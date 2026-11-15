import { courseActivity } from "./course-catalog";
import { startActivitySession, runActivitySession, type ActivityResponse } from "./activity-session";
import type { ProblemState } from "./problem-state";
export async function startCourseSession(id: string, classId: string, exerciseId: string): Promise<ProblemState> {
    return startActivitySession(id, { classId, assignmentId: null, exerciseId }, await courseActivity(exerciseId));
}
export async function runCourseSession(previous: ProblemState, input: ActivityResponse) {
    const activity = await courseActivity(previous.scope.exerciseId);
    const expected = await startCourseSession(previous.id, previous.scope.classId, activity.id);
    return runActivitySession(previous, expected, activity, input);
}
