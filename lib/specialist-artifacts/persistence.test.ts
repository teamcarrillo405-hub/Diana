import { describe, expect, it } from "vitest";

import {
  ARTIFACT_BLOCK_SOURCE_ANCHOR_MAX_COUNT,
  validateArtifactBlockPersistenceBounds,
} from "./persistence";

const sourceId = "11111111-1111-4111-8111-111111111111";

describe("specialist artifact persistence bounds", () => {
  it("accepts a bounded canonical block", () => {
    expect(validateArtifactBlockPersistenceBounds({
      content: { text: "Student work" },
      plainText: "Student work",
      sourceAnchors: [{ sourceId, location: "p. 2" }],
    })).toBeNull();
  });

  it("enforces UTF-8 bytes instead of character counts", () => {
    expect(validateArtifactBlockPersistenceBounds({
      content: { text: "\u{1f9ea}".repeat(500_001) },
      plainText: "",
      sourceAnchors: [],
    })).toContain("Artifact content is");
    expect(validateArtifactBlockPersistenceBounds({
      content: {},
      plainText: "\u00e9".repeat(500_001),
      sourceAnchors: [],
    })).toContain("Artifact text is");
  });

  it("rejects excessive source-anchor counts and bytes", () => {
    expect(validateArtifactBlockPersistenceBounds({
      content: {},
      plainText: "",
      sourceAnchors: Array.from(
        { length: ARTIFACT_BLOCK_SOURCE_ANCHOR_MAX_COUNT + 1 },
        () => ({ sourceId }),
      ),
    })).toContain("anchor limit");
    expect(validateArtifactBlockPersistenceBounds({
      content: {},
      plainText: "",
      sourceAnchors: [{ sourceId: "x".repeat(17_000) }],
    })).toContain("source anchors are");
  });
});
