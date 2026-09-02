import { describe, expect, it } from "vitest";

import { jsonByteLength, utf8ByteLength } from "./bounds";
import type { SpecialistArtifactContext } from "./contracts";
import {
  serializeCadArtifactContext,
  serializeCodeOutputArtifactContext,
  serializeDesignNotebookArtifactContext,
  serializeDrawingArtifactContext,
  serializeEquationArtifactContext,
  serializeGraphArtifactContext,
  serializeLabDataArtifactContext,
  serializeLedgerArtifactContext,
  serializeMapArtifactContext,
  serializeMediaAnnotationsArtifactContext,
  serializeNotationArtifactContext,
  serializePerformanceLogArtifactContext,
  serializeProcedureChecklistArtifactContext,
  serializeSpecialistArtifactContext,
  serializeSpreadsheetArtifactContext,
  trySerializeSpecialistArtifactContext,
} from "./serializers";

function expectBounded(context: SpecialistArtifactContext) {
  expect(context.bounds.byteLength).toBe(jsonByteLength(context.payload));
  expect(context.bounds.byteLength).toBeLessThanOrEqual(context.bounds.maxBytes);
  expect(context.bounds.itemCount).toBeLessThanOrEqual(context.bounds.maxItems);
  expect(utf8ByteLength(context.summary)).toBeLessThanOrEqual(320);
}

describe("specialist artifact context serializers", () => {
  it("serializes every beta specialist payload into a bounded typed context", () => {
    const musicXml = "<score-partwise version=\"3.1\"><part-list/><part id=\"P1\"><measure number=\"1\"><note/></measure></part></score-partwise>";
    const contexts: SpecialistArtifactContext[] = [
      serializeEquationArtifactContext({ latex: "x=5", reasoning: "Subtract five, then divide by three.", answer: "5" }),
      serializeGraphArtifactContext({ expression: "x^2", points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }),
      serializeLedgerArtifactContext({ rows: [{ account: "Cash", debit: 25, credit: 0 }] }),
      serializeSpreadsheetArtifactContext({
        cells: { A1: "12", B1: "=A1*2" },
        dataset: { fileName: "values.csv", columns: ["x", "y"], rows: [["1", "2"]] },
        chartConfig: { type: "line", xColumn: 0, yColumn: 1 },
      }),
      serializeMapArtifactContext({
        title: "Field observations",
        legend: "Sample sites",
        sourceAttribution: "Student survey",
        markers: [{ id: "one", latitude: 34.123456, longitude: -118.654321, label: "Site", source: "Survey" }],
        importedMap: {
          fileName: "sites.geojson",
          data: {
            type: "FeatureCollection",
            features: [{ type: "Feature", properties: { label: "A" }, geometry: { type: "Point", coordinates: [-118.2, 34.1] } }],
          },
        },
      }),
      serializeDrawingArtifactContext({ logicalWidth: 800, logicalHeight: 400, strokes: [{ id: "s1", color: "#123456", width: 3, points: [{ x: 0.1, y: 0.2 }, { x: 0.8, y: 0.9 }] }] }),
      serializeCodeOutputArtifactContext({ language: "python", code: "print('hi')", output: ["hi"], execution: { runtime: "pyodide", durationMs: 25 } }),
      serializeNotationArtifactContext({
        notes: [{ pitch: "C4", beats: 1 }, { pitch: "G4", beats: 2 }],
        musicXml: { xml: musicXml, metadata: { fileName: "score.musicxml" } },
      }),
      serializeCadArtifactContext({
        units: "mm",
        width: 100,
        height: 60,
        constraints: ["Fits enclosure"],
        modelFileName: "part.stl",
        modelFormat: "stl",
        design: { primitive: "box", dimensions: { width: 100, height: 60, depth: 20 }, volume: 120000, polygonCount: 6, triangleCount: 12 },
        modelStats: { byteLength: 8000, triangleCount: 12, vertexCount: 8 },
      }),
      serializeMediaAnnotationsArtifactContext({
        media: { id: "asset-1", file_name: "practice.mp4", mime_type: "video/mp4", file_size_bytes: 1000 },
        annotations: [{ id: "a", timeSeconds: 4, note: "Check timing", author: "student" }],
      }, { mediaKind: "video" }),
      serializeLabDataArtifactContext({
        rows: [{ id: "r", label: "Temperature", value: "22", unit: "C", uncertainty: "0.5", observation: "Stable" }],
        dataset: { fileName: "lab.csv", columns: ["time", "temp"], rows: [["0", "22"]] },
        chartConfig: { type: "scatter", xColumn: 0, yColumn: 1 },
      }),
      serializeDesignNotebookArtifactContext({ problem: "Reduce waste", stakeholders: "Students", criteria: ["Less material"], constraints: ["One week"], alternatives: [{ id: "a", name: "Reuse", evidence: "Trial" }], selectedAlternative: "Reuse", selectionReason: "Best evidence", tests: [{ id: "t", method: "Measure", result: "20%", revision: "Repeat" }] }),
      serializePerformanceLogArtifactContext({ entries: [{ id: "p", occurredOn: "2026-09-01", focus: "Timing", durationMinutes: 20, evidence: "Recording", reflection: "Steadier" }] }),
      serializeProcedureChecklistArtifactContext({ protocolId: "protocol-1", protocolVersion: 2, completedIndexes: [0, 2], practicalAvailable: true }),
    ];

    expect(contexts.map((context) => context.kind)).toEqual([
      "equation",
      "graph",
      "ledger",
      "spreadsheet",
      "map",
      "drawing",
      "code_output",
      "notation",
      "cad",
      "media_annotations",
      "lab_data",
      "design_notebook",
      "performance_log",
      "procedure_checklist",
    ]);
    contexts.forEach(expectBounded);
    expect(contexts.find((context) => context.kind === "drawing")?.payload).toMatchObject({
      logicalWidth: 800,
      logicalHeight: 400,
      strokes: [{ points: [{ x: 0.1, y: 0.2 }, { x: 0.8, y: 0.9 }] }],
    });
    expect(contexts.find((context) => context.kind === "map")?.payload).toMatchObject({
      importedMap: { data: { type: "FeatureCollection" }, analysis: { featureCount: 1, coordinateCount: 1 } },
    });
    expect(contexts.find((context) => context.kind === "notation")?.payload).toMatchObject({
      musicXml: { xml: musicXml, metadata: { fileName: "score.musicxml", noteCount: 1 } },
    });
  });

  it("enforces actual UTF-8 byte and item limits", () => {
    const graph = serializeGraphArtifactContext({
      expression: "student-expression-" + "\u{1f9ea}".repeat(200),
      points: Array.from({ length: 200 }, (_, index) => ({
        x: index + 0.123456789,
        y: index * index + 0.987654321,
      })),
    }, { maxBytes: 256, maxItems: 100 });

    expectBounded(graph);
    expect(graph.payload.points.length).toBeLessThan(100);
    expect(graph.bounds.truncated).toBe(true);
    expect(graph.bounds.reasons).toEqual(expect.arrayContaining([
      "byte_limit",
      "field_limit",
      "item_limit",
    ]));
  });

  it("produces summaries that do not echo code, locations, file names, or annotation text", () => {
    const secret = "PRIVATE-STUDENT-CONTENT";
    const code = serializeCodeOutputArtifactContext({
      language: "python",
      code: `print('${secret}')`,
      output: [secret],
    });
    const map = serializeMapArtifactContext({
      title: secret,
      sourceAttribution: secret,
      markers: [{ id: "m", latitude: 34.12345, longitude: -118.98765, label: secret, source: secret }],
    });
    const media = serializeMediaAnnotationsArtifactContext({
      media: { file_name: `${secret}.mp4`, storage_key: secret, url: secret },
      annotations: [{ id: "a", timeSeconds: 2, note: secret, author: "student" }],
    }, { mediaKind: "video" });

    expect(code.summary).not.toContain(secret);
    expect(map.summary).not.toContain(secret);
    expect(media.summary).not.toContain(secret);
    expect(JSON.stringify(media.payload)).not.toContain("storage_key");
    expect(JSON.stringify(media.payload)).not.toContain("url");
    expect(map.payload.markers[0]).toMatchObject({ latitude: 34.12, longitude: -118.99 });
  });

  it("removes terminal and direction controls from exported text fields", () => {
    const code = serializeCodeOutputArtifactContext({
      language: "javascript",
      code: "console.log('ok')",
      output: ["\u001b[31malert\u001b[0m\u202esecret"],
    });

    expect(code.payload.output).toEqual(["alertsecret"]);
    expect(code.payload.output[0]).not.toMatch(/[\u001b\u202e]/u);
  });

  it("carries bounded active runtime state into specialist context", () => {
    const code = serializeCodeOutputArtifactContext({
      language: "python",
      code: "print('ready')",
      output: ["ready"],
      runtimeState: {
        status: "complete",
        engines: ["Pyodide", "Pyodide", "x".repeat(200)],
        updatedAt: "2026-08-31T07:00:00.000Z",
        detail: "\u001b[32mLocal run complete\u001b[0m",
        outputTruncated: true,
      },
    });

    expect(code.runtime).toMatchObject({
      status: "complete",
      updatedAt: "2026-08-31T07:00:00.000Z",
      detail: "Local run complete",
      outputTruncated: true,
    });
    expect(code.runtime.engines[0]).toBe("Pyodide");
    expect(new TextEncoder().encode(code.runtime.engines[1]).byteLength).toBeLessThanOrEqual(64);
  });

  it("carries bounded assignment, academic, rubric, and source context", () => {
    const graph = serializeGraphArtifactContext(
      { expression: "x", points: [{ x: 0, y: 0 }] },
      {
        artifactContext: {
          assignmentIdentity: {
            id: "assignment-1",
            title: "\u001b[31mGraph evidence\u001b[0m",
          },
          academicBand: "high_foundation",
          rubricAnchors: [{
            criterionId: "criterion-1",
            criterion: "Use evidence from the graph",
            location: "Rubric row 1",
          }],
          sourceAnchors: [{
            sourceId: "source-1",
            label: "Teacher graph",
            location: "p. 2",
          }],
        },
      },
    );

    expect(graph).toMatchObject({
      assignmentIdentity: { id: "assignment-1", title: "Graph evidence" },
      academicBand: "high_foundation",
      rubricAnchors: [{
        criterionId: "criterion-1",
        criterion: "Use evidence from the graph",
        location: "Rubric row 1",
      }],
      sourceAnchors: [{
        sourceId: "source-1",
        label: "Teacher graph",
        location: "p. 2",
      }],
    });
  });

  it("maps stored assignment block types and rejects unsupported blocks", () => {
    expect(serializeSpecialistArtifactContext({
      type: "video",
      capability: "video_review",
      content: { annotations: [] },
    })).toMatchObject({ kind: "media_annotations", capability: "video_review" });
    expect(serializeSpecialistArtifactContext({
      kind: "lab_data",
      content: { rows: [] },
    })).toMatchObject({ kind: "lab_data", capability: "data_lab" });
    expect(trySerializeSpecialistArtifactContext({
      type: "rich_text",
      content: { text: "Universal fallback" },
    })).toBeNull();
  });
});
