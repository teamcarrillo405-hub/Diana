import { describe, expect, it } from "vitest";

import {
  buildPrerequisiteGraph,
  evaluateObjectiveReadiness,
  normalizeCasePackage,
} from "./standards";

describe("CASE package normalization", () => {
  it("normalizes CASE documents, items, and associations without rewriting licensed text", () => {
    const result = normalizeCasePackage({
      CFDocuments: [{
        identifier: "framework-1",
        uri: "https://example.edu/case/framework-1",
        title: "District Algebra Standards",
        creator: "Example District",
      }],
      CFItems: [
        {
          identifier: "item-1",
          uri: "https://example.edu/case/item-1",
          humanCodingScheme: "A-REI.1",
          fullStatement: "Authorized statement text.",
        },
        {
          identifier: "item-2",
          uri: "https://example.edu/case/item-2",
          humanCodingScheme: "A-REI.2",
        },
      ],
      CFAssociations: [{
        identifier: "association-1",
        associationType: "isChildOf",
        originNodeURI: { identifier: "item-2", uri: "https://example.edu/case/item-2" },
        destinationNodeURI: { identifier: "item-1", uri: "https://example.edu/case/item-1" },
      }],
    });

    expect(result.documents).toHaveLength(1);
    expect(result.items[0]?.fullStatement).toBe("Authorized statement text.");
    expect(result.items[1]?.fullStatement).toBeUndefined();
    expect(result.associations).toHaveLength(1);
    expect(result.warnings).toEqual([]);
  });

  it("warns about external references and rejects malformed URIs", () => {
    const result = normalizeCasePackage({
      CFDocuments: [{ identifier: "f", uri: "https://example.edu/f", title: "Framework" }],
      CFItems: [{ identifier: "i", uri: "https://example.edu/i" }],
      CFAssociations: [{
        identifier: "a",
        associationType: "isPartOf",
        originNodeURI: { identifier: "i", uri: "https://example.edu/i" },
        destinationNodeURI: { identifier: "outside", uri: "https://other.edu/item" },
      }],
    });
    expect(result.warnings).toEqual([
      "Association a references 1 item URI(s) outside this package.",
    ]);
    expect(() => normalizeCasePackage({
      CFDocuments: [{ identifier: "f", uri: "not-a-uri", title: "Framework" }],
      CFItems: [],
      CFAssociations: [],
    })).toThrow();
  });
});

describe("prerequisite graph", () => {
  const objectives = [
    { id: "variables", title: "Identify variables" },
    { id: "equations", title: "Solve equations" },
    { id: "systems", title: "Solve systems" },
  ];

  it("orders objectives and evaluates mastery thresholds deterministically", () => {
    const graph = buildPrerequisiteGraph(objectives, [
      { prerequisiteId: "variables", objectiveId: "equations", minimumMastery: 0.75 },
      { prerequisiteId: "equations", objectiveId: "systems", minimumMastery: 0.8 },
    ]);
    expect(graph.order).toEqual(["variables", "equations", "systems"]);
    expect(evaluateObjectiveReadiness("systems", graph, { equations: 0.79 })).toEqual({
      ready: false,
      unmet: [{ objectiveId: "equations", currentMastery: 0.79, requiredMastery: 0.8 }],
    });
    expect(evaluateObjectiveReadiness("systems", graph, { equations: 0.9 }).ready).toBe(true);
  });

  it("rejects unknown objectives, self-edges, and cycles", () => {
    expect(() => buildPrerequisiteGraph(objectives, [
      { prerequisiteId: "missing", objectiveId: "systems" },
    ])).toThrow("known learning objectives");
    expect(() => buildPrerequisiteGraph(objectives, [
      { prerequisiteId: "systems", objectiveId: "systems" },
    ])).toThrow("own prerequisite");
    expect(() => buildPrerequisiteGraph(objectives, [
      { prerequisiteId: "variables", objectiveId: "equations" },
      { prerequisiteId: "equations", objectiveId: "variables" },
    ])).toThrow("contains a cycle");
  });
});
