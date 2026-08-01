// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  saveDraft: vi.fn(),
  submitAttempt: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mocks.replace,
    refresh: mocks.refresh,
  }),
}));

vi.mock("@/app/(app)/course-mode/student-actions", () => ({
  saveAssessmentResponseDraft: mocks.saveDraft,
  submitAssessmentAttempt: mocks.submitAttempt,
}));

import {
  AssessmentResponseReview,
  AssessmentSession,
  type AssessmentSessionItem,
} from "./assessment-session";

const blueprintId = "11111111-1111-4111-8111-111111111111";
const attemptId = "22222222-2222-4222-8222-222222222222";
const items: AssessmentSessionItem[] = [
  {
    id: "33333333-3333-4333-8333-333333333333",
    title: "Explain the pattern",
    interactionType: "extended_text",
    prompt: "Describe what changes in each step.",
    choices: [],
    pointsPossible: 4,
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    title: "Choose the result",
    interactionType: "choice",
    prompt: "Which result follows the rule?",
    choices: [
      { identifier: "A", label: "Result A" },
      { identifier: "B", label: "Result B" },
    ],
    pointsPossible: 1,
  },
];

function renderSession(initialResponses: Record<string, string | string[]> = {}) {
  return render(
    <AssessmentSession
      blueprintId={blueprintId}
      attemptId={attemptId}
      attemptNumber={1}
      items={items}
      initialResponses={initialResponses}
    />,
  );
}

describe("AssessmentSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.saveDraft.mockResolvedValue({ ok: true });
    mocks.submitAttempt.mockResolvedValue({ ok: true, status: "teacher-review" });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("resumes a saved response and autosaves a new edit", async () => {
    vi.useFakeTimers();
    renderSession({ [items[0].id]: "Saved response" });

    const response = screen.getByLabelText("Your response");
    expect(response).toHaveValue("Saved response");
    fireEvent.change(response, { target: { value: "Updated response" } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });

    expect(mocks.saveDraft).toHaveBeenCalledWith({
      blueprintId,
      attemptId,
      itemId: items[0].id,
      response: "Updated response",
    });
    expect(screen.getByText("Saved")).toBeVisible();
  });

  it("uses one-question navigation and returns to the first open response", async () => {
    renderSession({ [items[0].id]: "Complete response" });

    fireEvent.click(screen.getByRole("button", { name: "Question 2" }));
    await screen.findByRole("heading", { name: "Choose the result" });
    fireEvent.click(screen.getByRole("button", { name: "Review and submit" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Question 2 still needs a response.");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("requires explicit confirmation and submits the complete response set", async () => {
    renderSession({
      [items[0].id]: "Complete response",
      [items[1].id]: "B",
    });

    fireEvent.click(screen.getByRole("button", { name: /Question 2, answered/ }));
    await screen.findByRole("heading", { name: "Choose the result" });
    fireEvent.click(screen.getByRole("button", { name: "Review and submit" }));

    const dialog = await screen.findByRole("dialog", { name: "Submit this assessment?" });
    expect(dialog).toBeVisible();
    expect(mocks.submitAttempt).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Submit assessment" }));

    await waitFor(() => expect(mocks.submitAttempt).toHaveBeenCalledWith({
      blueprintId,
      attemptId,
      responses: [
        { itemId: items[0].id, response: "Complete response" },
        { itemId: items[1].id, response: "B" },
      ],
    }));
    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith(
        `/course-mode/assessments/${blueprintId}?status=teacher-review`,
      );
      expect(mocks.refresh).toHaveBeenCalled();
    });
  });
});

describe("AssessmentResponseReview", () => {
  afterEach(cleanup);

  it("shows readable saved answers, scores, and teacher feedback", () => {
    render(
      <AssessmentResponseReview
        attemptNumber={1}
        status="confirmed"
        autoScore={1}
        teacherScore={4}
        finalScore={5}
        pointsPossible={5}
        finalPercent={100}
        items={items}
        responses={[
          {
            itemId: items[0].id,
            studentResponse: "A clear explanation",
            autoScore: null,
            teacherScore: 4,
            teacherFeedback: "Strong use of evidence.",
          },
          {
            itemId: items[1].id,
            studentResponse: "B",
            autoScore: 1,
            teacherScore: null,
            teacherFeedback: null,
          },
        ]}
      />,
    );

    expect(screen.getByText("Teacher-confirmed score: 5/5 (100%)")).toBeVisible();
    expect(screen.getByText("A clear explanation")).toBeVisible();
    expect(screen.getByText("Result B")).toBeVisible();
    expect(screen.getByText("Strong use of evidence.")).toBeVisible();
  });
});
