// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { resolveAssignmentProfile } from "@/lib/assignment-profile";
import { assignmentProblemArtifactBlock } from "@/lib/assignment-artifact";
import { serializeAssignmentInk } from "@/lib/assignment-ink";
import { buildAssignmentSubmissionPreview } from "@/lib/assignment-submission";
import { assignmentSubmissionCanonicalPayloadBytes } from "@/lib/assignment-submission-server";

import { AssignmentSubmissionPreview } from "./assignment-submission-preview";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/app/(app)/assignments/[id]/delivery-actions", () => ({
  prepareCanonicalAssignmentDeliveryDownload: vi.fn(),
}));

describe("assignment submission specialist preview", () => {
  it("shows the saved graph without a tool warning when its runtime status is unknown", () => {
    const assignment = {
      id: "11111111-1111-4111-8111-111111111111",
      title: "Supply and demand model",
      saved_work: { workspaceMode: "worksheet" },
      work_profile: "worksheet",
    };
    const profile = resolveAssignmentProfile({
      kind: "other",
      className: "Economics",
      title: assignment.title,
    });
    const preview = buildAssignmentSubmissionPreview({
      assignment,
      profile,
      problems: [],
      blocks: [
        {
          key: "analysis",
          type: "rich_text",
          capability: "rich_text",
          label: "Analysis",
          content: { text: "Demand increases when the price falls." },
          plainText: "Demand increases when the price falls.",
        },
        {
          key: "graph",
          type: "graph",
          capability: "graphing",
          label: "Function graph",
          content: {
            expression: "10-x",
            points: [{ x: 0, y: 10 }, { x: 10, y: 0 }],
          },
          plainText: "Stored graph text",
        },
      ],
      destination: "Canvas",
      submissionType: "text",
    });

    render(<AssignmentSubmissionPreview preview={{
      ...preview,
      payloadDigest: "a".repeat(64),
    }} />);

    expect(screen.getByRole("heading", { name: "Function graph" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Function graph of y by x" }).querySelector("path")).not.toBeNull();
    expect(screen.queryByText(/status unknown/i)).not.toBeInTheDocument();
    expect(screen.getByText("Function graph with 2 sampled points.")).toBeInTheDocument();
    expect(screen.queryByText("Typed and handwriting work remains included in this submission.")).not.toBeInTheDocument();
    expect(screen.getByText(/Demand increases when the price falls\./u)).toBeInTheDocument();
    expect(screen.getByText(/y = 10-x/u, { selector: "pre" })).toBeInTheDocument();
    const ticks = screen.getByText("Axis tick values").closest("details");
    expect(ticks).toHaveTextContent("Horizontal-10, -5, 0, 5, 10");
    expect(ticks).toHaveTextContent("Vertical10, 5, 0, -5, -10");
  });

  it("uses the saved section label and shows authored reasoning once, with an independent completion state", () => {
    const title = "Motion lab";
    const reasoning = "The change in position is divided by the time interval.";
    const prompt = "Show the change in position and time.";
    const problem = {
      id: "motion-section", problem_number: 1, problem_text: prompt, progress_status: "done",
      student_work: { work: reasoning, answer: "2 m/s" }, scaffold: { unitLabel: "Position analysis" },
    };
    const handwriting = {
      id: "motion-graph", problem_number: 2, problem_text: "Sketch the position graph.", progress_status: "todo",
      scaffold: { unitLabel: "Graph sketch" },
      student_work: { workInk: serializeAssignmentInk([{ id: "stroke", points: [{ x: 5, y: 8 }, { x: 12, y: 21 }] }]) },
    };
    const block = assignmentProblemArtifactBlock({ problemNumber: 1, problemText: prompt, studentWork: problem.student_work });
    const inkBlock = assignmentProblemArtifactBlock({ problemNumber: 2, problemText: handwriting.problem_text, studentWork: handwriting.student_work });
    const preview = buildAssignmentSubmissionPreview({
      assignment: { id: "motion-lab", title, saved_work: { workspaceMode: "math" }, work_profile: "math" },
      profile: resolveAssignmentProfile({ kind: "other", className: "Physics", title }),
      problems: [problem, handwriting],
      blocks: [
        { ...block, content: { problemText: prompt, reasoning, answer: "2 m/s", latex: "v = Δx / Δt", studentAuthoredText: reasoning } },
        inkBlock,
        { key: "stem-checks", label: "Physics work", type: "equation", capability: "equation_editor",
          content: { studentAuthoredText: "Additional notes from the velocity graph." } },
      ],
      specialistRuntimeEvidence: { equation_editor: { available: false } },
      destination: "Download or school handoff",
      submissionType: "file",
    });

    expect(preview.problemLabels).toEqual({ "motion-section": "Position analysis", "motion-graph": "Graph sketch" });
    expect(assignmentSubmissionCanonicalPayloadBytes(preview)).toEqual(assignmentSubmissionCanonicalPayloadBytes({ ...preview, problemLabels: undefined }));
    render(<AssignmentSubmissionPreview preview={preview} unitNoun="lab step" unitNounPlural="lab steps" />);
    const card = within(screen.getByRole("heading", { name: "Position analysis" }).closest("article")!);
    expect(card.getByText("Complete")).toBeInTheDocument();
    expect(card.getByText(prompt)).toBeInTheDocument();
    expect(card.getByText("2 m/s")).toBeInTheDocument();
    expect(card.getByText("v = Δx / Δt")).toBeInTheDocument();
    expect(card.getByText("Equation tool unavailable. Saved work is included in this submission.")).toBeInTheDocument();
    expect(screen.getAllByText(reasoning)).toHaveLength(1);
    expect(screen.getByText("Additional notes from the velocity graph.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Problem 1" })).not.toBeInTheDocument();
    const inkCard = within(screen.getByRole("heading", { name: "Graph sketch" }).closest("article")!);
    expect(inkCard.getByText("Incomplete")).toBeInTheDocument();
    expect(inkCard.getByRole("img", { name: "Handwriting for Graph sketch" }).querySelector("polyline")).not.toBeNull();
    expect(inkCard.queryByText("No work saved yet.")).not.toBeInTheDocument();
  });
});
