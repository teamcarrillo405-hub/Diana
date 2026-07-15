import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDueAt } from "@/lib/format";
import { effectiveAiMode, type AiMode } from "@/lib/portal/teacher";
import { resolveSubjectMode, SUBJECT_FIELDS } from "@/lib/homework-mission/subjects";
import { AppTopNav } from "../../app-top-nav";
import { HomeworkMission, type AssignmentProblem } from "./homework-mission";
import type { BreakdownStep } from "@/lib/task-breakdown/types";
import type { MathScaffoldResult } from "@/lib/math/scaffold";

export default async function AssignmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ start?: string; steps?: string }>;
}) {
  const { id } = await params;
  const { start, steps: stepsParam } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: a } = await supabase
    .from("assignments")
    .select(
      "id, title, description, due_at, status, kind, estimated_minutes, class_id, rubric_text, ai_mode_override, saved_work, classes(name, color, ai_mode)",
    )
    .eq("id", id)
    .single();
  if (!a) notFound();

  const classMode: AiMode = a.classes?.ai_mode === "red" || a.classes?.ai_mode === "yellow" ? a.classes.ai_mode : "green";
  const assignmentOverride: AiMode | null =
    a.ai_mode_override === "red" || a.ai_mode_override === "yellow" || a.ai_mode_override === "green"
      ? a.ai_mode_override
      : null;
  const classAiMode = effectiveAiMode(classMode, assignmentOverride);

  const subject = resolveSubjectMode({ kind: a.kind }, a.classes?.name ?? null);

  const { data: stepsRow } = await supabase
    .from("assignment_steps")
    .select("steps")
    .eq("assignment_id", id)
    .maybeSingle();
  const steps = (stepsRow?.steps as BreakdownStep[] | undefined) ?? [];

  let problems: AssignmentProblem[] = [];
  if (subject === "math") {
    const { data: problemRows } = await supabase
      .from("assignment_problems")
      .select("id, problem_number, problem_text, scaffold, student_work")
      .eq("assignment_id", id)
      .order("problem_number", { ascending: true });
    problems = (problemRows ?? []).map((p) => ({
      id: p.id,
      problem_number: p.problem_number,
      problem_text: p.problem_text,
      scaffold: (p.scaffold as MathScaffoldResult | null) ?? null,
      student_work: (p.student_work as Record<string, string>) ?? {},
    }));
  }

  const courseLabel = a.classes?.name ?? "Assignment";
  const dueLine = a.due_at ? formatDueAt(a.due_at) : "No due date";
  const estimate = a.estimated_minutes ? `${a.estimated_minutes} min` : null;
  const briefText = a.description?.trim() || "No instructions yet — check with your teacher.";
  const deliverables = SUBJECT_FIELDS[subject].map((f) => f.label);

  return (
    <div className="student-portal-page">
      <AppTopNav active="Work" />
      <HomeworkMission
        assignmentId={a.id}
        subject={subject}
        title={a.title}
        courseLabel={courseLabel}
        dueLine={dueLine}
        estimate={estimate}
        briefText={briefText}
        rubricText={a.rubric_text?.trim() || null}
        deliverables={deliverables}
        classAiMode={classAiMode}
        status={a.status}
        savedWork={(a.saved_work as Record<string, string>) ?? {}}
        steps={steps}
        problems={problems}
        startInWork={start === "1" || stepsParam === "1"}
        startWithSteps={stepsParam === "1"}
      />
    </div>
  );
}
