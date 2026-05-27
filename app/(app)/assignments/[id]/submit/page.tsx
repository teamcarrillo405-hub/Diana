import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubmitChecklist } from "./checklist";

export default async function SubmitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: a } = await supabase
    .from("assignments")
    .select("id, title, status, submission_url, classes(name)")
    .eq("id", id)
    .single();
  if (!a) notFound();
  if (a.status !== "exporting") redirect(`/assignments/${id}`);

  const { data: items } = await supabase
    .from("submission_checklist")
    .select("id, label, detail, required, checked, position")
    .eq("assignment_id", id)
    .order("position", { ascending: true });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link
          href={`/assignments/${id}`}
          className="text-xs text-muted hover:underline"
        >
          ← {a.title}
        </Link>
        <h1 className="text-2xl font-bold">Before you click submit</h1>
        <p className="text-sm text-muted">
          Tick each box as you check it. Required boxes have to be checked.
        </p>
      </header>

      <SubmitChecklist
        assignmentId={id}
        items={items ?? []}
        currentUrl={a.submission_url}
      />
    </div>
  );
}
