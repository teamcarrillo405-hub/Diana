// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { resolveAssignmentProfile } from "@/lib/assignment-profile";
import { buildAssignmentSubmissionPreview } from "@/lib/assignment-submission";

import { AssignmentSubmissionPreview } from "./assignment-submission-preview";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/app/(app)/assignments/[id]/delivery-actions", () => ({
  prepareCanonicalAssignmentDeliveryDownload: vi.fn(),
}));

describe("assignment submission specialist preview", () => {
  it("renders the preview projection and names the universal fallback for unknown health", () => {
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
    expect(screen.getByText("Status unknown")).toBeInTheDocument();
    expect(screen.getByText("Function graph with 2 sampled points.")).toBeInTheDocument();
    expect(screen.getByText("Typed and handwriting work remains included in this submission.")).toBeInTheDocument();
    expect(screen.getByText(/Demand increases when the price falls\./u)).toBeInTheDocument();
    expect(screen.getByText(/y = 10-x/u)).toBeInTheDocument();
  });
});
