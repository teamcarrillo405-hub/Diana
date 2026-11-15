import { createHash } from "node:crypto";
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRawStream,
  decodePDFRawStream,
} from "pdf-lib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resolveAssignmentProfile } from "./assignment-profile";
import { UNIVERSAL_TYPED_INK_FALLBACK } from "./assignment-capabilities";
import type { AssignmentArtifactBlockInput } from "./assignment-artifact";
import {
  ASSIGNMENT_SUBMISSION_PDF_MAX_BYTES,
  ASSIGNMENT_SUBMISSION_PDF_TEXT_MAX_BYTES,
  assignmentSubmissionPdfPayload,
  assignmentSubmissionPdfSpecialistNotices,
  assertAssignmentSubmissionPdfByteLength,
  renderAssignmentSubmissionPdf,
} from "./assignment-submission-pdf";
import {
  ASSIGNMENT_SUBMISSION_CANONICAL_PAYLOAD_MAX_BYTES,
  assignmentSubmissionDigest,
  assignmentSubmissionCanonicalPayloadBytes,
  assignmentSubmissionReceiptProjection,
  assertAssignmentSubmissionCanonicalPayloadByteLength,
} from "./assignment-submission-server";
import {
  assignmentSubmissionFileName,
  buildAssignmentSubmissionPreview,
  buildCanonicalSpecialistContexts,
  canonicalSubmissionPayloadForTarget,
  canonicalSubmissionText,
  submissionSpecialistRuntimeHealth,
} from "./assignment-submission";
import { SPECIALIST_ARTIFACT_CONTEXT_CONSUMERS, SPECIALIST_ARTIFACT_KINDS } from "./specialist-artifacts/contracts";

const NOW = new Date("2026-09-01T12:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

function canonicalPdfAttachment(pdf: PDFDocument): Uint8Array {
  const names = pdf.catalog.lookup(PDFName.of("Names"), PDFDict);
  const embeddedFiles = names.lookup(PDFName.of("EmbeddedFiles"), PDFDict);
  const files = embeddedFiles.lookup(PDFName.of("Names"), PDFArray);
  const fileSpec = files.lookup(1, PDFDict);
  const embeddedFile = fileSpec.lookup(PDFName.of("EF"), PDFDict);
  const stream = embeddedFile.lookup(PDFName.of("F")) as PDFRawStream;
  return decodePDFRawStream(stream).decode();
}

const assignment = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Algebra: Multi-Step Equations",
  saved_work: { workspaceMode: "math" },
  work_profile: "math",
  academic_band: "high_foundation",
  rubric_text: "Show the method and connect the evidence to the conclusion.",
};
const profile = resolveAssignmentProfile({ kind: "problem_set", className: "Algebra I", title: assignment.title });
const problems = [
  {
    id: "22222222-2222-4222-8222-222222222222",
    problem_number: 1,
    problem_text: "Solve 3x + 5 = 20",
    student_work: {
      work: "3x = 15\nx = 5",
      workInk: JSON.stringify({ version: 2, strokes: [{ id: "ink-1", points: [{ x: 12, y: 18 }, { x: 120, y: 64 }] }] }),
    },
    scaffold: null,
    progress_status: "done",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    problem_number: 2,
    problem_text: "Solve 2x = 18",
    student_work: {},
    scaffold: null,
    progress_status: "not_started",
  },
];

const specialistBlocks: AssignmentArtifactBlockInput[] = [
  {
    key: "student-response",
    type: "rich_text" as const,
    capability: "rich_text" as const,
    label: "Student response",
    position: 1,
    content: { text: "The graph rises as x increases." },
    plainText: "The graph rises as x increases.",
  },
  {
    key: "graph",
    type: "graph" as const,
    capability: "graphing" as const,
    label: "Function graph",
    position: 2,
    content: {
      expression: "x^2",
      points: [{ x: -1, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 1 }],
    },
    plainText: "Untrusted stored graph summary",
    sourceAnchors: [{ sourceId: "teacher-graph", location: "p. 2" }],
  },
];

const runtimeState = {
  status: "complete",
  engines: ["canonical-parity-runtime"],
  updatedAt: "2026-09-01T12:00:00.000Z",
  detail: "Runtime output captured",
  outputTruncated: false,
} as const;

const specialistPayloadCases: Array<{
  kind: (typeof SPECIALIST_ARTIFACT_KINDS)[number];
  block: AssignmentArtifactBlockInput;
}> = [
  {
    kind: "equation",
    block: {
      key: "equation",
      type: "equation",
      capability: "equation_editor",
      label: "Equation work",
      content: { problemText: "Solve x + 2 = 5", latex: "x=3", reasoning: "Subtract two.", answer: "3", runtimeState },
    },
  },
  {
    kind: "graph",
    block: {
      key: "graph",
      type: "graph",
      capability: "graphing",
      label: "Function graph",
      content: { expression: "x^2", points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], runtimeState },
    },
  },
  {
    kind: "ledger",
    block: {
      key: "ledger",
      type: "ledger",
      capability: "accounting_ledger",
      label: "Ledger",
      content: { rows: [{ account: "Cash", debit: 25, credit: 25 }], runtimeState },
    },
  },
  {
    kind: "spreadsheet",
    block: {
      key: "spreadsheet",
      type: "spreadsheet",
      capability: "spreadsheet",
      label: "Spreadsheet",
      content: {
        cells: { A1: "12", B1: "=A1*2" },
        dataset: { fileName: "values.csv", columns: ["x", "y"], rows: [["1", "2"]] },
        chartConfig: { type: "line", xColumn: 0, yColumn: 1 },
        runtimeState,
      },
    },
  },
  {
    kind: "map",
    block: {
      key: "map",
      type: "map",
      capability: "map_workspace",
      label: "Map",
      content: {
        title: "Observation sites",
        legend: "Sample",
        scale: "1:1000",
        sourceAttribution: "Teacher source",
        markers: [{ id: "site-1", latitude: 34.12, longitude: -118.21, label: "Site", source: "Teacher source" }],
        importedMap: {
          fileName: "sites.geojson",
          data: {
            type: "FeatureCollection",
            features: [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [-118.21, 34.12] } }],
          },
        },
        runtimeState,
      },
    },
  },
  {
    kind: "drawing",
    block: {
      key: "drawing",
      type: "drawing",
      capability: "drawing_canvas",
      label: "Drawing",
      content: {
        logicalWidth: 800,
        logicalHeight: 400,
        strokes: [{ id: "stroke-1", color: "#0f172a", width: 3, points: [{ x: 0.1, y: 0.2 }, { x: 0.9, y: 0.8 }] }],
        runtimeState,
      },
    },
  },
  {
    kind: "code_output",
    block: {
      key: "code",
      type: "code",
      capability: "code_runner",
      label: "Code output",
      content: { language: "python", code: "print('ok')", output: ["ok"], execution: { runtime: "pyodide", durationMs: 18 }, runtimeState },
    },
  },
  {
    kind: "notation",
    block: {
      key: "notation",
      type: "music_notation",
      capability: "music_notation",
      label: "Notation",
      content: {
        notes: [{ pitch: "C4", beats: 1 }, { pitch: "G4", beats: 2 }],
        musicXml: {
          xml: "<score-partwise version=\"3.1\"><part-list/><part id=\"P1\"><measure number=\"1\"><note/></measure></part></score-partwise>",
          metadata: { fileName: "score.musicxml" },
        },
        runtimeState,
      },
    },
  },
  {
    kind: "cad",
    block: {
      key: "cad",
      type: "cad",
      capability: "cad_workspace",
      label: "CAD package",
      content: {
        units: "mm",
        dimensions: { width: 100, height: 60, depth: 20 },
        constraints: ["Fits enclosure"],
        model: { fileName: "part.stl", format: "stl" },
        design: { primitive: "box", dimensions: { width: 100, height: 60, depth: 20 }, volume: 120000, polygonCount: 6, triangleCount: 12 },
        modelStats: { byteLength: 8000, triangleCount: 12, vertexCount: 8 },
        runtimeState,
      },
    },
  },
  {
    kind: "media_annotations",
    block: {
      key: "media",
      type: "video",
      capability: "video_review",
      label: "Video annotations",
      content: {
        media: { kind: "video", fileName: "practice.mp4", mimeType: "video/mp4", sizeBytes: 1000, durationSeconds: 12 },
        annotations: [{ id: "a1", timeSeconds: 4, note: "Check timing", author: "student" }],
        runtimeState,
      },
    },
  },
  {
    kind: "lab_data",
    block: {
      key: "lab-data",
      type: "data_table",
      capability: "data_lab",
      label: "Lab data",
      content: {
        rows: [{ id: "row-1", label: "Temperature", value: "22", unit: "C", uncertainty: "0.5", observation: "Stable" }],
        dataset: { fileName: "lab.csv", columns: ["time", "temp"], rows: [["0", "22"]] },
        chartConfig: { type: "scatter", xColumn: 0, yColumn: 1 },
        runtimeState,
      },
    },
  },
  {
    kind: "design_notebook",
    block: {
      key: "design-notebook",
      type: "design_notebook",
      capability: "design_notebook",
      label: "Design notebook",
      content: { problem: "Reduce waste", stakeholders: "Students", criteria: ["Less material"], constraints: ["One week"], alternatives: [{ id: "a", name: "Reuse", evidence: "Trial" }], selectedAlternative: "Reuse", selectionReason: "Best evidence", tests: [{ id: "t", method: "Measure", result: "20%", revision: "Repeat" }], runtimeState },
    },
  },
  {
    kind: "performance_log",
    block: {
      key: "performance-log",
      type: "performance_log",
      capability: "performance_log",
      label: "Performance log",
      content: { entries: [{ id: "entry", occurredOn: "2026-09-01", focus: "Timing", durationMinutes: 20, evidence: "Recording", reflection: "Steadier" }], runtimeState },
    },
  },
  {
    kind: "procedure_checklist",
    block: {
      key: "procedure",
      type: "procedure_checklist",
      capability: "procedure_checklist",
      label: "Approved procedure",
      content: { protocolId: "protocol-1", protocolVersion: 2, completedIndexes: [0, 2], practicalAvailable: true, runtimeState },
    },
  },
].map((entry) => ({
  ...entry,
  block: {
    ...entry.block,
    sourceAnchors: [{ sourceId: `source-${entry.kind}`, location: "p. 2" }],
  },
} as {
  kind: (typeof SPECIALIST_ARTIFACT_KINDS)[number];
  block: AssignmentArtifactBlockInput;
}));

describe("canonical assignment submission", () => {
  it("uses the same canonical text for preview and provider submission", () => {
    const expected = canonicalSubmissionText({ assignment, profile, problems });
    const preview = buildAssignmentSubmissionPreview({ assignment, profile, problems, destination: "Canvas", submissionType: "text" });

    expect(preview.textPayload).toBe(expected);
    expect(preview.textPayload).toContain("3x = 15\nx = 5");
    expect(preview.problems[0]?.inkData).toContain("ink-1");
    expect(preview.incompleteProblemNumbers).toEqual([2]);
    expect(preview.fileName).toBe("algebra-multi-step-equations.pdf");
  });

  it("renders the reviewed preview into a valid PDF file", async () => {
    const preview = buildAssignmentSubmissionPreview({ assignment, profile, problems, destination: "Google Classroom", submissionType: "file" });
    const bytes = await renderAssignmentSubmissionPdf(preview);
    const pdf = await PDFDocument.load(bytes);

    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(pdf.getTitle()).toBe(assignment.title);
    expect(pdf.getPageCount()).toBeGreaterThan(0);
    expect(assignmentSubmissionFileName(assignment.title)).toBe(preview.fileName);
  });

  it("renders common Unicode math text without rejecting the PDF", async () => {
    const unicodeProblems = problems.map((problem, index) => index === 0
      ? {
          ...problem,
          problem_text: "Graph x² + √y ≤ 10",
          student_work: { work: "x² + √y ≤ 10" },
        }
      : problem);
    const preview = buildAssignmentSubmissionPreview({
      assignment,
      profile,
      problems: unicodeProblems,
      destination: "Google Classroom",
      submissionType: "file",
    });

    const bytes = await renderAssignmentSubmissionPdf(preview);
    const pdf = await PDFDocument.load(bytes);

    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(pdf.getPageCount()).toBeGreaterThan(0);
  });

  it("derives preview, export, LMS, and receipt data from one specialist document", () => {
    const preview = buildAssignmentSubmissionPreview({
      assignment,
      profile,
      problems,
      blocks: specialistBlocks,
      destination: "Canvas",
      submissionType: "text",
    });
    const previewPayload = canonicalSubmissionPayloadForTarget(preview, "preview");
    const exportPayload = canonicalSubmissionPayloadForTarget(preview, "export");
    const lmsPayload = canonicalSubmissionPayloadForTarget(preview, "lms");
    const receiptProjection = assignmentSubmissionReceiptProjection(preview);

    expect(preview.specialistRenderDocument?.blocks).toHaveLength(1);
    expect(previewPayload.specialistProjection.blocks).toEqual([]);
    expect(exportPayload.specialistProjection.blocks).toEqual([]);
    expect(lmsPayload.specialistProjection.blocks).toEqual([]);
    expect(previewPayload.specialistProjection.fallbackBlocks).toBe(preview.specialistRenderDocument?.blocks);
    expect(exportPayload.specialistProjection.fallbackBlocks).toBe(preview.specialistRenderDocument?.blocks);
    expect(lmsPayload.specialistProjection.fallbackBlocks).toBe(preview.specialistRenderDocument?.blocks);
    expect(lmsPayload.specialistProjection.contextBlocks).toBe(preview.specialistRenderDocument?.blocks);
    expect(previewPayload.textPayload).toBe(exportPayload.textPayload);
    expect(exportPayload.textPayload).toBe(lmsPayload.textPayload);
    expect(lmsPayload.textPayload).toContain("The graph rises as x increases.");
    expect(lmsPayload.textPayload).toContain("y = x^2");
    expect(lmsPayload.textPayload).not.toContain("Untrusted stored graph summary");
    expect(lmsPayload.universalFallback).toBe(UNIVERSAL_TYPED_INK_FALLBACK);
    expect(lmsPayload.specialistProjection.fallbackBlocks[0]).toMatchObject({
      type: "graph",
      assignmentIdentity: { id: assignment.id, title: assignment.title },
      academicBand: "high_foundation",
      rubricAnchors: [{ criterion: assignment.rubric_text }],
      sourceAnchors: [{ sourceId: "teacher-graph", location: "p. 2" }],
      runtimeDisposition: "universal_fallback",
      runtimeHealth: { status: "unknown", fallbackRequired: true },
      universalFallback: UNIVERSAL_TYPED_INK_FALLBACK,
    });
    expect(receiptProjection.specialistProjection).toStrictEqual(lmsPayload.specialistProjection);
    expect(receiptProjection.specialistProjection.fallbackBlocks).toStrictEqual(preview.specialistRenderDocument?.blocks);
    expect(receiptProjection.textPayload).toBe(lmsPayload.textPayload);
    expect(receiptProjection.universalFallback).toBe(UNIVERSAL_TYPED_INK_FALLBACK);
  });

  it("binds PDF output and the receipt digest to canonical specialist content", async () => {
    const preview = buildAssignmentSubmissionPreview({
      assignment,
      profile,
      problems,
      blocks: specialistBlocks,
      destination: "Google Classroom",
      submissionType: "file",
    });
    const changedPreview = buildAssignmentSubmissionPreview({
      assignment,
      profile,
      problems,
      blocks: specialistBlocks.map((block) => block.type === "graph"
        ? { ...block, content: { ...block.content, expression: "x^3" } }
        : block),
      destination: "Google Classroom",
      submissionType: "file",
    });
    const pdfPayload = assignmentSubmissionPdfPayload(preview);
    const bytes = await renderAssignmentSubmissionPdf(preview);
    const pdf = await PDFDocument.load(bytes);
    const attachment = canonicalPdfAttachment(pdf);
    const canonicalBytes = assignmentSubmissionCanonicalPayloadBytes(preview);

    expect(pdfPayload.target).toBe("export");
    expect(pdfPayload.specialistProjection.blocks).toEqual([]);
    expect(pdfPayload.specialistProjection.fallbackBlocks).toBe(preview.specialistRenderDocument?.blocks);
    expect(pdfPayload.textPayload).toContain("y = x^2");
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(assignmentSubmissionDigest(preview)).toMatch(/^[a-f0-9]{64}$/u);
    expect(attachment).toEqual(canonicalBytes);
    expect(createHash("sha256").update(attachment).digest("hex")).toBe(
      assignmentSubmissionDigest(preview),
    );
    expect(assignmentSubmissionDigest(changedPreview)).not.toBe(assignmentSubmissionDigest(preview));
  });

  it("discloses missing CAD and media binaries in the visible PDF summary and attached manifest", async () => {
    const binaryBlocks = specialistPayloadCases
      .filter(({ kind }) => kind === "cad" || kind === "media_annotations")
      .map(({ block }) => block);
    const preview = buildAssignmentSubmissionPreview({
      assignment,
      profile,
      problems: [],
      blocks: binaryBlocks,
      destination: "Canvas",
      submissionType: "file",
    });
    const payload = assignmentSubmissionPdfPayload(preview);
    const notices = assignmentSubmissionPdfSpecialistNotices(preview);
    const pdf = await PDFDocument.load(await renderAssignmentSubmissionPdf(preview));
    const attachedPayload = JSON.parse(
      new TextDecoder().decode(canonicalPdfAttachment(pdf)),
    ) as ReturnType<typeof assignmentSubmissionReceiptProjection>;

    expect(payload.specialistDelivery).toMatchObject({
      visibleSummaryIncluded: true,
      externalHandoffRequired: true,
      machineReadableArtifact: {
        fileName: "diana-canonical-assignment.json",
        mediaType: "application/json",
        bounded: true,
      },
    });
    expect(payload.specialistDelivery.blocks).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "cad", sourceAssetHandling: "external_binary_required" }),
      expect.objectContaining({ type: "media_annotations", sourceAssetHandling: "external_binary_required" }),
    ]));
    expect(notices).toEqual(expect.arrayContaining([
      "Specialist artifact summary",
      expect.stringContaining("CAD package:"),
      expect.stringContaining("Video annotations:"),
      "The original CAD model binary is not embedded in the PDF.",
      "The original video binary is not embedded in the PDF.",
      "Submit each original CAD or media source file through the school system's external handoff.",
    ]));
    expect(attachedPayload.specialistDelivery).toStrictEqual(payload.specialistDelivery);
  });

  it("keeps the digest stable when only runtime observation timestamps change", () => {
    const build = (updatedAt: string, checkedAt: string) => buildAssignmentSubmissionPreview({
      assignment,
      profile,
      problems: [],
      blocks: [{
        key: "stable-graph",
        type: "graph",
        capability: "graphing",
        label: "Stable graph",
        content: {
          expression: "x^2",
          points: [{ x: 1, y: 1 }],
          runtimeState: {
            status: "complete",
            engines: ["graph-runtime"],
            updatedAt,
            detail: "Rendered",
            outputTruncated: false,
          },
        },
      }],
      specialistRuntimeEvidence: {
        graphing: {
          available: true,
          checkedAt,
          evidenceSource: "runtime_probe",
          evidenceId: "graph-probe",
          authority: "server",
        },
      },
      destination: "Canvas",
      submissionType: "file",
    });
    const first = build("2026-09-01T11:59:00.000Z", "2026-09-01T11:59:30.000Z");
    const second = build("2026-09-01T12:00:00.000Z", "2026-09-01T12:00:00.000Z");
    const receipt = assignmentSubmissionReceiptProjection(first);

    expect(first.specialistRenderDocument?.blocks[0].runtimeState.updatedAt).toBeNull();
    expect(receipt.specialistProjection.contextBlocks[0].runtimeHealth).toMatchObject({
      checkedAt: null,
      evidence: { observedAt: null },
    });
    expect(assignmentSubmissionCanonicalPayloadBytes(first)).toEqual(
      assignmentSubmissionCanonicalPayloadBytes(second),
    );
    expect(assignmentSubmissionDigest(first)).toBe(assignmentSubmissionDigest(second));
  });

  it("uses block key and id as deterministic tie-breakers for equal positions", () => {
    const equalPositionBlocks: AssignmentArtifactBlockInput[] = [
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        key: "second-key",
        type: "graph",
        capability: "graphing",
        label: "Second",
        position: 100,
        content: { expression: "x + 2", points: [] },
      },
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        key: "first-key",
        type: "graph",
        capability: "graphing",
        label: "First",
        position: 100,
        content: { expression: "x + 1", points: [] },
      },
    ];
    const build = (blocks: AssignmentArtifactBlockInput[]) =>
      buildAssignmentSubmissionPreview({
        assignment,
        profile,
        problems: [],
        blocks,
        destination: "Canvas",
        submissionType: "file",
      });
    const first = build(equalPositionBlocks);
    const second = build([...equalPositionBlocks].reverse());

    expect(first.specialistRenderDocument?.blocks.map((block) => block.id)).toEqual([
      "first-key",
      "second-key",
    ]);
    expect(assignmentSubmissionCanonicalPayloadBytes(first)).toEqual(
      assignmentSubmissionCanonicalPayloadBytes(second),
    );
    expect(assignmentSubmissionDigest(first)).toBe(assignmentSubmissionDigest(second));
  });

  it("prioritizes block anchors, deduplicates authoritative sources, and ignores saved-work metadata", () => {
    const authoritativeSources = Array.from({ length: 6 }, (_, index) => ({
      sourceId: `owned-source-${index + 1}`,
      label: `Owned source ${index + 1}`,
      location: `p. ${index + 1}`,
    }));
    const preview = buildAssignmentSubmissionPreview({
      assignment: {
        ...assignment,
        saved_work: {
          workspaceMode: "math",
          academicBand: "injected-band",
          rubricAnchors: [{ criterion: "Injected rubric" }],
          sourceAnchors: [{ sourceId: "not-owned", label: "Injected source" }],
        },
        source_anchors: authoritativeSources,
      },
      profile,
      problems: [],
      specialistContext: {
        academicBand: "high_foundation",
        rubricAnchors: [{ criterionId: "rubric-1", criterion: "Owned rubric", location: "row 1" }],
        sourceAnchors: authoritativeSources,
      },
      blocks: [{
        key: "source-map",
        type: "map",
        capability: "map_workspace",
        label: "Source map",
        content: { title: "Map", markers: [] },
        sourceAnchors: [
          { sourceId: "owned-source-1", location: "p. 1" },
          { sourceId: "block-source", location: "feature 1" },
        ],
      }],
      destination: "Canvas",
      submissionType: "file",
    });
    const block = preview.specialistRenderDocument?.blocks[0];

    expect(block?.academicBand).toBe("high_foundation");
    expect(block?.rubricAnchors).toEqual([
      { criterionId: "rubric-1", criterion: "Owned rubric", location: "row 1" },
      { criterionId: null, criterion: assignment.rubric_text, location: null },
    ]);
    expect(block?.sourceAnchors.map((anchor) => anchor.sourceId)).toEqual([
      "owned-source-1",
      "block-source",
      ...authoritativeSources.slice(1).map((anchor) => anchor.sourceId),
    ]);
    expect(block?.sourceAnchors).toHaveLength(7);
    expect(block?.sourceAnchors[0]).toEqual(authoritativeSources[0]);
    expect(block?.sourceAnchors).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceId: "not-owned" }),
    ]));
  });

  it("preserves canonical content beyond the former 50 KB boundary", () => {
    const sourcePrefix = Array.from({ length: 80 }, (_, index) =>
      `${index}:${"student-code".repeat(75)}`
    ).join("\n");
    const build = (tail: string) => buildAssignmentSubmissionPreview({
      assignment,
      profile,
      problems: [],
      blocks: [{
        key: "large-code",
        type: "code",
        capability: "code_runner",
        label: "Large code artifact",
        content: { language: "python", code: `${sourcePrefix}\n${tail}`, output: [] },
      }],
      destination: "Canvas",
      submissionType: "text",
    });
    const first = build("CANONICAL-TAIL-A");
    const second = build("CANONICAL-TAIL-B");

    expect(new TextEncoder().encode(first.textPayload).byteLength).toBeGreaterThan(50_000);
    expect(first.textPayload).toContain("CANONICAL-TAIL-A");
    expect(new TextDecoder().decode(assignmentSubmissionCanonicalPayloadBytes(first))).toContain("CANONICAL-TAIL-A");
    expect(assignmentSubmissionDigest(first)).not.toBe(assignmentSubmissionDigest(second));
  });

  it.each([
    {
      name: "drawing geometry",
      type: "drawing" as const,
      capability: "drawing_canvas" as const,
      content: (coordinate: number) => ({ logicalWidth: 800, logicalHeight: 400, strokes: [{ id: "s", color: "#0f172a", width: 3, points: [{ x: 0.1, y: 0.2 }, { x: coordinate, y: 0.8 }] }] }),
    },
    {
      name: "imported GeoJSON",
      type: "map" as const,
      capability: "map_workspace" as const,
      content: (coordinate: number) => ({ title: "Map", markers: [], importedMap: { fileName: "map.geojson", data: { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [coordinate, 34.1] } }] } } }),
    },
    {
      name: "MusicXML",
      type: "music_notation" as const,
      capability: "music_notation" as const,
      content: (coordinate: number) => ({ notes: [], musicXml: { xml: `<score-partwise version="3.1"><part-list/><part id="P1"><measure number="1"><note><pitch><step>${coordinate === 1 ? "C" : "D"}</step></pitch></note></measure></part></score-partwise>`, metadata: { fileName: "score.musicxml" } } }),
    },
  ])("changes the canonical digest when $name changes", ({ type, capability, content }) => {
    const build = (variant: number) => buildAssignmentSubmissionPreview({
      assignment,
      profile,
      problems: [],
      blocks: [{ key: "artifact", type, capability, label: "Specialist artifact", content: content(variant) }],
      destination: "Canvas",
      submissionType: "text",
    });

    expect(assignmentSubmissionDigest(build(1))).not.toBe(assignmentSubmissionDigest(build(2)));
  });

  it.each(specialistPayloadCases)(
    "executes preview, download, LMS, and receipt parity for $kind",
    async ({ kind, block }) => {
      const buildInput = {
        assignment,
        profile,
        problems,
        blocks: [block],
      };
      const preview = buildAssignmentSubmissionPreview({
        ...buildInput,
        destination: "Canvas",
        submissionType: "file",
      });
      const previewPayload = canonicalSubmissionPayloadForTarget(preview, "preview");
      const downloadPayload = assignmentSubmissionPdfPayload(preview);
      const lmsPayload = canonicalSubmissionPayloadForTarget(preview, "lms");
      const receipt = assignmentSubmissionReceiptProjection(preview);
      const receiptDigest = assignmentSubmissionDigest(preview);
      const pdfBytes = await renderAssignmentSubmissionPdf(preview);
      const pdf = await PDFDocument.load(pdfBytes);

      expect(preview.specialistRenderDocument?.blocks.map((item) => item.type)).toEqual([kind]);
      for (const payload of [previewPayload, downloadPayload, lmsPayload]) {
        expect(payload.specialistProjection.blocks).toEqual([]);
        expect(payload.specialistProjection.fallbackBlocks.map((item) => item.type)).toEqual([kind]);
        expect(payload.specialistProjection.contextBlocks[0]).toMatchObject({
          type: kind,
          assignmentIdentity: { id: assignment.id, title: assignment.title },
          academicBand: "high_foundation",
          rubricAnchors: [{ criterion: assignment.rubric_text }],
          sourceAnchors: [{ sourceId: `source-${kind}`, location: "p. 2" }],
          runtimeDisposition: "universal_fallback",
          runtimeHealth: {
            status: "unknown",
            fallbackRequired: true,
            evidence: null,
          },
        });
      }
      expect(previewPayload.textPayload).toBe(downloadPayload.textPayload);
      expect(downloadPayload.textPayload).toBe(lmsPayload.textPayload);
      expect(receipt.textPayload).toBe(lmsPayload.textPayload);
      expect(receipt.specialistProjection).toStrictEqual(lmsPayload.specialistProjection);
      expect(receiptDigest).toMatch(/^[a-f0-9]{64}$/u);
      expect(new TextDecoder().decode(pdfBytes.slice(0, 5))).toBe("%PDF-");
      expect(pdf.getPageCount()).toBeGreaterThan(0);

      for (const consumer of SPECIALIST_ARTIFACT_CONTEXT_CONSUMERS) {
        const contexts = buildCanonicalSpecialistContexts(buildInput, consumer);
        expect(contexts).toHaveLength(1);
        expect(contexts[0]).toMatchObject({
          consumer,
          kind,
          assignmentIdentity: { id: assignment.id, title: assignment.title },
          academicBand: "high_foundation",
          rubricAnchors: [{ criterion: assignment.rubric_text }],
          sourceAnchors: [{ sourceId: `source-${kind}`, location: "p. 2" }],
          fallbackRequired: true,
        });
      }
    },
  );

  it("requires runtime evidence instead of static beta capability", () => {
    expect(submissionSpecialistRuntimeHealth("data_lab")).toMatchObject({
      status: "unknown",
      evidence: null,
      detail: expect.stringContaining("No fresh server-authoritative specialist runtime evidence"),
      fallbackRequired: true,
      universalFallback: UNIVERSAL_TYPED_INK_FALLBACK,
    });
    expect(submissionSpecialistRuntimeHealth("data_lab", {
      available: true,
      checkedAt: "2026-09-01T12:00:00.000Z",
      evidenceSource: "provider_canary",
      evidenceId: "data-lab-canary",
      authority: "server",
    })).toMatchObject({
      status: "healthy",
      fallbackRequired: false,
      evidence: {
        source: "provider_canary",
        observedAt: "2026-09-01T12:00:00.000Z",
        evidenceId: "data-lab-canary",
        authority: "server",
      },
    });
    expect(submissionSpecialistRuntimeHealth("graphing")).toMatchObject({
      status: "unknown",
      detail: expect.stringContaining("universal typed and ink projection"),
      universalFallback: UNIVERSAL_TYPED_INK_FALLBACK,
    });
  });

  it("activates specialist projection only with fresh server evidence", () => {
    const build = (checkedAt: string) => buildAssignmentSubmissionPreview({
      assignment,
      profile,
      problems: [],
      blocks: [specialistBlocks[1]],
      specialistRuntimeEvidence: {
        graphing: {
          available: true,
          checkedAt,
          evidenceSource: "runtime_probe",
          evidenceId: "submission-graph-probe",
          authority: "server",
        },
      },
      destination: "Canvas",
      submissionType: "file",
    });

    const fresh = canonicalSubmissionPayloadForTarget(
      build("2026-09-01T12:00:00.000Z"),
      "lms",
    );
    const stale = canonicalSubmissionPayloadForTarget(
      build("2026-09-01T11:54:59.999Z"),
      "lms",
    );

    expect(fresh.specialistProjection.blocks).toHaveLength(1);
    expect(fresh.specialistProjection.fallbackBlocks).toEqual([]);
    expect(stale.specialistProjection.blocks).toEqual([]);
    expect(stale.specialistProjection.fallbackBlocks).toHaveLength(1);
  });

  it("enforces canonical receipt, rendered text, and final PDF byte limits", async () => {
    expect(() => assertAssignmentSubmissionCanonicalPayloadByteLength(
      ASSIGNMENT_SUBMISSION_CANONICAL_PAYLOAD_MAX_BYTES + 1,
    )).toThrow(/Canonical assignment payload needs/u);
    expect(() => assertAssignmentSubmissionPdfByteLength(
      ASSIGNMENT_SUBMISSION_PDF_MAX_BYTES + 1,
    )).toThrow(/Assignment PDF needs/u);

    const preview = buildAssignmentSubmissionPreview({
      assignment,
      profile,
      problems: [],
      destination: "Canvas",
      submissionType: "file",
    });
    const oversizedTextPreview = {
      ...preview,
      universalTextPayload: undefined,
      specialistRenderDocument: undefined,
      textPayload: "x".repeat(ASSIGNMENT_SUBMISSION_PDF_TEXT_MAX_BYTES + 1),
    };
    await expect(renderAssignmentSubmissionPdf(oversizedTextPreview)).rejects.toThrow(
      /Assignment PDF text needs/u,
    );
  });

  it("rejects individually bounded blocks when their aggregate assignment text exceeds the canonical limit", () => {
    const blocks: AssignmentArtifactBlockInput[] = Array.from({ length: 64 }, (_, index) => ({
      key: `aggregate-code-${index}`,
      type: "code",
      capability: "code_runner",
      label: `Code ${index + 1}`,
      content: {
        language: "python",
        code: Array.from({ length: 40 }, (_, line) => (
          `${index}:${line}:${"x".repeat(7_000)}`
        )).join("\n"),
        output: [],
      },
    }));

    expect(() => buildAssignmentSubmissionPreview({
      assignment,
      profile,
      problems: [],
      blocks,
      destination: "Canvas",
      submissionType: "file",
    })).toThrow(/Canonical render text needs .* above the 8000000-byte canonical payload limit/u);
  });
});
