import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { rankGraphTextbookPassages } from "../../lib/learning-engine/textbook-graph";
import { PRECALCULUS_BOOK } from "../../lib/learning-engine/textbook-catalog";
import { rankTextbookPassages } from "../../lib/learning-engine/textbook-search";
import { textbookManifest, loadReferenceTextbookChapters } from "../../lib/learning-engine/textbook-server";
import { assessTextbookRetrieval, type TextbookBenchmarkRun } from "../../lib/learning-engine/retrieval-benchmark";
import { textbookRetrievalProbes as probes } from "../../lib/learning-engine/textbook-retrieval-probes";
import { extractPdfBatch } from "../../lib/learning-engine/pdf";
import { auditRankedPdfResults } from "../../lib/learning-engine/textbook-pdf-audit";

async function main() {
  let blockedFetchAttempts = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { blockedFetchAttempts++; throw new Error("Network retrieval is forbidden in the local benchmark."); };
  try {
  const manifest = await textbookManifest();
  const indexes = await loadReferenceTextbookChapters();
  const chapters = indexes.map(index => ({ number: index.chapter, versionId: index.version.id, chunks: index.chunks }));
  const sources = indexes.map(index => ({ chapter: index.chapter, versionId: index.version.id, contentHash: index.version.contentHash }));
  if (chapters.length !== 9 || chapters.some(chapter =>
    !manifest.chapters.some(source => source.number === chapter.number))) throw new Error("Complete textbook manifest required.");

  const lexicalRuns: TextbookBenchmarkRun[] = [];
  const graphRuns: TextbookBenchmarkRun[] = [];
  for (const probe of probes) {
    const lexicalStart = performance.now();
    const lexical = rankTextbookPassages(probe.query, chapters);
    lexicalRuns.push({ probeId: probe.id, matches: lexical, durationMs: performance.now() - lexicalStart });
    const graphStart = performance.now();
    const graph = await rankGraphTextbookPassages(probe.query, chapters);
    graphRuns.push({ probeId: probe.id, matches: graph, durationMs: performance.now() - graphStart });
  }
  const lexical = assessTextbookRetrieval(probes, lexicalRuns, sources);
  const graph = assessTextbookRetrieval(probes, graphRuns, sources);
  if (blockedFetchAttempts) throw new Error("The benchmark attempted a network request.");
  if (lexical.totals.integrityViolations || graph.totals.integrityViolations) {
    throw new Error("A retrieved index passage has inconsistent provenance. No benchmark report was saved.");
  }
  // The index and its anchors are one derived artifact. Verify every returned
  // citation independently against the locked PDF bytes and a fresh extraction.
  const pdfs = new Map<number, Buffer>();
  for (const chapter of manifest.chapters) {
    const bytes = await readFile(path.resolve("public/assets/textbooks", PRECALCULUS_BOOK.assetDirectory, `chapter-${chapter.number}.pdf`));
    if (createHash("sha256").update(bytes).digest("hex") !== chapter.assetHash) {
      throw new Error(`Original PDF for chapter ${chapter.number} differs from its locked asset hash.`);
    }
    pdfs.set(chapter.number, bytes);
  }
  const pdfAudit = await auditRankedPdfResults([lexicalRuns, graphRuns], async (chapter, page) => {
    const bytes = pdfs.get(chapter);
    if (!bytes) throw new Error("A citation names a chapter outside the pinned book.");
    const extracted = await extractPdfBatch(bytes, page, 1);
    return extracted.pages.find(item => item.page === page);
  });
  if (pdfAudit.conflicts.length || pdfAudit.violations.length) {
    throw new Error(`Returned citations differ from original PDF text or conflict by anchor ID: ${
      [...pdfAudit.conflicts, ...pdfAudit.violations].join(", ")}`);
  }
  const report = {
    version: "diana-textbook-retrieval-proxy-v2",
    generatedAt: new Date().toISOString(),
    book: {
      id: PRECALCULUS_BOOK.id, edition: PRECALCULUS_BOOK.edition, license: PRECALCULUS_BOOK.license,
      chapterAssets: manifest.chapters.map(chapter => ({ number: chapter.number, assetHash: chapter.assetHash, indexHash: chapter.indexHash })),
    },
    probeDigest: createHash("sha256").update(JSON.stringify(probes)).digest("hex"),
    probes,
    conditions: {
      lexical: { ...lexical, limits: { ...lexical.limits, sourcePdfTextReverified: true } },
      curriculumGraph: { ...graph, limits: { ...graph.limits, sourcePdfTextReverified: true } },
    },
    pdfAudit: { scope: "all_returned_results", originalAssetsHashVerified: pdfs.size,
      returnedPassages: pdfAudit.returnedPassages, returnedPassagesVerified: pdfAudit.returnedPassages,
      distinctPassagesReextracted: pdfAudit.results.length,
      pagesReextracted: pdfAudit.pagesReextracted, rankCoverage: pdfAudit.rankCoverage,
      conflicts: pdfAudit.conflicts, violations: pdfAudit.violations,
      limits: "Every returned anchor's exact extracted text and offsets were rechecked. Visual layout, equations, figures, answerability and instructional interpretation were not verified." },
    interpretation: "Chapter topic localization, index anchor consistency and all-returned-result PDF text rechecks only. These catalog topics are visible engineering probes, not held-out educator relevance labels. Out-of-scope prompts are synthetic. The score cannot establish passage answerability, tutoring quality or student gains.",
    blockedFetchAttempts,
  };
  const directory = path.resolve("artifacts/learning-engine/research/retrieval-benchmark");
  await mkdir(directory, { recursive: true });
  const file = path.join(directory, `textbook-${Date.now()}-${randomUUID().slice(0, 8)}.json`);
  await writeFile(file, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
  process.stdout.write(JSON.stringify({ report: file, lexical: lexical.totals, curriculumGraph: graph.totals, labelKind: lexical.limits.labelKind }) + "\n");
  } finally { globalThis.fetch = originalFetch; }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : "Textbook retrieval benchmark could not complete.");
  process.exitCode = 1;
});
