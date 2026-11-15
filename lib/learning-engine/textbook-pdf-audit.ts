import type { SourcePage } from "./contracts";
import type { TextbookBenchmarkRun } from "./retrieval-benchmark";

export type PdfResult = {
  chapter: number;
  page: number;
  pageLabel: string;
  startOffset: number;
  endOffset: number;
  exactText: string;
  versionId: string;
  blockId: string;
  contentHash: string;
};

function tupleKey(result: PdfResult): string {
  return JSON.stringify([result.versionId, result.blockId, result.contentHash, result.chapter,
    result.page, result.pageLabel, result.startOffset, result.endOffset, result.exactText]);
}

/** Retain every distinct returned anchor tuple; never let a repeated ID overwrite a conflict. */
export function collectPdfResults(...conditions: readonly TextbookBenchmarkRun[][]) {
  const unique = new Map<string, PdfResult>();
  const ids = new Map<string, string>();
  const conflicts = new Set<string>();
  const rankCounts = new Map<number, number>();
  let returnedPassages = 0;
  for (const runs of conditions) for (const run of runs) for (const [index, match] of run.matches.entries()) {
    const { anchor } = match;
    const result: PdfResult = {
      chapter: match.chapter, page: anchor.location.page, pageLabel: anchor.location.pageLabel,
      startOffset: anchor.location.startOffset, endOffset: anchor.location.endOffset,
      exactText: anchor.exactText, versionId: anchor.versionId, blockId: anchor.blockId,
      contentHash: anchor.contentHash,
    };
    const key = tupleKey(result);
    const id = JSON.stringify([result.versionId, result.blockId]);
    const prior = ids.get(id);
    if (prior && prior !== key) conflicts.add(`Anchor ${id} has conflicting returned tuples.`);
    ids.set(id, key);
    unique.set(key, result);
    returnedPassages++;
    const rank = index + 1;
    rankCounts.set(rank, (rankCounts.get(rank) ?? 0) + 1);
  }
  return {
    results: [...unique.values()],
    returnedPassages,
    rankCoverage: [...rankCounts].sort(([a], [b]) => a - b).map(([rank, returned]) => ({ rank, returned })),
    conflicts: [...conflicts],
  };
}

/** A fresh PDF extraction must reproduce each indexed passage at its exact page offset. */
export function pdfResultViolation(result: PdfResult, page: SourcePage | undefined): string | null {
  if (!page || page.page !== result.page) return "page_unavailable";
  if (page.pageLabel !== result.pageLabel) return "page_label_changed";
  if (!Number.isSafeInteger(result.startOffset) || !Number.isSafeInteger(result.endOffset) ||
    result.startOffset < 0 || result.endOffset <= result.startOffset ||
    result.endOffset - result.startOffset !== result.exactText.length ||
    page.text.slice(result.startOffset, result.endOffset) !== result.exactText) return "passage_text_changed";
  return null;
}

/** The loader is invoked once per chapter/page, including unavailable pages. */
export async function auditRankedPdfResults(
  conditions: readonly (readonly TextbookBenchmarkRun[])[],
  loadPage: (chapter: number, page: number) => Promise<SourcePage | undefined>,
) {
  const collection = collectPdfResults(...conditions.map(runs => [...runs]));
  const pages = new Map<string, SourcePage | undefined>();
  const violations: string[] = [];
  for (const result of collection.results) {
    const key = JSON.stringify([result.chapter, result.page]);
    if (!pages.has(key)) pages.set(key, await loadPage(result.chapter, result.page));
    const violation = pdfResultViolation(result, pages.get(key));
    if (violation) violations.push(`${result.chapter}:${result.page}:${result.blockId}:${violation}`);
  }
  return { ...collection, pagesReextracted: pages.size, violations };
}
