import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { extractPdfBatch } from "../../lib/learning-engine/pdf";
import { structureDocument } from "../../lib/learning-engine/curriculum";
import { loadCourseCatalog } from "../../lib/learning-engine/course-catalog";
import { mappingReviewPacketSchema } from "../../lib/learning-engine/competency-mapping-review";
import { compareReviewedMappingRanking, type PublishedMappingInput } from "../../lib/learning-engine/reviewed-mappings";
import { loadReferenceTextbookChapters, textbookManifest } from "../../lib/learning-engine/textbook-server";
import { rankTextbookPassages } from "../../lib/learning-engine/textbook-search";
import { PRECALCULUS_BOOK, PUBLIC_TEXTBOOK_SCOPE } from "../../lib/learning-engine/textbook-catalog";

async function json(filename: string): Promise<unknown> {
  if ((await stat(filename)).size > 20_000_000) throw new Error("Comparison input exceeds 20 MB.");
  return JSON.parse(await readFile(filename, "utf8"));
}
async function main() {
  const [reviewDirectory, publicationFile, reviewerFile, assignmentFile, query, selectedCompetencyId, prerequisites] = process.argv.slice(2);
  if (!reviewDirectory || !publicationFile || !reviewerFile || !assignmentFile || !query || !selectedCompetencyId
    || query.length > 1000 || (prerequisites !== undefined && prerequisites !== "--prerequisites"))
    throw new Error("Usage: compare-reviewed-mappings <review-directory> <operator-publication-state.json> <current-reviewers.json> <current-assignments.json> <query> <competency-id> [--prerequisites]");
  let networkAttempts = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { networkAttempts++; throw new Error("Network forbidden during reviewed mapping comparison."); };
  try {
    const packets = z.array(mappingReviewPacketSchema).max(1000).parse(await json(path.join(reviewDirectory, "packets/reviewer-packets.json")));
    const reviews = z.array(z.unknown()).max(3000).parse(await json(path.join(reviewDirectory, "assessments.json")));
    const indexes = await loadReferenceTextbookChapters(), manifest = await textbookManifest();
    const currentDocuments = [];
    const sourceLocks: Array<{ chapter: number; assetHash: string; versionId: string; contentHash: string }> = [];
    for (const chapter of [...new Set(packets.map(item => item.chapter))]) {
      const lock = manifest.chapters.find(item => item.number === chapter)!, index = indexes.find(item => item.chapter === chapter)!;
      const bytes = await readFile(path.resolve("public/assets/textbooks", PRECALCULUS_BOOK.assetDirectory, `chapter-${chapter}.pdf`));
      if (createHash("sha256").update(bytes).digest("hex") !== lock.assetHash) throw new Error("Original PDF hash changed.");
      const pages = []; let total = 1;
      for (let start = 1; start <= total; start += 10) {
        const batch = await extractPdfBatch(bytes, start, 10); total = batch.totalPages; pages.push(...batch.pages);
      }
      const document = await structureDocument({ documentId: `${PRECALCULUS_BOOK.id}-chapter-${chapter}`, ...PUBLIC_TEXTBOOK_SCOPE,
        title: PRECALCULUS_BOOK.chapters.find(item => item.number === chapter)!.title,
        edition: `${PRECALCULUS_BOOK.edition}, chapter ${chapter}`, subject: "math", instructionRights: "licensed", sourceAssetHash: lock.assetHash }, pages);
      if (document.version.id !== index.version.id || document.version.contentHash !== index.version.contentHash)
        throw new Error("Fresh PDF extraction differs from the current index.");
      currentDocuments.push(document);
      sourceLocks.push({ chapter, assetHash: lock.assetHash, versionId: index.version.id, contentHash: index.version.contentHash });
    }
    // Read operator state after extraction, keeping its short freshness window useful.
    // The CLI cannot authenticate file provenance: operators must supply their current controlled stores.
    const trustedPublicationState = await json(publicationFile) as PublishedMappingInput["trustedPublicationState"];
    const result = await compareReviewedMappingRanking({ packets, reviews, sourceLocks, currentDocuments,
      currentFramework: (await loadCourseCatalog()).framework,
      reviewers: z.array(z.unknown()).max(1000).parse(await json(reviewerFile)),
      currentAssignments: z.array(z.unknown()).max(1000).parse(await json(assignmentFile)), trustedPublicationState,
      candidates: rankTextbookPassages(query, indexes.map(index => ({ number: index.chapter, versionId: index.version.id, chunks: index.chunks }))),
      selectedCompetencyId, includeDeclaredPrerequisites: prerequisites === "--prerequisites" });
    if (networkAttempts) throw new Error("Comparison attempted a network request.");
    console.log(JSON.stringify({ ...result, networkAttempts, comparisonOnly: true,
      verificationCoverage: {
        indexHashVerifiedChapters: indexes.map(index => ({ chapter: index.chapter,
          indexHash: manifest.chapters.find(item => item.number === index.chapter)!.indexHash,
          versionId: index.version.id, sourceContentHash: index.version.contentHash,
          manifestAssetHash: manifest.chapters.find(item => item.number === index.chapter)!.assetHash })),
        freshlyPdfHashedAndReextractedChapters: sourceLocks,
        baselinePassagesFromFreshlyReextractedChapters: result.baseline.filter(item => sourceLocks.some(lock => lock.chapter === item.chapter)).length,
        baselinePassagesFromOtherIndexedChapters: result.baseline.filter(item => !sourceLocks.some(lock => lock.chapter === item.chapter)).length,
        allBaselineAnchorsIndependentlyReextractedAndChecked: false,
        explanation: "All shipped chapter indexes are hash checked against the manifest. Only chapters referenced by review packets have their original PDF hashed and freshly re-extracted in this run. Review packet anchors are validated against that fresh extraction. Other baseline passages rely on pinned indexes; this command is not an independent audit of every returned baseline anchor.",
      },
      limitation: "Operator file provenance and actual educator identity must be verified outside this CLI. This comparison does not activate production ranking or establish answerability or learning gains." }, null, 2));
  } finally { globalThis.fetch = originalFetch; }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Comparison unavailable."); process.exitCode = 1; });
