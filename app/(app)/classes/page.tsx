import { redirect } from "next/navigation";

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
  created_at: string;
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
): SubjectLibraryCardModel {
  const classWork = assignments.filter((assignment) => assignment.class_id === cls.id);
  const completedCount = classWork.filter((assignment) => COMPLETED.has(assignment.status)).length;
  const progressPct =
    classWork.length === 0 ? 0 : Math.round((completedCount / classWork.length) * 100);
  const openWorkCount = classWork.filter((assignment) => !CLOSED.has(assignment.status)).length;
  const nextAssignment = classWork
    .filter((assignment) => !CLOSED.has(assignment.status))
    .sort((left, right) => {
      if (!left.due_at) return 1;
      if (!right.due_at) return -1;
      return left.due_at.localeCompare(right.due_at);
    })[0];
  const grade = cls.course_mode_course_id
    ? gradeByCourse.get(cls.course_mode_course_id) ?? null
    : null;

  return {
    id: cls.id,
    name: cls.name,
    teacher: cls.teacher,
    href: `/classes/${cls.id}`,
    progressPct,
    openWorkCount,
    nextAssignmentTitle: nextAssignment?.title ?? null,
    gradeLabel: grade?.letter_grade ?? (grade ? `${Math.round(grade.final_percent)}%` : null),
    gradePercent: grade?.letter_grade ? Math.round(grade.final_percent) : null,
  };
}

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ create?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: classes }, { data: assignments }, { data: finalGrades }, { data: profile }] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name, teacher, created_at, course_mode_course_id")
      .eq("owner_id", user.id)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("assignments")
      .select("class_id, status, title, due_at")
      .eq("owner_id", user.id)
      .not("class_id", "is", null),
    supabase
      .from("final_grade_records")
      .select("course_id, final_percent, letter_grade, confirmed_at")
      .eq("student_id", user.id)
      .in("status", ["confirmed", "synced"])
      .order("confirmed_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("display_name, photo_url, photo_offset_x, photo_offset_y")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const classRows = (classes ?? []) as ClassRow[];
  const assignmentRows = (assignments ?? []) as AssignmentRow[];
  const gradeByCourse = new Map<string, FinalGradeRow>();
  for (const grade of (finalGrades ?? []) as FinalGradeRow[]) {
    if (!gradeByCourse.has(grade.course_id)) gradeByCourse.set(grade.course_id, grade);
  }
  const cards = classRows.map((cls) => toSubjectCard(cls, assignmentRows, gradeByCourse));
  const createOpen = (await searchParams).create === "1";
  const createForm = <ClassForm />;
  const navProfile = {
    displayName: profile?.display_name,
    photoUrl: profile?.photo_url,
    photoOffsetX: profile?.photo_offset_x,
    photoOffsetY: profile?.photo_offset_y,
  };

  return cards.length === 0 ? (
    <EmptyClassLibrary
      createForm={createForm}
      createOpen={createOpen}
      profile={navProfile}
    />
  ) : (
    <MyClassesGrid
      cards={cards}
      createForm={createForm}
      createOpen={createOpen}
      profile={navProfile}
    />
  );
}
