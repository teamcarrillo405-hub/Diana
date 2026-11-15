"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink, FileText, Loader2, Send, X } from "lucide-react";

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

type Provider = "canvas" | "google_classroom" | "ics" | "clever" | string | null;
type SubmissionStatus = "not_started" | "opened_external" | "marked_submitted" | "not_supported" | string | null;
const PROVIDER_LABEL: Record<string, string> = { canvas: "Canvas", google_classroom: "Google Classroom" };

function providerLabel(provider: Provider) {
  return provider ? PROVIDER_LABEL[provider] ?? provider.replace(/_/gu, " ") : "school system";
}

function statusText(status: SubmissionStatus, receiptStatus: SubmissionReceiptStatus | null) {
  if (receiptStatus === "submitted") return "Submission receipt confirmed.";
  if (receiptStatus === "prepared" || receiptStatus === "confirmation_pending") return "The school system is still confirming this submission.";
  if (receiptStatus === "not_accepted") return "The last direct submission needs attention.";
  if (status === "opened_external") return "Opened in the school system.";
  if (status === "marked_submitted") return "Marked submitted in Diana.";
  if (status === "not_supported") return "Direct submission is not available for this assignment.";
  return "Not submitted yet.";
}

function newIdempotencyKey() {
  return globalThis.crypto.randomUUID();
}

export function ExternalSubmissionSync({ assignmentId, assignmentTitle, provider, externalUrl, initialStatus, deliveryFile, preview }: {
  assignmentId: string;
  assignmentTitle: string;
  provider: Provider;
  externalUrl: string | null;
  initialStatus: SubmissionStatus;
  deliveryFile: PreparedAssignmentSubmissionFile | null;
  preview: AssignmentSubmissionPreview;
}) {
  const [status, setStatus] = useState<SubmissionStatus>(initialStatus ?? "not_started");
  const [receiptStatus, setReceiptStatus] = useState<SubmissionReceiptStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [attachedFile, setAttachedFile] = useState<PreparedAssignmentSubmissionFile | null>(() => (
    deliveryFile?.payloadDigest === preview.payloadDigest ? deliveryFile : null
  ));
  const [capabilities, setCapabilities] = useState<ProviderSubmissionCapabilities>(() => submissionCapabilities(provider));
  const [confirmation, setConfirmation] = useState<"text" | "file" | null>(null);
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
        setMessage(result.error);
        return;
      }
      setCapabilities(result.capabilities);
      setReceiptStatus(result.receiptStatus);
      if (result.receiptDetail && (result.receiptStatus === "not_accepted" || result.receiptStatus === "confirmation_pending")) {
        setMessage(result.receiptDetail);
      }
    });
    return () => { active = false; };
  }, [assignmentId]);

  useEffect(() => {
    setAttachedFile(deliveryFile?.payloadDigest === preview.payloadDigest ? deliveryFile : null);
    setConfirmation(null);
  }, [deliveryFile, preview.payloadDigest]);

  if (provider !== "canvas" && provider !== "google_classroom") return null;

  const directBlocked = receiptStatus === "submitted" || receiptStatus === "prepared" || receiptStatus === "confirmation_pending";
  const canCheckSubmission = receiptStatus === "prepared" || receiptStatus === "confirmation_pending";
  const canSubmitText = provider === "canvas"
    && capabilities.capabilities.includes("submit_text")
    && !hasSpecialistArtifacts
    && !directBlocked;
  const canSubmitFile = capabilities.capabilities.includes("upload_file")
    && !requiresExternalBinaryHandoff
    && !directBlocked;
  const preferredSubmission: "text" | "file" | null = hasSpecialistArtifacts
    ? canSubmitFile ? "file" : null
    : canSubmitText ? "text" : canSubmitFile ? "file" : null;
  const providerNote = requiresExternalBinaryHandoff
    ? `Diana's PDF includes a canonical visible summary and attached bounded machine-readable artifact, but not the original CAD or media source file. Open ${label} and attach the source file there.`
    : hasSpecialistArtifacts
    ? canSubmitFile
      ? `${label} will receive a PDF with a canonical visible summary and attached bounded machine-readable artifact.`
      : `${label} cannot receive Diana's specialist PDF directly. Open the assignment to complete the handoff there.`
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

  function update(nextStatus: "opened_external" | "marked_submitted" | "not_supported") {
    setMessage(null);
    startTransition(async () => {
      const result = await markExternalSubmission({ id: assignmentId, status: nextStatus });
      if (result.error) return setMessage(result.error);
      setStatus(nextStatus);
      setMessage(result.message ?? "School system handoff saved");
    });
  }

  const confirmationType = confirmation === "file" ? "PDF file" : "Text entry";
  const confirmationOutput = confirmation === "file" ? attachedFile?.filename ?? preview.fileName : "The exact text shown in this review";

  return (
    <section className="sd-provider-handoff" aria-labelledby="provider-handoff-title">
      <div className="sd-provider-handoff-heading">
        <div>
          <p>School system</p>
          <h2 id="provider-handoff-title">{label}</h2>
        </div>
        <span>{statusText(status, receiptStatus)}</span>
      </div>
      <p className="sd-provider-note">{providerNote}</p>

      {confirmation ? (
        <section className="sd-provider-confirmation" aria-labelledby="provider-confirmation-title">
          <div className="sd-provider-confirmation-heading">
            <div><FileText size={20} aria-hidden="true" /><h3 id="provider-confirmation-title">Confirm what Diana will send</h3></div>
            <button type="button" aria-label="Close submission confirmation" onClick={() => setConfirmation(null)} disabled={pending}><X size={20} aria-hidden="true" /></button>
          </div>
          <dl>
            <div><dt>Destination</dt><dd>{label}</dd></div>
            <div><dt>Assignment</dt><dd>{assignmentTitle}</dd></div>
            <div><dt>Submission type</dt><dd>{confirmationType}</dd></div>
            <div><dt>Output</dt><dd>{confirmationOutput}</dd></div>
          </dl>
          {confirmation === "text" ? <pre aria-label="Text Diana will submit">{lmsPayload.textPayload}</pre> : (
            <p className="sd-provider-file-note">{hasSpecialistArtifacts
              ? "This PDF contains the typed work, handwriting previews, a canonical visible specialist summary, and an attached bounded machine-readable artifact."
              : "This PDF contains the typed work and handwriting previews shown above."}</p>
          )}
          <button type="button" className="sd-provider-confirm" onClick={confirmDirectSubmission} disabled={pending}>
            {pending ? <Loader2 size={20} className="animate-spin" aria-hidden="true" /> : <Send size={20} aria-hidden="true" />}
            {pending ? "Sending" : `Confirm and send to ${label}`}
          </button>
        </section>
      ) : null}

      <div className="sd-provider-actions">
        {canCheckSubmission ? <button type="button" onClick={checkSubmissionStatus} disabled={pending}>Check submission status</button> : null}
        {preferredSubmission ? (
          <button type="button" data-primary="true" onClick={openConfirmation} disabled={pending}>
            {pending ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />}
            {pending ? "Preparing" : preferredSubmission === "file" ? "Review PDF submission" : "Review Canvas submission"}
          </button>
        ) : null}
        {externalUrl ? <a href={externalUrl} target="_blank" rel="noreferrer" onClick={() => update("opened_external")}><ExternalLink size={18} aria-hidden="true" />Open in {label}</a> : null}
        {!preferredSubmission && !externalUrl ? <button type="button" onClick={() => update("not_supported")} disabled={pending}>Direct submission unavailable</button> : null}
      </div>
      {message ? <p className="sd-source-calm-error" role="status">{message}</p> : null}
    </section>
  );
}
