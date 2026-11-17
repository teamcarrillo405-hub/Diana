import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { ClassForm } from "./class-form";
import {
  EmptyClassLibrary,
  MyClassesGrid,
  type SubjectLibraryCardModel,
} from "./my-classes-grid";

type ClassRow = {
  id: string;
  name: string;
  teacher: string | null;
  course_mode_course_id: string | null;
};

type AssignmentRow = {
  class_id: string | null;
  status: string;
  title: string;
  due_at: string | null;
};

type FinalGradeRow = {
  course_id: string;
  final_percent: number;
  letter_grade: string | null;
  confirmed_at: string;
};

const COMPLETED = new Set(["submitted", "graded"]);
const CLOSED = new Set(["submitted", "graded", "abandoned"]);

function toSubjectCard(
  cls: ClassRow,
  assignments: readonly AssignmentRow[],
  gradeByCourse: ReadonlyMap<string, FinalGradeRow>,
  gradesUnavailable: boolean,
): SubjectLibraryCardModel {
  const classWork = assignments.filter((assignment) => assignment.class_id === cls.id && assignment.status !== "abandoned");
  const completedCount = classWork.filter((assignment) => COMPLETED.has(assignment.status)).length;
  const activeWork = classWork.filter((assignment) => !CLOSED.has(assignment.status));
  const nextAssignment = activeWork.find((assignment) => assignment.due_at) ?? activeWork[0];
  const grade = cls.course_mode_course_id
    ? gradeByCourse.get(cls.course_mode_course_id) ?? null
    : null;
  const letterGrade = grade?.letter_grade?.trim() || null;

  return {
    id: cls.id,
    name: cls.name,
    teacher: cls.teacher,
    href: `/classes/${cls.id}`,
    openWorkCount: activeWork.length,
    submittedCount: completedCount,
    nextAssignmentTitle: nextAssignment?.title ?? null,
    nextAssignmentDueAt: nextAssignment?.due_at ?? null,
    gradeLabel: letterGrade ?? (grade ? `${grade.final_percent}%` : null),
    gradePercent: letterGrade && grade ? grade.final_percent : null,
    gradeConfirmedAt: grade?.confirmed_at ?? null,
    gradeUnavailable: Boolean(cls.course_mode_course_id && gradesUnavailable),
  };
}

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ create?: string; intake?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: classes, error: classError },
    { data: assignments, error: workError },
    { data: finalGrades, error: gradeError },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name, teacher, course_mode_course_id")
      .eq("owner_id", user.id)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("assignments")
      .select("class_id, status, title, due_at")
      .eq("owner_id", user.id)
      .not("class_id", "is", null)
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true }),
    supabase
      .from("final_grade_records")
      .select("course_id, final_percent, letter_grade, confirmed_at")
      .eq("student_id", user.id)
      .in("status", ["confirmed", "synced"])
      .order("confirmed_at", { ascending: false })
      .order("version", { ascending: false })
      .order("id", { ascending: false }),
    supabase
      .from("profiles")
      .select("display_name, photo_url, photo_offset_x, photo_offset_y, school_name, timezone")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const classRows = (classes ?? []) as ClassRow[];
  const assignmentRows = (assignments ?? []) as AssignmentRow[];
  const gradeByCourse = new Map<string, FinalGradeRow>();
  for (const grade of (finalGrades ?? []) as FinalGradeRow[]) {
    if (!gradeByCourse.has(grade.course_id)) gradeByCourse.set(grade.course_id, grade);
  }
  const cards = classRows.map((cls) => toSubjectCard(cls, assignmentRows, gradeByCourse, Boolean(gradeError)));
  const { create, intake } = await searchParams;
  const createOpen = create === "1";
  const captureId = z.string().uuid().safeParse(intake);
  const returnTo = createOpen
    ? intake === "add" ? "/quick-add" : captureId.success ? `/assignments/captures/${captureId.data}` : undefined
    : undefined;
  const createForm = <ClassForm returnTo={returnTo} />;
  const navProfile = {
    displayName: profile?.display_name,
    photoUrl: profile?.photo_url,
    photoOffsetX: profile?.photo_offset_x,
    photoOffsetY: profile?.photo_offset_y,
  };

  const props = {
    createForm,
    createOpen,
    closeCreateHref: returnTo,
    profile: navProfile,
    schoolName: profile?.school_name,
    timeZone: profile?.timezone,
    unavailable: Boolean(classError),
    workUnavailable: Boolean(workError),
  };

  return cards.length === 0 ? <EmptyClassLibrary {...props} /> : <MyClassesGrid {...props} cards={cards} />;
}

