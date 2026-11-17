import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { CourseInsight, type CourseInsightAssignment, type CourseInsightNote } from "@/components/course-insight";
import type { AssignmentStatus } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/server";
import { RubricForm } from "./rubric-form";
import { SyllabusForm } from "./syllabus-form";
import {materialDestination} from "@/lib/learning-engine/material-navigation";
import {learningAccess} from "@/lib/learning-engine/server";
import { loadStudentClassAssessments } from "@/lib/course-mode/student-class-assessments";
import { formatCampusName } from "@/lib/school-branding";

type ClassRow = {
  id: string;
  name: string;
  teacher: string | null;
  ai_mode: string;
  course_mode_course_id: string | null;
};

type RubricRow = {
  id: string;
  title: string;
  raw_text: string | null;
  storage_key: string | null;
  original_filename: string | null;
};

type SyllabusRow = {
  id: string;
  title: string;
  storage_key: string | null;
  original_filename: string | null;
};

type AssignmentRow = {
  id: string;
  title: string;
  kind: string | null;
  due_at: string | null;
  status: AssignmentStatus;
};

type NoteRow = { id: string; title: string | null; updated_at: string };
type GradeRow = { final_percent: number; letter_grade: string | null; confirmed_at: string };

const Section = z.enum(["overview", "assignments", "materials", "notes", "quiz", "grades"]);

async function materialDocument(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: { id: string; storage_key: string | null; original_filename: string | null } | null,
) {
  if (!row?.storage_key || !row.original_filename) return null;
  const { data } = await supabase.storage.from("note-docs").createSignedUrl(row.storage_key, 60 * 10);
  return { id: row.id, name: row.original_filename, href: data?.signedUrl ?? null };
}

export default async function ClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ materials?: string; rubric?: string; work?: string; section?: string }>;
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: classData } = await supabase
    .from("classes")
    .select("id, name, teacher, course_mode_course_id, ai_mode")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!classData) notFound();

  const cls = classData as ClassRow;
  const [
    { data: rubrics },
    { data: syllabi },
    { data: assignments, error: workError },
    { data: notes, error: notesError },
    { data: gradeRows, error: gradeError },
    { data: profile },
    { data: quizzes, error: quizError },
    assessments,
    practiceEnabled,
  ] = await Promise.all([
    supabase
      .from("rubrics")
      .select("id, title, raw_text, storage_key, original_filename")
      .eq("owner_id", user.id)
      .eq("class_id", id)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("class_syllabi")
      .select("id, title, storage_key, original_filename")
      .eq("owner_id", user.id)
      .eq("class_id", id)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("assignments")
      .select("id, title, kind, due_at, status")
      .eq("owner_id", user.id)
      .eq("class_id", id)
      .neq("status", "abandoned")
      .order("due_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("notes")
      .select("id, title, updated_at")
      .eq("owner_id", user.id)
      .eq("class_id", id)
      .order("updated_at", { ascending: false })
      .limit(60),
    cls.course_mode_course_id
      ? supabase
          .from("final_grade_records")
          .select("final_percent, letter_grade, confirmed_at")
          .eq("student_id", user.id)
          .eq("course_id", cls.course_mode_course_id)
          .in("status", ["confirmed", "synced"])
          .order("confirmed_at", { ascending: false })
          .order("version", { ascending: false })
          .order("id", { ascending: false })
          .limit(1)
      : Promise.resolve({ data: [] as GradeRow[], error: null }),
    supabase
      .from("profiles")
      .select("display_name, photo_url, photo_offset_x, photo_offset_y, timezone, school_name, school_logo_url")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("study_artifacts")
      .select("id, title, updated_at")
      .eq("owner_id", user.id)
      .eq("class_id", id)
      .eq("artifact_type", "practice_test")
      .order("updated_at", { ascending: false }),
    loadStudentClassAssessments(supabase, user.id, id, cls.course_mode_course_id),
    cls.ai_mode === "green" ? learningAccess("assessment", user.id) : Promise.resolve(false),
  ]);

  const rubricRow = ((rubrics ?? []) as RubricRow[])[0] ?? null;
  const syllabusRow = ((syllabi ?? []) as SyllabusRow[])[0] ?? null;
  const [rubricDocument, syllabusDocument] = await Promise.all([
    materialDocument(supabase, rubricRow),
    materialDocument(supabase, syllabusRow),
  ]);
  const classAssignments: CourseInsightAssignment[] = ((assignments ?? []) as AssignmentRow[]).map(
    (assignment) => ({ id: assignment.id, title: assignment.title, kind: assignment.kind, dueAt: assignment.due_at, status: assignment.status }),
  );
  const classNotes: CourseInsightNote[] = ((notes ?? []) as NoteRow[]).map((note) => ({ id: note.id, title: note.title, updatedAt: note.updated_at }));
  const currentGrade = ((gradeRows ?? []) as GradeRow[])[0] ?? null;
  const gradeLetter = currentGrade?.letter_grade?.trim() || null;
  const requestedView = await searchParams;
  const sourceOpen = requestedView.materials === "1" || requestedView.rubric === "scan";
  const initialSection = Section.safeParse(requestedView.section);
  const workOrigin = sourceOpen ? classAssignments.find(assignment => assignment.id === requestedView.work) : undefined;
  const assignmentIds=classAssignments.map(assignment=>assignment.id);
  const materialResult=assignmentIds.length?await supabase.from("assignment_sources")
    .select("id,title,assignment_id").eq("owner_id",user.id).in("assignment_id",assignmentIds).order("created_at",{ascending:false})
    :{data:[],error:null};
  const materials=(materialResult.data??[]).map(source=>({
    id:source.id,title:source.title||"Attached file",assignmentTitle:classAssignments.find(assignment=>assignment.id===source.assignment_id)?.title??"Assignment",
    href:materialDestination(source.assignment_id,id,source.id),
  }));

  return (
    <CourseInsight
      classId={cls.id}
      className={cls.name}
      teacher={cls.teacher}
      campusName={formatCampusName(profile?.school_name)}
      campusLogoUrl={profile?.school_logo_url}
      assignments={classAssignments}
      notes={classNotes}
      rubricTitle={rubricRow?.title ?? null}
      grade={currentGrade ? { label: gradeLetter ?? `${currentGrade.final_percent}%`, percent: gradeLetter ? currentGrade.final_percent : null, confirmedAt: currentGrade.confirmed_at } : null}
      gradeUnavailable={Boolean(gradeError)}
      initialSection={initialSection.success ? initialSection.data : undefined}
      sourceOpen={sourceOpen}
      workOrigin={workOrigin}
      timeZone={profile?.timezone ?? "UTC"}
      workUnavailable={Boolean(workError)}
      notesUnavailable={Boolean(notesError)}
      materials={materials}
      materialsUnavailable={Boolean(materialResult.error)}
      practiceEnabled={practiceEnabled}
      quizzes={(quizzes ?? []).map((quiz) => ({ id: quiz.id, title: quiz.title, updatedAt: quiz.updated_at }))}
      quizzesUnavailable={Boolean(quizError)}
      {...assessments}
      rubricForm={<RubricForm classId={cls.id} document={rubricDocument} />}
      syllabusForm={<SyllabusForm classId={cls.id} document={syllabusDocument} />}
      profile={{ displayName: profile?.display_name, photoUrl: profile?.photo_url, photoOffsetX: profile?.photo_offset_x, photoOffsetY: profile?.photo_offset_y }}
    />
  );
}
