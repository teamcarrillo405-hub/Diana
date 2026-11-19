import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, FilePenLine } from "lucide-react";

import { AssignmentSubmissionDownload, AssignmentSubmissionPreview } from "@/components/assignment-submission-preview";
import { StudentShell } from "@/components/student-shell/student-shell";
import type { StudentNavigationProfile } from "@/components/screen-design/student-desktop-nav";
import { SectionTabs } from "@/components/student-shell/section-tabs";
import styles from "@/components/student-shell/submission.module.css";
import { loadAssignmentSubmissionBundle } from "@/lib/assignment-submission-server";
import { submittedWorkPath, WORK_RETURN_PATH } from "@/lib/assignment-navigation";
import { safeCalendarReturnHref, withCalendarReturn } from "@/lib/calendar-return";
import { formatHandInTime } from "@/lib/assignment-submission-time";
import { subjectPresentationFor } from "@/lib/assignment-subject-presentation";
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

type SubmissionReceipt = {
  id: string;
  provider: string | null;
  providerReceiptId: string | null;
  filename: string | null;
  payloadDigest: string | null;
};

function SubmittedAssignmentReceipt({ assignmentId, title, className, status, submittedAt, timeZone, externalSource, receipt, navigationProfile, calendarReturn }: {
  assignmentId: string;
  title: string;
  className: string;
  status: string;
  submittedAt: string | null;
  timeZone?: string | null;
  externalSource: string | null;
  receipt: SubmissionReceipt | null;
  navigationProfile?: StudentNavigationProfile;
  calendarReturn: string | null;
}) {
  const graded = status === "graded";
  const provider = receipt?.providerReceiptId && receipt.provider === externalSource
    ? externalSource === "canvas" ? "Canvas" : externalSource === "google_classroom" ? "Google Classroom" : null
    : null;
  const submittedDate = formatHandInTime(submittedAt, timeZone);
  return (
    <StudentShell active="Work" className={styles.root} profile={navigationProfile}>
      <main id="main-content" className={styles.main}>
        <nav aria-label="Submission navigation" className={styles.routeLinks}>
          <Link href={calendarReturn ?? WORK_RETURN_PATH} className={styles.back}><ArrowLeft size={18} aria-hidden="true" />{calendarReturn ? "Back to Calendar" : "Back to Work"}</Link>
        </nav>
        <section className={styles.receipt} aria-labelledby="submission-receipt-title">
          <div className={styles.receiptHeading}>
            <CheckCircle2 size={34} aria-hidden="true" />
            <div>
              <p className={styles.eyebrow}>{provider ? "School confirmation" : "Diana Record"}</p>
              <h1 id="submission-receipt-title">{graded ? "Grade recorded" : provider ? "Submission confirmed" : "Submission recorded"}</h1>
            </div>
          </div>
          <div className={`${styles.paper} ${styles.receiptDetails}`}>
            <h2 className={styles.receiptAssignment}>{title} <span>{className}</span></h2>
            <p>{provider ? `${provider} confirmed this hand-in.` : externalSource === "canvas" || externalSource === "google_classroom" ? "This hand-in is recorded in Diana. Check your school assignment for its confirmation." : "This hand-in is recorded in Diana."}</p>
            <dl className={styles.facts}>
              <div><dt>Destination</dt><dd>{provider ?? "School hand-in"}</dd></div>
              {submittedAt && submittedDate ? <div><dt>Hand-in recorded</dt><dd><time dateTime={submittedAt}>{submittedDate}</time></dd></div> : null}
              {receipt?.filename ? <div><dt>Submitted file</dt><dd>{receipt.filename}</dd></div> : null}
            </dl>
            <div className={styles.controls}>
              <Link href={withCalendarReturn(submittedWorkPath(assignmentId), calendarReturn)} className={styles.primary}>View submitted work<ArrowRight size={18} aria-hidden="true" /></Link>
              <Link href="/proof" className={styles.secondary}>Open Record</Link>
            </div>
            {receipt ? <details className={styles.options}>
              <summary>Receipt details</summary>
              <dl className={styles.facts}>
                <div><dt>Diana receipt ID</dt><dd>{receipt.id}</dd></div>
                {provider ? <div><dt>{provider} receipt ID</dt><dd>{receipt.providerReceiptId}</dd></div> : null}
                {receipt.payloadDigest ? <div><dt>File fingerprint</dt><dd>{receipt.payloadDigest.slice(0, 12).toUpperCase()}</dd></div> : null}
              </dl>
            </details> : null}
          </div>
        </section>
      </main>
    </StudentShell>
  );
}

export default async function SubmitPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ calendarReturn?: string; step?: string }> }) {
  const { id } = await params;
  const requestedView = await searchParams;
  const calendarReturn = safeCalendarReturnHref(requestedView?.calendarReturn);
  const initialStep = requestedView?.step === "hand-in" ? "hand-in" : "review";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [bundle, { data: profile }] = await Promise.all([
    loadAssignmentSubmissionBundle({ supabase, ownerId: user.id, assignmentId: id }),
    supabase.from("profiles").select("display_name, photo_url, photo_offset_x, photo_offset_y, timezone").eq("user_id", user.id).maybeSingle(),
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
  if (pageState === "workspace") redirect(withCalendarReturn(`/assignments/${id}/workspace`, calendarReturn));
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
    return <SubmittedAssignmentReceipt assignmentId={id} title={assignment.title} className={className} status={assignment.status} submittedAt={assignment.submitted_at} timeZone={profile?.timezone} externalSource={assignment.external_source} receipt={submissionReceipt} navigationProfile={navigationProfile} calendarReturn={calendarReturn} />;
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
  const { unitNoun, unitNounPlural } = subjectPresentationFor(bundle.profile);

  return (
    <StudentShell active="Work" className={styles.root} profile={navigationProfile}>
      <main id="main-content" className={styles.main}>
        <nav aria-label="Submission navigation" className={styles.routeLinks}>
          <Link href={calendarReturn ?? WORK_RETURN_PATH} className={styles.back}><ArrowLeft size={18} aria-hidden="true" />{calendarReturn ? "Back to Calendar" : "Back to Work"}</Link>
          <Link href={withCalendarReturn(`/assignments/${id}/workspace`, calendarReturn)} className={styles.back}><FilePenLine size={17} aria-hidden="true" />Edit in workspace</Link>
        </nav>
        <header className={styles.title}>
          <p className={styles.eyebrow}>{className}</p>
          <h1>{assignment.title}</h1>
          {timeSpent > 0 ? <p className={styles.focusedTime}><Clock3 size={16} aria-hidden="true" />{formatMinutes(timeSpent)} focused time</p> : null}
        </header>

        <div className={styles.submissionFlow}>
          <SectionTabs key={id} id="submission" label="Submission" initial={initialStep} queryKey="step" sections={[
            {
              id: "review",
              label: "Review",
              content: <AssignmentSubmissionPreview preview={preview} unitNoun={unitNoun} unitNounPlural={unitNounPlural} />,
              continueAction: { label: "Continue to hand in", className: `${styles.primary} ${styles.continueAction}` },
            },
            { id: "hand-in", label: "Hand in", content: connectedProvider ? (
              <ExternalSubmissionSync
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
                <SubmissionDestination
                  assignmentId={id}
                  currentUrl={assignment.submission_url}
                  externalUrl={assignment.external_url}
                  externalLabel="Open school assignment"
                  title="Hand in at school"
                  extraAction={<AssignmentSubmissionDownload assignmentId={id} payloadDigest={preview.payloadDigest} />}
                >
                  <p>Download your PDF, then hand it in using your teacher&apos;s required method.</p>
                </SubmissionDestination>
                {checks}
              </div>
            ) },
          ]} />
        </div>
      </main>
    </StudentShell>
  );
}
