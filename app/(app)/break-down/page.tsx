import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ assignmentId?: string }>;

// Keep existing deep links working while the plan now lives inside the workspace.
export default async function BreakDownPage({ searchParams }: { searchParams: SearchParams }) {
  const { assignmentId } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const query = supabase
    .from("assignments")
    .select("id")
    .eq("owner_id", user.id);
  const { data: assignment } = assignmentId
    ? await query.eq("id", assignmentId).maybeSingle()
    : await query.order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (!assignment) notFound();

  redirect(`/assignments/${assignment.id}/workspace?plan=1`);
}
