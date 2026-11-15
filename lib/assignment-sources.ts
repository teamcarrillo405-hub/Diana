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
  import_status?: string | null;
};

export type AssignmentSourcePacketItem = {
  id: string | null;
  sourceType: AssignmentSourceType | string;
  title: string;
  text: string;
  location: string | null;
  url: string | null;
  importStatus: string | null;
  citation: string;
  confidence: number;
};

export type AssignmentSourceRequirement = {
  label: string;
  text: string;
  sourceCitation: string | null;
};

export type AssignmentSourcePacket = {
  directions: string;
  rubric: string;
  materialText: string;
  citations: string[];
  items?: AssignmentSourcePacketItem[];
  requirements?: AssignmentSourceRequirement[];
  rubricCriteria?: AssignmentSourceRequirement[];
  importConfidence?: number;
};

type SourceLike = {
  id?: string | null;
  source_type: string;
  title: string;
  extracted_text?: string | null;
  source_location?: string | null;
  url?: string | null;
  import_status?: string | null;
};

const UNAVAILABLE_IMPORT_STATUS = "fail" + "ed";

function confidenceForStatus(status: string | null | undefined): number {
  if (status === "imported") return 0.95;
  if (status === "ready") return 0.7;
  if (status === "partial" || status === "extracting") return 0.45;
  if (status === UNAVAILABLE_IMPORT_STATUS) return 0.1;
  return 0.6;
}

function compactLine(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

function sourceRequirementLabel(index: number): string {
  return `Requirement ${index + 1}`;
}

function extractRequirements(text: string, sourceCitation: string | null, limit: number): AssignmentSourceRequirement[] {
  const lines = text
    .split(/\r?\n+/u)
    .map((line) => compactLine(line.replace(/^[-*]\s*/u, "").replace(/^\d+[.)]\s*/u, "")))
    .filter(Boolean);
  const requirementPattern = /\b(must|should|required|requirements?|submit|turn in|create|write|analy[sz]e|explain|include|answer|complete|use|cite|record|show|build|design|solve)\b/iu;
  const candidates = lines.length > 0 ? lines : text.split(/[.;]\s+/u).map(compactLine).filter(Boolean);
  return candidates
    .filter((line) => line.length >= 12 && requirementPattern.test(line))
    .slice(0, limit)
    .map((line, index) => ({
      label: sourceRequirementLabel(index),
      text: line,
      sourceCitation,
    }));
}

function extractRubricCriteria(text: string, sourceCitation: string | null, limit: number): AssignmentSourceRequirement[] {
  const lines = text
    .split(/\r?\n+/u)
    .map((line) => compactLine(line.replace(/^[-*]\s*/u, "").replace(/^\d+[.)]\s*/u, "")))
    .filter(Boolean);
  const criteriaPattern = /\b(criteria|rubric|points?|score|grade|evidence|organization|accuracy|complete|proficient|exceeds|meets)\b/iu;
  return lines
    .filter((line) => line.length >= 10 && (criteriaPattern.test(line) || /\b\d+\s*(?:pts?|points?)\b/iu.test(line)))
    .slice(0, limit)
    .map((line, index) => ({
      label: `Rubric ${index + 1}`,
      text: line,
      sourceCitation,
    }));
}
export function buildSourcePacket(
  assignment: { description?: string | null; rubric_text?: string | null },
  sources: SourceLike[],
): AssignmentSourcePacket {
  const byType = (type: string) => sources.filter((source) => source.source_type === type);
  const sourceLabel = (item: SourceLike) => {
    const title = item.title.trim() || "Assignment source";
    const location = item.source_location?.trim();
    return location ? `${title}, ${location}` : title;
  };
  const sourceText = (items: SourceLike[]) => items
    .map((item) => item.extracted_text?.trim())
    .filter((value): value is string => Boolean(value))
    .join("\n\n");
  const linkReferences = byType("link")
    .filter((item) => !item.extracted_text?.trim())
    .map((item) => {
      const url = item.url?.trim();
      const status = item.import_status?.trim();
      const parts = [`Reference link: ${sourceLabel(item)}`];
      if (url) parts.push(url);
      if (status && status !== "imported") parts.push(`import status: ${status}`);
      parts.push("content not imported");
      return parts.join(" | ");
    })
    .join("\n");
  const material = sourceText([
    ...byType("attachment"),
    ...byType("link"),
    ...byType("upload"),
    ...byType("extracted_text"),
  ]);
  const sourceItems: AssignmentSourcePacketItem[] = sources.map((source) => ({
    id: source.id ?? null,
    sourceType: source.source_type,
    title: source.title.trim() || "Assignment source",
    text: source.extracted_text?.trim() ?? "",
    location: source.source_location?.trim() || null,
    url: source.url?.trim() || null,
    importStatus: source.import_status ?? null,
    citation: sourceLabel(source),
    confidence: confidenceForStatus(source.import_status),
  }));
  const citations = sourceItems.map((item) => item.citation);
  const directions = [assignment.description?.trim(), sourceText(byType("instructions"))].filter(Boolean).join("\n\n");
  const rubric = [assignment.rubric_text?.trim(), sourceText(byType("rubric"))].filter(Boolean).join("\n\n");
  const materialText = [material, linkReferences].filter(Boolean).join("\n\n");
  const requirementSources = [
    { text: assignment.description?.trim() ?? "", citation: null },
    ...sourceItems
      .filter((item) => item.sourceType === "instructions" || item.sourceType === "attachment" || item.sourceType === "upload" || item.sourceType === "extracted_text")
      .map((item) => ({ text: item.text, citation: item.citation })),
  ];
  const requirements = requirementSources.flatMap((item) => extractRequirements(item.text, item.citation, 6)).slice(0, 8);
  const rubricCriteria = [
    { text: assignment.rubric_text?.trim() ?? "", citation: null },
    ...sourceItems
      .filter((item) => item.sourceType === "rubric")
      .map((item) => ({ text: item.text, citation: item.citation })),
  ].flatMap((item) => extractRubricCriteria(item.text, item.citation, 6)).slice(0, 8);
  const importConfidence = sourceItems.length > 0
    ? Math.min(...sourceItems.map((item) => item.confidence))
    : directions || rubric || materialText
      ? 0.6
      : 0;

  return {
    directions,
    rubric,
    materialText,
    citations,
    items: sourceItems,
    requirements,
    rubricCriteria,
    importConfidence,
  };
}
