import { describe, expect, it } from "vitest";
import { assessTextbookRetrieval, type TextbookBenchmarkMatch, type TextbookRetrievalProbe } from "./retrieval-benchmark";

const sources = [
  { chapter: 1, versionId: "a".repeat(64), contentHash: "b".repeat(64) },
  { chapter: 2, versionId: "c".repeat(64), contentHash: "d".repeat(64) },
];
const probes: TextbookRetrievalProbe[] = [
  { id: "functions", query: "function input", expectedChapter: 1, label: "book_topic_proxy" },
  { id: "linear", query: "linear slope", expectedChapter: 2, label: "book_topic_proxy" },
  { id: "outside", query: "chocolate cake recipe", expectedChapter: null, label: "synthetic_out_of_scope" },
];
function match(chapter: 1 | 2): TextbookBenchmarkMatch {
  const source = sources[chapter - 1];
  const exactText = chapter === 1 ? "A function maps an input." : "Slope describes a linear rate.";
  return {
    chapter,
    chunk: { versionId: source.versionId, text: exactText },
    anchor: {
      versionId: source.versionId, blockId: String(chapter).repeat(64), contentHash: source.contentHash,
      exactText, location: { page: chapter, pageLabel: String(chapter), startOffset: 0, endOffset: exactText.length },
    },
  };
}
const runs = [
  { probeId: "functions", matches: [match(1)], durationMs: 3 },
  { probeId: "linear", matches: [match(1), match(2)], durationMs: 5 },
  { probeId: "outside", matches: [], durationMs: 2 },
];

describe("textbook retrieval benchmark integrity", () => {
  it("reports chapter localization separately from passage judgment and learning evidence", () => {
    const result = assessTextbookRetrieval(probes, runs, sources);
    expect(result.totals).toEqual({ positive: 2, negative: 1, chapterHitAt1: 1, chapterHitAt6: 2,
      negativeClean: 1, integrityViolations: 0, durationMs: 10 });
    expect(result.cases[1]).toMatchObject({ returnedChapters: [1, 2], hitAt1: false, hitAt6: true });
    expect(result.limits).toMatchObject({ educatorPassageRelevanceLabels: false, sourcePdfTextReverified: false,
      measuresStudentLearning: false });
  });
  it("does not count a chapter hit when its result has an altered source hash or quotation", () => {
    const forged: TextbookBenchmarkMatch = { ...match(1), anchor: { ...match(1).anchor, contentHash: "e".repeat(64), exactText: "Different text" } };
    const changed = runs.map(run => run.probeId === "functions" ? { ...run, matches: [forged] } : run);
    const result = assessTextbookRetrieval(probes, changed, sources);
    expect(result.cases[0].hitAt1).toBe(false);
    expect(result.cases[0].integrityViolations).toContain("result 1: source version mismatch");
    expect(result.cases[0].integrityViolations).toContain("result 1: passage anchor mismatch");
    expect(result.totals.integrityViolations).toBe(2);
  });
  it("counts any out-of-scope result as a false positive and rejects missing or unlabelled runs", () => {
    const changed = runs.map(run => run.probeId === "outside" ? { ...run, matches: [match(2)] } : run);
    expect(assessTextbookRetrieval(probes, changed, sources).totals.negativeClean).toBe(0);
    expect(() => assessTextbookRetrieval(probes, runs.slice(1), sources)).toThrow("missing its retrieval run");
    expect(() => assessTextbookRetrieval(probes.slice(1), runs, sources)).toThrow("unlabelled retrieval run");
  });
});
