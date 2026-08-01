import {
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FilePlus2,
  RefreshCw,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";

import {
  addAssessmentChoiceItem,
  addAssessmentOpenItem,
  addObjectivePrerequisite,
  alignAssessmentItemObjective,
  alignLessonObjective,
  alignObjectiveStandard,
  approveAndPublishCourseContent,
  approveCourseGradingRule,
  approveCourseModeObjective,
  confirmAssessmentGrade,
  confirmCourseFinalGrade,
  createAssessmentBlueprint,
  createCourseContentRevision,
  createCourseModeAssignment,
  createCourseModeLesson,
  createCourseModeLessonResource,
  createCourseModeObjective,
  createCourseObjectiveRevision,
  createCourseModeUnit,
  createCourseGradingRule,
  createSafetyProtocol,
  distributeCourseModeAssignment,
  enrollCourseModeStudent,
  linkCourseModeLms,
  previewCourseFinalGrade,
  recordTeacherItemScore,
  syncConfirmedAssessmentGrade,
} from "@/app/(app)/course-mode/actions";
import {
  buildCourseCoverageReport,
  type CoverageStage,
} from "@/lib/course-mode/coverage";
import { subjectPackForDomain } from "@/lib/course-mode/subject-packs";
import type { SubjectDomain } from "@/lib/assignment-profile";

type Row = Record<string, any>;

type TeacherCourseEditorProps = {
  course: Row;
  organizationId: string;
  units: Row[];
  lessons: Row[];
  resources: Row[];
  objectives: Row[];
  objectiveAlignments: Row[];
  prerequisiteEdges: Row[];
  lessonObjectives: Row[];
  assignments: Row[];
  assessments: Row[];
  items: Row[];
  itemObjectives: Row[];
  attempts: Row[];
  responses: Row[];
  protocols: Row[];
  connections: Row[];
  courseLink: Row | null;
  studentMemberships: Row[];
  enrollments: Row[];
  gradingRules: Row[];
  profileNames: Record<string, string>;
  gradePreview: {
    studentId: string;
    gradingPeriod: string;
    ready: boolean;
    calculatedPercent: number | null;
    scoredCount: number;
    ruleCount: number;
  } | null;
  standardItems: Row[];
};

type PublishKind =
  | "course"
  | "unit"
  | "lesson"
  | "course_assignment"
  | "assessment"
  | "safety_protocol";

const inputClass = "mt-1 min-h-11 w-full border border-slate-400 bg-white px-3 font-normal text-slate-950";
const textAreaClass = "mt-1 w-full border border-slate-400 bg-white p-3 font-normal text-slate-950";
const secondaryButton = "inline-flex min-h-10 items-center justify-center gap-2 bg-white px-3 text-sm font-black text-slate-950";
const primaryButton = "inline-flex min-h-10 items-center justify-center gap-2 bg-[#db2777] px-3 text-sm font-black text-white";

function PublishForm({ kind, id }: { kind: PublishKind; id: string }) {
  return (
    <form action={approveAndPublishCourseContent}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <button className={primaryButton} type="submit">
        <ShieldCheck size={16} aria-hidden="true" /> Approve and publish
      </button>
    </form>
  );
}

function RevisionForm({ kind, id }: { kind: PublishKind; id: string }) {
  return (
    <form action={createCourseContentRevision}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <button className={secondaryButton} type="submit">
        <RefreshCw size={16} aria-hidden="true" /> New draft version
      </button>
    </form>
  );
}

function responseText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (value === null || value === undefined) return "No response saved.";
  return JSON.stringify(value);
}

export function TeacherCourseEditor({
  course,
  organizationId,
  units,
  lessons,
  resources,
  objectives,
  objectiveAlignments,
  prerequisiteEdges,
  lessonObjectives,
  assignments,
  assessments,
  items,
  itemObjectives,
  attempts,
  responses,
  protocols,
  connections,
  courseLink,
  studentMemberships,
  enrollments,
  gradingRules,
  profileNames,
  gradePreview,
  standardItems,
}: TeacherCourseEditorProps) {
  const subjectPack = subjectPackForDomain(course.subject_domain as SubjectDomain);
  const coverage = buildCourseCoverageReport(objectives.map((objective) => ({
    objectiveId: objective.id,
    title: objective.title,
    standardItemIds: objectiveAlignments
      .filter((alignment) => alignment.objective_id === objective.id)
      .map((alignment) => alignment.standard_item_id),
    lessonStages: lessonObjectives
      .filter((alignment) => alignment.objective_id === objective.id)
      .map((alignment) => alignment.alignment_type as CoverageStage),
    assessmentItemCount: itemObjectives.filter((alignment) => alignment.objective_id === objective.id).length,
  })));
  const enrolledMembershipIds = new Set(enrollments.map((enrollment) => enrollment.membership_id));
  const availableStudents = studentMemberships.filter((membership) => !enrolledMembershipIds.has(membership.id));
  const enrolledStudents = studentMemberships.filter((membership) => enrolledMembershipIds.has(membership.id));

  return (
    <article className="border-t border-white/25 pt-7">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="m-0 text-xs font-black uppercase text-cyan-300">
            {String(course.subject_domain).replaceAll("_", " ")} | {course.grade_band}
          </p>
          <h2 className="mb-0 mt-2 text-3xl font-black">{course.title}</h2>
          <p className="mb-0 mt-1 text-sm text-slate-300">
            Version {course.version} | {course.status}
          </p>
          <p className="mb-0 mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            {subjectPack.methodology[0]}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {course.status === "draft"
            ? <PublishForm kind="course" id={course.id} />
            : <RevisionForm kind="course" id={course.id} />}
        </div>
      </header>

      <div className="mt-6 grid gap-4">
        <details className="course-mode-light rounded-md border border-dashed border-white/35 bg-[#f4efe6] text-slate-950" open>
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 py-3 font-black">
            <ClipboardCheck aria-hidden="true" /> Standards coverage
          </summary>
          <div className="border-t border-slate-300 px-5 py-5">
            <div className="grid gap-3 sm:grid-cols-5">
              {[
                ["Objectives", coverage.objectiveCount],
                ["Aligned", coverage.alignedObjectiveCount],
                ["Taught", coverage.taughtObjectiveCount],
                ["Practiced", coverage.practicedObjectiveCount],
                ["Assessed", coverage.assessedObjectiveCount],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <strong className="block text-2xl">{value}</strong>
                  <span className="text-sm text-slate-600">{label}</span>
                </div>
              ))}
            </div>
            <p className="mb-0 mt-4 text-sm font-bold text-slate-700">
              {coverage.coveragePercent}% of objectives have a standard, instruction, practice, and assessment evidence.
            </p>
            <form action={createCourseModeObjective} className="mt-5 grid gap-3 md:grid-cols-[1fr_1.5fr_auto]">
              <input type="hidden" name="courseId" value={course.id} />
              <label className="text-sm font-bold">Objective title
                <input name="title" required className={inputClass} />
              </label>
              <label className="text-sm font-bold">Student outcome
                <input name="description" className={inputClass} />
              </label>
              <button className={`${secondaryButton} self-end`} type="submit">Add objective</button>
            </form>
            <div className="mt-5 grid gap-3">
              {objectives.map((objective) => {
                const result = coverage.objectives.find((item) => item.objectiveId === objective.id);
                return (
                  <div key={objective.id} className="border-t border-slate-300 pt-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <strong>{objective.title}</strong>
                        {objective.description ? <p className="mb-0 mt-1 text-sm text-slate-600">{objective.description}</p> : null}
                        <p className="mb-0 mt-1 text-xs font-bold uppercase text-slate-500">
                          {objective.status} | {result?.gaps.length ? `Needs ${result.gaps.join(", ")}` : "Complete coverage"}
                        </p>
                      </div>
                      {objective.status === "draft" ? (
                        <form action={approveCourseModeObjective}>
                          <input type="hidden" name="objectiveId" value={objective.id} />
                          <button className={primaryButton} type="submit">Approve objective</button>
                        </form>
                      ) : (
                        <form action={createCourseObjectiveRevision}>
                          <input type="hidden" name="objectiveId" value={objective.id} />
                          <button className={secondaryButton} type="submit">
                            <RefreshCw size={16} aria-hidden="true" /> New objective version
                          </button>
                        </form>
                      )}
                    </div>
                    {standardItems.length > 0 ? (
                      <form action={alignObjectiveStandard} className="mt-3 grid gap-2 sm:grid-cols-[1fr_170px_auto]">
                        <input type="hidden" name="objectiveId" value={objective.id} />
                        <select name="standardItemId" className={inputClass} aria-label={`Standard for ${objective.title}`}>
                          {standardItems.map((standard) => (
                            <option key={standard.id} value={standard.id}>
                              {standard.human_coding_scheme || standard.case_identifier}
                            </option>
                          ))}
                        </select>
                        <select name="alignmentType" className={inputClass} aria-label={`Standard alignment type for ${objective.title}`}>
                          <option value="teaches">Teaches</option>
                          <option value="practices">Practices</option>
                          <option value="assesses">Assesses</option>
                          <option value="introduces">Introduces</option>
                        </select>
                        <button className={`${secondaryButton} self-end`} type="submit">Align standard</button>
                      </form>
                    ) : (
                      <p className="mb-0 mt-2 text-sm text-slate-600">
                        Select an approved CASE standards framework for this course to align this objective.
                      </p>
                    )}
                    {objectives.filter((candidate) => candidate.id !== objective.id && candidate.status === "approved").length > 0 ? (
                      <form action={addObjectivePrerequisite} className="mt-3 grid gap-2 sm:grid-cols-[1fr_170px_auto]">
                        <input type="hidden" name="objectiveId" value={objective.id} />
                        <select name="prerequisiteObjectiveId" className={inputClass} aria-label={`Prerequisite for ${objective.title}`}>
                          {objectives.filter((candidate) => candidate.id !== objective.id && candidate.status === "approved").map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>{candidate.title}</option>
                          ))}
                        </select>
                        <label className="text-sm font-bold">Minimum mastery
                          <input name="minimumMastery" type="number" min="0" max="1" step="0.05" defaultValue="0.7" className={inputClass} />
                        </label>
                        <button className={`${secondaryButton} self-end`} type="submit">Add prerequisite</button>
                      </form>
                    ) : null}
                    {prerequisiteEdges.filter((edge) => edge.objective_id === objective.id).length > 0 ? (
                      <p className="mb-0 mt-2 text-xs font-bold text-slate-600">
                        Prerequisites: {prerequisiteEdges.filter((edge) => edge.objective_id === objective.id).map((edge) => {
                          const prerequisite = objectives.find((candidate) => candidate.id === edge.prerequisite_objective_id);
                          return `${prerequisite?.title ?? "Objective"} at ${Math.round(Number(edge.minimum_mastery) * 100)}%`;
                        }).join(", ")}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </details>

        <details className="course-mode-light rounded-md border border-dashed border-white/35 bg-[#f4efe6] text-slate-950" open>
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 py-3 font-black">
            <BookOpen aria-hidden="true" /> Units, lessons, and resources
          </summary>
          <div className="border-t border-slate-300 px-5 py-5">
            <form action={createCourseModeUnit} className="grid gap-3 md:grid-cols-[1fr_1.5fr_auto]">
              <input type="hidden" name="courseId" value={course.id} />
              <label className="text-sm font-bold">Unit title<input name="title" required className={inputClass} /></label>
              <label className="text-sm font-bold">Unit summary<input name="summary" className={inputClass} /></label>
              <button className={`${secondaryButton} self-end`} type="submit">Add unit draft</button>
            </form>
            <div className="mt-6 grid gap-7">
              {units.map((unit) => {
                const unitLessons = lessons.filter((lesson) => lesson.unit_id === unit.id);
                return (
                  <section key={unit.id} className="border-t border-slate-300 pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="m-0 text-xl font-black">{unit.title}</h3>
                      {unit.status === "draft"
                        ? <PublishForm kind="unit" id={unit.id} />
                        : <RevisionForm kind="unit" id={unit.id} />}
                    </div>
                    <form action={createCourseModeLesson} className="mt-4 grid gap-3 md:grid-cols-2">
                      <input type="hidden" name="unitId" value={unit.id} />
                      <label className="text-sm font-bold">Lesson title<input name="title" required className={inputClass} /></label>
                      <label className="text-sm font-bold">Estimated minutes<input name="estimatedMinutes" type="number" min="1" max="600" className={inputClass} /></label>
                      <label className="text-sm font-bold md:col-span-2">Lesson text<textarea name="summary" rows={3} className={textAreaClass} /></label>
                      <button className={`${secondaryButton} md:col-span-2`} type="submit">Add lesson draft</button>
                    </form>
                    <div className="mt-5 grid gap-5">
                      {unitLessons.map((lesson) => (
                        <div key={lesson.id} className="border-t border-slate-300 pt-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <strong>{lesson.title}</strong>
                              <span className="ml-2 text-xs font-bold uppercase text-slate-500">{lesson.status}</span>
                            </div>
                            {lesson.status === "draft"
                              ? <PublishForm kind="lesson" id={lesson.id} />
                              : <RevisionForm kind="lesson" id={lesson.id} />}
                          </div>
                          {lesson.status === "draft" ? (
                            <>
                              <form action={createCourseModeLessonResource} className="mt-3 grid gap-2 md:grid-cols-2">
                                <input type="hidden" name="lessonId" value={lesson.id} />
                                <label className="text-sm font-bold">Resource title<input name="title" required className={inputClass} /></label>
                                <label className="text-sm font-bold">Type
                                  <select name="resourceType" className={inputClass}>
                                    <option value="text">Teacher text</option>
                                    <option value="link">Link</option>
                                    <option value="video">Video</option>
                                    <option value="audio">Audio</option>
                                    <option value="interactive">Interactive</option>
                                    <option value="file">File link</option>
                                  </select>
                                </label>
                                <label className="text-sm font-bold">Source URL<input name="sourceUri" type="url" className={inputClass} /></label>
                                <label className="text-sm font-bold">Teacher content<textarea name="contentText" rows={2} className={textAreaClass} /></label>
                                <button className={`${secondaryButton} md:col-span-2`} type="submit">
                                  <FilePlus2 size={16} aria-hidden="true" /> Add resource
                                </button>
                              </form>
                              {objectives.length > 0 ? (
                                <form action={alignLessonObjective} className="mt-3 grid gap-2 sm:grid-cols-[1fr_170px_auto]">
                                  <input type="hidden" name="lessonId" value={lesson.id} />
                                  <select name="objectiveId" className={inputClass} aria-label={`Objective for ${lesson.title}`}>
                                    {objectives.filter((objective) => objective.status === "approved").map((objective) => (
                                      <option key={objective.id} value={objective.id}>{objective.title}</option>
                                    ))}
                                  </select>
                                  <select name="alignmentType" className={inputClass} aria-label={`Objective stage for ${lesson.title}`}>
                                    <option value="introduces">Introduces</option>
                                    <option value="teaches">Teaches</option>
                                    <option value="practices">Practices</option>
                                    <option value="assesses">Assesses</option>
                                  </select>
                                  <button className={`${secondaryButton} self-end`} type="submit">Align objective</button>
                                </form>
                              ) : null}
                            </>
                          ) : null}
                          <ul className="mb-0 mt-3 grid gap-1 pl-5 text-sm text-slate-600">
                            {resources.filter((resource) => resource.lesson_id === lesson.id).map((resource) => (
                              <li key={resource.id}>{resource.title} ({resource.resource_type})</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </details>

        <details className="course-mode-light rounded-md border border-dashed border-white/35 bg-[#f4efe6] text-slate-950">
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 py-3 font-black">
            <FilePlus2 aria-hidden="true" /> Assignments
          </summary>
          <div className="border-t border-slate-300 px-5 py-5">
            <form action={createCourseModeAssignment} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="courseId" value={course.id} />
              <label className="text-sm font-bold">Lesson
                <select name="lessonId" className={inputClass}>
                  <option value="">No lesson link</option>
                  {lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}
                </select>
              </label>
              <label className="text-sm font-bold">Assignment title<input name="title" required className={inputClass} /></label>
              <label className="text-sm font-bold md:col-span-2">Teacher instructions<textarea name="instructions" required rows={4} className={textAreaClass} /></label>
              <label className="text-sm font-bold md:col-span-2">Rubric criteria<textarea name="rubricText" rows={3} className={textAreaClass} /></label>
              <label className="text-sm font-bold">Due date<input name="dueAt" type="datetime-local" className={inputClass} /></label>
              <label className="text-sm font-bold">Estimated minutes<input name="estimatedMinutes" type="number" min="1" max="1200" className={inputClass} /></label>
              <button className={`${secondaryButton} md:col-span-2`} type="submit">Create assignment draft</button>
            </form>
            <div className="mt-5 grid gap-3">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-300 pt-3">
                  <div>
                    <strong>{assignment.title}</strong>
                    <span className="ml-2 text-xs font-bold uppercase text-slate-500">{assignment.status}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {assignment.status === "draft" ? <PublishForm kind="course_assignment" id={assignment.id} /> : (
                      <>
                        <form action={distributeCourseModeAssignment}>
                          <input type="hidden" name="assignmentId" value={assignment.id} />
                          <button type="submit" className={primaryButton}><Send size={16} aria-hidden="true" /> Send to students</button>
                        </form>
                        <RevisionForm kind="course_assignment" id={assignment.id} />
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </details>

        <details className="course-mode-light rounded-md border border-dashed border-white/35 bg-[#f4efe6] text-slate-950">
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 py-3 font-black">
            <ClipboardCheck aria-hidden="true" /> Assessments and grading
          </summary>
          <div className="border-t border-slate-300 px-5 py-5">
            <form action={createAssessmentBlueprint} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="courseId" value={course.id} />
              <label className="text-sm font-bold">Assessment title<input name="title" required className={inputClass} /></label>
              <label className="text-sm font-bold">Purpose
                <select name="purpose" className={inputClass}><option value="formative">Formative</option><option value="summative">Summative</option></select>
              </label>
              <label className="text-sm font-bold">Maximum attempts<input name="maxAttempts" type="number" min="1" max="20" defaultValue="1" className={inputClass} /></label>
              <label className="text-sm font-bold">LMS assignment ID<input name="externalAssignmentId" className={inputClass} /></label>
              <label className="text-sm font-bold md:col-span-2">Instructions<textarea name="instructions" rows={2} className={textAreaClass} /></label>
              <button className={`${secondaryButton} md:col-span-2`} type="submit">Create assessment draft</button>
            </form>
            <div className="mt-6 grid gap-7">
              {assessments.map((assessment) => {
                const assessmentItems = items.filter((item) => item.blueprint_id === assessment.id);
                const assessmentAttempts = attempts.filter((attempt) => attempt.blueprint_id === assessment.id);
                return (
                  <section key={assessment.id} className="border-t border-slate-300 pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="m-0 text-xl font-black">{assessment.title}</h3>
                        <p className="mb-0 mt-1 text-xs font-bold uppercase text-slate-500">{assessment.status} | {assessmentItems.length} items</p>
                      </div>
                      {assessment.status === "draft"
                        ? <PublishForm kind="assessment" id={assessment.id} />
                        : <RevisionForm kind="assessment" id={assessment.id} />}
                    </div>
                    {assessment.status === "draft" ? (
                      <>
                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <form action={addAssessmentChoiceItem} className="grid gap-2 border-t border-slate-300 pt-3">
                          <strong>Choice item</strong>
                          <input type="hidden" name="blueprintId" value={assessment.id} />
                          <label className="text-sm font-bold">Item ID
                            <input name="identifier" required className={inputClass} />
                          </label>
                          <label className="text-sm font-bold">Item title
                            <input name="title" required className={inputClass} />
                          </label>
                          <label className="text-sm font-bold">Question prompt
                            <textarea name="prompt" required rows={2} className={textAreaClass} />
                          </label>
                          <label className="text-sm font-bold">Choice A
                            <input name="choiceA" required className={inputClass} />
                          </label>
                          <label className="text-sm font-bold">Choice B
                            <input name="choiceB" required className={inputClass} />
                          </label>
                          <label className="text-sm font-bold">Approved answer
                            <select name="correct" className={inputClass}><option value="A">A is correct</option><option value="B">B is correct</option></select>
                          </label>
                          <label className="text-sm font-bold">Points
                            <input name="points" type="number" min="0.1" step="0.1" required className={inputClass} />
                          </label>
                          <button className={secondaryButton} type="submit">Add choice item</button>
                        </form>
                        <form action={addAssessmentOpenItem} className="grid gap-2 border-t border-slate-300 pt-3">
                          <strong>Open or numeric item</strong>
                          <input type="hidden" name="blueprintId" value={assessment.id} />
                          <label className="text-sm font-bold">Item ID
                            <input name="identifier" required className={inputClass} />
                          </label>
                          <label className="text-sm font-bold">Item title
                            <input name="title" required className={inputClass} />
                          </label>
                          <label className="text-sm font-bold">Question prompt
                            <textarea name="prompt" required rows={2} className={textAreaClass} />
                          </label>
                          <label className="text-sm font-bold">Response type
                            <select name="interactionType" className={inputClass}>
                              <option value="extended_text">Teacher-scored response</option>
                              <option value="text_entry">Exact text response</option>
                              <option value="numeric_entry">Numeric response</option>
                            </select>
                          </label>
                          <label className="text-sm font-bold">Approved answer for deterministic items
                            <input name="correctResponse" className={inputClass} />
                          </label>
                          <label className="text-sm font-bold">Numeric tolerance
                            <input name="numericTolerance" type="number" min="0" step="any" className={inputClass} />
                          </label>
                          <label className="text-sm font-bold">Points
                            <input name="points" type="number" min="0.1" step="0.1" required className={inputClass} />
                          </label>
                          <button className={secondaryButton} type="submit">Add open item</button>
                        </form>
                      </div>
                      <div className="mt-4 grid gap-3">
                        {assessmentItems.map((item) => (
                          <form key={item.id} action={alignAssessmentItemObjective} className="grid gap-2 border-t border-slate-300 pt-3 sm:grid-cols-[1fr_1fr_120px_auto]">
                            <input type="hidden" name="itemId" value={item.id} />
                            <span className="self-center text-sm font-bold">{item.title}</span>
                            <select name="objectiveId" className={inputClass} aria-label={`Objective measured by ${item.title}`}>
                              {objectives.filter((objective) => objective.status === "approved").map((objective) => (
                                <option key={objective.id} value={objective.id}>{objective.title}</option>
                              ))}
                            </select>
                            <label className="text-sm font-bold">Weight
                              <input name="evidenceWeight" type="number" min="0.1" max="100" step="0.1" defaultValue="1" className={inputClass} />
                            </label>
                            <button className={`${secondaryButton} self-end`} type="submit">Align item</button>
                          </form>
                        ))}
                      </div>
                      </>
                    ) : null}
                    {assessment.status === "published" ? (
                      <form action={createCourseGradingRule} className="mt-4 grid gap-2 border-t border-slate-300 pt-3 sm:grid-cols-[1fr_140px_auto]">
                        <input type="hidden" name="courseId" value={course.id} />
                        <input type="hidden" name="assessmentId" value={assessment.id} />
                        <label className="text-sm font-bold">Grading period
                          <input name="gradingPeriod" required placeholder="Semester 1" className={inputClass} />
                        </label>
                        <label className="text-sm font-bold">Weight
                          <input name="weight" required type="number" min="0.1" step="0.1" placeholder="25" className={inputClass} />
                        </label>
                        <button className={`${secondaryButton} self-end`} type="submit">Add grade rule</button>
                      </form>
                    ) : null}
                    {gradingRules.filter((rule) => rule.assessment_blueprint_id === assessment.id).map((rule) => (
                      <div key={rule.id} className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-300 pt-3">
                        <span className="text-sm font-bold">{rule.grading_period}: weight {rule.weight} | {rule.status}</span>
                        {rule.status === "draft" ? (
                          <form action={approveCourseGradingRule}>
                            <input type="hidden" name="ruleId" value={rule.id} />
                            <button className={primaryButton} type="submit">Approve grade rule</button>
                          </form>
                        ) : null}
                      </div>
                    ))}
                    <div className="mt-4 grid gap-5">
                      {assessmentAttempts.map((attempt) => {
                        const attemptResponses = responses.filter((response) => response.attempt_id === attempt.id);
                        const studentName = profileNames[attempt.student_id] || "Enrolled student";
                        return (
                          <div key={attempt.id} className="border-t border-slate-300 pt-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <strong>{studentName} | Attempt {attempt.attempt_number}</strong>
                              <span className="text-xs font-black uppercase text-slate-500">{attempt.status}</span>
                            </div>
                            {attemptResponses.map((response) => {
                              const item = assessmentItems.find((candidate) => candidate.id === response.item_id);
                              if (!item) return null;
                              const needsTeacherScore = response.auto_score === null;
                              return (
                                <div key={response.id} className="mt-3 border-t border-slate-300 pt-3">
                                  <p className="m-0 text-sm font-black">{item.title} | {item.points_possible} points</p>
                                  <p className="mb-0 mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{responseText(response.student_response)}</p>
                                  {needsTeacherScore && attempt.status !== "confirmed" ? (
                                    <form action={recordTeacherItemScore} className="mt-3 grid gap-2 sm:grid-cols-[120px_1fr_auto]">
                                      <input type="hidden" name="attemptId" value={attempt.id} />
                                      <input type="hidden" name="itemId" value={item.id} />
                                      <label className="text-sm font-bold">Score
                                        <input name="score" required type="number" min="0" max={item.points_possible} step="0.1" defaultValue={response.teacher_score ?? ""} className={inputClass} />
                                      </label>
                                      <label className="text-sm font-bold">Feedback
                                        <input name="feedback" defaultValue={response.teacher_feedback ?? ""} className={inputClass} />
                                      </label>
                                      <button className={`${secondaryButton} self-end`} type="submit">Record score</button>
                                    </form>
                                  ) : null}
                                </div>
                              );
                            })}
                            {attempt.status === "submitted" || attempt.status === "scored" ? (
                              <form action={confirmAssessmentGrade} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                                <input type="hidden" name="attemptId" value={attempt.id} />
                                <label className="text-sm font-bold">Confirmation note
                                  <input name="reason" required defaultValue="Teacher reviewed and confirmed the assessment evidence." className={inputClass} />
                                </label>
                                <button className={`${primaryButton} self-end`} type="submit">
                                  <CheckCircle2 size={16} aria-hidden="true" /> Confirm grade
                                </button>
                              </form>
                            ) : null}
                            {attempt.status === "confirmed" ? (
                              <form action={syncConfirmedAssessmentGrade} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                                <input type="hidden" name="attemptId" value={attempt.id} />
                                <label className="text-sm font-bold">LMS student ID
                                  <input name="externalStudentId" required className={inputClass} />
                                </label>
                                <button className={`${primaryButton} self-end`} type="submit">
                                  Sync {attempt.final_score}/{attempt.points_possible}
                                </button>
                              </form>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </details>

        <details className="course-mode-light rounded-md border border-dashed border-white/35 bg-[#f4efe6] text-slate-950">
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 py-3 font-black">
            <ShieldCheck aria-hidden="true" /> Practical safety
          </summary>
          <div className="border-t border-slate-300 px-5 py-5">
            <p className="m-0 max-w-3xl text-sm leading-6 text-slate-700">
              Practical procedures must come from a teacher, district, manufacturer, or government source. Missing protective equipment or emergency steps blocks publication.
            </p>
            <form action={createSafetyProtocol} className="mt-4 grid gap-3 md:grid-cols-2">
              <input type="hidden" name="courseId" value={course.id} />
              <input type="hidden" name="organizationId" value={organizationId} />
              <label className="text-sm font-bold">Protocol title<input name="title" required className={inputClass} /></label>
              <label className="text-sm font-bold">Safety class
                <select name="safetyClass" className={inputClass}>
                  <option value="physical_activity">Physical activity</option>
                  <option value="workshop_hazard">Workshop hazard</option>
                  <option value="lab_hazard">Lab hazard</option>
                </select>
              </label>
              <label className="text-sm font-bold">Approved source type
                <select name="sourceKind" className={inputClass}>
                  <option value="teacher">Teacher</option>
                  <option value="district">District</option>
                  <option value="manufacturer">Manufacturer</option>
                  <option value="government">Government</option>
                </select>
              </label>
              <label className="text-sm font-bold">Source URL<input name="sourceUri" required type="url" className={inputClass} /></label>
              <label className="text-sm font-bold">Procedure steps, one per line<textarea name="procedureSteps" required rows={4} className={textAreaClass} /></label>
              <label className="text-sm font-bold">Protective equipment, one per line<textarea name="requiredPpe" rows={4} className={textAreaClass} /></label>
              <label className="text-sm font-bold">Emergency steps, one per line<textarea name="emergencySteps" required rows={4} className={textAreaClass} /></label>
              <label className="text-sm font-bold">Disposal steps, one per line<textarea name="disposalSteps" rows={4} className={textAreaClass} /></label>
              <label className="text-sm font-bold">Minimum age<input name="minimumAge" type="number" min="5" max="21" className={inputClass} /></label>
              <button className={`${secondaryButton} self-end`} type="submit">Create safety draft</button>
            </form>
            <div className="mt-5 grid gap-3">
              {protocols.map((protocol) => (
                <div key={protocol.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-300 pt-3">
                  <div><strong>{protocol.title}</strong><span className="ml-2 text-xs font-bold uppercase text-slate-500">{protocol.status}</span></div>
                  {protocol.status === "draft"
                    ? <PublishForm kind="safety_protocol" id={protocol.id} />
                    : <RevisionForm kind="safety_protocol" id={protocol.id} />}
                </div>
              ))}
            </div>
          </div>
        </details>

        <details className="course-mode-light rounded-md border border-dashed border-white/35 bg-[#f4efe6] text-slate-950">
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 py-3 font-black">
            <Users aria-hidden="true" /> Enrollment, final grades, and LMS
          </summary>
          <div className="border-t border-slate-300 px-5 py-5">
            {availableStudents.length > 0 ? (
              <form action={enrollCourseModeStudent} className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <input type="hidden" name="courseId" value={course.id} />
                <label className="text-sm font-bold">Verified student
                  <select name="membershipId" className={inputClass}>
                    {availableStudents.map((membership) => (
                      <option key={membership.id} value={membership.id}>
                        {profileNames[membership.user_id] || membership.user_id}
                      </option>
                    ))}
                  </select>
                </label>
                <button className={`${secondaryButton} self-end`} type="submit">Enroll student</button>
              </form>
            ) : <p className="m-0 text-sm text-slate-600">No additional verified student memberships are available.</p>}

            <div className="mt-5 grid gap-4">
              {enrolledStudents.map((membership) => {
                const preview = gradePreview?.studentId === membership.user_id ? gradePreview : null;
                return (
                  <div key={membership.id} className="border-t border-slate-300 pt-3">
                    <form action={previewCourseFinalGrade} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                      <input type="hidden" name="courseId" value={course.id} />
                      <input type="hidden" name="studentId" value={membership.user_id} />
                      <label className="text-sm font-bold">Student
                        <span className="mt-1 flex min-h-11 items-center">{profileNames[membership.user_id] || membership.user_id}</span>
                      </label>
                      <label className="text-sm font-bold">Grading period
                        <input name="gradingPeriod" required defaultValue={preview?.gradingPeriod ?? ""} placeholder="Semester 1" className={inputClass} />
                      </label>
                      <button className={`${secondaryButton} self-end`} type="submit">Calculate grade</button>
                    </form>
                    {preview ? (
                      preview.ready && preview.calculatedPercent !== null ? (
                        <form action={confirmCourseFinalGrade} className="mt-3 grid gap-2 border-t border-slate-300 pt-3 md:grid-cols-4">
                          <input type="hidden" name="courseId" value={course.id} />
                          <input type="hidden" name="studentId" value={membership.user_id} />
                          <input type="hidden" name="gradingPeriod" value={preview.gradingPeriod} />
                          <div>
                            <span className="text-sm font-bold">Calculated grade</span>
                            <strong className="mt-1 block text-2xl">{preview.calculatedPercent}%</strong>
                          </div>
                          <label className="text-sm font-bold">Teacher-confirmed final %<input name="finalPercent" required type="number" min="0" max="100" step="0.01" defaultValue={preview.calculatedPercent} className={inputClass} /></label>
                          <label className="text-sm font-bold">Letter grade<input name="letterGrade" className={inputClass} /></label>
                          <label className="text-sm font-bold">Confirmation reason<input name="reason" required defaultValue="Teacher reviewed the deterministic grade calculation and supporting evidence." className={inputClass} /></label>
                          <button className={`${primaryButton} md:col-span-4`} type="submit">Confirm final grade</button>
                        </form>
                      ) : (
                        <p className="mb-0 mt-3 border border-amber-500 bg-amber-50 p-3 text-sm font-bold text-amber-950" role="status">
                          {preview.scoredCount} of {preview.ruleCount} approved grade-rule assessments have confirmed scores. Confirm every required assessment before the course grade.
                        </p>
                      )
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="mt-7 border-t border-slate-300 pt-5">
              <h3 className="m-0 text-lg font-black">Teacher LMS connection</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href="/api/lms/google-oauth/start?course_mode=teacher" className={secondaryButton}>Connect Google Classroom</a>
                <form action="/api/lms/canvas-oauth/start" method="get" className="flex flex-wrap gap-2">
                  <input type="hidden" name="course_mode" value="teacher" />
                  <label className="sr-only" htmlFor={`canvas-url-${course.id}`}>Canvas base URL</label>
                  <input id={`canvas-url-${course.id}`} name="base_url" type="url" required placeholder="https://school.instructure.com" className="min-h-10 min-w-64 border border-slate-400 bg-white px-3 text-slate-950" />
                  <button className={secondaryButton} type="submit">Connect Canvas</button>
                </form>
              </div>
              {connections.length > 0 ? (
                <form action={linkCourseModeLms} className="mt-4 grid gap-2 md:grid-cols-3">
                  <input type="hidden" name="courseId" value={course.id} />
                  <label className="text-sm font-bold">Teacher connection
                    <select name="connectionId" className={inputClass}>
                      {connections.map((connection) => <option key={connection.id} value={connection.id}>{connection.provider}</option>)}
                    </select>
                  </label>
                  <label className="text-sm font-bold">Provider
                    <select name="provider" className={inputClass}><option value="canvas">Canvas</option><option value="google_classroom">Google Classroom</option></select>
                  </label>
                  <label className="text-sm font-bold">External course ID<input name="externalCourseId" required defaultValue={courseLink?.external_course_id ?? ""} className={inputClass} /></label>
                  <button type="submit" className={`${secondaryButton} md:col-span-3`}>Link course gradebook</button>
                </form>
              ) : <p className="mb-0 mt-3 text-sm text-slate-600">Connect a teacher LMS account before linking a gradebook.</p>}
            </div>
          </div>
        </details>
      </div>
    </article>
  );
}
