import { describe, expect, it } from "vitest";

import {
  ASSIGNMENT_INK_DEFAULT_LOGICAL_HEIGHT,
  ASSIGNMENT_INK_DEFAULT_LOGICAL_WIDTH,
  parseAssignmentInk,
  parseAssignmentInkDocument,
  serializeAssignmentInk,
  serializeAssignmentInkDocument,
} from "./assignment-ink";

describe("assignment ink document", () => {
  it("reads legacy arrays and converts version 2 documents to version 3", () => {
    const legacy = parseAssignmentInkDocument(JSON.stringify([
      [{ x: 1, y: 2 }, { x: 3, y: 4 }],
    ]));
    expect(legacy).toEqual({
      version: 3,
      logicalWidth: ASSIGNMENT_INK_DEFAULT_LOGICAL_WIDTH,
      logicalHeight: ASSIGNMENT_INK_DEFAULT_LOGICAL_HEIGHT,
      strokes: [{ id: "legacy-0", points: [{ x: 1, y: 2 }, { x: 3, y: 4 }] }],
    });

    const version2 = JSON.stringify({
      version: 2,
      strokes: [{ id: "ink-1", points: [{ x: 10, y: 20 }] }],
    });
    const migrated = parseAssignmentInkDocument(version2);
    expect(JSON.parse(serializeAssignmentInkDocument(migrated))).toEqual({
      version: 3,
      logicalWidth: ASSIGNMENT_INK_DEFAULT_LOGICAL_WIDTH,
      logicalHeight: ASSIGNMENT_INK_DEFAULT_LOGICAL_HEIGHT,
      strokes: [{ id: "ink-1", points: [{ x: 10, y: 20 }] }],
    });
    expect(parseAssignmentInk(version2)).toEqual(migrated.strokes);
  });

  it("preserves stable logical dimensions when a version 3 document is saved", () => {
    const parsed = parseAssignmentInkDocument(JSON.stringify({
      version: 3,
      logicalWidth: 960,
      logicalHeight: 540,
      strokes: [{ id: "ink-1", points: [{ x: 120, y: 80 }] }],
    }));

    expect(JSON.parse(serializeAssignmentInkDocument(parsed))).toEqual({
      version: 3,
      logicalWidth: 960,
      logicalHeight: 540,
      strokes: [{ id: "ink-1", points: [{ x: 120, y: 80 }] }],
    });
  });

  it("rejects malformed documents, dimensions, and non-numeric points", () => {
    expect(parseAssignmentInkDocument("not-json").strokes).toEqual([]);
    expect(parseAssignmentInk(JSON.stringify({
      version: 3,
      logicalWidth: 640,
      logicalHeight: 300,
      strokes: [{ id: "ink-1", points: [{ x: "10", y: 20 }] }],
    }))).toEqual([]);
    expect(parseAssignmentInkDocument({
      version: 3,
      logicalWidth: Number.POSITIVE_INFINITY,
      logicalHeight: 300,
      strokes: [{ id: "ink-1", points: [{ x: 10, y: 20 }] }],
    })).toEqual({
      version: 3,
      logicalWidth: ASSIGNMENT_INK_DEFAULT_LOGICAL_WIDTH,
      logicalHeight: ASSIGNMENT_INK_DEFAULT_LOGICAL_HEIGHT,
      strokes: [],
    });
    expect(parseAssignmentInk(JSON.stringify({
      version: 4,
      strokes: [{ id: "ink-1", points: [{ x: 10, y: 20 }] }],
    }))).toEqual([]);
  });

  it("serializes empty or invalid ink as an empty string", () => {
    expect(serializeAssignmentInk([])).toBe("");
    expect(serializeAssignmentInkDocument({
      version: 3,
      logicalWidth: 640,
      logicalHeight: 300,
      strokes: [],
    })).toBe("");
  });
});
