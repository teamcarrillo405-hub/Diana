import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type WorkFlowScreen = "assignment" | "workspace" | "planning" | "submission";

function isWorkFlowScreen(value: string): value is WorkFlowScreen {
  return value === "assignment" || value === "workspace" || value === "planning" || value === "submission";
}

export default async function WorkFlowPreviewPage({ params }: { params: Promise<{ screen: string }> }) {
  const { screen } = await params;
  if (!isWorkFlowScreen(screen)) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const query = supabase
    .from("assignments")
    .select("id")
    .eq("owner_id", user.id)
    .not("status", "in", "(submitted,graded,abandoned)")
    .order("due_at", { ascending: true, nullsFirst: false });
  const { data: assignment } = screen === "submission"
    ? await query.eq("status", "exporting").limit(1).maybeSingle()
    : await query.limit(1).maybeSingle();
  if (!assignment) redirect("/assignments");

  if (screen === "submission") redirect(`/assignments/${assignment.id}/submit`);
  redirect(`/assignments/${assignment.id}/workspace${screen === "planning" ? "?plan=1" : ""}`);
}
