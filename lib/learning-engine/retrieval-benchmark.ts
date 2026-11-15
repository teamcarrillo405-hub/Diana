import type { CurriculumChunk, EvidenceAnchor } from "./contracts";

export type TextbookRetrievalProbe = {
  id: string;
  query: string;
  expectedChapter: number | null;
  label: "book_topic_proxy" | "synthetic_out_of_scope";
};
export type TextbookBenchmarkSource = {
  chapter: number;
  versionId: string;
  contentHash: string;
};
export type TextbookBenchmarkMatch = {
  chapter: number;
  chunk: Pick<CurriculumChunk, "versionId" | "text">;
  anchor: EvidenceAnchor;
};
export type TextbookBenchmarkRun = {
  probeId: string;
  matches: readonly TextbookBenchmarkMatch[];
  durationMs: number;
};

export type TextbookRetrievalAssessment = {
  cases: Array<{
    id: string;
    expectedChapter: number | null;
    returnedChapters: number[];
    hitAt1: boolean | null;
    hitAt6: boolean | null;
    negativeClean: boolean | null;
    integrityViolations: string[];
    durationMs: number;
  }>;
  totals: {
    positive: number;
    negative: number;
    chapterHitAt1: number;
    chapterHitAt6: number;
    negativeClean: number;
    integrityViolations: number;
    durationMs: number;
  };
  limits: {
    labelKind: "book_topic_proxy_and_synthetic_negative";
    educatorPassageRelevanceLabels: false;
    sourcePdfTextReverified: false;
    measuresStudentLearning: false;
  };
};

/** Audits index-level provenance and chapter localization. It cannot certify answerability. */
export function assessTextbookRetrieval(
  probes: readonly TextbookRetrievalProbe[],
  runs: readonly TextbookBenchmarkRun[],
  sources: readonly TextbookBenchmarkSource[],
): TextbookRetrievalAssessment {
  const byChapter = new Map<number, TextbookBenchmarkSource>();
  const versions = new Set<string>();
  for (const source of sources) {
    if (!Number.isInteger(source.chapter) || source.chapter < 1 || byChapter.has(source.chapter) || versions.has(source.versionId)) {
      throw new Error("Benchmark sources must have distinct positive chapters and versions.");
    }
    byChapter.set(source.chapter, source);
    versions.add(source.versionId);
  }
  const byRun = new Map<string, TextbookBenchmarkRun>();
  for (const run of runs) {
    if (byRun.has(run.probeId) || !Number.isFinite(run.durationMs) || run.durationMs < 0 || run.matches.length > 6) {
      throw new Error("Benchmark run is duplicated, unbounded or has invalid timing.");
    }
    byRun.set(run.probeId, run);
  }
  const ids = new Set<string>();
  const cases = probes.map(probe => {
    if (ids.has(probe.id) || !probe.id || !probe.query.trim() || probe.query.length > 1000 ||
      (probe.expectedChapter === null) !== (probe.label === "synthetic_out_of_scope") ||
      (probe.expectedChapter !== null && !byChapter.has(probe.expectedChapter))) {
      throw new Error("Benchmark probe has a duplicate ID, missing source or inconsistent label.");
    }
    ids.add(probe.id);
    const run = byRun.get(probe.id);
    if (!run) throw new Error("Benchmark probe is missing its retrieval run.");
    const integrityViolations: string[] = [];
    const anchorIds = new Set<string>();
    for (const [index, match] of run.matches.entries()) {
      const source = byChapter.get(match.chapter);
      const anchor = match.anchor;
      const anchorId = anchor.versionId + ":" + anchor.blockId;
      if (!source || match.chunk.versionId !== source.versionId || anchor.versionId !== source.versionId ||
        anchor.contentHash !== source.contentHash) integrityViolations.push(`result ${index + 1}: source version mismatch`);
      if (anchorIds.has(anchorId)) integrityViolations.push(`result ${index + 1}: duplicate source anchor`);
      anchorIds.add(anchorId);
      if (!anchor.exactText || !match.chunk.text.includes(anchor.exactText) ||
        anchor.location.endOffset - anchor.location.startOffset !== anchor.exactText.length ||
        anchor.location.page < 1) integrityViolations.push(`result ${index + 1}: passage anchor mismatch`);
    }
    const valid = integrityViolations.length === 0;
    const returnedChapters = run.matches.map(match => match.chapter);
    const expected = probe.expectedChapter;
    return {
      id: probe.id, expectedChapter: expected, returnedChapters,
      hitAt1: expected === null ? null : valid && returnedChapters[0] === expected,
      hitAt6: expected === null ? null : valid && returnedChapters.includes(expected),
      negativeClean: expected === null ? returnedChapters.length === 0 : null,
      integrityViolations, durationMs: run.durationMs,
    };
  });
  if (byRun.size !== ids.size || [...byRun.keys()].some(id => !ids.has(id))) {
    throw new Error("Benchmark has an unlabelled retrieval run.");
  }
  return {
    cases,
    totals: {
      positive: cases.filter(item => item.expectedChapter !== null).length,
      negative: cases.filter(item => item.expectedChapter === null).length,
      chapterHitAt1: cases.filter(item => item.hitAt1 === true).length,
      chapterHitAt6: cases.filter(item => item.hitAt6 === true).length,
      negativeClean: cases.filter(item => item.negativeClean === true).length,
      integrityViolations: cases.reduce((count, item) => count + item.integrityViolations.length, 0),
      durationMs: cases.reduce((time, item) => time + item.durationMs, 0),
    },
    limits: {
      labelKind: "book_topic_proxy_and_synthetic_negative",
      educatorPassageRelevanceLabels: false,
      sourcePdfTextReverified: false,
      measuresStudentLearning: false,
    },
  };
}
