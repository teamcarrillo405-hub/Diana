import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, FilePenLine } from "lucide-react";

import { AssignmentSubmissionPreview } from "@/components/assignment-submission-preview";
import { StudentShell } from "@/components/student-shell/student-shell";
import type { StudentNavigationProfile } from "@/components/screen-design/student-desktop-nav";
import { SectionTabs } from "@/components/student-shell/section-tabs";
import styles from "@/components/student-shell/submission.module.css";
import { loadAssignmentSubmissionBundle } from "@/lib/assignment-submission-server";
import { WORK_RETURN_PATH } from "@/lib/assignment-navigation";
import { createClient } from "@/lib/supabase/server";
import { ExternalSubmissionSync } from "../external-submission-sync";
import { SubmitChecklist } from "./checklist";
import { SubmissionDestination } from "./destination";

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

function formatReceiptDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

type SubmissionReceipt = {
  id: string;
  provider: string | null;
  providerReceiptId: string | null;
  filename: string | null;
  payloadDigest: string | null;
};

function SubmittedAssignmentReceipt({ title, className, status, submittedAt, externalSource, receipt, navigationProfile }: {
  title: string;
  className: string;
  status: string;
  submittedAt: string | null;
  externalSource: string | null;
  receipt: SubmissionReceipt | null;
  navigationProfile?: StudentNavigationProfile;
}) {
  const graded = status === "graded";
  const provider = receipt?.providerReceiptId && receipt.provider === externalSource
    ? externalSource === "canvas" ? "Canvas" : externalSource === "google_classroom" ? "Google Classroom" : null
    : null;
  const submittedDate = formatReceiptDate(submittedAt);
  return (
    <StudentShell active="Work" className={styles.root} profile={navigationProfile}>
      <main id="main-content" className={styles.main}>
        <Link href={WORK_RETURN_PATH} className={styles.back}><ArrowLeft size={18} aria-hidden="true" />Back to Work</Link>
        <section className={`${styles.paper} ${styles.receipt}`} aria-labelledby="submission-receipt-title">
          <div className={styles.receiptHeading}>
            <CheckCircle2 size={34} aria-hidden="true" />
            <div>
              <p className={styles.eyebrow}>{provider ? "School confirmation" : "Diana Record"}</p>
              <h1 id="submission-receipt-title">{graded ? "Grade recorded" : provider ? "Submission confirmed" : "Submission recorded"}</h1>
            </div>
          </div>
          <p className={styles.receiptAssignment}>{title} <span>{className}</span></p>
          <p>{provider ? `${provider} confirmed this hand-in.` : externalSource === "canvas" || externalSource === "google_classroom" ? "This hand-in is recorded in Diana. Check your school assignment for its confirmation." : "This hand-in is recorded in Diana."}</p>
          {submittedDate || receipt?.filename ? <dl className={styles.facts}>
            {submittedDate ? <div><dt>Hand-in recorded</dt><dd>{submittedDate}</dd></div> : null}
            {receipt?.filename ? <div><dt>Submitted file</dt><dd>{receipt.filename}</dd></div> : null}
          </dl> : null}
          <div className={styles.controls}>
            <Link href="/proof" className={styles.primary}>Open Record<ArrowRight size={18} aria-hidden="true" /></Link>
          </div>
          {receipt ? <details className={styles.options}>
            <summary>Receipt details</summary>
            <dl className={styles.facts}>
              <div><dt>Diana receipt ID</dt><dd>{receipt.id}</dd></div>
              {provider ? <div><dt>{provider} receipt ID</dt><dd>{receipt.providerReceiptId}</dd></div> : null}
              {receipt.payloadDigest ? <div><dt>File fingerprint</dt><dd>{receipt.payloadDigest.slice(0, 12).toUpperCase()}</dd></div> : null}
            </dl>
          </details> : null}
        </section>
      </main>
    </StudentShell>
  );
}

export default async function SubmitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [bundle, { data: profile }] = await Promise.all([
    loadAssignmentSubmissionBundle({ supabase, ownerId: user.id, assignmentId: id }),
    supabase.from("profiles").select("display_name, photo_url, photo_offset_x, photo_offset_y").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!bundle) notFound();
  const { assignment, className, preview } = bundle;
  const navigationProfile = profile ? {
    displayName: profile.display_name,
    photoUrl: profile.photo_url,
    photoOffsetX: profile.photo_offset_x,
    photoOffsetY: profile.photo_offset_y,
  } : undefined;
  const pageState = submissionPageState(assignment.status);
  if (pageState === "workspace") redirect(`/assignments/${id}/workspace`);
  if (pageState === "receipt") {
    const { data: receipt } = await supabase
      .from("assignment_submission_receipts")
      .select("id, provider, provider_receipt_id, assignment_submission_files(filename, payload_digest)")
      .eq("assignment_id", id)
      .eq("owner_id", user.id)
      .eq("status", "submitted")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const relation = receipt?.assignment_submission_files;
    const submissionReceipt: SubmissionReceipt | null = receipt
      ? {
          id: receipt.id,
          provider: receipt.provider,
          providerReceiptId: receipt.provider_receipt_id?.trim() || null,
          filename: relation?.filename ?? null,
          payloadDigest: relation?.payload_digest ?? null,
        }
      : null;
    return <SubmittedAssignmentReceipt title={assignment.title} className={className} status={assignment.status} submittedAt={assignment.submitted_at} externalSource={assignment.external_source} receipt={submissionReceipt} navigationProfile={navigationProfile} />;
  }

  const [{ data: items }, { data: timeLogs }] = await Promise.all([
    supabase.from("submission_checklist").select("id, label, detail, required, checked, position").eq("assignment_id", id).eq("owner_id", user.id).order("position", { ascending: true }),
    supabase.from("assignment_time_log").select("started_at, ended_at, elapsed_minutes").eq("assignment_id", id).eq("owner_id", user.id),
  ]);
  const { data: deliveryFiles } = preview.payloadDigest
    ? await supabase
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
  const timeSpent = (timeLogs ?? []).reduce((total, log) => {
    if (typeof log.elapsed_minutes === "number") return total + log.elapsed_minutes;
    if (!log.ended_at) return total;
    return total + Math.max(0, (new Date(log.ended_at).getTime() - new Date(log.started_at).getTime()) / 60_000);
  }, 0);
  const connectedProvider = assignment.external_source === "canvas" || assignment.external_source === "google_classroom";
  const storedFile = deliveryFiles?.[0];
  const deliveryFile = storedFile?.payload_digest && storedFile.payload_digest === preview.payloadDigest
    ? {
        id: storedFile.id,
        filename: storedFile.filename,
        payloadDigest: storedFile.payload_digest,
      }
    : null;
  const checks = <SubmitChecklist assignmentId={id} items={checklist} showFinalConfirmation={!connectedProvider} />;

  return (
    <StudentShell active="Work" className={styles.root} profile={navigationProfile}>
      <main id="main-content" className={styles.main}>
        <div className={styles.routeLinks}>
          <Link href={WORK_RETURN_PATH} className={styles.back}><ArrowLeft size={18} aria-hidden="true" />Back to Work</Link>
          <Link href={`/assignments/${id}/workspace`} className={styles.back}><FilePenLine size={17} aria-hidden="true" />Edit in workspace</Link>
        </div>
        <header className={styles.title}>
          <p className={styles.eyebrow}>{className}</p>
          <h1>{assignment.title}</h1>
          {timeSpent > 0 ? <p className={styles.focusedTime}><Clock3 size={16} aria-hidden="true" />{formatMinutes(timeSpent)} focused time</p> : null}
        </header>

        <SectionTabs id="submission" label="Submission" sections={[
          { id: "review", label: "Review", content: <AssignmentSubmissionPreview preview={preview} /> },
          { id: "hand-in", label: "Hand in", content: connectedProvider ? (
            <ExternalSubmissionSync
              key={id}
              assignmentId={id}
              assignmentTitle={assignment.title}
              provider={assignment.external_source}
              externalUrl={assignment.external_url}
              currentUrl={assignment.submission_url}
              initialStatus={assignment.submission_sync_status}
              deliveryFile={deliveryFile}
              preview={preview}
            >{checks}</ExternalSubmissionSync>
          ) : (
            <div className={styles.handoff}>
              <SubmissionDestination assignmentId={id} currentUrl={assignment.submission_url} externalUrl={assignment.external_url} externalLabel="Open school assignment" title="Hand in at school">
                <p>Download your PDF from Review and hand it in using your teacher&apos;s required method.</p>
              </SubmissionDestination>
              {checks}
            </div>
          ) },
        ]} />
      </main>
    </StudentShell>
  );
}
