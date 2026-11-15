"use client";

import { useState, useTransition, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Download, FileText } from "lucide-react";

import { prepareCanonicalAssignmentDeliveryDownload } from "@/app/(app)/assignments/[id]/delivery-actions";
import { parseAssignmentInkDocument } from "@/lib/assignment-ink";
import { canonicalSubmissionPayloadForTarget } from "@/lib/assignment-submission";
import type { CanonicalRenderBlock } from "@/lib/specialist-artifacts/render-blocks";
import type { AssignmentSubmissionPreview as SubmissionPreview } from "@/lib/assignment-workspace-contracts";

const RUNTIME_STATUS_LABEL = {
  healthy: "Available",
  degraded: "Limited",
  unavailable: "Unavailable",
  unknown: "Status unknown",
} as const;

function InkPreview({ value, number }: { value: string; number: number }) {
  const document = parseAssignmentInkDocument(value);
  if (document.strokes.length === 0) return null;
  return (
    <figure className="sd-submission-ink-preview">
      <figcaption>Handwriting</figcaption>
      <svg
        viewBox={`0 0 ${document.logicalWidth} ${document.logicalHeight}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Handwriting for problem ${number}`}
      >
        {document.strokes.map((stroke) => (
          <polyline key={stroke.id} points={stroke.points.map((point) => `${point.x},${point.y}`).join(" ")} />
        ))}
      </svg>
    </figure>
  );
}

function SpecialistBlockPreview({ block }: { block: CanonicalRenderBlock }) {
  const fallbackVisible = block.runtimeHealth.status !== "healthy";
  return (
    <article className="sd-submission-problem" data-specialist-kind={block.type}>
      <header>
        <h3>{block.label}</h3>
        <span>{RUNTIME_STATUS_LABEL[block.runtimeHealth.status]}</span>
      </header>
      <p className="sd-submission-problem-prompt">{block.summary}</p>
      {block.plainText ? (
        <div className="sd-submission-typed-work">
          <strong>Specialist work</strong>
          <pre>{block.plainText}</pre>
        </div>
      ) : null}
      {fallbackVisible ? (
        <p className="sd-submission-empty-work">
          Typed and handwriting work remains included in this submission.
        </p>
      ) : null}
    </article>
  );
}

export function AssignmentSubmissionPreview({ preview }: { preview: SubmissionPreview }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const canonicalPayload = canonicalSubmissionPayloadForTarget(preview, "preview");

  function downloadPreparedPdf(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (pending) return;
    if (!preview.payloadDigest) {
      setMessage("Refresh this review before preparing the PDF.");
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await prepareCanonicalAssignmentDeliveryDownload({
        assignmentId: preview.assignmentId,
        payloadDigest: preview.payloadDigest ?? "",
      });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      const link = document.createElement("a");
      link.href = result.downloadUrl;
      link.download = result.file.filename;
      link.hidden = true;
      document.body.append(link);
      link.click();
      link.remove();
      router.refresh();
    });
  }

  return (
    <section className="sd-submission-preview" aria-labelledby="submission-preview-title">
      <div className="sd-submission-preview-heading">
        <div><FileText size={22} aria-hidden="true" /><div><p>Outgoing work</p><h2 id="submission-preview-title">Review exactly what will be submitted</h2></div></div>
        <a href="#" aria-disabled={pending} onClick={downloadPreparedPdf}>
          <Download size={18} aria-hidden="true" /> {pending ? "Preparing PDF" : "Download PDF"}
        </a>
      </div>

      {message ? <p className="sd-source-calm-error" role="status">{message}</p> : null}

      <dl className="sd-submission-preview-facts">
        <div><dt>Destination</dt><dd>{preview.destination}</dd></div>
        <div><dt>Prepared file</dt><dd>{preview.fileName}</dd></div>
        <div><dt>Problems</dt><dd>{preview.problems.length || "Full assignment"}</dd></div>
      </dl>

      {canonicalPayload.specialistProjection.contextBlocks.length > 0 ? (
        <div className="sd-submission-problems" aria-label="Specialist assignment work">
          {canonicalPayload.specialistProjection.contextBlocks.map((block) => (
            <SpecialistBlockPreview key={block.id} block={block} />
          ))}
        </div>
      ) : null}

      {preview.incompleteProblemNumbers.length > 0 ? (
        <div className="sd-submission-incomplete" role="status">
          <AlertTriangle size={19} aria-hidden="true" />
          <span><strong>Still marked incomplete:</strong> Problems {preview.incompleteProblemNumbers.join(", ")}. You can submit, but review these first.</span>
        </div>
      ) : null}

      {preview.problems.length > 0 ? (
        <div className="sd-submission-problems">
          {preview.problems.map((problem) => (
            <article key={problem.id} className="sd-submission-problem" data-complete={problem.complete || undefined}>
              <header><h3>Problem {problem.number}</h3><span>{problem.complete ? "Done" : "Incomplete"}</span></header>
              <p className="sd-submission-problem-prompt">{problem.prompt}</p>
              {problem.typedWork ? <div className="sd-submission-typed-work"><strong>Student work</strong><pre>{problem.typedWork}</pre></div> : <p className="sd-submission-empty-work">No typed work saved.</p>}
              <InkPreview value={problem.inkData} number={problem.number} />
            </article>
          ))}
        </div>
      ) : (
        <div className="sd-submission-text-payload">
          <strong>Student work</strong>
          <pre>{(preview.universalTextPayload ?? canonicalPayload.universalTextPayload) || (canonicalPayload.specialistProjection.contextBlocks.length === 0 ? canonicalPayload.textPayload : "No typed work saved.") || "No work saved yet."}</pre>
        </div>
      )}
    </section>
  );
}
