// Structured rubric engine.
//
// Why this exists: teacher rubrics arrive as flattened text (Canvas import
// collapses criteria into lines; teachers paste prose). Students with
// executive-function differences can't act on a wall of rubric text — they
// need each criterion as one small, checkable move. This module turns rubric
// text into structured criteria and resolves which rubric governs an
// assignment (assignment override wins, else the class default), mirroring
// the effectiveAiMode precedent.

export type RubricCriterion = {
  id: string;
  /** Short student-facing title, e.g. "Thesis statement". */
  title: string;
  /** Longer detail when the source provides one. */
  detail: string | null;
  /** Points when the source provides them; null for unweighted criteria. */
  points: number | null;
};

export type Rubric = {
  source: "assignment" | "class";
  criteria: RubricCriterion[];
  totalPoints: number | null;
};

export type RubricSelfCheck = {
  done: number;
  total: number;
  /** 0–100, weighted by points when every criterion has points. */
  coveragePct: number;
  /** The single best criterion to look at next, or null when all are done. */
  next: RubricCriterion | null;
};

const MAX_CRITERIA = 24;
const MAX_TITLE_CHARS = 90;

/**
 * Which rubric governs this assignment: the assignment's own rubric when it
 * has one, otherwise the class default. Returns null when neither parses to
 * at least one criterion.
 */
export function resolveRubric(
  classRubricText: string | null | undefined,
  assignmentRubricText: string | null | undefined,
): Rubric | null {
  const fromAssignment = parseRubricText(assignmentRubricText);
  if (fromAssignment.length > 0) {
    return { source: "assignment", criteria: fromAssignment, totalPoints: totalPoints(fromAssignment) };
  }
  const fromClass = parseRubricText(classRubricText);
  if (fromClass.length > 0) {
    return { source: "class", criteria: fromClass, totalPoints: totalPoints(fromClass) };
  }
  return null;
}

/**
 * Parse flattened rubric text into criteria.
 *
 * Handles the shapes we actually store:
 * - Canvas import lines:  "Description - Long description - 10 pts"
 * - Bulleted teacher text: "- Cite two sources", "* Cite two sources"
 * - Numbered lists:        "1. Cite two sources", "1) Cite two sources"
 * - Plain line-per-criterion prose.
 * Lines that are headers ("Rubric:", "Criteria") or empty are dropped.
 */
export function parseRubricText(text: string | null | undefined): RubricCriterion[] {
  if (!text) return [];
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const criteria: RubricCriterion[] = [];
  for (const raw of lines) {
    if (criteria.length >= MAX_CRITERIA) break;
    const line = stripListMarker(raw);
    if (!line) continue;
    if (isHeaderLine(line)) continue;

    const { body, points } = extractPoints(line);
    const { title, detail } = splitTitleDetail(body);
    if (!title) continue;

    criteria.push({
      id: `rc-${criteria.length + 1}`,
      title: clampTitle(title),
      detail,
      points,
    });
  }
  return criteria;
}

/** Criteria as student-facing self-check items: one small move per line. */
export function rubricToChecklist(rubric: Rubric): string[] {
  return rubric.criteria.map((criterion) => {
    const pts = criterion.points != null ? ` (${criterion.points} pts)` : "";
    return `${criterion.title}${pts}`;
  });
}

/**
 * Self-check progress. Weighted by points when every criterion carries
 * points (so a 20-pt thesis counts more than a 2-pt heading); otherwise a
 * plain count. `next` is the highest-value unchecked criterion — points
 * descending, then rubric order — so the student always sees the one move
 * that matters most.
 */
export function rubricSelfCheck(rubric: Rubric, checkedIds: ReadonlySet<string> | string[]): RubricSelfCheck {
  const checked = checkedIds instanceof Set ? checkedIds : new Set(checkedIds);
  const total = rubric.criteria.length;
  const done = rubric.criteria.filter((c) => checked.has(c.id)).length;

  const allWeighted = total > 0 && rubric.criteria.every((c) => c.points != null && c.points > 0);
  let coveragePct: number;
  if (allWeighted) {
    const totalPts = rubric.criteria.reduce((sum, c) => sum + (c.points ?? 0), 0);
    const donePts = rubric.criteria
      .filter((c) => checked.has(c.id))
      .reduce((sum, c) => sum + (c.points ?? 0), 0);
    coveragePct = totalPts > 0 ? Math.round((donePts / totalPts) * 100) : 0;
  } else {
    coveragePct = total > 0 ? Math.round((done / total) * 100) : 0;
  }

  const remaining = rubric.criteria.filter((c) => !checked.has(c.id));
  const next =
    remaining.length === 0
      ? null
      : [...remaining].sort((a, b) => (b.points ?? 0) - (a.points ?? 0))[0];

  return { done, total, coveragePct, next };
}

function totalPoints(criteria: RubricCriterion[]): number | null {
  if (criteria.length === 0) return null;
  if (!criteria.every((c) => c.points != null)) return null;
  return criteria.reduce((sum, c) => sum + (c.points ?? 0), 0);
}

function stripListMarker(line: string): string {
  return line.replace(/^([-*•]|\d{1,2}[.)])\s+/, "").trim();
}

function isHeaderLine(line: string): boolean {
  return /^(rubric|criteria|grading|scoring)\b[:\s]*$/i.test(line);
}

function extractPoints(line: string): { body: string; points: number | null } {
  // Trailing "... - 10 pts" / "... (10 points)" / "... 10pts"
  const tail = line.match(/^(.*?)[\s\-–(]*\b(\d+(?:\.\d+)?)\s*(?:pts?|points?)\)?\s*$/i);
  if (tail && tail[1].trim()) {
    return { body: tail[1].replace(/[\s\-–(]+$/, "").trim(), points: Number(tail[2]) };
  }
  return { body: line, points: null };
}

function splitTitleDetail(body: string): { title: string; detail: string | null } {
  // Canvas format joins description and long_description with " - ".
  const idx = body.indexOf(" - ");
  if (idx > 0) {
    const title = body.slice(0, idx).trim();
    const detail = body.slice(idx + 3).trim();
    return { title, detail: detail || null };
  }
  return { title: body.trim(), detail: null };
}

function clampTitle(title: string): string {
  if (title.length <= MAX_TITLE_CHARS) return title;
  return `${title.slice(0, MAX_TITLE_CHARS - 1).trimEnd()}…`;
}
