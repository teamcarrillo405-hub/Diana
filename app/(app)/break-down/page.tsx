import { notFound, redirect } from "next/navigation";
import { effectiveAiMode, type AiMode } from "@/lib/portal/teacher";
import { createClient } from "@/lib/supabase/server";
import type { BreakdownStep } from "@/lib/task-breakdown/types";
import { BreakDownClient } from "./break-down-client";

type SearchParams = Promise<{
  assignmentId?: string;
  returnTo?: string;
}>;

function classAiMode(classes: { ai_mode?: string | null } | null): AiMode {
  return classes?.ai_mode === "red" || classes?.ai_mode === "yellow"
    ? classes.ai_mode
    : "green";
}

export default async function BreakDownPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let assignmentQuery = supabase
    .from("assignments")
    .select(
      "id, title, description, kind, estimated_minutes, ai_mode_override, classes(ai_mode)",
    )
    .eq("owner_id", user.id);

  assignmentQuery = query.assignmentId
    ? assignmentQuery.eq("id", query.assignmentId)
    : assignmentQuery.order("updated_at", { ascending: false }).limit(1);

  const { data: assignments } = await assignmentQuery;
  const assignment = assignments?.[0];
  if (!assignment) notFound();

  const { data: stepsRow } = await supabase
    .from("assignment_steps")
    .select("steps")
    .eq("assignment_id", assignment.id)
    .eq("owner_id", user.id)
    .maybeSingle();

  const override: AiMode | null =
    assignment.ai_mode_override === "red" ||
    assignment.ai_mode_override === "yellow" ||
    assignment.ai_mode_override === "green"
      ? assignment.ai_mode_override
      : null;
  const returnTo =
    query.returnTo?.startsWith("/") && !query.returnTo.startsWith("//")
      ? query.returnTo
      : `/assignments/${assignment.id}`;

  return (
    <BreakDownClient
      assignmentId={assignment.id}
      title={assignment.title}
      description={assignment.description ?? ""}
      kind={assignment.kind}
      estimatedMinutes={assignment.estimated_minutes ?? undefined}
      aiMode={effectiveAiMode(classAiMode(assignment.classes), override)}
      initialSteps={(stepsRow?.steps as unknown as BreakdownStep[] | null) ?? []}
      returnTo={returnTo}
    />
  );
}
