import { z } from "zod";

export const regionSchema = z.object({
  id: z.string().min(1).max(100), kind: z.enum(["text", "table", "diagram", "equation", "handwriting"]),
  box: z.object({ x: z.number().finite().min(0).max(1), y: z.number().finite().min(0).max(1), width: z.number().finite().positive().max(1), height: z.number().finite().positive().max(1) }).strict()
    .refine(box => box.x + box.width <= 1.000001 && box.y + box.height <= 1.000001, "Region must remain within its page"),
  startOffset: z.number().int().nonnegative(), endOffset: z.number().int().positive(),
  provenance: z.enum(["native_pdf", "model_extraction", "manual"]),
  confirmed: z.boolean(),
}).strict().refine(region => region.endOffset > region.startOffset, "Region must contain text");
export const sourcePageSchema = z.object({
  page: z.number().int().min(1).max(1500), pageLabel: z.string().min(1).max(120),
  text: z.string().max(250000), interpretation: z.enum(["original", "model_extraction", "confirmed"]),
  regions: z.array(regionSchema).max(4000).optional(),
}).strict().superRefine((page, context) => {
  const ids = new Set<string>();
  for (const region of page.regions ?? []) {
    if (ids.has(region.id) || region.endOffset > page.text.length) context.addIssue({ code: z.ZodIssueCode.custom, message: "Region identity or text span is invalid" });
    ids.add(region.id);
  }
});
export type SourceRegion = z.infer<typeof regionSchema>;
/** Rebase disjoint offsets, and discard overlapping annotations after a correction. */
export function correctRegion(page:z.infer<typeof sourcePageSchema>,id:string,text:string) {
  const region=page.regions?.find(item=>item.id===id);
  if(!region||!text.trim()||text.length>12000)throw new Error("Choose a region and a bounded correction.");
  const delta=text.length-(region.endOffset-region.startOffset);
  return sourcePageSchema.parse({...page,text:page.text.slice(0,region.startOffset)+text+page.text.slice(region.endOffset),
    regions:page.regions!.flatMap(item=>{
      if(item.id===id)return [{...item,endOffset:item.startOffset+text.length,confirmed:true,provenance:"manual" as const}];
      if(item.endOffset<=region.startOffset)return [item];
      if(item.startOffset>=region.endOffset)return [{...item,startOffset:item.startOffset+delta,endOffset:item.endOffset+delta}];
      return [];
    })});
}
export type LayoutUnit = { start: number; end: number; kind: "heading" | "paragraph" | "problem" | "equation" | "table" | "diagram"; level?: number; table?: Array<Array<{ startOffset: number; endOffset: number; text: string }>> };

/** Deterministic structure hints. No visual meaning is inferred from prose. */
export function layoutUnits(text: string): LayoutUnit[] {
  const lines = [...text.matchAll(/[^\r\n]+/g)].map(match => ({ text: match[0], start: match.index!, end: match.index! + match[0].length }));
  const units: LayoutUnit[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i], trimmed = line.text.trim();
    if (!trimmed) continue;
    const start = line.start + line.text.length - line.text.trimStart().length;
    const end = line.end - (line.text.length - line.text.trimEnd().length);
    const markdown = /^(#{1,6})\s/.exec(trimmed);
    const chapter = /^(?:chapter|unit|part)\s+(?:\d+|[IVX]+)\b/i.test(trimmed);
    const section = /^(?:section\s+)?\d+\.\d+(?:\.\d+)?\s+[A-Za-z]/i.test(trimmed);
    if (markdown || chapter || section) { units.push({ start, end, kind: "heading", level: markdown?.[1].length ?? (chapter ? 1 : 2) }); continue; }
    const delimiter = trimmed.includes("\t") ? "\t" : trimmed.startsWith("|") && trimmed.endsWith("|") ? "|" : null;
    if (delimiter) {
      const rows: NonNullable<LayoutUnit["table"]> = [];
      let last = i;
      while (last < lines.length && (delimiter === "\t" ? lines[last].text.includes("\t") : /^\s*\|.*\|\s*$/.test(lines[last].text))) {
        const row = lines[last];
        const cells: NonNullable<LayoutUnit["table"]>[number] = [];
        for (const match of row.text.matchAll(delimiter === "\t" ? /[^\t]+/g : /[^|]+/g)) {
          const value = match[0].trim();
          if (!value) continue;
          const cellStart = row.start + match.index! + match[0].length - match[0].trimStart().length;
          cells.push({ startOffset: cellStart, endOffset: cellStart + value.length, text: value });
        }
        rows.push(cells); last++;
      }
      // Ragged/oversized tables remain prose until reviewed.
      if (rows.length >= 2 && rows.length <= 60 && rows[0].length <= 20 && rows.every(row => row.length === rows[0].length)) {
        units.push({ start, end: lines[last - 1].end, kind: "table", table: rows }); i = last - 1; continue;
      }
    }
    const kind = /^(?:problem\s+)?\d+[a-z]?[.)]\s/i.test(trimmed) ? "problem"
      : /^(?:figure|diagram)\s+\d+/i.test(trimmed) ? "diagram"
      : /^[\d\sxyzXYZ()+*/^.=−+\-]+$/.test(trimmed) && /[=]/.test(trimmed) ? "equation" : "paragraph";
    const previous = units.at(-1);
    if (kind === "paragraph" && previous && (previous.kind === "paragraph" || previous.kind === "problem")
      && !/\r?\n\s*\r?\n/.test(text.slice(previous.end, start))) previous.end = end;
    else units.push({ start, end, kind });
  }
  return units;
}

export function extractionQuality(pages: Array<z.infer<typeof sourcePageSchema>>) {
  const signals = pages.map(page => {
    const reasons: string[] = [];
    if (page.text.trim().length < 40) reasons.push("sparse_text");
    if (/\uFFFD/.test(page.text)) reasons.push("replacement_characters");
    if (page.interpretation === "model_extraction") reasons.push("unconfirmed_extraction");
    if (page.regions?.some(region => region.provenance === "model_extraction" && !region.confirmed)) reasons.push("unconfirmed_region");
    return { page: page.page, reasons, reviewRequired: reasons.length > 0 };
  });
  return { method: "observable_extraction_signals_v1", calibratedProbability: null, pages: signals, reviewPages: signals.filter(page => page.reviewRequired).length };
}
