export const ASSIGNMENT_SOURCE_TYPES = [
  "instructions",
  "rubric",
  "attachment",
  "link",
  "upload",
  "extracted_text",
] as const;

export type AssignmentSourceType = (typeof ASSIGNMENT_SOURCE_TYPES)[number];

export type AssignmentSourceInput = {
  source_type: AssignmentSourceType;
  title: string;
  provider?: string | null;
  external_id?: string | null;
  url?: string | null;
  storage_key?: string | null;
  mime_type?: string | null;
  extracted_text?: string | null;
  source_location?: string | null;
  import_status?: "ready" | "extracting" | "imported" | "partial" | "failed";
};

export type AssignmentSourcePacket = {
  directions: string;
  rubric: string;
  materialText: string;
  citations: string[];
};

type SourceLike = {
  source_type: string;
  title: string;
  extracted_text?: string | null;
  source_location?: string | null;
};

export function buildSourcePacket(
  assignment: { description?: string | null; rubric_text?: string | null },
  sources: SourceLike[],
): AssignmentSourcePacket {
  const byType = (type: string) => sources.filter((source) => source.source_type === type);
  const sourceText = (items: SourceLike[]) => items
    .map((item) => item.extracted_text?.trim())
    .filter((value): value is string => Boolean(value))
    .join("\n\n");
  const material = sourceText([
    ...byType("attachment"),
    ...byType("link"),
    ...byType("upload"),
    ...byType("extracted_text"),
  ]);
  const citations = sources.map((source) => {
    const location = source.source_location ? `, ${source.source_location}` : "";
    return `${source.title}${location}`;
  });

  return {
    directions: [assignment.description?.trim(), sourceText(byType("instructions"))].filter(Boolean).join("\n\n"),
    rubric: [assignment.rubric_text?.trim(), sourceText(byType("rubric"))].filter(Boolean).join("\n\n"),
    materialText: material,
    citations,
  };
}
