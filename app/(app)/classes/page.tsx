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
};

const COMPLETED = new Set(["submitted", "graded"]);
const CLOSED = new Set(["submitted", "graded", "abandoned"]);

function toSubjectCard(
  cls: ClassRow,
  assignments: readonly AssignmentRow[],
): SubjectLibraryCardModel {
  const classWork = assignments.filter((assignment) => assignment.class_id === cls.id);
  const completedCount = classWork.filter((assignment) => COMPLETED.has(assignment.status)).length;
  const progressPct =
    classWork.length === 0 ? 0 : Math.round((completedCount / classWork.length) * 100);
  const openWorkCount = classWork.filter((assignment) => !CLOSED.has(assignment.status)).length;

  return {
    id: cls.id,
    name: cls.name,
    teacher: cls.teacher,
    href: cls.course_mode_course_id
      ? `/course-mode/courses/${cls.course_mode_course_id}`
      : `/classes/${cls.id}`,
    progressPct,
    openWorkCount,
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

  const [{ data: classes }, { data: assignments }, { data: profile }] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name, teacher, created_at, course_mode_course_id")
      .eq("owner_id", user.id)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("assignments")
      .select("class_id, status")
      .eq("owner_id", user.id)
      .not("class_id", "is", null),
    supabase
      .from("profiles")
      .select("display_name, photo_url, photo_offset_x, photo_offset_y")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const classRows = (classes ?? []) as ClassRow[];
  const assignmentRows = (assignments ?? []) as AssignmentRow[];
  const cards = classRows.map((cls) => toSubjectCard(cls, assignmentRows));
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
