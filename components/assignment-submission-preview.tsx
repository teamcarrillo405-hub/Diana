"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Download, FileText } from "lucide-react";

import { prepareCanonicalAssignmentDeliveryDownload } from "@/app/(app)/assignments/[id]/delivery-actions";
import { parseAssignmentInkDocument } from "@/lib/assignment-ink";
import { canonicalSubmissionPayloadForTarget } from "@/lib/assignment-submission";
import { assignmentPlotForBlock } from "@/lib/specialist-artifacts/assignment-plots";
import type { CanonicalRenderBlock } from "@/lib/specialist-artifacts/render-blocks";
import type { AssignmentSubmissionPreview as SubmissionPreview } from "@/lib/assignment-workspace-contracts";
import { AssignmentPlotPreview } from "./assignment-plot-preview";
import styles from "./student-shell/submission.module.css";

const RUNTIME_STATUS_LABEL = {
  healthy: "Available",
  degraded: "Limited",
  unavailable: "Unavailable",
} as const;

type SubmissionProblem = SubmissionPreview["problems"][number];
type EquationBlock = CanonicalRenderBlock<"equation">;

function InkPreview({ document, label }: { document: ReturnType<typeof parseAssignmentInkDocument>; label: string }) {
  if (document.strokes.length === 0) return null;
  return (
    <figure className={styles.inkPreview}>
      <figcaption>Handwriting</figcaption>
      <svg
        viewBox={`0 0 ${document.logicalWidth} ${document.logicalHeight}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Handwriting for ${label}`}
      >
        {document.strokes.map((stroke) => (
          <polyline key={stroke.id} points={stroke.points.map((point) => `${point.x},${point.y}`).join(" ")} />
        ))}
      </svg>
    </figure>
  );
}

function specialistDisplayText(block: CanonicalRenderBlock): string {
  if (block.type !== "equation") return block.plainText;
  const { studentAuthoredText, reasoning, answer } = block.content;
  if (!studentAuthoredText || (studentAuthoredText !== reasoning && studentAuthoredText !== answer)) return block.plainText;
  const duplicate = `\n\n${studentAuthoredText}`;
  return block.plainText.endsWith(duplicate) ? block.plainText.slice(0, -duplicate.length) : block.plainText;
}

function SpecialistBlockPreview({ block }: { block: CanonicalRenderBlock }) {
  const toolStatus = block.runtimeHealth.status;
  const fallbackVisible = toolStatus === "degraded" || toolStatus === "unavailable";
  const projection = assignmentPlotForBlock(block);
  const work = specialistDisplayText(block);
  return (
    <article className={styles.workBlock} data-specialist-kind={block.type}>
      <header>
        <h3>{block.label}</h3>
        {toolStatus !== "unknown" ? <span>{RUNTIME_STATUS_LABEL[toolStatus]}</span> : null}
      </header>
      <p>{block.summary}</p>
      {projection?.plot ? <AssignmentPlotPreview plot={projection.plot} /> : null}
      {projection?.fallback ? <p>{projection.fallback}</p> : null}
      {work ? (
        <div className={styles.typedWork}>
          <strong>Specialist work</strong>
          <pre>{work}</pre>
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

function workFields(problem: SubmissionProblem, equation?: EquationBlock) {
  const { reasoning, answer, latex, explanation, handwriting, studentAuthoredText } = equation?.content ?? {};
  // The generated equation block mirrors this same work for downstream delivery.
  const mirroredText = [reasoning || answer, handwriting ? "Handwritten work attached." : ""].filter(Boolean).join("\n");
  const fields = [
    { label: answer === problem.typedWork ? "Answer" : "Student work", value: problem.typedWork },
    { label: "Reasoning", value: reasoning },
    { label: "Answer", value: answer },
    { label: "Notation", value: latex },
    { label: "Explanation", value: explanation },
    { label: "Additional student work", value: studentAuthoredText === mirroredText ? "" : studentAuthoredText },
  ];
  const shown = new Set<string>();
  return fields.flatMap(({ label, value }) => {
    if (!value || shown.has(value)) return [];
    shown.add(value);
    return [{ label, value }];
  });
}

function WorkUnitPreview({ problem, label, equation }: { problem: SubmissionProblem; label: string; equation?: EquationBlock }) {
  const fields = workFields(problem, equation);
  const ink = parseAssignmentInkDocument(problem.inkData || equation?.content.handwriting || "");
  const toolStatus = equation?.runtimeHealth.status;
  const toolLimited = toolStatus === "degraded" || toolStatus === "unavailable";
  return (
    <article className={styles.workBlock} data-complete={problem.complete || undefined}>
      <header><h3>{label}</h3><span>{problem.complete ? "Complete" : "Incomplete"}</span></header>
      {problem.prompt.trim() && problem.prompt.trim() !== label ? <p>{problem.prompt}</p> : null}
      {fields.map(({ label: fieldLabel, value }) => (
        <div key={fieldLabel} className={styles.typedWork}><strong>{fieldLabel}</strong><pre>{value}</pre></div>
      ))}
      {fields.length === 0 && ink.strokes.length === 0 ? <p>No work saved yet.</p> : null}
      <InkPreview document={ink} label={label} />
      {toolLimited ? <p>Equation tool {RUNTIME_STATUS_LABEL[toolStatus].toLowerCase()}. Saved work is included in this submission.</p> : null}
    </article>
  );
}

export function AssignmentSubmissionDownload({ assignmentId, payloadDigest }: Pick<SubmissionPreview, "assignmentId" | "payloadDigest">) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function downloadPreparedPdf() {
    if (pending) return;
    if (!payloadDigest) {
      setMessage("Refresh the page before preparing the PDF.");
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await prepareCanonicalAssignmentDeliveryDownload({ assignmentId, payloadDigest });
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
    <div className={styles.downloadAction}>
      <button type="button" className={styles.secondary} disabled={pending} onClick={downloadPreparedPdf}>
        <Download size={18} aria-hidden="true" /> {pending ? "Preparing PDF" : "Download PDF"}
      </button>
      {message ? <p className={styles.notice} role="status">{message}</p> : null}
    </div>
  );
}

function capitalizeLabel(label: string) {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function AssignmentSubmissionPreview({ preview, unitNoun = "problem", unitNounPlural = "problems" }: {
  preview: SubmissionPreview;
  unitNoun?: string;
  unitNounPlural?: string;
}) {
  const canonicalPayload = canonicalSubmissionPayloadForTarget(preview, "preview");
  const unitLabel = capitalizeLabel(unitNoun);
  const unitsLabel = capitalizeLabel(unitNounPlural);
  const equationById = new Map(canonicalPayload.specialistProjection.contextBlocks.flatMap((block) =>
    block.type === "equation" ? [[block.id, block] as const] : []));
  const groupedEquations = new Set<string>();
  const workUnits = preview.problems.map((problem) => {
    const block = equationById.get(`problem-${problem.number}`);
    const equation = block && block.content.problemText === problem.prompt.trim() ? block : undefined;
    if (equation) groupedEquations.add(equation.id);
    return { problem, equation, label: preview.problemLabels?.[problem.id]?.trim() || `${unitLabel} ${problem.number}` };
  });
  const pendingNumbers = new Set(preview.incompleteProblemNumbers);
  const incompleteLabel = workUnits.filter(({ problem }) => pendingNumbers.has(problem.number)).map(({ label }) => label).join(", ")
    || `${preview.incompleteProblemNumbers.length === 1 ? unitLabel : unitsLabel} ${preview.incompleteProblemNumbers.join(", ")}`;
  const specialistBlocks = canonicalPayload.specialistProjection.contextBlocks.filter((block) => !groupedEquations.has(block.id));

  return (
    <section className={`${styles.paper} ${styles.reviewPaper}`} aria-labelledby="submission-preview-title">
      <header className={styles.reviewHeader}>
        <div className={styles.panelHeading}>
          <FileText size={22} aria-hidden="true" />
          <h2 id="submission-preview-title">Your work</h2>
        </div>
        <AssignmentSubmissionDownload assignmentId={preview.assignmentId} payloadDigest={preview.payloadDigest} />
      </header>

      <dl className={styles.facts}>
        <div><dt>Destination</dt><dd>{preview.destination}</dd></div>
        <div><dt>PDF filename</dt><dd>{preview.fileName}</dd></div>
        <div><dt>{unitsLabel}</dt><dd>{preview.problems.length || "Full assignment"}</dd></div>
      </dl>

      {preview.incompleteProblemNumbers.length > 0 ? (
        <div className={styles.notice} role="status">
          <AlertTriangle size={19} aria-hidden="true" />
          <span><strong>Still marked incomplete:</strong> {incompleteLabel}. You can hand in now or check your work first.</span>
        </div>
      ) : null}

      {workUnits.length > 0 ? (
        <div className={styles.workBlocks}>
          {workUnits.map(({ problem, label, equation }) => <WorkUnitPreview key={problem.id} problem={problem} label={label} equation={equation} />)}
        </div>
      ) : (
        <div className={`${styles.workBlock} ${styles.typedWork}`}>
          <strong>Student work</strong>
          <pre>{(preview.universalTextPayload ?? canonicalPayload.universalTextPayload) || (canonicalPayload.specialistProjection.contextBlocks.length === 0 ? canonicalPayload.textPayload : "No typed work saved.") || "No work saved yet."}</pre>
        </div>
      )}
      {specialistBlocks.length > 0 ? (
        <div className={styles.workBlocks} aria-label="Specialist assignment work">
          {specialistBlocks.map((block) => <SpecialistBlockPreview key={block.id} block={block} />)}
        </div>
      ) : null}
    </section>
  );
}
