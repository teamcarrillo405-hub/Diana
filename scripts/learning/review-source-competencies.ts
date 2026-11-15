import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { extractPdfBatch } from "../../lib/learning-engine/pdf";
import { structureDocument, validateDocumentAnchor } from "../../lib/learning-engine/curriculum";
import { loadCourseCatalog } from "../../lib/learning-engine/course-catalog";
import { suggestSourceCompetencies } from "../../lib/learning-engine/competency-mapping";
import { buildMappingReviewPacket, evaluateMappingReviews, mappingReviewAssignmentSchema,
  mappingReviewPacketSchema } from "../../lib/learning-engine/competency-mapping-review";
import { loadReferenceTextbookChapters, textbookManifest } from "../../lib/learning-engine/textbook-server";
import { PRECALCULUS_BOOK, PUBLIC_TEXTBOOK_SCOPE } from "../../lib/learning-engine/textbook-catalog";

const selectionSchema = z.array(z.object({ chapter: z.number().int().min(1).max(9),
  blockId: z.string().regex(/^[a-f0-9]{64}$/), skillId: z.string().min(2).max(160),
  assignmentId: z.string().min(1).max(200) }).strict()).min(1).max(500);
async function json(filename: string) {
  if ((await stat(filename)).size > 20_000_000) throw new Error("Mapping review input exceeds 20 MB.");
  return JSON.parse(await readFile(filename, "utf8"));
}
async function once(filename: string, data: unknown) {
  await writeFile(filename, JSON.stringify(data, null, 2) + "\n", { flag: "wx" });
}
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

/** Re-extract the local original PDF and compare it with the pinned, shipped chapter index. */
async function source(chapter: number) {
  const manifest = await textbookManifest();
  const lock = manifest.chapters.find(item => item.number === chapter);
  if (!lock) throw new Error("The requested public textbook chapter is not pinned.");
  const bytes = await readFile(path.resolve("public/assets/textbooks", PRECALCULUS_BOOK.assetDirectory,
    `chapter-${chapter}.pdf`));
  if (hash(bytes) !== lock.assetHash) throw new Error("Original chapter PDF hash changed.");
  const index = (await loadReferenceTextbookChapters(chapter))[0];
  if (!index || index.version.sourceAssetHash !== lock.assetHash) throw new Error("Chapter index changed.");
  const pages = []; let total = 1;
  for (let start = 1; start <= total; start += 10) {
    const batch = await extractPdfBatch(bytes, start, 10);
    total = batch.totalPages; pages.push(...batch.pages);
  }
  const document = await structureDocument({
    documentId: `${PRECALCULUS_BOOK.id}-chapter-${chapter}`, ...PUBLIC_TEXTBOOK_SCOPE,
    title: PRECALCULUS_BOOK.chapters.find(item => item.number === chapter)!.title,
    edition: `${PRECALCULUS_BOOK.edition}, chapter ${chapter}`,
    subject: "math", instructionRights: "licensed", sourceAssetHash: lock.assetHash,
  }, pages);
  if (document.version.id !== index.version.id || document.version.contentHash !== index.version.contentHash)
    throw new Error("Fresh original-page extraction differs from the pinned index.");
  return { document, assetHash: lock.assetHash,
    sourceLock: { chapter, assetHash: lock.assetHash, versionId: index.version.id, contentHash: index.version.contentHash } };
}

async function main() {
  const command = process.argv[2];
  const directory = path.resolve(process.argv[3] ?? "artifacts/learning-engine/research/competency-mapping-review");
  let networkAttempts = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { networkAttempts++; throw new Error("Network request forbidden during source mapping review."); };
  try {
    if (command === "candidates") {
      const chapter = Number(process.argv[4]);
      if (!Number.isInteger(chapter) || chapter < 1 || chapter > 9) throw new Error("Select chapter 1 through 9.");
      const { document } = await source(chapter), framework = (await loadCourseCatalog()).framework;
      const proposals = [];
      for (const block of document.blocks) {
        const result = await suggestSourceCompetencies(framework, document.version, [block], document.pages);
        for (const item of result.suggestions) proposals.push({ chapter, blockId: block.id,
          page: item.anchor.location.page, skillId: item.skillId, title: item.title,
          suggestionHash: item.mappingHash, sourceExcerpt: item.anchor.exactText.slice(0, 260) });
      }
      await mkdir(directory, { recursive: true });
      await once(path.join(directory, `candidates-chapter-${chapter}.json`), proposals);
      console.log(`Prepared ${proposals.length} public chapter ${chapter} keyword candidates. None are reviewed.`);
      return;
    }
    if (command === "packets") {
      const selections = selectionSchema.parse(await json(path.join(directory, "mapping-selections.json")));
      const assignments = z.array(mappingReviewAssignmentSchema).max(1000).parse(await json(path.join(directory, "assignments.json")));
      if (new Set(selections.map(item => `${item.chapter}:${item.blockId}:${item.skillId}`)).size !== selections.length
        || new Set(assignments.map(item => item.id)).size !== assignments.length) throw new Error("Repeated mapping selection or assignment.");
      const framework = (await loadCourseCatalog()).framework, prepared = new Map<number, Awaited<ReturnType<typeof source>>>();
      const packets = []; const secret = randomBytes(32).toString("hex");
      for (const selection of selections) {
        let preparedChapter = prepared.get(selection.chapter);
        if (!preparedChapter) { preparedChapter = await source(selection.chapter); prepared.set(selection.chapter, preparedChapter); }
        const block = preparedChapter.document.blocks.find(item => item.id === selection.blockId);
        if (!block) throw new Error("Selected source block is absent from the pinned PDF.");
        const suggestion = (await suggestSourceCompetencies(framework, preparedChapter.document.version,
          [block], preparedChapter.document.pages)).suggestions.find(item => item.skillId === selection.skillId);
        if (!suggestion) throw new Error("Selected skill is not a current lexical suggestion.");
        const assignment = assignments.find(item => item.id === selection.assignmentId);
        if (!assignment) throw new Error("Selected review assignment is absent.");
        packets.push(await buildMappingReviewPacket({ framework, document: preparedChapter.document,
          suggestion, chapter: selection.chapter, assetHash: preparedChapter.assetHash,
          assignment, blindSecret: secret }));
      }
      if (networkAttempts) throw new Error("A mapping review packet attempted a network request.");
      const output = path.join(directory, "packets");
      await mkdir(output);
      await once(path.join(output, "reviewer-packets.json"), packets);
      await once(path.join(output, "assessment-template.json"), packets.map(packet => ({
        id: "", packetId: packet.id, packetHash: packet.contentHash,
        reviewerId: "", qualificationReference: "", role: "rater", reviewedAt: "",
        conflictOfInterest: false, resolves: [], originalPageChecked: false, objectiveChecked: false,
        judgment: "uncertain", rationale: "", evidence: [],
      })));
      console.log(`Prepared ${packets.length} public-source mapping packets. No educator assessments were added.`);
      return;
    }
    if (command === "report") {
      const packets = z.array(mappingReviewPacketSchema).max(1000).parse(await json(path.join(directory, "packets/reviewer-packets.json")));
      const prepared = new Map<number, Awaited<ReturnType<typeof source>>>();
      for (const packet of packets) {
        let preparedChapter = prepared.get(packet.chapter);
        if (!preparedChapter) { preparedChapter = await source(packet.chapter); prepared.set(packet.chapter, preparedChapter); }
        if (!validateDocumentAnchor(packet.anchor, preparedChapter.document)
          || !preparedChapter.document.blocks.some(item => item.id === packet.anchor.blockId))
          throw new Error("Mapping packet anchor differs from the current original PDF.");
        const block = preparedChapter.document.blocks.find(item => item.id === packet.anchor.blockId)!;
        const proposals = await suggestSourceCompetencies((await loadCourseCatalog()).framework,
          preparedChapter.document.version, [block], preparedChapter.document.pages);
        if (!proposals.suggestions.some(item => item.skillId === packet.competency.id && item.mappingHash === packet.suggestionHash))
          throw new Error("Mapping proposal changed since packet creation.");
      }
      const result = await evaluateMappingReviews({ packets,
        currentFramework: (await loadCourseCatalog()).framework,
        currentDocuments: [...prepared.values()].map(item => item.document),
        sourceLocks: [...prepared.values()].map(item => item.sourceLock),
        reviews: await json(path.join(directory, "assessments.json")),
        reviewers: await json(path.join(directory, "reviewers.json")),
        currentAssignments: await json(path.join(directory, "assignments.json")),
      });
      if (networkAttempts) throw new Error("A mapping report attempted a network request.");
      await once(path.join(directory, `mapping-review-report-${Date.now()}.json`), result);
      console.log(result.status);
      if (result.status !== "review_complete") process.exitCode = 1;
      return;
    }
    throw new Error("Use candidates, packets or report with a private mapping review directory.");
  } finally { globalThis.fetch = originalFetch; }
}

main().catch(error => { console.error(error instanceof Error ? error.message : "Source mapping review could not complete."); process.exitCode = 1; });
