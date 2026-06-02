"use client";

import { useState, useTransition } from "react";
import { ExternalLink } from "lucide-react";
import { markExternalSubmission } from "./actions";

type Provider = "canvas" | "google_classroom" | "ics" | "clever" | string | null;
type SubmissionStatus = "not_started" | "opened_external" | "marked_submitted" | "not_supported" | string | null;

const PROVIDER_LABEL: Record<string, string> = {
  canvas: "Canvas",
  google_classroom: "Google Classroom",
};

function providerLabel(provider: Provider): string {
  if (!provider) return "school system";
  return PROVIDER_LABEL[provider] ?? provider.replace(/_/g, " ");
}

function statusText(status: SubmissionStatus): string {
  if (status === "opened_external") return "Opened in the school system.";
  if (status === "marked_submitted") return "Marked submitted in Diana.";
  if (status === "not_supported") return "Submission sync is not available for this source.";
  return "Not synced yet.";
}

export function ExternalSubmissionSync({
  assignmentId,
  provider,
  externalUrl,
  initialStatus,
}: {
  assignmentId: string;
  provider: Provider;
  externalUrl: string | null;
  initialStatus: SubmissionStatus;
}) {
  const [status, setStatus] = useState<SubmissionStatus>(initialStatus ?? "not_started");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const label = providerLabel(provider);

  if (provider !== "canvas" && provider !== "google_classroom") return null;

  function update(nextStatus: "opened_external" | "marked_submitted" | "not_supported") {
    setMessage(null);
    startTransition(async () => {
      const result = await markExternalSubmission({ id: assignmentId, status: nextStatus });
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setStatus(nextStatus);
      setMessage(result.message ?? "School system handoff saved");
    });
  }

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="space-y-1">
        <h2 className="text-sm font-medium">School system handoff</h2>
        <p className="text-sm text-muted">
          Open this assignment in {label}, submit there, then mark the handoff here.
        </p>
        <p className="text-xs text-muted">{statusText(status)}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {externalUrl ? (
          <a
            href={externalUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => update("opened_external")}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-border/30"
          >
            <ExternalLink size={14} />
            Open in {label}
          </a>
        ) : (
          <button
            type="button"
            onClick={() => update("not_supported")}
            disabled={pending}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-border/30 disabled:opacity-50"
          >
            No provider link
          </button>
        )}
        <button
          type="button"
          onClick={() => update("marked_submitted")}
          disabled={pending}
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          I submitted it in {label}
        </button>
      </div>
      {message && <p className="text-xs text-muted">{message}</p>}
    </section>
  );
}
