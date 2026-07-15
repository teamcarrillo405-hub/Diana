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
  created_at: string;
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
    href: `/classes/${cls.id}`,
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

  const [{ data: classes }, { data: assignments }] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name, created_at")
      .eq("owner_id", user.id)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("assignments")
      .select("class_id, status")
      .eq("owner_id", user.id)
      .not("class_id", "is", null),
  ]);

  const classRows = (classes ?? []) as ClassRow[];
  const assignmentRows = (assignments ?? []) as AssignmentRow[];
  const cards = classRows.map((cls) => toSubjectCard(cls, assignmentRows));
  const createOpen = (await searchParams).create === "1";
  const createForm = <ClassForm />;

  return cards.length === 0 ? (
    <EmptyClassLibrary createForm={createForm} createOpen={createOpen} />
  ) : (
    <MyClassesGrid cards={cards} createForm={createForm} createOpen={createOpen} />
  );
}
