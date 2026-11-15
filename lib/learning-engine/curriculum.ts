import {
  blockSchema, chunkSchema, documentVersionSchema, type DocumentVersion,
  type EvidenceAnchor, type SourceBlock, type SourcePage, type StructuredDocument,
} from "./contracts";
import { layoutUnits, sourcePageSchema } from "./source-layout";

export async function sha256(value: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

const SKILLS: Array<[string, RegExp]> = [
  ["math.linear_equations", /\b(linear|equation|solve for|slope)\b/i],
  ["math.polynomials", /\b(polynomial|factor|quadratic|exponent)\b/i],
  ["math.systems", /\b(system of|simultaneous|substitution|elimination)\b/i],
  ["math.functions", /\b(function|domain|range|graph)\b/i],
  ["math.geometry_measurement", /\b(area|volume|perimeter|circumference|triangle|circle)\b/i],
  ["math.geometry_reasoning", /\b(congruent|similar|proof|theorem|angle)\b/i],
  ["reading.central_idea", /\b(central idea|main idea|theme|summary)\b/i],
  ["reading.evidence", /\b(evidence|quote|support|passage)\b/i],
  ["reading.inference", /\b(infer|inference|implies|conclude)\b/i],
  ["reading.vocabulary", /\b(vocabulary|meaning|context clue|word)\b/i],
  ["reading.argument", /\b(argument|purpose|author|claim|rhetoric)\b/i],
  ["reading.comparison", /\b(compare|contrast|both texts|difference)\b/i],
];

export function curriculumSkills(text: string): string[] {
  return SKILLS.filter(([, pattern]) => pattern.test(text)).map(([skill]) => skill);
}

/** Original page text is immutable. Every derived block retains exact offsets. */
export async function structureDocument(
  metadata: Omit<DocumentVersion, "id" | "contentHash" | "extractionVersion" | "trainingPermission" | "parentVersionId">
    & { trainingPermission?: DocumentVersion["trainingPermission"]; parentVersionId?: string | null },
  pages: SourcePage[],
  options: { legacy?: boolean } = {},
): Promise<StructuredDocument> {
  pages = pages.map(page => sourcePageSchema.parse(page));
  if (!pages.length || pages.length > 1500
    || pages.some((page) => page.text.length > 250000 || !Number.isInteger(page.page) || page.page < 1 || page.page > 1500)
    || new Set(pages.map((page) => page.page)).size !== pages.length) {
    throw new Error("Document exceeds extraction bounds or repeats a page.");
  }
  if (pages.reduce((total, page) => total + page.text.length, 0) > 8_000_000) {
    throw new Error("Document exceeds the text budget.");
  }
  const contentHash = await sha256(JSON.stringify(pages));
  const normalized = { ...metadata, trainingPermission: metadata.trainingPermission ?? "excluded", parentVersionId: metadata.parentVersionId ?? null };
  const extractionVersion = options.legacy ? "structured-text-v1" : "structured-text-v2";
  const version = documentVersionSchema.parse({
    ...normalized, contentHash, extractionVersion,
    id: await sha256(JSON.stringify({ ...normalized, contentHash, extractionVersion })),
  });
  const blocks: SourceBlock[] = [];
  let section: string | null = null;
  const headingPath: Array<{ id: string; level: number }> = [];
  for (const page of [...pages].sort((a, b) => a.page - b.page)) {
    // Split paragraphs and numbered instructional units without rewriting source text.
    const spans = options.legacy ? [...page.text.matchAll(/[^\r\n]+(?:\r?\n(?!\s*(?:\r?\n|(?:problem\s+)?\d+[.)]|\s*#{1,6}\s))[^\r\n]+)*/gi)].map(match => ({ text: match[0], start: match.index!, unit: null }))
      : layoutUnits(page.text).map(unit => ({ text: page.text.slice(unit.start,unit.end), start: unit.start, unit }));
    for (const span of spans) {
      const raw = span.text;
      const start = span.start + raw.length - raw.trimStart().length;
      const text = raw.trim();
      if (!text) continue;
      const heading = span.unit ? span.unit.kind === "heading" : /^(?:#{1,6}\s|chapter\s+\d|section\s+\d)/i.test(text);
      if (heading) section = text.slice(0, 300);
      const problemNumber = /^(?:problem\s+)?(\d+[a-z]?)[.)]\s/i.exec(text)?.[1] ?? null;
      // Keep short exercises together; long prose is bounded by whitespace.
      let cursor = 0;
      while (cursor < text.length) {
        let end = Math.min(cursor + (span.unit?.kind === "table" ? 12000 : 2200), text.length);
        if (end < text.length) {
          const boundary = text.lastIndexOf(" ", end);
          if (boundary > cursor + 1100) end = boundary;
        }
        const slice = text.slice(cursor, end);
        if (slice.trim()) {
          const location = { page: page.page, pageLabel: page.pageLabel, startOffset: start + cursor, endOffset: start + end };
          const id = await sha256(version.id + ":" + page.page + ":" + location.startOffset + ":" + location.endOffset);
          const previous = blocks.at(-1);
          const regions = (page.regions ?? []).filter(region => region.startOffset < location.endOffset && region.endOffset > location.startOffset);
          // A confirmed region can unlock only its fully covered text span.
          // Confirming one label never confirms the surrounding page or diagram.
          const coveredByConfirmedRegion = regions.some(region => region.confirmed && region.startOffset <= location.startOffset && region.endOffset >= location.endOffset);
          const needsConfirmation = (page.interpretation === "model_extraction" && !coveredByConfirmedRegion) || regions.some(region => region.provenance === "model_extraction" && !region.confirmed);
          const level = span.unit?.level ?? 1;
          if (heading && cursor === 0) { while (headingPath.length && headingPath.at(-1)!.level >= level) headingPath.pop(); }
          // Only explicit continuation labels join pages. A nearby equation is insufficient.
          const continuation = !needsConfirmation && previous && !previous.needsConfirmation && previous.location.page === page.page - 1
            && /^(?:continued\b|\(continued\))/i.test(slice) && previous.kind === "problem" ? previous.id : null;
          blocks.push(blockSchema.parse({
            id,
            versionId: version.id, text: slice, location, section, problemNumber,
            kind: span.unit?.kind ?? (heading ? "heading" : problemNumber ? "problem" : "paragraph"),
            skillIds: curriculumSkills(slice), interpretation: coveredByConfirmedRegion ? "confirmed" : page.interpretation,
            needsConfirmation,
            ...(!options.legacy ? { structure: { headingPath: headingPath.map(item => item.id),
              ...(heading ? { headingLevel: level } : {}), previousBlockId: previous?.id ?? null, continuationOf: continuation,
              regionIds: regions.map(region => region.id),
              ...(span.unit?.table && text.length <= 12000 ? { table: span.unit.table } : {}),
            } } : {}),
          }));
          if (heading && cursor === 0) headingPath.push({id,level});
        }
        cursor = end;
      }
    }
  }
  const chunks = blocks.filter((block) => !block.needsConfirmation && block.kind !== "heading").map((block) => chunkSchema.parse({
    id: block.id, versionId: version.id, ownerId: version.ownerId,
    assignmentId: version.assignmentId, classId: version.classId, subject: version.subject,
    text: block.text, skillIds: block.skillIds, problemNumber: block.problemNumber,
    anchors: [{ versionId: version.id, blockId: block.id, contentHash, location: block.location, exactText: block.text }],
  }));
  const blocksById = new Map(blocks.map(block=>[block.id,block]));
  const chunksById = new Map(chunks.map(chunk=>[chunk.id,chunk]));
  if(!options.legacy)for(const chunk of chunks){
    const block=blocksById.get(chunk.id)!;
    const headings=(block.structure?.headingPath??[]).map(id=>blocksById.get(id)).filter((item):item is SourceBlock=>!!item&&!item.needsConfirmation);
    const context=headings.map(item=>item.text.slice(0,300)).join("\n");
    if(context&&context.length+chunk.text.length+2<=12000){
      chunk.text=context+"\n\n"+chunk.text;
      for(const heading of headings){
        const exactText=heading.text.slice(0,300);
        chunk.anchors.push({versionId:version.id,blockId:heading.id,contentHash,exactText,
          location:{...heading.location,endOffset:heading.location.startOffset+exactText.length}});
      }
    }
  }
  for (const block of blocks) {
    const previous = block.structure?.continuationOf ? blocksById.get(block.structure.continuationOf) : undefined;
    if (!previous || block.needsConfirmation || previous.needsConfirmation || previous.text.length + block.text.length > 11000) continue;
    const first = chunksById.get(previous.id), next = chunksById.get(block.id);
    const anchors=first&&next?[...new Map([...first.anchors,...next.anchors].map(anchor=>[anchor.blockId,anchor])).values()]:[];
    if (first && next && anchors.length<=12 && first.text.length+next.text.length+2<=12000) chunks.push(chunkSchema.parse({ ...first, id: await sha256(first.id + ":continued:" + next.id),
      text: first.text + "\n\n" + next.text, anchors }));
  }
  return { version, pages, blocks, chunks };
}

export function validateDocumentAnchor(anchor: EvidenceAnchor, document: StructuredDocument): boolean {
  const block = document.blocks.find((candidate) => candidate.id === anchor.blockId);
  const page = document.pages.find((candidate) => candidate.page === anchor.location.page);
  return anchor.versionId === document.version.id && anchor.contentHash === document.version.contentHash
    && !!block && !block.needsConfirmation && !!page && page.pageLabel === anchor.location.pageLabel
    && anchor.location.startOffset >= block.location.startOffset
    && anchor.location.endOffset <= block.location.endOffset
    && page.text.slice(anchor.location.startOffset, anchor.location.endOffset) === anchor.exactText;
}
