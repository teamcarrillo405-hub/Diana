import {
  parseWorkspaceMode,
  type AssignmentWorkspaceMode,
} from "@/lib/assignment-workspace";
import type { AssignmentCapability } from "@/lib/assignment-capabilities";
import { ASSIGNMENT_CAPABILITIES } from "@/lib/assignment-capabilities";
import type { AssignmentArtifactType } from "@/lib/assignment-profile";

export const ASSIGNMENT_ARTIFACT_SCHEMA_VERSION = 2 as const;

export type AssignmentArtifactFieldDefinition = {
  key: string;
  label: string;
};

export type AssignmentArtifactSection = {
  key: string;
  label: string;
  content: string;
};

export type AssignmentArtifactProblemInput = {
  problemNumber?: number | null;
  problemText?: unknown;
  studentWork?: unknown;
  scaffold?: unknown;
  [key: string]: unknown;
};

export const ASSIGNMENT_ARTIFACT_BLOCK_TYPES = [
  "rich_text",
  "equation",
  "graph",
  "spreadsheet",
  "ledger",
  "map",
  "code",
  "drawing",
  "cad",
  "music_notation",
  "audio",
  "video",
  "data_table",
  "design_notebook",
  "performance_log",
  "procedure_checklist",
] as const;

export type AssignmentArtifactBlockType = (typeof ASSIGNMENT_ARTIFACT_BLOCK_TYPES)[number];

export type AssignmentArtifactBlockInput = {
  id?: string | null;
  key?: string | null;
  type: AssignmentArtifactBlockType;
  capability: AssignmentCapability;
  label: string;
  position?: number | null;
  content: Record<string, unknown>;
  plainText?: string | null;
  sourceAnchors?: Array<{
    sourceId: string;
    location?: string | null;
  }> | null;
};

export type AssignmentArtifactBlock = {
  id: string;
  key: string;
  type: AssignmentArtifactBlockType;
  capability: AssignmentCapability;
  label: string;
  position: number;
  content: Record<string, unknown>;
  plainText: string;
  sourceAnchors: Array<{
    sourceId: string;
    location: string | null;
  }>;
};

type StoredArtifactBlock = {
  id?: unknown;
  block_key?: unknown;
  block_type?: unknown;
  capability?: unknown;
  label?: unknown;
  position?: unknown;
  content?: unknown;
  plain_text?: unknown;
  source_anchors?: unknown;
};

export type AssignmentArtifactInput = {
  mode: AssignmentWorkspaceMode;
  title?: string | null;
  savedWork?: unknown;
  problems?: readonly AssignmentArtifactProblemInput[] | null;
  artifactType?: AssignmentArtifactType | null;
  blocks?: readonly AssignmentArtifactBlockInput[] | null;
};

export type AssignmentArtifact = {
  schemaVersion: typeof ASSIGNMENT_ARTIFACT_SCHEMA_VERSION;
  mode: AssignmentWorkspaceMode;
  artifactType: AssignmentArtifactType | null;
  title: string | null;
  sections: AssignmentArtifactSection[];
  blocks: AssignmentArtifactBlock[];
  plainText: string;
  isEmpty: boolean;
};

export const ASSIGNMENT_ARTIFACT_FIELDS = {
  math: [],
  worksheet: [
    { key: "worksheetQuestion", label: "Question" },
    { key: "worksheetWork", label: "Your reasoning" },
    { key: "worksheetResponse", label: "Response" },
  ],
  writing: [
    { key: "writingThesis", label: "Thesis or main claim" },
    { key: "writingPlan", label: "Paragraph plan" },
    { key: "draft", label: "Your draft" },
  ],
  research: [
    { key: "researchQuestion", label: "Research question" },
    { key: "researchSources", label: "Source notes and citations" },
    { key: "researchClaim", label: "Working claim" },
    { key: "researchDraft", label: "Draft" },
  ],
  history: [
    { key: "historySource", label: "Source analysis" },
    { key: "historyEvidence", label: "Evidence" },
    { key: "historyClaim", label: "Claim" },
    { key: "historyResponse", label: "Response" },
  ],
  lab: [
    { key: "labQuestion", label: "Question or purpose" },
    { key: "labHypothesis", label: "Hypothesis" },
    { key: "labData", label: "Data and observations" },
    { key: "labAnalysis", label: "Analysis" },
    { key: "labConclusion", label: "Conclusion" },
  ],
  reading: [
    { key: "readingNotes", label: "Reading notes" },
    { key: "readingEvidence", label: "Evidence or quote" },
    { key: "readingResponse", label: "Your response" },
  ],
  language: [
    { key: "languagePrompt", label: "Prompt or text" },
    { key: "languageAttempt", label: "Your attempt" },
    { key: "languageNotes", label: "What to improve" },
  ],
  coding: [
    { key: "codeTask", label: "Task and requirements" },
    { key: "codePlan", label: "Plan" },
    { key: "codeWork", label: "Code or pseudocode" },
    { key: "codeTests", label: "Test notes" },
  ],
  art: [
    { key: "artBrief", label: "Brief and requirements" },
    { key: "artConcept", label: "Concept" },
    { key: "artProcess", label: "Process notes" },
    { key: "artStatement", label: "Artist statement" },
  ],
  project: [
    { key: "projectGoal", label: "Project goal" },
    { key: "projectDeliverables", label: "Deliverables" },
    { key: "projectPlan", label: "Build plan" },
    { key: "projectNotes", label: "Work notes" },
  ],
  handoff: [
    { key: "handoffResponse", label: "Response or hand-in notes" },
  ],
} as const satisfies Record<
  AssignmentWorkspaceMode,
  readonly AssignmentArtifactFieldDefinition[]
>;

export const ASSIGNMENT_ARTIFACT_EXCLUDED_KEYS = [
  "workspaceMode",
  "workProfile",
  "workProfileSource",
  "delivery",
  "labScaffold",
  "scaffold",
] as const;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parseStoredAssignmentArtifactBlocks(value: unknown): AssignmentArtifactBlockInput[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const row = raw as StoredArtifactBlock;
    if (
      typeof row.block_type !== "string" ||
      !ASSIGNMENT_ARTIFACT_BLOCK_TYPES.includes(row.block_type as AssignmentArtifactBlockType) ||
      typeof row.capability !== "string" ||
      !ASSIGNMENT_CAPABILITIES.includes(row.capability as AssignmentCapability) ||
      typeof row.label !== "string" ||
      typeof row.block_key !== "string"
    ) return [];
    const anchors = Array.isArray(row.source_anchors)
      ? row.source_anchors.flatMap((anchor) => {
          if (!anchor || typeof anchor !== "object" || Array.isArray(anchor)) return [];
          const candidate = anchor as Record<string, unknown>;
          return typeof candidate.sourceId === "string"
            ? [{
                sourceId: candidate.sourceId,
                location: typeof candidate.location === "string" ? candidate.location : null,
              }]
            : [];
        })
      : [];
    return [{
      id: typeof row.id === "string" ? row.id : row.block_key,
      key: row.block_key,
      type: row.block_type as AssignmentArtifactBlockType,
      capability: row.capability as AssignmentCapability,
      label: row.label,
      position: typeof row.position === "number" ? row.position : 0,
      content: asRecord(row.content),
      plainText: typeof row.plain_text === "string" ? row.plain_text : "",
      sourceAnchors: anchors,
    }];
  }).sort((left, right) => (left.position ?? 0) - (right.position ?? 0));
}

export function legacyArtifactBlocksForPatch(
  mode: AssignmentWorkspaceMode,
  patch: Record<string, string>,
): AssignmentArtifactBlockInput[] {
  if (mode === "math") return [];
  return ASSIGNMENT_ARTIFACT_FIELDS[mode].flatMap((field, index) => {
    if (!(field.key in patch)) return [];
    const content = cleanText(patch[field.key]);
    return [{
      id: `legacy-${field.key}`,
      key: field.key,
      type: "rich_text" as const,
      capability: "rich_text" as const,
      label: field.label,
      content: { text: content },
      plainText: content,
      sourceAnchors: [],
      position: index,
    }];
  });
}

export function assignmentProblemArtifactBlock(problem: AssignmentArtifactProblemInput): AssignmentArtifactBlockInput {
  const work = asRecord(problem.studentWork);
  const problemNumber = Number.isFinite(problem.problemNumber)
    ? Math.max(1, Math.trunc(problem.problemNumber as number))
    : 1;
  const problemText = cleanText(problem.problemText);
  const reasoning = cleanText(work.work);
  const answer = cleanText(work.answer);
  const plainText = [
    problemText ? `Problem: ${problemText}` : "",
    reasoning ? `Work:\n${reasoning}` : "",
    answer ? `Answer:\n${answer}` : "",
  ].filter(Boolean).join("\n\n");
  return {
    id: `problem-${problemNumber}`,
    key: `problem-${problemNumber}`,
    type: "equation",
    capability: "equation_editor",
    label: `Problem ${problemNumber}`,
    content: {
      problemText,
      reasoning,
      answer,
      studentAuthoredText: [reasoning, answer].filter(Boolean).join("\n"),
    },
    plainText,
    sourceAnchors: [],
    position: problemNumber - 1,
  };
}

function sectionsForSavedWork(
  mode: Exclude<AssignmentWorkspaceMode, "math">,
  savedWork: unknown,
): AssignmentArtifactSection[] {
  const record = asRecord(savedWork);
  return ASSIGNMENT_ARTIFACT_FIELDS[mode].flatMap((field) => {
    const content = cleanText(record[field.key]);
    return content ? [{ ...field, content }] : [];
  });
}

function sectionsForProblems(
  problems: readonly AssignmentArtifactProblemInput[] | null | undefined,
): AssignmentArtifactSection[] {
  return (problems ?? [])
    .map((problem, index) => {
      const number = Number.isFinite(problem.problemNumber)
        ? Math.max(1, Math.trunc(problem.problemNumber as number))
        : index + 1;
      const work = asRecord(problem.studentWork);
      const problemText = cleanText(problem.problemText);
      const reasoning = cleanText(work.work);
      const answer = cleanText(work.answer);
      const content = [
        problemText ? `Problem: ${problemText}` : "",
        reasoning ? `Work:\n${reasoning}` : "",
        answer ? `Answer:\n${answer}` : "",
      ].filter(Boolean).join("\n\n");

      return {
        number,
        index,
        section: content
          ? {
              key: `problem-${number}`,
              label: `Problem ${number}`,
              content,
            }
          : null,
      };
    })
    .filter((item): item is {
      number: number;
      index: number;
      section: AssignmentArtifactSection;
    } => item.section !== null)
    .sort((left, right) => left.number - right.number || left.index - right.index)
    .map((item) => item.section);
}

function artifactPlainText(
  title: string | null,
  sections: readonly AssignmentArtifactSection[],
): string {
  return [
    title,
    ...sections.map((section) => `${section.label}\n${section.content}`),
  ].filter((value): value is string => Boolean(value)).join("\n\n");
}

function blockPlainText(block: AssignmentArtifactBlockInput): string {
  const explicit = cleanText(block.plainText);
  if (explicit) return explicit;
  const text = cleanText(block.content.text);
  if (text) return text;
  const value = cleanText(block.content.value);
  if (value) return value;
  return "";
}

function normalizeBlocks(
  blocks: readonly AssignmentArtifactBlockInput[] | null | undefined,
): AssignmentArtifactBlock[] {
  return (blocks ?? []).map((block, index) => {
    const label = cleanText(block.label) || `Work item ${index + 1}`;
    const key = cleanText(block.key) || `block-${index + 1}`;
    const id = cleanText(block.id) || key;
    return {
      id,
      key,
      type: block.type,
      capability: block.capability,
      label,
      position: Number.isFinite(block.position)
        ? Math.max(0, Math.trunc(block.position as number))
        : index,
      content: asRecord(block.content),
      plainText: blockPlainText(block),
      sourceAnchors: (block.sourceAnchors ?? []).flatMap((anchor) =>
        anchor && typeof anchor.sourceId === "string" && anchor.sourceId.trim()
          ? [{ sourceId: anchor.sourceId.trim(), location: cleanText(anchor.location) || null }]
          : []),
    };
  });
}

function blocksForLegacySections(
  sections: readonly AssignmentArtifactSection[],
  mode: AssignmentWorkspaceMode,
): AssignmentArtifactBlock[] {
  return sections.map((section) => ({
    id: section.key,
    key: section.key,
    type: mode === "math" ? "equation" : "rich_text",
    capability: mode === "math" ? "equation_editor" : "rich_text",
    label: section.label,
    position: sections.indexOf(section),
    content: { text: section.content },
    plainText: section.content,
    sourceAnchors: [],
  }));
}

function blocksPlainText(
  title: string | null,
  blocks: readonly AssignmentArtifactBlock[],
): string {
  return [
    title,
    ...blocks.flatMap((block) => {
      const content = cleanText(block.plainText);
      return content ? [`${block.label}\n${content}`] : [];
    }),
  ].filter((value): value is string => Boolean(value)).join("\n\n");
}

export function buildAssignmentArtifact(input: AssignmentArtifactInput): AssignmentArtifact;
export function buildAssignmentArtifact(
  mode: AssignmentWorkspaceMode,
  savedWork?: unknown,
  problems?: readonly AssignmentArtifactProblemInput[] | null,
): AssignmentArtifact;
export function buildAssignmentArtifact(
  inputOrMode: AssignmentArtifactInput | AssignmentWorkspaceMode,
  savedWork?: unknown,
  problems?: readonly AssignmentArtifactProblemInput[] | null,
): AssignmentArtifact {
  const input: AssignmentArtifactInput = typeof inputOrMode === "string"
    ? { mode: inputOrMode, savedWork, problems }
    : inputOrMode;
  const mode = parseWorkspaceMode(input.mode);
  if (!mode) {
    throw new TypeError(`Unsupported assignment workspace mode: ${String(input.mode)}`);
  }

  const title = cleanText(input.title) || null;
  const sections = mode === "math"
    ? sectionsForProblems(input.problems)
    : sectionsForSavedWork(mode, input.savedWork);
  const suppliedBlocks = normalizeBlocks(input.blocks);
  const blocks = suppliedBlocks.length > 0
    ? suppliedBlocks
    : mode === "math"
      ? normalizeBlocks((input.problems ?? []).map(assignmentProblemArtifactBlock))
      : blocksForLegacySections(sections, mode);
  const plainText = suppliedBlocks.length > 0
    ? blocksPlainText(title, blocks)
    : artifactPlainText(title, sections);

  return {
    schemaVersion: ASSIGNMENT_ARTIFACT_SCHEMA_VERSION,
    mode,
    artifactType: input.artifactType ?? null,
    title,
    sections,
    blocks,
    plainText,
    isEmpty: blocks.every((block) => {
      const studentAuthoredText = block.content.studentAuthoredText;
      return typeof studentAuthoredText === "string"
        ? !cleanText(studentAuthoredText)
        : !cleanText(block.plainText);
    }),
  };
}
