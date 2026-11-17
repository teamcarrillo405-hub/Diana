// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(), rpc: vi.fn(), replace: vi.fn(), refresh: vi.fn(),
  saveDraft: vi.fn(), submitAttempt: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("not-found"); },
  redirect: () => { throw new Error("redirect"); },
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "student" } } }) },
    from: mocks.from, rpc: mocks.rpc,
  }),
}));
vi.mock("@/lib/profile", () => ({ loadProfile: async () => null }));
vi.mock("@/components/student-shell/student-shell", () => ({
  StudentShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/app/(app)/course-mode/student-actions", () => ({
  startAssessmentAttempt: vi.fn(), saveAssessmentResponseDraft: mocks.saveDraft,
  submitAssessmentAttempt: mocks.submitAttempt,
}));

import CourseAssessmentPage from "./page";

const classId = "11111111-1111-4111-8111-111111111111";
const blueprintId = "22222222-2222-4222-8222-222222222222";
const attemptId = "33333333-3333-4333-8333-333333333333";

function query(data: unknown) {
  const result = Promise.resolve({ data, error: null });
  const chain = {
    select: vi.fn(() => chain), eq: vi.fn(() => chain), is: vi.fn(() => chain),
    neq: vi.fn(() => chain), order: vi.fn(() => chain),
    maybeSingle: vi.fn(() => result), then: result.then.bind(result),
  };
  return chain;
}

function page() {
  return CourseAssessmentPage({
    params: Promise.resolve({ id: classId, assessmentId: blueprintId }),
    searchParams: Promise.resolve({}),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  const rows: Record<string, unknown> = {
    assessment_blueprints: {
      id: blueprintId, course_id: "course", title: "Pattern assessment", instructions: "Explain your thinking.",
      max_attempts: 1, version: 1, feedback_release: "after_confirmation", release_conditions: {},
    },
    classes: { id: classId, name: "Algebra I" },
    course_mode_courses: { id: "course" },
    assessment_attempts: [{
      id: attemptId, blueprint_version: 1, status: "in_progress", attempt_number: 1,
      expires_at: "2026-01-01T00:00:00Z", allotted_minutes: 20, extra_time_pct: 0,
    }],
    assessment_items: [{
      id: "question", title: "Explain the pattern", interaction_type: "extended_text",
      prompt: "Describe the change.", body: {}, points_possible: 4,
    }],
    assessment_responses: [{
      item_id: "question", student_response: "My saved explanation", auto_score: null,
      teacher_score: 4, teacher_feedback: "Withheld teacher feedback",
    }],
  };
  mocks.from.mockImplementation((table: string) => query(rows[table]));
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.submitAttempt.mockResolvedValue({ ok: true, status: "teacher-review" });
});

afterEach(cleanup);

describe("Classes assessment", () => {
  it("reopens an expired attempt with locked saved responses and explicit hand-in", async () => {
    render(await page());

    expect(screen.getByLabelText("Your response")).toHaveValue("My saved explanation");
    expect(screen.getByLabelText("Your response")).toBeDisabled();
    expect(screen.queryByText("Withheld teacher feedback")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start assessment" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Review and submit" }));
    expect(mocks.submitAttempt).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Submit assessment" }));

    await waitFor(() => expect(mocks.submitAttempt).toHaveBeenCalledWith({ blueprintId, attemptId, responses: [] }));
    expect(mocks.saveDraft).not.toHaveBeenCalled();
    expect(mocks.replace).toHaveBeenCalledWith(`/classes/${classId}/assessments/${blueprintId}?status=teacher-review`);
  });

  it("keeps an expired attempt unavailable without course enrollment", async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });

    await expect(page()).rejects.toThrow("not-found");
    expect(mocks.from).not.toHaveBeenCalledWith("assessment_items");
    expect(mocks.from).not.toHaveBeenCalledWith("assessment_responses");
  });
});
