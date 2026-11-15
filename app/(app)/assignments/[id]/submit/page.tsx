import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock3, FileCheck2 } from "lucide-react";

import { AssignmentSubmissionPreview } from "@/components/assignment-submission-preview";
import { StudentDesktopNav } from "@/components/screen-design/student-desktop-nav";
import { loadAssignmentSubmissionBundle } from "@/lib/assignment-submission-server";
import { createClient } from "@/lib/supabase/server";
import { ExternalSubmissionSync } from "../external-submission-sync";
import { SubmitChecklist } from "./checklist";

function formatMinutes(total: number): string {
  if (total < 1) return "0 min";
  if (total < 60) return `${Math.round(total)} min`;
  const hours = Math.floor(total / 60);
  const minutes = Math.round(total % 60);
  return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
}

function submissionPageState(status: string): "review" | "receipt" | "workspace" {
  if (status === "exporting") return "review";
  if (status === "submitted" || status === "graded") return "receipt";
  return "workspace";
}

function formatReceiptDate(value: string | null): string {
  if (!value) return "Saved in Diana";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Saved in Diana";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

type SubmittedArtifactReceipt = {
  id: string;
  filename: string;
  payloadDigest: string;
};

function SubmittedAssignmentReceipt({ assignmentId, title, className, status, submittedAt, syncStatus, artifactReceipt }: {
  assignmentId: string;
  title: string;
  className: string;
  status: string;
  submittedAt: string | null;
  syncStatus: string | null;
  artifactReceipt: SubmittedArtifactReceipt | null;
}) {
  const graded = status === "graded";
  const handoffSaved = syncStatus === "marked_submitted";
  return (
    <div className="sd-assignment-submit-screen">
      <StudentDesktopNav active="Work" />
      <main className="sd-assignment-submit-main">
        <Link href="/assignments" className="sd-assignment-submit-back"><ArrowLeft size={18} aria-hidden="true" />Back to work</Link>
        <section className="sd-assignment-receipt" aria-labelledby="submission-receipt-title">
          <CheckCircle2 size={42} aria-hidden="true" />
          <p>Receipt saved</p>
          <h1 id="submission-receipt-title">{graded ? "Grade recorded" : "Submission recorded"}</h1>
          <span>{title} · {className}</span>
          <dl>
            <div><dt>Status</dt><dd>{graded ? "Graded" : "Submitted"}</dd></div>
            <div><dt>Saved</dt><dd>{formatReceiptDate(submittedAt)}</dd></div>
            <div>
              <dt>{artifactReceipt ? "Artifact" : "School handoff"}</dt>
              <dd>{artifactReceipt?.filename ?? (handoffSaved ? "Confirmed" : "Saved in Diana")}</dd>
            </div>
          </dl>
          <div className="sd-assignment-receipt-actions">
            <Link href="/proof">Open Record</Link>
            <Link href="/assignments">Back to Work</Link>
          </div>
          <small>
            Receipt ID {(artifactReceipt?.id ?? assignmentId).slice(0, 8).toUpperCase()}
            {artifactReceipt ? ` · Payload ${artifactReceipt.payloadDigest.slice(0, 12).toUpperCase()}` : ""}
          </small>
        </section>
      </main>
    </div>
  );
}

export default async function SubmitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const bundle = await loadAssignmentSubmissionBundle({ supabase: supabase as any, ownerId: user.id, assignmentId: id });
  if (!bundle) notFound();
  const { assignment, className, preview } = bundle;
  const pageState = submissionPageState(assignment.status);
  if (pageState === "workspace") redirect(`/assignments/${id}/workspace`);
  if (pageState === "receipt") {
    const { data: receipt } = await (supabase as any)
      .from("assignment_submission_receipts")
      .select("id, submission_file_id, assignment_submission_files(filename, payload_digest)")
      .eq("assignment_id", id)
      .eq("owner_id", user.id)
      .eq("status", "submitted")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const relation = Array.isArray(receipt?.assignment_submission_files)
      ? receipt.assignment_submission_files[0]
      : receipt?.assignment_submission_files;
    const artifactReceipt = typeof receipt?.id === "string"
      && typeof relation?.filename === "string"
      && typeof relation?.payload_digest === "string"
      ? {
          id: receipt.id,
          filename: relation.filename,
          payloadDigest: relation.payload_digest,
        }
      : null;
    return <SubmittedAssignmentReceipt assignmentId={id} title={assignment.title} className={className} status={assignment.status} submittedAt={assignment.submitted_at} syncStatus={assignment.submission_sync_status} artifactReceipt={artifactReceipt} />;
  }

  const [{ data: items }, { data: timeLogs }] = await Promise.all([
    supabase.from("submission_checklist").select("id, label, detail, required, checked, position").eq("assignment_id", id).eq("owner_id", user.id).order("position", { ascending: true }),
    supabase.from("assignment_time_log").select("started_at, ended_at, elapsed_minutes").eq("assignment_id", id).eq("owner_id", user.id),
  ]);
  const deliveryStore = supabase as any;
  const { data: deliveryFiles } = preview.payloadDigest
    ? await deliveryStore
        .from("assignment_submission_files")
        .select("id, filename, payload_digest")
        .eq("assignment_id", id)
        .eq("owner_id", user.id)
        .eq("payload_digest", preview.payloadDigest)
        .eq("integrity_status", "bound")
        .order("created_at", { ascending: false })
        .limit(1)
    : { data: [] };
  const checklist = items ?? [];
  const checkedCount = checklist.filter((item) => item.checked).length;
  const timeSpent = (timeLogs ?? []).reduce((total, log) => {
    if (typeof log.elapsed_minutes === "number") return total + log.elapsed_minutes;
    if (!log.ended_at) return total;
    return total + Math.max(0, (new Date(log.ended_at).getTime() - new Date(log.started_at).getTime()) / 60_000);
  }, 0);
  const connectedProvider = assignment.external_source === "canvas" || assignment.external_source === "google_classroom";
  const deliveryFile = deliveryFiles?.[0]?.payload_digest === preview.payloadDigest
    ? {
        id: deliveryFiles[0].id,
        filename: deliveryFiles[0].filename,
        payloadDigest: deliveryFiles[0].payload_digest,
      }
    : null;

  return (
    <div className="sd-assignment-submit-screen">
      <StudentDesktopNav active="Work" />
      <main className="sd-assignment-submit-main">
        <div className="sd-assignment-submit-title-row">
          <Link href={`/assignments/${id}/workspace`} className="sd-assignment-submit-back"><ArrowLeft size={18} aria-hidden="true" />Back to workspace</Link>
          <header>
            <p>{className}</p>
            <h1>{assignment.title}</h1>
          </header>
        </div>

        <section className="sd-assignment-submit-summary" aria-label="Review status">
          <div><FileCheck2 size={20} aria-hidden="true" /><span><strong>{checkedCount} of {checklist.length}</strong> checks complete</span></div>
          <div><Clock3 size={20} aria-hidden="true" /><span><strong>{formatMinutes(timeSpent)}</strong> focused time</span></div>
        </section>

        <AssignmentSubmissionPreview preview={preview} />
        <SubmitChecklist assignmentId={id} items={checklist} currentUrl={assignment.submission_url} showFinalConfirmation={!connectedProvider} />

        {connectedProvider ? (
          <ExternalSubmissionSync
            assignmentId={id}
            assignmentTitle={assignment.title}
            provider={assignment.external_source}
            externalUrl={assignment.external_url}
            initialStatus={assignment.submission_sync_status}
            deliveryFile={deliveryFile}
            preview={preview}
          />
        ) : (
          <section className="sd-provider-handoff sd-provider-handoff--manual">
            <h2>School handoff</h2>
            <p>Diana cannot submit this assignment directly. Download the verified PDF above, then use the teacher’s required hand-in method.</p>
            {assignment.external_url ? <a href={assignment.external_url} target="_blank" rel="noreferrer">Open school assignment</a> : null}
          </section>
        )}
      </main>
    </div>
  );
}
