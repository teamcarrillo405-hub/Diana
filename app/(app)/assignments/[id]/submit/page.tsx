import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileText, Plus, Settings2 } from "lucide-react";
import { DianaMascotMark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { createClient } from "@/lib/supabase/server";
import { ExternalSubmissionSync } from "../external-submission-sync";
import { SubmitChecklist } from "./checklist";

function formatMinutes(total: number): string {
  if (total < 1) return "0M";
  if (total < 60) return `${Math.round(total)}M`;
  const hours = Math.floor(total / 60);
  const minutes = Math.round(total % 60);
  return minutes > 0 ? `${hours}H ${minutes}M` : `${hours}H`;
}

export default async function SubmitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, title, status, submission_url, external_source, external_url, submission_sync_status, classes(name)")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!assignment) notFound();
  if (assignment.status !== "exporting") redirect(`/assignments/${id}`);

  const [{ data: items }, { data: timeLogs }] = await Promise.all([
    supabase
      .from("submission_checklist")
      .select("id, label, detail, required, checked, position")
      .eq("assignment_id", id)
      .eq("owner_id", user.id)
      .order("position", { ascending: true }),
    supabase
      .from("assignment_time_log")
      .select("started_at, ended_at, elapsed_minutes")
      .eq("assignment_id", id)
      .eq("owner_id", user.id),
  ]);

  const checklist = items ?? [];
  const checkedCount = checklist.filter((item) => item.checked).length;
  const completion = checklist.length > 0
    ? Math.round((checkedCount / checklist.length) * 100)
    : 0;
  const timeSpent = (timeLogs ?? []).reduce((total, log) => {
    if (typeof log.elapsed_minutes === "number") return total + log.elapsed_minutes;
    if (!log.ended_at) return total;
    return total + Math.max(0, (new Date(log.ended_at).getTime() - new Date(log.started_at).getTime()) / 60000);
  }, 0);
  const className = assignment.classes?.name ?? "your class";

  return (
    <ScreenDesignViewport className="sd-submit-screen">
      <header className="sd-submit-header">
        <Link href={`/assignments/${id}`} aria-label="Back to assignment" className="sd-source-icon-button">
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>
        <h1>PRE-SUBMISSION REVIEW</h1>
        <Link href="/settings" aria-label="Open settings" className="sd-source-icon-button">
          <Settings2 size={20} aria-hidden="true" />
        </Link>
      </header>

      <main className="sd-submit-scroll">
        <section className="sd-submit-scan" aria-label="Submission review summary">
          <div className="sd-submit-document" aria-hidden="true">
            <span className="sd-submit-scan-line" />
            <FileText size={64} strokeWidth={1.5} />
            <small>READY TO REVIEW</small>
          </div>
          <div>
            <h2>SESSION REVIEW</h2>
            <p>{assignment.title} · {className}</p>
          </div>
        </section>

        <section className="sd-submit-stats" aria-label="Submission facts">
          <div>
            <span>CHECKS COMPLETE</span>
            <strong>{completion}%</strong>
            <small>{checkedCount} OF {checklist.length}</small>
          </div>
          <div>
            <span>TIME RECORDED</span>
            <strong>{formatMinutes(timeSpent)}</strong>
            <small>THIS ASSIGNMENT</small>
          </div>
        </section>

        <section className="sd-submit-coach">
          <DianaMascotMark decorative />
          <div>
            <h2>COACH DIANA</h2>
            <p>
              Check the required items, submit in your class system, then confirm it here.
              You decide when it is ready.
            </p>
          </div>
        </section>

        <SubmitChecklist
          assignmentId={id}
          items={checklist}
          currentUrl={assignment.submission_url}
        />

        {assignment.external_source ? (
          <details className="sd-submit-sync">
            <summary>Class system handoff</summary>
            <ExternalSubmissionSync
              assignmentId={id}
              provider={assignment.external_source}
              externalUrl={assignment.external_url}
              initialStatus={assignment.submission_sync_status}
            />
          </details>
        ) : null}
      </main>

      <Link href="/quick-add" className="sd-source-fab" aria-label="Add a quick task">
        <Plus size={30} aria-hidden="true" />
      </Link>
    </ScreenDesignViewport>
  );
}
