import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExternalSubmissionSync } from "../external-submission-sync";
import { CheckSquare } from "lucide-react";
import { SubmitChecklist } from "./checklist";
import { PageShell } from "../../../page-shell";

export default async function SubmitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: a } = await supabase
    .from("assignments")
    .select("id, title, status, submission_url, external_source, external_url, submission_sync_status, classes(name)")
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
    <PageShell
      active="Work"
      eyebrow="Schoolwork"
      title="Before you click submit."
      subtitle="Tick each box as you check it. Required boxes have to be checked."
      accent="var(--gl-cyan)"
      icon={CheckSquare}
    >
      <div className="space-y-6">
      <Link
        href={`/assignments/${id}`}
        className="nexus-kicker text-xs text-muted hover:underline"
      >
        ← {a.title}
      </Link>
      <p className="text-xs text-muted">
        Add your own checks as needed; remove any that don&apos;t apply.
      </p>

      <SubmitChecklist
        assignmentId={id}
        items={items ?? []}
        currentUrl={a.submission_url}
      />

      <ExternalSubmissionSync
        assignmentId={id}
        provider={a.external_source}
        externalUrl={a.external_url}
        initialStatus={a.submission_sync_status}
      />
      </div>
    </PageShell>
  );
}
