import { PDFDocument, PDFRawStream, decodePDFRawStream } from "pdf-lib";
import { describe, expect, it } from "vitest";

import type { AssignmentArtifactBlockInput } from "./assignment-artifact";
import { resolveAssignmentProfile } from "./assignment-profile";
import { renderAssignmentSubmissionPdf } from "./assignment-submission-pdf";
import { buildAssignmentSubmissionPreview } from "./assignment-submission";
import { ASSIGNMENT_PLOT_FRAME, assignmentPlotForBlock } from "./specialist-artifacts/assignment-plots";

const assignment = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Graph and data comparison",
  saved_work: { workspaceMode: "math" },
  work_profile: "math",
};

const profile = resolveAssignmentProfile({ kind: "problem_set", className: "Algebra I", title: assignment.title });

function submission(blocks: AssignmentArtifactBlockInput[]) {
  return buildAssignmentSubmissionPreview({ assignment, profile, blocks, problems: [], destination: "Canvas", submissionType: "file" });
}

function graph(content: AssignmentArtifactBlockInput["content"], key = "graph"): AssignmentArtifactBlockInput {
  return { key, type: "graph", capability: "graphing", label: "Saved graph", content, plainText: "" };
}

function savedChart(type: "spreadsheet" | "lab_data", chartType: "scatter" | "bar"): AssignmentArtifactBlockInput {
  const config = chartType === "scatter"
    ? { columns: ["Time", "Temperature"], rows: [["1", "12"], ["2", "17"], ["10", "24"]] }
    : { columns: ["Surface", "Pressure"], rows: [["Grass", "-3"], ["Pavement", "6"]] };
  return {
    key: type,
    type: type === "lab_data" ? "data_table" : type,
    capability: type === "lab_data" ? "data_lab" : "spreadsheet",
    label: chartType === "scatter" ? "Measured temperatures" : "Surface pressures",
    content: { dataset: { ...config, fileName: "results.csv" }, chartConfig: { type: chartType, xColumn: 0, yColumn: 1 } },
    plainText: "",
  };
}

async function visiblePdfOperators(blocks: AssignmentArtifactBlockInput[]) {
  const pdf = await PDFDocument.load(await renderAssignmentSubmissionPdf(submission(blocks)));
  return pdf.getPages().flatMap((page) => (page.node.normalizedEntries().Contents?.asArray() ?? []).flatMap((entry) => {
    const stream = pdf.context.lookup(entry);
    return stream instanceof PDFRawStream ? [new TextDecoder().decode(decodePDFRawStream(stream).decode())] : [];
  })).join("\n");
}

function pdfText(operators: string) {
  return Array.from(operators.matchAll(/<([0-9A-F]+)> Tj/gu), ([, text]) => Buffer.from(text!, "hex").toString("ascii"));
}

describe("visible charts in exported homework", () => {
  it("uses the saved viewport and does not join function branches across a pole", () => {
    const model = submission([graph({
      expression: "y = 1/x",
      series: [{ expression: "y = 1/x", label: "Reciprocal" }, { expression: "1", label: "Constant" }],
      viewport: { xMin: -4, xMax: 4, yMin: -2, yMax: 2 },
      xLabel: "Input", yLabel: "Output", points: [],
    })]);
    const plot = assignmentPlotForBlock(model.specialistRenderDocument!.blocks[0]!)?.plot;
    expect(plot?.xTicks.map((tick) => tick.label)).toEqual(["-4", "-2", "0", "2", "4"]);
    expect(plot?.marks.map((mark) => mark.label)).toEqual(["Reciprocal: y = 1/x", "Constant: y = 1"]);
    const reciprocal = plot?.marks[0];
    expect(reciprocal?.kind).toBe("line");
    if (reciprocal?.kind !== "line") throw new Error("Missing reciprocal curve");
    expect(reciprocal.paths).toHaveLength(2);
    expect(reciprocal.paths.flat().every(({ x, y }) => x >= ASSIGNMENT_PLOT_FRAME.left && x <= ASSIGNMENT_PLOT_FRAME.right && y >= ASSIGNMENT_PLOT_FRAME.top && y <= ASSIGNMENT_PLOT_FRAME.bottom)).toBe(true);
  });

  it("keeps numeric spacing and renders data charts and student-confirmed readings as PDF vectors", async () => {
    const scatter = savedChart("spreadsheet", "scatter");
    const model = submission([scatter]);
    const mark = assignmentPlotForBlock(model.specialistRenderDocument!.blocks[0]!)?.plot?.marks[0];
    expect(mark?.kind).toBe("points");
    if (mark?.kind !== "points") throw new Error("Missing scatter coordinates");
    const [a, b, c] = mark.points;
    expect((c!.x - b!.x) / (b!.x - a!.x)).toBeCloseTo(8);

    const operators = await visiblePdfOperators([
      scatter,
      savedChart("lab_data", "bar"),
      graph({ expression: "", points: [{ x: 2, y: 4 }], photo: { sourceId: "22222222-2222-4222-8222-222222222222", title: "Teacher worksheet photo" } }, "graph-photo"),
      graph({ expression: "x^2", points: [] }),
    ]);
    const texts = pdfText(operators);
    expect(texts).toContain("Measured temperatures: scatter plot");
    expect(texts).toContain("Surface pressures: bar chart");
    expect(texts).toContain("Pavement");
    expect(texts).toContain("Confirmed readings from Teacher worksheet photo");
    expect(texts).toContain("Saved graph: function graph");
    expect(/\bc\s*\n/u.test(operators)).toBe(true);
    expect(/\bh\s*\nf\s*\n/u.test(operators)).toBe(true);
    expect(/\bl\s*\n/u.test(operators)).toBe(true);
  });

  it("labels an invalid saved function while retaining the original equation in the PDF", async () => {
    const operators = await visiblePdfOperators([graph({ expression: "unsupported(x)", points: [] })]);
    const texts = pdfText(operators);
    expect(texts).toContain("Saved graph: No graph is visible in the saved range. The saved work is shown below.");
    expect(texts).toContain("y = unsupported(x)");
  });
});

it("prints the title and mirrored reasoning once while keeping additional typed STEM work", async () => {
  const reasoning = "The average velocity is the change in position divided by elapsed time.";
  const terms = "Your displacement: 0 m";
  const blocks: AssignmentArtifactBlockInput[] = [
    { key: "reasoning", type: "equation", capability: "equation_editor", label: "Reasoning", content: { reasoning, studentAuthoredText: reasoning } },
    { key: "stem-checks", type: "equation", capability: "equation_editor", label: "Physics work", content: { studentAuthoredText: terms } },
  ];
  const texts = pdfText(await visiblePdfOperators(blocks));
  expect(texts.filter((text) => text === assignment.title)).toHaveLength(1);
  expect(texts.filter((text) => text === reasoning)).toHaveLength(1);
  expect(texts).toContain(terms);
  expect(submission(blocks).specialistRenderDocument?.blocks[0]?.plainText.split(reasoning)).toHaveLength(3);
});
