"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Send, X } from "lucide-react";

import {
  checkConnectedProviderSubmissionStatus,
  getConnectedProviderSubmissionState,
  markExternalSubmission,
  submitToConnectedProvider,
} from "./actions";
import {
  prepareCanonicalAssignmentDeliveryFile,
  submitFileToConnectedProvider,
} from "./delivery-actions";
import {
  submissionCapabilities,
  type ProviderSubmissionCapabilities,
  type SubmissionReceiptStatus,
} from "@/lib/lms/submission-capabilities";
import type { PreparedAssignmentSubmissionFile } from "@/lib/assignment-submission-server";
import { canonicalSubmissionPayloadForTarget } from "@/lib/assignment-submission";
import type { AssignmentSubmissionPreview } from "@/lib/assignment-workspace-contracts";
import styles from "@/components/student-shell/submission.module.css";
import { SubmissionDestination } from "./submit/destination";

type Provider = "canvas" | "google_classroom" | "ics" | "clever" | string | null;
type SubmissionStatus = "not_started" | "opened_external" | "marked_submitted" | "not_supported" | string | null;
const PROVIDER_LABEL: Record<string, string> = { canvas: "Canvas", google_classroom: "Google Classroom" };

function providerLabel(provider: Provider) {
  return provider ? PROVIDER_LABEL[provider] ?? provider.replace(/_/gu, " ") : "school system";
}

function newIdempotencyKey() {
  return globalThis.crypto.randomUUID();
}

export function ExternalSubmissionSync({ assignmentId, assignmentTitle, provider, externalUrl, currentUrl = null, initialStatus, deliveryFile, preview, children }: {
  assignmentId: string;
  assignmentTitle: string;
  provider: Provider;
  externalUrl: string | null;
  currentUrl?: string | null;
  initialStatus: SubmissionStatus;
  deliveryFile: PreparedAssignmentSubmissionFile | null;
  preview: AssignmentSubmissionPreview;
  children?: ReactNode;
}) {
  const [status, setStatus] = useState<SubmissionStatus>(initialStatus ?? "not_started");
  const [receiptStatus, setReceiptStatus] = useState<SubmissionReceiptStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [attachedFile, setAttachedFile] = useState<PreparedAssignmentSubmissionFile | null>(() => (
    deliveryFile?.payloadDigest === preview.payloadDigest ? deliveryFile : null
  ));
  const [capabilities, setCapabilities] = useState<ProviderSubmissionCapabilities>(() => submissionCapabilities(provider));
  const [connection, setConnection] = useState<"loading" | "ready" | "unavailable" | "reconnect">("loading");
  const [confirmation, setConfirmation] = useState<"text" | "file" | null>(null);
  const confirmationTitle = useRef<HTMLHeadingElement>(null);
  const reviewButton = useRef<HTMLButtonElement>(null);
  const restoreReviewFocus = useRef(false);
  const idempotencyKey = useRef(newIdempotencyKey());
  const router = useRouter();
  const label = providerLabel(provider);
  const lmsPayload = canonicalSubmissionPayloadForTarget(preview, "lms");
  const hasSpecialistArtifacts = lmsPayload.specialistDelivery.visibleSummaryIncluded;
  const requiresExternalBinaryHandoff =
    lmsPayload.specialistDelivery.externalHandoffRequired;

  useEffect(() => {
    let active = true;
    void getConnectedProviderSubmissionState({ assignmentId }).then((result) => {
      if (!active) return;
      if (!result.ok) {
        setConnection("unavailable");
        return;
      }
      setConnection(result.connectionReady ? "ready" : "code" in result && result.code === "reconnect_required" ? "reconnect" : "unavailable");
      setCapabilities(result.capabilities);
      setReceiptStatus(result.receiptStatus);
      if (result.receiptDetail && (result.receiptStatus === "not_accepted" || result.receiptStatus === "confirmation_pending")) {
        setMessage(result.receiptDetail);
      }
    }).catch(() => { if (active) setConnection("unavailable"); });
    return () => { active = false; };
  }, [assignmentId]);

  useEffect(() => {
    setAttachedFile(deliveryFile?.payloadDigest === preview.payloadDigest ? deliveryFile : null);
    setConfirmation(null);
  }, [deliveryFile, preview.payloadDigest]);

  useEffect(() => {
    if (confirmation) confirmationTitle.current?.focus();
    else if (restoreReviewFocus.current) {
      restoreReviewFocus.current = false;
      reviewButton.current?.focus();
    }
  }, [confirmation]);

  if (provider !== "canvas" && provider !== "google_classroom") return null;

  const directBlocked = receiptStatus === "submitted" || receiptStatus === "prepared" || receiptStatus === "confirmation_pending";
  const canCheckSubmission = receiptStatus === "prepared" || receiptStatus === "confirmation_pending";
  const canSubmitText = provider === "canvas"
    && connection === "ready"
    && capabilities.capabilities.includes("submit_text")
    && !hasSpecialistArtifacts
    && !directBlocked;
  const canSubmitFile = connection === "ready"
    && capabilities.capabilities.includes("upload_file")
    && (capabilities.allowedExtensions.length === 0 || capabilities.allowedExtensions.some((extension) => extension.toLowerCase() === "pdf"))
    && !requiresExternalBinaryHandoff
    && !directBlocked;
  const preferredSubmission: "text" | "file" | null = hasSpecialistArtifacts
    ? canSubmitFile ? "file" : null
    : canSubmitText ? "text" : canSubmitFile ? "file" : null;
  const providerNote = requiresExternalBinaryHandoff
    ? `Diana's PDF includes a canonical visible summary and attached bounded machine-readable artifact, but not the original CAD or media source file. Open ${label} and attach the source file there.`
    : connection === "loading"
    ? `Checking available hand-in options for ${label}.`
    : connection === "reconnect"
    ? `Reconnect ${label} to hand in from Diana. You can still hand in at school.`
    : connection === "unavailable"
    ? `Direct hand-in to ${label} is unavailable. Hand in using your teacher’s method.`
    : hasSpecialistArtifacts && !directBlocked
    ? canSubmitFile
      ? `${label} will receive a PDF with a canonical visible summary and attached bounded machine-readable artifact.`
      : `${label} cannot receive Diana's specialist PDF directly. Open the assignment to complete the handoff there.`
    : !preferredSubmission && !directBlocked && capabilities.capabilities.includes("upload_file")
    ? `${label} accepts other file types for this assignment. Open the school assignment to hand it in.`
    : capabilities.note;

  function openConfirmation() {
    if (!preferredSubmission) return;
    setMessage(null);
    if (preferredSubmission === "text") {
      setConfirmation("text");
      return;
    }
    if (attachedFile) {
      setConfirmation("file");
      return;
    }
    startTransition(async () => {
      const result = await prepareCanonicalAssignmentDeliveryFile({
        assignmentId,
        payloadDigest: preview.payloadDigest ?? "",
      });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      if (result.file.payloadDigest !== preview.payloadDigest) {
        setMessage("Your work changed while the PDF was being prepared. Refresh the review and try again.");
        router.refresh();
        return;
      }
      setAttachedFile(result.file);
      setConfirmation("file");
    });
  }

  function closeConfirmation() {
    restoreReviewFocus.current = true;
    setConfirmation(null);
  }

  function confirmDirectSubmission() {
    if (!confirmation) return;
    if (confirmation === "file" && !attachedFile) return;
    setMessage(null);
    startTransition(async () => {
      const result = confirmation === "file" && attachedFile
        ? await submitFileToConnectedProvider({
            assignmentId,
            fileId: attachedFile.id,
            confirmed: true,
            idempotencyKey: idempotencyKey.current,
            payloadDigest: preview.payloadDigest ?? "",
          })
        : await submitToConnectedProvider({
            assignmentId,
            confirmed: true,
            idempotencyKey: idempotencyKey.current,
            payloadDigest: preview.payloadDigest ?? "",
          });
      if (!result.ok) {
        if (result.receiptStatus) setReceiptStatus(result.receiptStatus);
        if (result.receiptStatus === "not_accepted") idempotencyKey.current = newIdempotencyKey();
        if ("code" in result && result.code === "stale_artifact") {
          setAttachedFile(null);
          setConfirmation(null);
          idempotencyKey.current = newIdempotencyKey();
          router.refresh();
        }
        setMessage(result.error);
        return;
      }
      setReceiptStatus("submitted");
      setStatus("marked_submitted");
      setConfirmation(null);
      setMessage(result.message);
      router.refresh();
    });
  }

  function checkSubmissionStatus() {
    setMessage(null);
    startTransition(async () => {
      const result = await checkConnectedProviderSubmissionStatus({ assignmentId });
      if (!result.ok) {
        if (result.receiptStatus) setReceiptStatus(result.receiptStatus);
        setMessage(result.error);
        return;
      }
      setReceiptStatus(result.receiptStatus);
      if (result.receiptStatus === "not_accepted") idempotencyKey.current = newIdempotencyKey();
      if (result.receiptStatus === "submitted") setStatus("marked_submitted");
      setMessage(result.message);
      router.refresh();
    });
  }

  function openSchool() {
    if (status === "opened_external" || status === "marked_submitted" || directBlocked) return;
    startTransition(async () => {
      const result = await markExternalSubmission({ id: assignmentId, status: "opened_external" });
      if (!result.error) setStatus("opened_external");
    });
  }

  const confirmationType = confirmation === "file" ? "PDF file" : "Text entry";
  const confirmationOutput = confirmation === "file" ? attachedFile?.filename ?? preview.fileName : "The exact text shown in this review";

  return (
    <div className={styles.handoff}>
      <SubmissionDestination assignmentId={assignmentId} currentUrl={currentUrl} externalUrl={externalUrl} externalLabel={`Open in ${label}`} onOpenSchool={openSchool} title={label}>
        {receiptStatus !== "submitted" && !canCheckSubmission ? <p role="status">{providerNote}</p> : null}
        {connection === "reconnect" ? <Link href="/settings?section=connections" className={styles.inlineLink}>Manage school connections</Link> : null}
      </SubmissionDestination>
      {children}

      {preferredSubmission || directBlocked || receiptStatus === "not_accepted" || message ? (
        <section className={styles.sendPanel} aria-labelledby="provider-handoff-title">
          <h2 id="provider-handoff-title">{canCheckSubmission || receiptStatus === "submitted" ? "School confirmation" : `Send to ${label}`}</h2>
          {canCheckSubmission ? <p>{label} is still confirming this hand-in. Check its status before sending again.</p> : null}
          {receiptStatus === "submitted" && !message ? <p>{label} confirmed this hand-in.</p> : null}
          {receiptStatus === "not_accepted" && !message ? <p>Review the previous attempt before trying again.</p> : null}
          {canCheckSubmission ? <button className={styles.secondary} type="button" onClick={checkSubmissionStatus} disabled={pending}>Check submission status</button> : null}
          {preferredSubmission ? (
            <button ref={reviewButton} className={styles.secondary} type="button" onClick={openConfirmation} disabled={pending || !!confirmation}>
              {pending && !confirmation ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <FileText size={18} aria-hidden="true" />}
              {pending && !confirmation ? "Preparing" : preferredSubmission === "file" ? "Review PDF submission" : "Review Canvas submission"}
            </button>
          ) : null}
          {confirmation ? (
            <div className={styles.providerConfirmation}>
              <div className={styles.panelHeading}>
                <h3 ref={confirmationTitle} tabIndex={-1} id="provider-confirmation-title">Confirm what Diana will send</h3>
                <button className={styles.iconButton} type="button" aria-label="Close submission confirmation" onClick={closeConfirmation} disabled={pending}><X size={20} aria-hidden="true" /></button>
              </div>
              <dl className={styles.facts}>
                <div><dt>Destination</dt><dd>{label}</dd></div>
                <div><dt>Assignment</dt><dd>{assignmentTitle}</dd></div>
                <div><dt>Submission type</dt><dd>{confirmationType}</dd></div>
                <div><dt>Output</dt><dd>{confirmationOutput}</dd></div>
              </dl>
              {confirmation === "text" ? <pre tabIndex={0} aria-label="Text Diana will submit">{lmsPayload.textPayload}</pre> : (
                <p>{hasSpecialistArtifacts
                  ? "This PDF contains the typed work, handwriting previews, a canonical visible specialist summary, and an attached bounded machine-readable artifact."
                  : "This PDF contains the typed work and handwriting previews from Review."}</p>
              )}
              <button type="button" className={styles.primary} onClick={confirmDirectSubmission} disabled={pending || directBlocked}>
                {pending ? <Loader2 size={20} className="animate-spin" aria-hidden="true" /> : <Send size={20} aria-hidden="true" />}
                {pending ? "Sending" : `Confirm and send to ${label}`}
              </button>
            </div>
          ) : null}
          {message ? <p className={styles.notice} role="status">{message}</p> : null}
        </section>
      ) : null}
    </div>
  );
}
