import { notFound, redirect } from "next/navigation";

import { AiWritingCoach } from "@/components/screen-design/ai-writing-coach";
import { effectiveAiMode, type AiMode } from "@/lib/portal/teacher";
import { createClient } from "@/lib/supabase/server";

export default async function AssignmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sdState?: string }>;
}) {
  const { id } = await params;
  const { sdState } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, title, status, saved_work, ai_mode_override, classes(name, ai_mode)")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!assignment) notFound();

  if (sdState?.startsWith("writing-coach")) {
    const classMode: AiMode = assignment.classes?.ai_mode === "red" || assignment.classes?.ai_mode === "yellow"
      ? assignment.classes.ai_mode
      : "green";
    const override: AiMode | null = assignment.ai_mode_override === "red" || assignment.ai_mode_override === "yellow" || assignment.ai_mode_override === "green"
      ? assignment.ai_mode_override
      : null;
    const savedWork = assignment.saved_work && typeof assignment.saved_work === "object" && !Array.isArray(assignment.saved_work)
      ? assignment.saved_work as Record<string, unknown>
      : {};
    return <AiWritingCoach assignmentId={assignment.id} assignmentTitle={assignment.title} courseLabel={assignment.classes?.name ?? "Assignment"} initialDraft={typeof savedWork.draft === "string" ? savedWork.draft : ""} classAiMode={effectiveAiMode(classMode, override)} />;
  }

  if (sdState === "submit" && assignment.status === "exporting") {
    redirect(`/assignments/${id}/submit`);
  }
  redirect(`/assignments/${id}/workspace`);
}
