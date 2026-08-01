import { ChevronRight, GraduationCap, Plus } from "lucide-react";
import Link from "next/link";

import {
  createCourseModeCourse,
  importCaseStandardsFramework,
} from "@/app/(app)/course-mode/actions";
import { TeacherCourseEditor } from "@/components/course-mode/teacher-course-editor";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import { StudentDesktopNav } from "@/components/screen-design/student-desktop-nav";
import { SUBJECT_DOMAINS } from "@/lib/assignment-profile";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{
  status?: string;
  classroom?: string;
  canvas?: string;
  previewCourseId?: string;
  previewStudentId?: string;
  previewPeriod?: string;
  previewReady?: string;
  previewPercent?: string;
  previewScored?: string;
  previewRules?: string;
}>;
type Row = Record<string, any>;

const statusCopy: Record<string, string> = {
  "course-created": "Course draft created.",
  "course-title-in-use": "A course with this title already exists in the organization.",
  "unit-created": "Unit draft created.",
  "lesson-created": "Lesson draft created.",
  "resource-created": "Lesson resource added.",
  "objective-created": "Learning objective draft created.",
  "objective-approved": "Learning objective approved.",
  "objective-revision-created": "A new editable objective version was created.",
  "lesson-objective-aligned": "Lesson aligned to the learning objective.",
  "standard-aligned": "Learning objective aligned to the standard.",
  "assignment-created": "Assignment draft created.",
  "assessment-created": "Assessment draft created.",
  "item-created": "Assessment item added.",
  "item-objective-aligned": "Assessment item aligned to the learning objective.",
  "prerequisite-created": "Objective prerequisite added.",
  "standards-imported": "Approved CASE standards framework imported.",
  "safety-created": "Safety protocol draft created.",
  "student-enrolled": "Student enrolled.",
  "teacher-score-recorded": "Teacher score and feedback saved.",
  "grade-confirmed": "Assessment grade confirmed.",
  "grading-rule-created": "Grading rule draft created.",
  "grading-rule-approved": "Grading rule approved.",
  "final-grade-confirmed": "Course grade confirmed with an audit record.",
  "revision-created": "A new editable draft version was created.",
  published: "Approved content published.",
  "lms-linked": "Teacher LMS connection linked to the course.",
  "grade-synced": "Confirmed grade synced.",
  "grade-already-synced": "This confirmed grade is already synced.",
  connected: "Teacher LMS connection is ready.",
  "not-authorized": "Verified teacher access is required for that connection.",
};

function ids(rows: Row[] | null | undefined, key = "id"): string[] {
  return (rows ?? []).map((row) => row[key]).filter((value): value is string => typeof value === "string");
}

export default async function CourseModePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const store = supabase as any;
  const { data: memberships } = await store
    .from("organization_memberships")
    .select("organization_id, role, verification_status, school_organizations(id,name,organization_type)")
    .eq("user_id", user?.id ?? "")
    .eq("verification_status", "verified")
    .in("role", ["district_admin", "school_admin", "teacher"])
    .order("created_at", { ascending: true });
  const membership = memberships?.[0] ?? null;

  if (!membership) {
    const { data: studentMemberships } = await store
      .from("organization_memberships")
      .select("id")
      .eq("user_id", user?.id ?? "")
      .eq("role", "student")
      .eq("verification_status", "verified");
    const studentMembershipIds = ids(studentMemberships);
    const { data: studentEnrollments } = studentMembershipIds.length > 0
      ? await store
          .from("course_mode_enrollments")
          .select("course_id")
          .in("membership_id", studentMembershipIds)
          .eq("enrollment_role", "student")
          .eq("status", "active")
      : { data: [] };
    const enrolledCourseIds = ids(studentEnrollments, "course_id");
    const { data: enrolledCourses } = enrolledCourseIds.length > 0
      ? await store
          .from("course_mode_courses")
          .select("id, title, subject_domain, grade_band, course_level")
          .in("id", enrolledCourseIds)
          .eq("status", "published")
          .order("title")
      : { data: [] };

    if ((enrolledCourses ?? []).length > 0) {
      return (
        <div className="course-mode-shell min-h-dvh bg-[#081326] text-white">
          <StudentDesktopNav active="Classes" />
          <div className="mx-auto w-full max-w-[1040px] px-5 pb-28 pt-10 lg:px-8">
            <header className="border-b border-white/20 pb-7">
              <p className="m-0 text-xs font-black uppercase text-cyan-300">
                Your courses
              </p>
              <h1 className="mb-0 mt-2 text-4xl font-black">Course Mode</h1>
              <p className="mb-0 mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Open a teacher-published course to continue the next lesson,
                assignment, or assessment.
              </p>
            </header>
            <div className="mt-7 grid gap-4">
              {(enrolledCourses ?? []).map((course: Row) => (
                <Link
                  key={course.id}
                  href={`/course-mode/courses/${course.id}`}
                  className="course-mode-light flex min-h-24 items-center justify-between gap-5 rounded-md border border-dashed border-white/35 bg-[#f4efe6] p-5 text-slate-950"
                >
                  <span>
                    <span className="block text-xs font-black uppercase text-[#be185d]">
                      {String(course.subject_domain).replaceAll("_", " ")}
                      {" | "}
                      {course.grade_band}
                    </span>
                    <strong className="mt-2 block text-xl">{course.title}</strong>
                    {course.course_level ? (
                      <span className="mt-1 block text-sm text-slate-600">
                        {course.course_level}
                      </span>
                    ) : null}
                  </span>
                  <ChevronRight aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
          <StudentBottomNav />
        </div>
      );
    }

    return (
      <div className="course-mode-shell min-h-dvh bg-[#081326] text-white">
        <StudentDesktopNav active="Classes" />
        <div className="mx-auto grid min-h-[calc(100dvh-72px)] max-w-[1040px] place-items-center px-6 py-16">
          <section className="course-mode-light w-full rounded-md border border-dashed border-white/35 bg-[#f4efe6] p-8 text-slate-950">
            <GraduationCap size={36} aria-hidden="true" />
            <h1 className="mb-0 mt-4 text-3xl font-black">Course Mode access</h1>
            <p className="mb-0 mt-3 max-w-2xl text-base leading-7 text-slate-700">
              Course publication, enrollment, safety unlocks, assessments, and final grades require a verified school or district membership. Student sharing permissions do not grant teacher authority.
            </p>
          </section>
        </div>
        <StudentBottomNav />
      </div>
    );
  }

  const organization = Array.isArray(membership.school_organizations)
    ? membership.school_organizations[0]
    : membership.school_organizations;
  const organizationId = membership.organization_id as string;
  const [
    { data: courses },
    { data: allConnections },
    { data: frameworks },
    { data: studentMemberships },
  ] = await Promise.all([
    store.from("course_mode_courses").select("*").eq("organization_id", organizationId).order("created_at", { ascending: true }),
    store.from("lms_connections").select("id, provider, config").eq("owner_id", user?.id ?? "").in("provider", ["canvas", "google_classroom"]),
    store.from("standards_frameworks").select("id, title, version_label, status").eq("owner_id", user?.id ?? "").eq("status", "approved").order("title"),
    store.from("organization_memberships").select("id, user_id, role, verification_status").eq("organization_id", organizationId).eq("role", "student").eq("verification_status", "verified"),
  ]);
  const teacherConnections = (allConnections ?? []).filter(
    (connection: Row) => connection.config?.connection_mode === "teacher",
  );
  const courseIds = ids(courses);

  const [
    { data: units },
    { data: assignments },
    { data: assessments },
    { data: lmsLinks },
    { data: objectives },
    { data: protocols },
    { data: enrollments },
    { data: gradingRules },
  ] = courseIds.length > 0
    ? await Promise.all([
        store.from("course_mode_units").select("*").in("course_id", courseIds).order("position", { ascending: true }),
        store.from("course_mode_assignments").select("*").in("course_id", courseIds).order("created_at", { ascending: true }),
        store.from("assessment_blueprints").select("*").in("course_id", courseIds).order("created_at", { ascending: true }),
        store.from("course_mode_lms_links").select("*").in("course_id", courseIds),
        store.from("learning_objectives").select("*").in("course_mode_course_id", courseIds).order("created_at", { ascending: true }),
        store.from("safety_protocols").select("*").in("course_id", courseIds).order("created_at", { ascending: true }),
        store.from("course_mode_enrollments").select("*").in("course_id", courseIds).eq("enrollment_role", "student"),
        store.from("course_grading_rules").select("*").in("course_id", courseIds).order("created_at", { ascending: true }),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const unitIds = ids(units);
  const { data: lessons } = unitIds.length > 0
    ? await store.from("course_mode_lessons").select("*").in("unit_id", unitIds).order("position", { ascending: true })
    : { data: [] };
  const lessonIds = ids(lessons);
  const [{ data: resources }, { data: lessonObjectives }] = lessonIds.length > 0
    ? await Promise.all([
        store.from("course_mode_lesson_resources").select("*").in("lesson_id", lessonIds).order("position", { ascending: true }),
        store.from("course_mode_lesson_objectives").select("*").in("lesson_id", lessonIds),
      ])
    : [{ data: [] }, { data: [] }];

  const assessmentIds = ids(assessments);
  const [{ data: items }, { data: attempts }] = assessmentIds.length > 0
    ? await Promise.all([
        store.from("assessment_items").select("*").in("blueprint_id", assessmentIds).order("position", { ascending: true }),
        store.from("assessment_attempts").select("*").in("blueprint_id", assessmentIds).in("status", ["submitted", "scored", "confirmed"]).order("submitted_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }];
  const itemIds = ids(items);
  const attemptIds = ids(attempts);
  const [{ data: itemObjectives }, { data: responses }] = await Promise.all([
    itemIds.length > 0
      ? store.from("assessment_item_objectives").select("*").in("item_id", itemIds)
      : Promise.resolve({ data: [] }),
    attemptIds.length > 0
      ? store.from("assessment_responses").select("*").in("attempt_id", attemptIds)
      : Promise.resolve({ data: [] }),
  ]);

  const objectiveIds = ids(objectives);
  const [{ data: objectiveAlignments }, { data: prerequisiteEdges }] = objectiveIds.length > 0
    ? await Promise.all([
        store.from("objective_alignments").select("*").in("objective_id", objectiveIds),
        store.from("prerequisite_edges").select("*").in("objective_id", objectiveIds),
      ])
    : [{ data: [] }, { data: [] }];
  const frameworkIds = ids(courses, "standards_framework_id");
  const { data: standardItems } = frameworkIds.length > 0
    ? await store.from("standard_items").select("id, framework_id, case_identifier, human_coding_scheme, statement").in("framework_id", frameworkIds).order("human_coding_scheme")
    : { data: [] };

  const studentUserIds = ids(studentMemberships, "user_id");
  const { data: profiles } = studentUserIds.length > 0
    ? await store.from("profiles").select("user_id, display_name").in("user_id", studentUserIds)
    : { data: [] };
  const profileNames = Object.fromEntries(
    (profiles ?? []).map((profile: Row) => [profile.user_id, profile.display_name || "Enrolled student"]),
  ) as Record<string, string>;
  const notice = statusCopy[params.status ?? params.classroom ?? params.canvas ?? ""] ?? (
    params.status ? "Course Mode could not complete that action. Review the required fields and verified permissions." : ""
  );

  return (
    <div className="course-mode-shell min-h-dvh bg-[#081326] text-white">
      <StudentDesktopNav active="Classes" />
      <div className="mx-auto w-full max-w-[1080px] px-5 pb-24 pt-10 lg:px-8">
        <header className="border-b border-white/20 pb-7">
          <p className="m-0 text-xs font-black uppercase text-cyan-300">{organization?.name ?? "Verified organization"}</p>
          <h1 className="mb-0 mt-2 text-4xl font-black">Course Mode</h1>
          <p className="mb-0 mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Teacher-governed curriculum, approved assessments, safety controls, and confirmed grades.
          </p>
        </header>

        {notice ? <p className="mt-5 border border-amber-400 bg-amber-50 p-3 text-sm font-bold text-amber-950" role="status">{notice}</p> : null}

        <details className="course-mode-light mt-8 rounded-md border border-dashed border-white/35 bg-[#f4efe6] text-slate-950">
          <summary className="min-h-14 cursor-pointer list-none px-5 py-4 font-black">Import an approved CASE standards framework</summary>
          <form action={importCaseStandardsFramework} className="grid gap-3 border-t border-slate-300 px-5 py-5 md:grid-cols-2">
            <input type="hidden" name="organizationId" value={organizationId} />
            <label className="text-sm font-bold md:col-span-2">CASE package JSON
              <textarea name="packageJson" required rows={8} className="mt-1 w-full border border-slate-400 bg-white p-3 font-mono text-sm font-normal text-slate-950" />
            </label>
            <label className="text-sm font-bold">Standard-statement storage authorization
              <select name="statementStorageAuthorized" className="mt-1 min-h-11 w-full border border-slate-400 bg-white px-3 font-normal">
                <option value="no">Store identifiers and links only</option>
                <option value="yes">Authorized to store statement text</option>
              </select>
            </label>
            <label className="text-sm font-bold">License or terms URL
              <input name="licenseUri" type="url" className="mt-1 min-h-11 w-full border border-slate-400 bg-white px-3 font-normal" />
            </label>
            <button type="submit" className="min-h-11 bg-slate-950 px-4 font-black text-white md:col-span-2">Verify and import framework</button>
          </form>
        </details>

        <section className="course-mode-light mt-8 rounded-md border border-dashed border-white/35 bg-[#f4efe6] p-5 text-slate-950">
          <div className="flex items-center gap-3"><Plus aria-hidden="true" /><h2 className="m-0 text-xl font-black">New course</h2></div>
          <form action={createCourseModeCourse} className="mt-4 grid gap-3 md:grid-cols-2">
            <input type="hidden" name="organizationId" value={organizationId} />
            <label className="text-sm font-bold">Course title<input name="title" required className="mt-1 min-h-11 w-full border border-slate-400 bg-white px-3 font-normal" /></label>
            <label className="text-sm font-bold">Subject
              <select name="subjectDomain" className="mt-1 min-h-11 w-full border border-slate-400 bg-white px-3 font-normal">
                {SUBJECT_DOMAINS.map((domain) => <option key={domain} value={domain}>{domain.replaceAll("_", " ")}</option>)}
              </select>
            </label>
            <label className="text-sm font-bold">Grade band<input name="gradeBand" required placeholder="9-12" className="mt-1 min-h-11 w-full border border-slate-400 bg-white px-3 font-normal" /></label>
            <label className="text-sm font-bold">Course level<input name="courseLevel" placeholder="General, honors, AP, dual credit" className="mt-1 min-h-11 w-full border border-slate-400 bg-white px-3 font-normal" /></label>
            <label className="text-sm font-bold">Jurisdiction<input name="jurisdictionCode" placeholder="State or district code" className="mt-1 min-h-11 w-full border border-slate-400 bg-white px-3 font-normal" /></label>
            <label className="text-sm font-bold">Approved standards framework
              <select name="standardsFrameworkId" className="mt-1 min-h-11 w-full border border-slate-400 bg-white px-3 font-normal">
                <option value="">Not selected</option>
                {(frameworks ?? []).map((framework: Row) => <option key={framework.id} value={framework.id}>{framework.title}{framework.version_label ? ` (${framework.version_label})` : ""}</option>)}
              </select>
            </label>
            <button type="submit" className="min-h-11 bg-slate-950 px-4 font-black text-white md:col-span-2">Create course draft</button>
          </form>
        </section>

        <section className="mt-10">
          {(courses ?? []).length === 0 ? <p className="text-slate-300">No course drafts yet.</p> : null}
          <div className="grid gap-12">
            {(courses ?? []).map((course: Row) => {
              const courseUnits = (units ?? []).filter((unit: Row) => unit.course_id === course.id);
              const courseUnitIds = new Set(courseUnits.map((unit: Row) => unit.id));
              const courseLessons = (lessons ?? []).filter((lesson: Row) => courseUnitIds.has(lesson.unit_id));
              const courseLessonIds = new Set(courseLessons.map((lesson: Row) => lesson.id));
              const courseAssessments = (assessments ?? []).filter((assessment: Row) => assessment.course_id === course.id);
              const courseAssessmentIds = new Set(courseAssessments.map((assessment: Row) => assessment.id));
              const courseItems = (items ?? []).filter((item: Row) => courseAssessmentIds.has(item.blueprint_id));
              const courseItemIds = new Set(courseItems.map((item: Row) => item.id));
              const courseAttempts = (attempts ?? []).filter((attempt: Row) => courseAssessmentIds.has(attempt.blueprint_id));
              const courseAttemptIds = new Set(courseAttempts.map((attempt: Row) => attempt.id));
              return (
                <TeacherCourseEditor
                  key={course.id}
                  course={course}
                  organizationId={organizationId}
                  units={courseUnits}
                  lessons={courseLessons}
                  resources={(resources ?? []).filter((resource: Row) => courseLessonIds.has(resource.lesson_id))}
                  objectives={(objectives ?? []).filter((objective: Row) => objective.course_mode_course_id === course.id)}
                  objectiveAlignments={objectiveAlignments ?? []}
                  prerequisiteEdges={(prerequisiteEdges ?? []).filter((edge: Row) => (
                    (objectives ?? []).some((objective: Row) => objective.course_mode_course_id === course.id && objective.id === edge.objective_id)
                  ))}
                  lessonObjectives={(lessonObjectives ?? []).filter((alignment: Row) => courseLessonIds.has(alignment.lesson_id))}
                  assignments={(assignments ?? []).filter((assignment: Row) => assignment.course_id === course.id)}
                  assessments={courseAssessments}
                  items={courseItems}
                  itemObjectives={(itemObjectives ?? []).filter((alignment: Row) => courseItemIds.has(alignment.item_id))}
                  attempts={courseAttempts}
                  responses={(responses ?? []).filter((response: Row) => courseAttemptIds.has(response.attempt_id))}
                  protocols={(protocols ?? []).filter((protocol: Row) => protocol.course_id === course.id)}
                  connections={teacherConnections}
                  courseLink={(lmsLinks ?? []).find((link: Row) => link.course_id === course.id) ?? null}
                  studentMemberships={studentMemberships ?? []}
                  enrollments={(enrollments ?? []).filter((enrollment: Row) => enrollment.course_id === course.id)}
                  gradingRules={(gradingRules ?? []).filter((rule: Row) => rule.course_id === course.id)}
                  profileNames={profileNames}
                  gradePreview={params.previewCourseId === course.id && params.previewStudentId ? {
                    studentId: params.previewStudentId,
                    gradingPeriod: params.previewPeriod ?? "",
                    ready: params.previewReady === "1",
                    calculatedPercent: params.previewPercent ? Number(params.previewPercent) : null,
                    scoredCount: Number(params.previewScored ?? 0),
                    ruleCount: Number(params.previewRules ?? 0),
                  } : null}
                  standardItems={(standardItems ?? []).filter((standard: Row) => standard.framework_id === course.standards_framework_id)}
                />
              );
            })}
          </div>
        </section>
      </div>
      <StudentBottomNav />
    </div>
  );
}
