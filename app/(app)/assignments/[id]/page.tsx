import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDueAt } from "@/lib/format";
import { effectiveAiMode, type AiMode } from "@/lib/portal/teacher";
import {
  AssignmentCockpit,
  type AssignmentCockpitDrill,
} from "./assignment-cockpit";
import type { BreakdownStep } from "@/lib/task-breakdown/types";
import type { AssignmentStatus } from "@/lib/supabase/types";
import { AiWritingCoach } from "@/components/screen-design/ai-writing-coach";

export default async function AssignmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    focus?: string;
    start?: string;
    steps?: string;
    sdState?: string;
    sdScenario?: string;
  }>;
}) {
  const { id } = await params;
  const {
    focus,
    start,
    steps: stepsParam,
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

  const courseLabel = a.classes?.name ?? "Assignment";
  const dueLine = a.due_at ? formatDueAt(a.due_at) : "No due date";
  const estimate = a.estimated_minutes ? `${a.estimated_minutes} min` : null;
  const briefText = a.description?.trim() || "No instructions yet: check with your teacher.";
  const savedWork = a.saved_work && typeof a.saved_work === "object" && !Array.isArray(a.saved_work)
    ? a.saved_work
    : {};

  if (sdState?.startsWith("writing-coach")) {
    return (
      <AiWritingCoach
        assignmentId={a.id}
        assignmentTitle={a.title}
        courseLabel={courseLabel}
        initialDraft={typeof savedWork.draft === "string" ? savedWork.draft : ""}
        classAiMode={classAiMode}
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
      startRequested={focus === "next-step" || start === "1" || stepsParam === "1"}
    />
  );
}
