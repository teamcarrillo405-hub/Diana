import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDueAt } from "@/lib/format";
import { effectiveAiMode, type AiMode } from "@/lib/portal/teacher";
import { resolveSubjectMode, SUBJECT_FIELDS } from "@/lib/homework-mission/subjects";
import { HomeworkMission, type AssignmentProblem } from "./homework-mission";
import {
  AssignmentCockpit,
  type AssignmentCockpitDrill,
} from "./assignment-cockpit";
import type { BreakdownStep } from "@/lib/task-breakdown/types";
import type { MathScaffoldResult } from "@/lib/math/scaffold";
import type { AssignmentStatus } from "@/lib/supabase/types";

export default async function AssignmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    focus?: string;
    start?: string;
    steps?: string;
    workspace?: string;
    sdState?: string;
    sdScenario?: string;
  }>;
}) {
  const { id } = await params;
  const {
    focus,
    start,
    steps: stepsParam,
    workspace,
    sdState,
    sdScenario,
  } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: a } = await supabase
    .from("assignments")
    .select(
      "id, owner_id, title, description, due_at, status, kind, estimated_minutes, class_id, rubric_text, ai_mode_override, saved_work, classes(name, color, ai_mode)",
    )
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();
  if (!a) notFound();

  if (sdState === "submit" && a.status === "exporting") {
    const query = sdScenario
      ? `?sdScenario=${encodeURIComponent(sdScenario)}&sdState=submit`
      : "";
    redirect(`/assignments/${id}/submit${query}`);
  }

  const classMode: AiMode = a.classes?.ai_mode === "red" || a.classes?.ai_mode === "yellow" ? a.classes.ai_mode : "green";
  const assignmentOverride: AiMode | null =
    a.ai_mode_override === "red" || a.ai_mode_override === "yellow" || a.ai_mode_override === "green"
      ? a.ai_mode_override
      : null;
  const classAiMode = effectiveAiMode(classMode, assignmentOverride);

  const subject = resolveSubjectMode({ kind: a.kind }, a.classes?.name ?? null);

  const [{ data: stepsRow }, { data: checklistRows }] = await Promise.all([
    supabase
      .from("assignment_steps")
      .select("steps")
      .eq("assignment_id", id)
      .eq("owner_id", user.id)
      .maybeSingle(),
    supabase
      .from("submission_checklist")
      .select("id, label, detail, checked, position")
      .eq("assignment_id", id)
      .eq("owner_id", user.id)
      .order("position", { ascending: true }),
  ]);
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
  const briefText = a.description?.trim() || "No instructions yet: check with your teacher.";
  const deliverables = SUBJECT_FIELDS[subject].map((f) => f.label);

  if (workspace === "1") {
    return (
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
        startInWork={focus === "next-step" || start === "1" || stepsParam === "1"}
        startWithSteps={stepsParam === "1"}
      />
    );
  }

  const checklistDrills: AssignmentCockpitDrill[] = (checklistRows ?? []).map(
    (item) => ({
      id: item.id,
      kind: "checklist",
      label: item.label,
      detail: item.detail,
      checked: item.checked,
    }),
  );
  const stepDrills: AssignmentCockpitDrill[] = steps.map((step, index) => ({
    id: `step-${index}`,
    kind: "step",
    label: step.action,
    detail: `${step.minutes} minute step`,
    checked: step.done,
    stepIndex: index,
  }));

  return (
    <AssignmentCockpit
      assignmentId={a.id}
      title={a.title}
      courseLabel={courseLabel}
      dueLine={dueLine}
      estimate={estimate}
      briefText={briefText}
      classAiMode={classAiMode}
      status={a.status as AssignmentStatus}
      drills={[...stepDrills, ...checklistDrills].slice(0, 4)}
    />
  );
}
