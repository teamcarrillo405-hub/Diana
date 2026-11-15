import { describe, expect, it, vi } from "vitest";
import { auditRankedPdfResults, collectPdfResults, pdfResultViolation } from "./textbook-pdf-audit";
import type { TextbookBenchmarkRun } from "./retrieval-benchmark";

const text = "Intro Linear slope and examples";
const page = { page: 7, pageLabel: "7", text, interpretation: "original" as const };
const first = { versionId: "a", blockId: "b", contentHash: "hash", exactText: "Linear slope",
  location: { page: 7, pageLabel: "7", startOffset: 6, endOffset: 18 } };
const later = { ...first, blockId: "later", exactText: "examples",
  location: { page: 7, pageLabel: "7", startOffset: 23, endOffset: 31 } };
function run(...anchors: typeof first[]): TextbookBenchmarkRun {
  return { probeId: "query", durationMs: 1, matches: anchors.map(anchor => ({
    chapter: 2, chunk: { versionId: "a", text }, anchor,
  })) };
}

describe("independent PDF citation audit", () => {
  it("checks exact offsets on a freshly extracted page and refuses a changed passage", () => {
    const result = collectPdfResults([run(first)]).results[0];
    expect(pdfResultViolation(result, page)).toBeNull();
    expect(pdfResultViolation(result, { ...page, text: "Intro Linear value and examples" })).toBe("passage_text_changed");
    expect(pdfResultViolation(result, { ...page, pageLabel: "vii" })).toBe("page_label_changed");
    expect(pdfResultViolation(result, undefined)).toBe("page_unavailable");
  });

  it("checks lower ranks and reuses one fresh extraction per chapter and page", async () => {
    const load = vi.fn(async () => page);
    const audit = await auditRankedPdfResults([[run(first, later)], [run(first, later)]], load);
    expect(load).toHaveBeenCalledOnce();
    expect(audit).toMatchObject({ returnedPassages: 4, pagesReextracted: 1,
      rankCoverage: [{ rank: 1, returned: 2 }, { rank: 2, returned: 2 }], conflicts: [], violations: [] });
    expect(audit.results).toHaveLength(2);
    const shiftedLowerRank = { ...later, location: { ...later.location, startOffset: 22, endOffset: 30 } };
    const corrupted = await auditRankedPdfResults([[run(first, shiftedLowerRank)]], async () => page);
    expect(corrupted.violations).toEqual(["2:7:later:passage_text_changed"]);
  });

  it("surfaces conflicting tuples for one anchor ID across conditions without dropping either", async () => {
    const conflicting = { ...first, exactText: "examples", location: later.location };
    const audit = await auditRankedPdfResults([[run(first)], [run(conflicting)]], async () => page);
    expect(audit.results).toHaveLength(2);
    expect(audit.conflicts).toHaveLength(1);
    expect(audit.conflicts[0]).toContain("conflicting returned tuples");
    expect(audit.violations).toEqual([]);
  });

  it("caches an unavailable page and reports every affected returned anchor", async () => {
    const load = vi.fn(async () => undefined);
    const audit = await auditRankedPdfResults([[run(first, later)]], load);
    expect(load).toHaveBeenCalledOnce();
    expect(audit.pagesReextracted).toBe(1);
    expect(audit.violations).toEqual(["2:7:b:page_unavailable", "2:7:later:page_unavailable"]);
  });
});
