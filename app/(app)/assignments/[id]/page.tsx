import { notFound, redirect } from "next/navigation";
import { assignmentDestination } from "@/lib/assignment-navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: assignment, error } = await supabase.from("assignments").select("id, status").eq("id", id).eq("owner_id", user.id).maybeSingle();
  if (error) throw new Error("Unable to open this assignment. Please try again.");
  if (!assignment) notFound();
  redirect(assignmentDestination(assignment.id, assignment.status));
}
