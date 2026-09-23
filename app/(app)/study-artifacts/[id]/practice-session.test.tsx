// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/components/screen-design/primitives", () => ({
  DianaWordmark: () => <span>Diana</span>,
}));

vi.mock("@/components/screen-design/screen-design-viewport", () => ({
  ScreenDesignViewport: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("../actions", () => ({
  restartPracticeTest: vi.fn(),
  savePracticeTestProgress: vi.fn(),
}));

import { PracticeTestSession } from "./practice-session";

const quiz = [{
  question: "Which detail supports the claim?",
  choices: ["The quoted detail"],
  answer: "The quoted detail",
  hint: "Use the source.",
  sourceAnchor: "Paragraph 2",
}];

describe("PracticeTestSession journey continuity", () => {
  afterEach(cleanup);

  it("returns assignment-linked completion to the assignment workspace", () => {
    const assignmentId = "11111111-1111-4111-8111-111111111111";
    render(
      <PracticeTestSession
        artifactId="22222222-2222-4222-8222-222222222222"
        artifactTitle="Identity practice"
        assignmentId={assignmentId}
        quiz={quiz}
        initialProgress={{
          currentQuestion: 0,
          completed: true,
          completedAt: "2026-07-31T12:00:00.000Z",
          responses: { "0": "The quoted detail" },
        }}
        initialResult={null}
      />,
    );

    expect(screen.getByRole("link", { name: "Back to assignment" })).toHaveAttribute(
      "href",
      `/assignments/${assignmentId}/workspace`,
    );
  });

  it("preserves Study Lab exits for standalone practice", () => {
    render(
      <PracticeTestSession
        artifactId="22222222-2222-4222-8222-222222222222"
        artifactTitle="Standalone practice"
        assignmentId={null}
        quiz={quiz}
        initialProgress={{
          currentQuestion: 0,
          completed: false,
          completedAt: null,
          responses: {},
        }}
        initialResult={null}
      />,
    );

    expect(screen.getByRole("link", { name: "Back to study lab" })).toHaveAttribute(
      "href",
      "/study-artifacts",
    );
    expect(screen.getByRole("link", { name: "Pause" })).toHaveAttribute(
      "href",
      "/study-artifacts",
    );
  });
});
