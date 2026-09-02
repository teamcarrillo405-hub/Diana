export type AssignmentReviewTemplate = "writing" | "math" | "worksheet" | "research" | "history" | "lab" | "reading" | "language" | "coding" | "art" | "project" | "handoff";

export type AssignmentReviewField = {
  label: string;
  value: string;
};

export type AssignmentVisualAidKind = "none" | "balance" | "equation_steps" | "number_line" | "coordinate_plane" | "fraction_bar" | "geometry" | "table" | "process";

export type AssignmentVisualAid = {
  kind: AssignmentVisualAidKind;
  title: string;
  description: string;
  steps: string[];
  equationRows?: StructuredEquationRow[];
};

export type AssignmentReviewResult = {
  title: string;
  strength: string;
  improvement: string;
  nextMove: string;
  question: string;
  evidenceAnchor: string;
  visualAid: AssignmentVisualAid;
};

const VISUAL_AID_KINDS = new Set<AssignmentVisualAidKind>(["none", "balance", "equation_steps", "number_line", "coordinate_plane", "fraction_bar", "geometry", "table", "process"]);

export function parseAssignmentReviewResponse(content: string, template: AssignmentReviewTemplate): AssignmentReviewResult {
  const json = extractJsonObject(content);
  if (!json) return fallbackAssignmentReview(template);

  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const fallback = fallbackAssignmentReview(template);
    return {
      title: stringOr(parsed.title, fallback.title),
      strength: stringOr(parsed.strength, fallback.strength),
      improvement: stringOr(parsed.improvement, fallback.improvement),
      nextMove: stringOr(parsed.nextMove, fallback.nextMove),
      question: stringOr(parsed.question, fallback.question),
      evidenceAnchor: stringOr(parsed.evidenceAnchor, fallback.evidenceAnchor),
      visualAid: parseVisualAid(parsed.visualAid, fallback.visualAid),
    };
  } catch {
    return fallbackAssignmentReview(template);
  }
}

function fallbackAssignmentReview(template: AssignmentReviewTemplate): AssignmentReviewResult {
  const nextMove = template === "math"
    ? "Show the operation you chose and why it fits the problem."
    : template === "lab"
      ? "Connect one observation to the claim you are making."
      : template === "reading"
        ? "Add one exact detail from the text, then explain why it matters."
        : template === "project"
          ? "Choose the smallest deliverable you can complete next."
          : template === "writing"
            ? "Add one sentence that makes your main claim more specific."
            : "Name the next thing you will hand in or complete.";

  return {
    title: "Diana review",
    strength: "You have started with your own work.",
    improvement: "The next useful improvement is to make the connection to the assignment clearer.",
    nextMove,
    question: "What evidence or detail best supports your next move?",
    evidenceAnchor: "Student work",
    visualAid: { kind: "none", title: "", description: "", steps: [] },
  };
}

function parseVisualAid(value: unknown, fallback: AssignmentVisualAid): AssignmentVisualAid {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const candidate = value as Record<string, unknown>;
  const kind = typeof candidate.kind === "string" && VISUAL_AID_KINDS.has(candidate.kind as AssignmentVisualAidKind)
    ? candidate.kind as AssignmentVisualAidKind
    : fallback.kind;
  const steps = Array.isArray(candidate.steps)
    ? candidate.steps.filter((step): step is string => typeof step === "string" && step.trim().length > 0).map((step) => step.trim().slice(0, 180)).slice(0, 4)
    : [];
  if (kind === "none") return { kind: "none", title: "", description: "", steps: [] };
  return {
    kind,
    title: stringOr(candidate.title, visualTitleForKind(kind)),
    description: stringOr(candidate.description, "Use this visual to understand the relationship before the next step."),
    steps,
    equationRows: kind === "equation_steps" ? parseEquationRows(candidate.equationRows) : undefined,
  };
}

function parseEquationRows(value: unknown): StructuredEquationRow[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const rows = value
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object" && !Array.isArray(row))
    .map((row): StructuredEquationRow => ({
      kind: row.kind === "operation" || row.kind === "divider" ? row.kind : "equation",
      cells: Array.isArray(row.cells)
        ? row.cells
          .filter((cell): cell is Record<string, unknown> => Boolean(cell) && typeof cell === "object" && !Array.isArray(cell))
          .map((cell) => ({
            column: cell.column === "left_term" || cell.column === "left_constant" || cell.column === "relation" || cell.column === "right_term"
              ? cell.column
              : null,
            value: typeof cell.value === "string" ? cell.value.trim().slice(0, 80) : "",
          }))
          .filter((cell): cell is StructuredEquationRow["cells"][number] => Boolean(cell.column) && cell.value.length > 0)
        : [],
    }))
    .filter((row) => row.cells.length > 0 || row.kind === "divider")
    .slice(0, 5);
  return rows.length > 0 ? rows : undefined;
}

function visualTitleForKind(kind: AssignmentVisualAidKind): string {
  if (kind === "balance") return "Equation balance";
  if (kind === "equation_steps") return "Equation steps";
  if (kind === "number_line") return "Number line";
  if (kind === "coordinate_plane") return "Coordinate plane";
  if (kind === "fraction_bar") return "Fraction bar";
  if (kind === "geometry") return "Geometry sketch";
  if (kind === "table") return "Table";
  if (kind === "process") return "Process map";
  return "Visual helper";
}

function extractJsonObject(content: string): string | null {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  return start === -1 || end <= start ? null : content.slice(start, end + 1);
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim().slice(0, 900) : fallback;
}
import type { StructuredEquationRow } from "@/lib/assignment-workspace-contracts";
