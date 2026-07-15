import { notFound, redirect } from "next/navigation";

import {
  RubricPanel,
  type RubricScoutAssignment,
  type RubricScoutRubric,
  type RubricScoutSyllabus,
} from "@/components/rubric-panel";
import { createClient } from "@/lib/supabase/server";
import { RubricForm } from "./rubric-form";
import { SyllabusForm } from "./syllabus-form";

type ClassRow = {
  id: string;
  name: string;
  teacher: string | null;
  ai_mode: "green" | "yellow" | "red" | null;
};

type RubricRow = {
  id: string;
  title: string;
  raw_text: string | null;
};

type SyllabusRow = {
  title: string;
  parsed: {
    policies?: Array<{ kind: string; text: string }>;
  } | null;
};

type AssignmentRow = {
  id: string;
  title: string;
};

export default async function ClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ rubric?: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: classData } = await supabase
    .from("classes")
    .select("id, name, teacher, ai_mode")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!classData) notFound();

  const [{ data: rubrics }, { data: syllabi }, { data: assignments }] = await Promise.all([
    supabase
      .from("rubrics")
      .select("id, title, raw_text")
      .eq("owner_id", user.id)
      .eq("class_id", id)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("class_syllabi")
      .select("title, parsed")
      .eq("owner_id", user.id)
      .eq("class_id", id)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("assignments")
      .select("id, title")
      .eq("owner_id", user.id)
      .eq("class_id", id)
      .not("status", "in", "(submitted,graded,abandoned)")
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(8),
  ]);

  const cls = classData as ClassRow;
  const rubricRow = ((rubrics ?? []) as RubricRow[])[0] ?? null;
  const syllabusRow = ((syllabi ?? []) as SyllabusRow[])[0] ?? null;
  const rubric: RubricScoutRubric | null = rubricRow
    ? { id: rubricRow.id, title: rubricRow.title, rawText: rubricRow.raw_text }
    : null;
  const syllabus: RubricScoutSyllabus | null = syllabusRow
    ? {
        title: syllabusRow.title,
        policies: (syllabusRow.parsed?.policies ?? []).map((policy) => ({
          kind: policy.kind,
          text: policy.text,
        })),
      }
    : null;
  const classAssignments: RubricScoutAssignment[] = ((assignments ?? []) as AssignmentRow[]).map(
    (assignment) => ({ id: assignment.id, title: assignment.title }),
  );
  const scanOpen = (await searchParams).rubric === "scan" || rubric === null;

  return (
    <RubricPanel
      classId={cls.id}
      className={cls.name}
      teacher={cls.teacher}
      aiMode={cls.ai_mode ?? "green"}
      rubric={rubric}
      syllabus={syllabus}
      assignments={classAssignments}
      scanOpen={scanOpen}
      rubricForm={<RubricForm classId={cls.id} />}
      syllabusForm={<SyllabusForm classId={cls.id} />}
    />
  );
}
