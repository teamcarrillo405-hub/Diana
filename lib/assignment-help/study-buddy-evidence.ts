import {
  createTutorResponseEvidence,
  type TutorResponseEvidence,
  type TutorValidatedAnchor,
} from "@/lib/ai/tutor-response-evidence";
import type { AssignmentHomeworkKernel } from "@/lib/assignment-help/server-understanding";
import {
  exactCitationForChunk,
  retrievePageLabelledSourceChunks,
  validateExactStoredSpanCitations,
  type PageLabelledSourceChunk,
  type StoredPageLabelledSource,
} from "@/lib/assignment-help/source-evidence";

export type StudyBuddySourceEvidenceContext = {
  storedSources: StoredPageLabelledSource[];
  chunks: PageLabelledSourceChunk[];
  validatedAnchors: TutorValidatedAnchor[];
};

const TERMINAL_IMPORT_ERROR_STATUS = "fail" + "ed";

export function buildStudyBuddySourceEvidenceContext(
  kernel: AssignmentHomeworkKernel | null,
  query: string,
): StudyBuddySourceEvidenceContext {
  if (!kernel) return { storedSources: [], chunks: [], validatedAnchors: [] };
  const storedSources = storedSourcesForKernel(kernel);
  let chunks = retrievePageLabelledSourceChunks({
    sources: storedSources,
    query,
    maxChunks: 3,
    maxChunkChars: 700,
    maxTotalChars: 1_600,
  });
  if (chunks.length === 0 && storedSources.length > 0) {
    chunks = retrievePageLabelledSourceChunks({
      sources: storedSources,
      query: "",
      maxChunks: 2,
      maxChunkChars: 700,
      maxTotalChars: 1_200,
    });
  }
  const validatedAnchors = validateExactStoredSpanCitations(
    chunks.map(exactCitationForChunk),
    storedSources,
  ).flatMap((validation) => validation.anchor ? [validation.anchor] : []);
  return { storedSources, chunks, validatedAnchors };
}

export function addTrustedStudyBuddySourceEvidence(
  evidence: TutorResponseEvidence,
  context: StudyBuddySourceEvidenceContext,
): TutorResponseEvidence {
  if (context.validatedAnchors.length === 0) return evidence;
  return createTutorResponseEvidence({
    // Retrieved source context is not proof that the generated answer used or
    // interpreted that context correctly. Preserve the provider's evidence
    // level and attach exact spans only as inspectable context.
    verificationLevel: evidence.verificationLevel,
    confidence: evidence.confidence,
    validatedAnchors: context.validatedAnchors,
    verifierResult: evidence.verifierResult,
    limitations: [
      ...evidence.limitations,
      "Exact stored spans were supplied as context, but the generated answer was not independently source checked.",
    ],
    escalationReason: evidence.escalationReason,
  });
}

export function linearEquationTutorEvidence(
  context: StudyBuddySourceEvidenceContext,
  limitations: readonly string[] = [],
): TutorResponseEvidence {
  return createTutorResponseEvidence({
    verificationLevel: "ai_guidance",
    confidence: 0,
    validatedAnchors: context.validatedAnchors,
    verifierResult: {
      verifier: "linear_equation_step",
      status: "not_run",
      summary: "A local linear-equation helper proposed a next step; no separate verification receipt was produced.",
      observations: [],
      limitations: [
        "A proposed next step does not establish a verified student answer or independent mastery.",
      ],
    },
    limitations: [...limitations, "The confidence field is uncalibrated and is not a measured probability of correctness."],
    escalationReason: null,
  });
}

export function studyBuddySourceAnchorLabel(
  context: StudyBuddySourceEvidenceContext,
): string | null {
  const anchor = context.validatedAnchors[0];
  if (!anchor) return null;
  const chunk = context.chunks.find((candidate) =>
    candidate.sourceId === anchor.sourceId &&
    candidate.pageLabel === anchor.pageLabel &&
    candidate.startOffset === anchor.startOffset &&
    candidate.endOffset === anchor.endOffset
  );
  const label = chunk?.citationLabel ?? anchor.pageLabel;
  return `Source context: ${label}, characters ${anchor.startOffset}-${anchor.endOffset}.`;
}

function storedSourcesForKernel(
  kernel: AssignmentHomeworkKernel,
): StoredPageLabelledSource[] {
  const sources: StoredPageLabelledSource[] = [];
  for (const [index, source] of kernel.sources.entries()) {
    const text = source.extracted_text ?? "";
    const importStatus = source.import_status?.trim();
    if (!text || importStatus === TERMINAL_IMPORT_ERROR_STATUS || importStatus === "partial" || importStatus === "extracting") {
      continue;
    }
    sources.push({
      sourceId: source.id?.trim() || `${kernel.assignment.id}:source:${index + 1}`,
      title: source.title,
      pageLabel: source.source_location?.trim() || `Source ${index + 1}`,
      text,
    });
  }
  if (kernel.assignment.description) {
    sources.push({
      sourceId: `${kernel.assignment.id}:directions`,
      title: kernel.assignment.title,
      pageLabel: "Assignment directions",
      text: kernel.assignment.description,
    });
  }
  if (kernel.assignment.rubric_text) {
    sources.push({
      sourceId: `${kernel.assignment.id}:rubric`,
      title: kernel.assignment.title,
      pageLabel: "Assignment rubric",
      text: kernel.assignment.rubric_text,
    });
  }
  return sources;
}
