"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import {
  checkConnectedProviderSubmissionStatus,
  getConnectedProviderSubmissionState,
  markExternalSubmission,
  submitToConnectedProvider,
} from "./actions";
import { submitFileToConnectedProvider, uploadAssignmentDeliveryFile } from "./delivery-actions";
import {
  submissionCapabilities,
  type ProviderSubmissionCapabilities,
  type SubmissionReceiptStatus,
} from "@/lib/lms/submission-capabilities";

type Provider = "canvas" | "google_classroom" | "ics" | "clever" | string | null;
type SubmissionStatus = "not_started" | "opened_external" | "marked_submitted" | "not_supported" | string | null;
const PROVIDER_LABEL: Record<string, string> = { canvas: "Canvas", google_classroom: "Google Classroom" };

function providerLabel(provider: Provider) {
  return provider ? PROVIDER_LABEL[provider] ?? provider.replace(/_/g, " ") : "school system";
}

function statusText(status: SubmissionStatus, receiptStatus: SubmissionReceiptStatus | null) {
  if (receiptStatus === "submitted") return "Submission receipt confirmed.";
  if (receiptStatus === "prepared" || receiptStatus === "confirmation_pending") return "Submission receipt is still being confirmed.";
  if (receiptStatus === "not_accepted") return "The last direct submission was not accepted.";
  if (status === "opened_external") return "Opened in the school system.";
  if (status === "marked_submitted") return "Marked submitted in Diana.";
  if (status === "not_supported") return "Submission sync is not available for this source.";
  return "Not synced yet.";
}

function newIdempotencyKey() {
  return globalThis.crypto.randomUUID();
}

export function ExternalSubmissionSync({ assignmentId, assignmentTitle, provider, externalUrl, initialStatus, deliveryFile }: {
  assignmentId: string;
  assignmentTitle: string;
  provider: Provider;
  externalUrl: string | null;
  initialStatus: SubmissionStatus;
  deliveryFile: { id: string; filename: string } | null;
}) {
  const [status, setStatus] = useState<SubmissionStatus>(initialStatus ?? "not_started");
  const [receiptStatus, setReceiptStatus] = useState<SubmissionReceiptStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [attachedFile, setAttachedFile] = useState(deliveryFile);
  const [capabilities, setCapabilities] = useState<ProviderSubmissionCapabilities>(() => submissionCapabilities(provider));
  const idempotencyKey = useRef(newIdempotencyKey());
  const router = useRouter();
  const label = providerLabel(provider);

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

  if (provider !== "canvas" && provider !== "google_classroom") return null;

  const directBlocked = receiptStatus === "submitted" || receiptStatus === "prepared" || receiptStatus === "confirmation_pending";
  const canCheckSubmission = receiptStatus === "prepared" || receiptStatus === "confirmation_pending";
  const canSubmitAttachedFile = Boolean(attachedFile) && capabilities.capabilities.includes("upload_file") && !directBlocked;
  const canSubmitCanvasText = provider === "canvas" && !attachedFile && capabilities.capabilities.includes("submit_text") && !directBlocked;
  const canSubmitDirectly = canSubmitAttachedFile || canSubmitCanvasText;

  function submitDirectly() {
    if (!canSubmitDirectly) return;
    setMessage(null);
    const detail = [`Destination: ${label}`, `Assignment: ${assignmentTitle}`, attachedFile ? `Submission: ${attachedFile.filename}` : "Submission: Diana text", "", "Send now?"].join("\n");
    if (!window.confirm(detail)) return;
    startTransition(async () => {
      const result = attachedFile
        ? await submitFileToConnectedProvider({
            assignmentId,
            fileId: attachedFile.id,
            confirmed: true,
            idempotencyKey: idempotencyKey.current,
          })
        : await submitToConnectedProvider({
            assignmentId,
            confirmed: true,
            idempotencyKey: idempotencyKey.current,
          });
      if (!result.ok) {
        if (result.receiptStatus) setReceiptStatus(result.receiptStatus);
        if (result.receiptStatus === "not_accepted") idempotencyKey.current = newIdempotencyKey();
        setMessage(result.error);
        return;
      }
      setReceiptStatus("submitted");
      setStatus("marked_submitted");
      setMessage(result.message);
      router.refresh();
    });
  }

  function attachFile() {
    if (!file) return setMessage("Choose a finished file first.");
    const formData = new FormData();
    formData.set("assignmentId", assignmentId);
    formData.set("file", file);
    startTransition(async () => {
      const result = await uploadAssignmentDeliveryFile(formData);
      if (!result.ok) return setMessage(result.error);
      setAttachedFile(result.file);
      setFile(null);
      idempotencyKey.current = newIdempotencyKey();
      setMessage(`${result.file.filename} is ready to send.`);
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

  const accept = capabilities.allowedExtensions.length > 0
    ? capabilities.allowedExtensions.map((extension) => `.${extension}`).join(",")
    : undefined;

  return <section className="space-y-3 rounded-xl border border-border bg-card p-4">
    <div className="space-y-1">
      <h2 className="text-sm font-medium">School system handoff</h2>
      <p className="text-sm text-muted">Open this assignment in {label}, submit there, then mark the handoff here.</p>
      <p className="text-xs text-muted">{capabilities.note}</p>
      <p className="text-xs text-muted">{statusText(status, receiptStatus)}</p>
      {capabilities.capabilities.includes("upload_file") ? <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="text-xs text-muted">
          Finished file
          <input
            type="file"
            accept={accept}
            className="ml-2 max-w-48 text-xs"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <button type="button" onClick={attachFile} disabled={pending || !file} className="rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-50">Attach file</button>
        {attachedFile ? <span className="text-xs text-muted">Ready: {attachedFile.filename}</span> : null}
      </div> : null}
    </div>
    <div className="flex flex-wrap gap-2">
      {canCheckSubmission ? <button type="button" onClick={checkSubmissionStatus} disabled={pending} className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        Check submission status
      </button> : null}
      {canSubmitDirectly ? <button type="button" onClick={submitDirectly} disabled={pending} className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {attachedFile ? "Submit attached file" : "Submit from Diana"}
      </button> : null}
      {externalUrl ? <a href={externalUrl} target="_blank" rel="noreferrer" onClick={() => update("opened_external")} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-border/30"><ExternalLink size={14} />Open in {label}</a> : <button type="button" onClick={() => update("not_supported")} disabled={pending} className="rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-50">No provider link</button>}
      <button type="button" onClick={() => update("marked_submitted")} disabled={pending || receiptStatus === "submitted"} className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50">I submitted it in {label}</button>
    </div>
    {message ? <p className="text-xs text-muted" role="status">{message}</p> : null}
  </section>;
}
