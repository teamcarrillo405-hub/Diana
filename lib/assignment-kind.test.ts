import { describe, expect, it } from "vitest";

import {
  normalizeAssignmentKind,
  normalizeAssignmentStatus,
} from "./assignment-kind";

describe("assignment database value normalization", () => {
  it("preserves supported assignment values", () => {
    expect(normalizeAssignmentKind("lab")).toBe("lab");
    expect(normalizeAssignmentStatus("submitted")).toBe("submitted");
  });

  it("uses safe defaults for unsupported database values", () => {
    expect(normalizeAssignmentKind("unexpected")).toBe("other");
    expect(normalizeAssignmentStatus(null)).toBe("todo");
  });
});
