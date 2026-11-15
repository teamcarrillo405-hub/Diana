import type {
  TutorValidatedAnchor,
  TutorVerifierResult,
} from "@/lib/ai/tutor-response-evidence";

export const SOURCE_RETRIEVAL_BOUNDS = {
  maxSourcePages: 200,
  maxStoredPageChars: 250_000,
  maxQueryChars: 500,
  maxQueryTerms: 20,
  maxChunks: 8,
  maxChunkChars: 1_600,
  maxTotalChars: 6_400,
  maxCitationChars: 4_000,
} as const;

export type StoredPageLabelledSource = {
  sourceId: string;
  title?: string | null;
  pageLabel: string;
  text: string;
};

export type PageLabelledSourceChunk = {
  sourceId: string;
  pageLabel: string;
  citationLabel: string;
  startOffset: number;
  endOffset: number;
  text: string;
  matchedTerms: string[];
  score: number;
};

export type SourceChunkRetrievalInput = {
  sources: readonly StoredPageLabelledSource[];
  query: string;
  maxChunks?: number;
  maxChunkChars?: number;
  maxTotalChars?: number;
};

export type ExactStoredSpanCitation = {
  sourceId: string;
  pageLabel: string;
  startOffset: number;
  endOffset: number;
  exactText: string;
};

export type ExactStoredSpanValidationReason =
  | "valid"
  | "source_not_found"
  | "page_not_found"
  | "ambiguous_page"
  | "invalid_span"
  | "text_mismatch";

export type ExactStoredSpanValidation = {
  valid: boolean;
  reason: ExactStoredSpanValidationReason;
  anchor: TutorValidatedAnchor | null;
  verifierResult: TutorVerifierResult;
};

type RetrievalCandidate = PageLabelledSourceChunk & {
  pageIndex: number;
};

export function retrievePageLabelledSourceChunks(
  input: SourceChunkRetrievalInput,
): PageLabelledSourceChunk[] {
  const maxChunks = boundedInteger(input.maxChunks, 1, SOURCE_RETRIEVAL_BOUNDS.maxChunks, 4);
  const maxChunkChars = boundedInteger(
    input.maxChunkChars,
    80,
    SOURCE_RETRIEVAL_BOUNDS.maxChunkChars,
    900,
  );
  const maxTotalChars = boundedInteger(
    input.maxTotalChars,
    80,
    SOURCE_RETRIEVAL_BOUNDS.maxTotalChars,
    3_200,
  );
  const queryTerms = queryTermsFor(input.query);
  const candidates: RetrievalCandidate[] = [];

  for (const [pageIndex, source] of input.sources
    .slice(0, SOURCE_RETRIEVAL_BOUNDS.maxSourcePages)
    .entries()) {
    const normalizedSource = normalizeStoredSource(source);
    if (!normalizedSource) continue;
    const text = normalizedSource.text.slice(0, SOURCE_RETRIEVAL_BOUNDS.maxStoredPageChars);
    const lowerText = text.toLocaleLowerCase("en-US");
    const offsets = queryTerms.length > 0
      ? findQueryOffsets(lowerText, queryTerms)
      : [0];

    if (offsets.length === 0) continue;
    const starts = new Set<number>();
    for (const offset of offsets) {
      const span = boundedWindow(text, offset, maxChunkChars);
      if (starts.has(span.startOffset)) continue;
      starts.add(span.startOffset);
      const chunkText = text.slice(span.startOffset, span.endOffset);
      const matchedTerms = queryTerms.filter((term) =>
        chunkText.toLocaleLowerCase("en-US").includes(term)
      );
      candidates.push({
        sourceId: normalizedSource.sourceId,
        pageLabel: normalizedSource.pageLabel,
        citationLabel: citationLabelFor(normalizedSource),
        startOffset: span.startOffset,
        endOffset: span.endOffset,
        text: chunkText,
        matchedTerms,
        score: retrievalScore(chunkText, queryTerms),
        pageIndex,
      });
    }
  }

  candidates.sort((left, right) =>
    right.score - left.score ||
    left.pageIndex - right.pageIndex ||
    left.startOffset - right.startOffset
  );

  const selected: PageLabelledSourceChunk[] = [];
  let totalChars = 0;
  for (const candidate of candidates) {
    if (selected.length >= maxChunks || totalChars >= maxTotalChars) break;
    if (selected.some((chunk) => substantiallyOverlaps(chunk, candidate))) continue;

    const remainingChars = maxTotalChars - totalChars;
    const endOffset = Math.min(candidate.endOffset, candidate.startOffset + remainingChars);
    const text = candidate.text.slice(0, endOffset - candidate.startOffset);
    if (!text) continue;

    selected.push({
      sourceId: candidate.sourceId,
      pageLabel: candidate.pageLabel,
      citationLabel: candidate.citationLabel,
      startOffset: candidate.startOffset,
      endOffset,
      text,
      matchedTerms: candidate.matchedTerms,
      score: candidate.score,
    });
    totalChars += text.length;
  }

  return selected;
}

export function exactCitationForChunk(
  chunk: PageLabelledSourceChunk,
): ExactStoredSpanCitation {
  return {
    sourceId: chunk.sourceId,
    pageLabel: chunk.pageLabel,
    startOffset: chunk.startOffset,
    endOffset: chunk.endOffset,
    exactText: chunk.text,
  };
}

export function validateExactStoredSpanCitation(
  citation: ExactStoredSpanCitation,
  sources: readonly StoredPageLabelledSource[],
): ExactStoredSpanValidation {
  const sourcePages = sources
    .slice(0, SOURCE_RETRIEVAL_BOUNDS.maxSourcePages)
    .filter((source) => source.sourceId === citation.sourceId);
  if (sourcePages.length === 0) {
    return invalidCitation(
      "source_not_found",
      "The cited source is not present in stored assignment material.",
      "Source availability must be restored before this citation can be checked.",
    );
  }

  const pages = sourcePages.filter((source) => source.pageLabel === citation.pageLabel);
  if (pages.length === 0) {
    return invalidCitation(
      "page_not_found",
      "The cited page label is not present in the stored source.",
      "Page labels must match stored labels exactly.",
    );
  }
  if (pages.length > 1) {
    return invalidCitation(
      "ambiguous_page",
      "More than one stored page has the same source and page label.",
      "Duplicate page identities must be resolved before citation checking.",
    );
  }

  const pageText = pages[0].text;
  if (!isValidCitationRange(citation, pageText.length)) {
    return invalidCitation(
      "invalid_span",
      "The cited character span is outside the stored page or has an invalid length.",
      "Citation offsets use UTF-16 code-unit positions in the exact stored page text.",
    );
  }

  const storedText = pageText.slice(citation.startOffset, citation.endOffset);
  if (storedText !== citation.exactText) {
    return invalidCitation(
      "text_mismatch",
      "The cited text does not exactly match the stored character span.",
      "Whitespace, punctuation, capitalization, and offsets are checked without normalization.",
    );
  }

  const anchor: TutorValidatedAnchor = {
    sourceId: citation.sourceId,
    pageLabel: citation.pageLabel,
    startOffset: citation.startOffset,
    endOffset: citation.endOffset,
    exactText: citation.exactText,
  };
  return {
    valid: true,
    reason: "valid",
    anchor,
    verifierResult: {
      verifier: "source_span",
      status: "passed",
      summary: "The citation exactly matches the stored source span.",
      observations: [
        `${citation.pageLabel}, characters ${citation.startOffset}-${citation.endOffset}`,
      ],
      limitations: [
        "This check validates source fidelity, not whether the cited passage supports every conclusion drawn from it.",
      ],
    },
  };
}

export function validateExactStoredSpanCitations(
  citations: readonly ExactStoredSpanCitation[],
  sources: readonly StoredPageLabelledSource[],
): ExactStoredSpanValidation[] {
  return citations
    .slice(0, 20)
    .map((citation) => validateExactStoredSpanCitation(citation, sources));
}

function normalizeStoredSource(
  source: StoredPageLabelledSource,
): StoredPageLabelledSource | null {
  const sourceId = source.sourceId?.trim();
  const pageLabel = source.pageLabel?.trim();
  if (!sourceId || !pageLabel || typeof source.text !== "string" || !source.text) return null;
  return {
    sourceId,
    pageLabel,
    title: source.title?.trim() || null,
    text: source.text,
  };
}

function queryTermsFor(query: string): string[] {
  const terms = query
    .slice(0, SOURCE_RETRIEVAL_BOUNDS.maxQueryChars)
    .toLocaleLowerCase("en-US")
    .match(/[a-z0-9][a-z0-9_-]{1,63}/gu) ?? [];
  return [...new Set(terms)].slice(0, SOURCE_RETRIEVAL_BOUNDS.maxQueryTerms);
}

function findQueryOffsets(text: string, queryTerms: readonly string[]): number[] {
  const offsets = new Set<number>();
  for (const term of queryTerms) {
    let fromIndex = 0;
    for (let occurrence = 0; occurrence < 4; occurrence += 1) {
      const index = text.indexOf(term, fromIndex);
      if (index < 0) break;
      offsets.add(index);
      fromIndex = index + Math.max(1, term.length);
    }
  }
  return [...offsets].sort((left, right) => left - right).slice(0, 24);
}

function boundedWindow(
  text: string,
  matchOffset: number,
  maxChars: number,
): { startOffset: number; endOffset: number } {
  let startOffset = Math.max(0, matchOffset - Math.floor(maxChars * 0.35));
  let endOffset = Math.min(text.length, startOffset + maxChars);
  if (endOffset - startOffset < maxChars) {
    startOffset = Math.max(0, endOffset - maxChars);
  }

  startOffset = alignStartToBoundary(text, startOffset);
  endOffset = Math.min(text.length, startOffset + maxChars);
  endOffset = alignEndToBoundary(text, startOffset, endOffset);
  return { startOffset, endOffset };
}

function alignStartToBoundary(text: string, startOffset: number): number {
  if (startOffset === 0 || /\s/u.test(text[startOffset - 1] ?? "")) return startOffset;
  const lowerBound = Math.max(0, startOffset - 60);
  for (let index = startOffset; index > lowerBound; index -= 1) {
    if (/\s/u.test(text[index - 1] ?? "")) return index;
  }
  return startOffset;
}

function alignEndToBoundary(text: string, startOffset: number, endOffset: number): number {
  if (endOffset >= text.length || /\s/u.test(text[endOffset] ?? "")) return endOffset;
  const lowerBound = Math.max(startOffset + 40, endOffset - 60);
  for (let index = endOffset; index > lowerBound; index -= 1) {
    if (/\s/u.test(text[index] ?? "")) return index;
  }
  return endOffset;
}

function retrievalScore(text: string, terms: readonly string[]): number {
  if (terms.length === 0) return 1;
  const normalized = text.toLocaleLowerCase("en-US");
  let distinctMatches = 0;
  let totalMatches = 0;
  for (const term of terms) {
    let matches = 0;
    let fromIndex = 0;
    while (matches < 12) {
      const index = normalized.indexOf(term, fromIndex);
      if (index < 0) break;
      matches += 1;
      fromIndex = index + Math.max(1, term.length);
    }
    if (matches > 0) distinctMatches += 1;
    totalMatches += matches;
  }
  return distinctMatches * 100 + totalMatches * 10;
}

function citationLabelFor(source: StoredPageLabelledSource): string {
  return source.title ? `${source.title}, ${source.pageLabel}` : source.pageLabel;
}

function substantiallyOverlaps(
  left: PageLabelledSourceChunk,
  right: PageLabelledSourceChunk,
): boolean {
  if (left.sourceId !== right.sourceId || left.pageLabel !== right.pageLabel) return false;
  const overlap = Math.max(
    0,
    Math.min(left.endOffset, right.endOffset) - Math.max(left.startOffset, right.startOffset),
  );
  const shorterLength = Math.min(
    left.endOffset - left.startOffset,
    right.endOffset - right.startOffset,
  );
  return shorterLength > 0 && overlap / shorterLength >= 0.65;
}

function isValidCitationRange(
  citation: ExactStoredSpanCitation,
  pageLength: number,
): boolean {
  return Number.isInteger(citation.startOffset) &&
    Number.isInteger(citation.endOffset) &&
    citation.startOffset >= 0 &&
    citation.endOffset > citation.startOffset &&
    citation.endOffset <= pageLength &&
    typeof citation.exactText === "string" &&
    citation.exactText.length === citation.endOffset - citation.startOffset &&
    citation.exactText.length <= SOURCE_RETRIEVAL_BOUNDS.maxCitationChars;
}

function invalidCitation(
  reason: Exclude<ExactStoredSpanValidationReason, "valid">,
  summary: string,
  limitation: string,
): ExactStoredSpanValidation {
  return {
    valid: false,
    reason,
    anchor: null,
    verifierResult: {
      verifier: "source_span",
      status: reason === "source_not_found" || reason === "page_not_found" || reason === "ambiguous_page"
        ? "inconclusive"
        : "not_passed",
      summary,
      observations: [],
      limitations: [limitation],
    },
  };
}

function boundedInteger(
  value: number | undefined,
  minimum: number,
  maximum: number,
  fallback: number,
): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(minimum, Math.min(maximum, Math.floor(value)))
    : fallback;
}
