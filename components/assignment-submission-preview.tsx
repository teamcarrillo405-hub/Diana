"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Download, FileText } from "lucide-react";

import { prepareCanonicalAssignmentDeliveryDownload } from "@/app/(app)/assignments/[id]/delivery-actions";
import { parseAssignmentInkDocument } from "@/lib/assignment-ink";
import { canonicalSubmissionPayloadForTarget } from "@/lib/assignment-submission";
import type { CanonicalRenderBlock } from "@/lib/specialist-artifacts/render-blocks";
import type { AssignmentSubmissionPreview as SubmissionPreview } from "@/lib/assignment-workspace-contracts";
import styles from "./student-shell/submission.module.css";

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
    <figure className={styles.inkPreview}>
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
    <article className={styles.workBlock} data-specialist-kind={block.type}>
      <header>
        <h3>{block.label}</h3>
        <span>{RUNTIME_STATUS_LABEL[block.runtimeHealth.status]}</span>
      </header>
      <p>{block.summary}</p>
      {block.plainText ? (
        <div className={styles.typedWork}>
          <strong>Specialist work</strong>
          <pre>{block.plainText}</pre>
        </div>
      ) : null}
      {fallbackVisible ? (
        <p>
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

  function downloadPreparedPdf() {
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
    <section className={styles.paper} aria-labelledby="submission-preview-title">
      <div className={styles.panelHeading}>
        <FileText size={23} aria-hidden="true" /><h2 id="submission-preview-title">Your work</h2>
        <button type="button" className={styles.secondary} disabled={pending} onClick={downloadPreparedPdf}>
          <Download size={18} aria-hidden="true" /> {pending ? "Preparing PDF" : "Download PDF"}
        </button>
      </div>

      {message ? <p className={styles.notice} role="status">{message}</p> : null}

      <dl className={styles.facts}>
        <div><dt>Destination</dt><dd>{preview.destination}</dd></div>
        <div><dt>PDF filename</dt><dd>{preview.fileName}</dd></div>
        <div><dt>Problems</dt><dd>{preview.problems.length || "Full assignment"}</dd></div>
      </dl>

      {canonicalPayload.specialistProjection.contextBlocks.length > 0 ? (
        <div className={styles.workBlocks} aria-label="Specialist assignment work">
          {canonicalPayload.specialistProjection.contextBlocks.map((block) => (
            <SpecialistBlockPreview key={block.id} block={block} />
          ))}
        </div>
      ) : null}

      {preview.incompleteProblemNumbers.length > 0 ? (
        <div className={styles.notice} role="status">
          <AlertTriangle size={19} aria-hidden="true" />
          <span><strong>Still marked incomplete:</strong> Problems {preview.incompleteProblemNumbers.join(", ")}. You can submit, but review these first.</span>
        </div>
      ) : null}

      {preview.problems.length > 0 ? (
        <div className={styles.workBlocks}>
          {preview.problems.map((problem) => (
            <article key={problem.id} className={styles.workBlock} data-complete={problem.complete || undefined}>
              <header><h3>Problem {problem.number}</h3><span>{problem.complete ? "Done" : "Incomplete"}</span></header>
              <p>{problem.prompt}</p>
              {problem.typedWork ? <div className={styles.typedWork}><strong>Student work</strong><pre>{problem.typedWork}</pre></div> : <p>No typed work saved.</p>}
              <InkPreview value={problem.inkData} number={problem.number} />
            </article>
          ))}
        </div>
      ) : (
        <div className={`${styles.workBlock} ${styles.typedWork}`}>
          <strong>Student work</strong>
          <pre>{(preview.universalTextPayload ?? canonicalPayload.universalTextPayload) || (canonicalPayload.specialistProjection.contextBlocks.length === 0 ? canonicalPayload.textPayload : "No typed work saved.") || "No work saved yet."}</pre>
        </div>
      )}
    </section>
  );
}
