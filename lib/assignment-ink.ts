export const ASSIGNMENT_INK_VERSION = 3 as const;
export const ASSIGNMENT_INK_DEFAULT_LOGICAL_WIDTH = 640 as const;
export const ASSIGNMENT_INK_DEFAULT_LOGICAL_HEIGHT = 300 as const;

const ASSIGNMENT_INK_V2_VERSION = 2 as const;

export type AssignmentInkPoint = { x: number; y: number };

export type AssignmentInkStroke = {
  id: string;
  points: AssignmentInkPoint[];
};

export type AssignmentInkDimensions = {
  logicalWidth: number;
  logicalHeight: number;
};

export type InkDocumentV3 = AssignmentInkDimensions & {
  version: typeof ASSIGNMENT_INK_VERSION;
  strokes: AssignmentInkStroke[];
};

export type AssignmentInkDocument = InkDocumentV3;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function finitePositiveNumber(value: unknown): value is number {
  return finiteNumber(value) && value > 0;
}

function finitePoint(value: unknown): AssignmentInkPoint | null {
  if (!isRecord(value)) return null;
  return finiteNumber(value.x) && finiteNumber(value.y)
    ? { x: value.x, y: value.y }
    : null;
}

function parseStoredValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  if (!value.trim()) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function normalizeStrokes(value: unknown): AssignmentInkStroke[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((rawStroke, index) => {
    const rawPoints = Array.isArray(rawStroke)
      ? rawStroke
      : isRecord(rawStroke) && Array.isArray(rawStroke.points)
        ? rawStroke.points
        : [];
    const points = rawPoints.flatMap((point) => {
      const parsedPoint = finitePoint(point);
      return parsedPoint ? [parsedPoint] : [];
    });
    if (points.length === 0) return [];
    const id = isRecord(rawStroke) && typeof rawStroke.id === "string" && rawStroke.id
      ? rawStroke.id
      : `legacy-${index}`;
    return [{ id, points }];
  });
}

function emptyAssignmentInkDocument(): AssignmentInkDocument {
  return {
    version: ASSIGNMENT_INK_VERSION,
    logicalWidth: ASSIGNMENT_INK_DEFAULT_LOGICAL_WIDTH,
    logicalHeight: ASSIGNMENT_INK_DEFAULT_LOGICAL_HEIGHT,
    strokes: [],
  };
}

export function parseAssignmentInkDocument(value: unknown): AssignmentInkDocument {
  const parsed = parseStoredValue(value);
  if (Array.isArray(parsed)) {
    return {
      ...emptyAssignmentInkDocument(),
      strokes: normalizeStrokes(parsed),
    };
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.strokes)) {
    return emptyAssignmentInkDocument();
  }
  if (parsed.version === ASSIGNMENT_INK_V2_VERSION) {
    return {
      ...emptyAssignmentInkDocument(),
      strokes: normalizeStrokes(parsed.strokes),
    };
  }
  if (
    parsed.version !== ASSIGNMENT_INK_VERSION
    || !finitePositiveNumber(parsed.logicalWidth)
    || !finitePositiveNumber(parsed.logicalHeight)
  ) {
    return emptyAssignmentInkDocument();
  }
  return {
    version: ASSIGNMENT_INK_VERSION,
    logicalWidth: parsed.logicalWidth,
    logicalHeight: parsed.logicalHeight,
    strokes: normalizeStrokes(parsed.strokes),
  };
}

export function parseAssignmentInk(value: unknown): AssignmentInkStroke[] {
  return parseAssignmentInkDocument(value).strokes;
}

export function serializeAssignmentInkDocument(document: AssignmentInkDocument): string {
  const rawDocument = document as unknown;
  if (
    !isRecord(rawDocument)
    || rawDocument.version !== ASSIGNMENT_INK_VERSION
    || !finitePositiveNumber(rawDocument.logicalWidth)
    || !finitePositiveNumber(rawDocument.logicalHeight)
  ) {
    return "";
  }
  const strokes = normalizeStrokes(rawDocument.strokes).map((stroke) => ({
    id: stroke.id,
    points: stroke.points.map((point) => ({
      x: Math.round(point.x),
      y: Math.round(point.y),
    })),
  }));
  if (strokes.length === 0) return "";
  const normalized: AssignmentInkDocument = {
    version: ASSIGNMENT_INK_VERSION,
    logicalWidth: rawDocument.logicalWidth,
    logicalHeight: rawDocument.logicalHeight,
    strokes,
  };
  return JSON.stringify(normalized);
}

export function serializeAssignmentInk(
  strokes: readonly AssignmentInkStroke[],
  dimensions: AssignmentInkDimensions = {
    logicalWidth: ASSIGNMENT_INK_DEFAULT_LOGICAL_WIDTH,
    logicalHeight: ASSIGNMENT_INK_DEFAULT_LOGICAL_HEIGHT,
  },
): string {
  return serializeAssignmentInkDocument({
    version: ASSIGNMENT_INK_VERSION,
    logicalWidth: dimensions.logicalWidth,
    logicalHeight: dimensions.logicalHeight,
    strokes: strokes.map((stroke) => ({
      id: stroke.id,
      points: stroke.points.map((point) => ({ ...point })),
    })),
  });
}

export function hasAssignmentInk(value: unknown): boolean {
  return parseAssignmentInk(value).length > 0;
}
