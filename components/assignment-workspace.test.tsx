// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  getSession: vi.fn(),
  saveHandInPatch: vi.fn(),
  saveProblemWorkPatch: vi.fn(),
  prepareAssignmentReview: vi.fn(),
  startAssignmentWorkspace: vi.fn(),
  selectAssignmentWorkspaceMode: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={String(href)} {...props}>{children}</a> }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { getSession: mocks.getSession } }),
}));
vi.mock("@/app/(app)/assignments/[id]/hm-actions", () => ({
  addProblem: vi.fn(),
  importProblemsFromAssignmentSources: vi.fn(),
  prepareAssignmentReview: mocks.prepareAssignmentReview,
  saveHandInPatch: mocks.saveHandInPatch,
  saveProblemScaffold: vi.fn(),
  saveProblemWorkPatch: mocks.saveProblemWorkPatch,
  selectAssignmentWorkspaceMode: mocks.selectAssignmentWorkspaceMode,
  startAssignmentWorkspace: mocks.startAssignmentWorkspace,
}));
vi.mock("@/app/(app)/assignments/[id]/ai-tools-actions", () => ({ requestMathScaffold: vi.fn(), requestScienceScaffold: vi.fn() }));
vi.mock("@/components/assignment-focus-clock", () => ({ AssignmentFocusClock: () => null }));
vi.mock("@/components/assignment-source-importer", () => ({ AssignmentSourceImporter: () => null }));
vi.mock("@/components/assignment-plan-panel", () => ({ AssignmentPlanPanel: () => null }));
vi.mock("@/components/assignment-review-panel", () => ({ AssignmentReviewPanel: () => null }));
vi.mock("@/components/screen-design/student-bottom-nav", () => ({ StudentBottomNav: () => null }));
vi.mock("@/components/screen-design/student-desktop-nav", () => ({ StudentDesktopNav: () => null }));

import { AssignmentWorkspace } from "./assignment-workspace";
import { resolveAssignmentProfile } from "@/lib/assignment-profile";

const assignmentId = "11111111-1111-4111-8111-111111111111";
const baseProps = {
  assignmentId,
  title: "Rhetorical analysis",
  courseLabel: "English 9",
  kind: "essay" as const,
  status: "todo" as const,
  description: "Write a rhetorical analysis.",
  sourcePacket: { directions: "Write a rhetorical analysis.", rubric: "", materialText: "", citations: [] },
  sources: [],
  steps: [],
  aiMode: "green" as const,
  initialMode: "writing" as const,
  assignmentProfile: resolveAssignmentProfile({
    kind: "essay",
    className: "English 9",
    title: "Rhetorical analysis",
  }),
  practicalGate: {
    connected: false,
    acknowledged: false,
    teacherUnlocked: false,
    supervisionActive: false,
    ageEligible: false,
    protocol: null,
  },
  initialSavedWork: {},
  initialProblems: [],
  externalUrl: null,
  externalSource: null,
  estimatedMinutes: 40,
};

describe("AssignmentWorkspace reliability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mocks.getSession.mockResolvedValue({
      data: { session: { expires_at: Math.floor(Date.now() / 1_000) + 3_600 } },
      error: null,
    });
    mocks.saveHandInPatch.mockResolvedValue({ ok: true });
    mocks.saveProblemWorkPatch.mockResolvedValue({ ok: true });
    mocks.saveProblemWorkPatch.mockResolvedValue({ ok: true });
    mocks.prepareAssignmentReview.mockResolvedValue({ ok: true });
    mocks.startAssignmentWorkspace.mockResolvedValue({ ok: true });
    mocks.selectAssignmentWorkspaceMode.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("flushes the latest edit before opening submission review", async () => {
    render(<AssignmentWorkspace {...baseProps} />);
    fireEvent.change(screen.getByLabelText("Student draft"), { target: { value: "My current draft" } });
    fireEvent.click(screen.getByRole("button", { name: /review submission/i }));

    await waitFor(() => expect(mocks.saveHandInPatch).toHaveBeenCalledWith({
      assignmentId,
      patch: { draft: "My current draft" },
    }));
    await waitFor(() => expect(mocks.prepareAssignmentReview).toHaveBeenCalledWith({ assignmentId }));
    expect(mocks.saveHandInPatch.mock.invocationCallOrder[0]).toBeLessThan(mocks.prepareAssignmentReview.mock.invocationCallOrder[0]);
    expect(mocks.push).toHaveBeenCalledWith(`/assignments/${assignmentId}/submit`);
  });

  it("recovers a pending local patch and saves it", async () => {
    window.localStorage.setItem(`diana:assignment:${assignmentId}:pending-work`, JSON.stringify({ draft: "Recovered draft" }));
    render(<AssignmentWorkspace {...baseProps} />);

    expect((screen.getByLabelText("Student draft") as HTMLTextAreaElement).value).toBe("Recovered draft");
    await waitFor(() => expect(mocks.saveHandInPatch).toHaveBeenCalledWith({
      assignmentId,
      patch: { draft: "Recovered draft" },
    }));
  });
  it("flushes recoverable math work before submission review", async () => {
    const problemId = "22222222-2222-4222-8222-222222222222";
    render(<AssignmentWorkspace {...baseProps} kind="problem_set" initialMode="math" assignmentProfile={resolveAssignmentProfile({ kind: "problem_set", className: "Algebra I", title: "Equations" })} initialProblems={[{
      id: problemId,
      problemNumber: 1,
      problemText: "Solve 2x = 10",
      studentWork: {},
    }]} />);

    fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: "x = 5" } });
    fireEvent.change(screen.getByLabelText("Show your work"), { target: { value: "Divide both sides by 2." } });
    fireEvent.click(screen.getByRole("button", { name: /review submission/i }));

    await waitFor(() => expect(mocks.saveProblemWorkPatch).toHaveBeenCalledWith({
      problemId,
      patch: { answer: "x = 5", work: "Divide both sides by 2." },
    }));
    await waitFor(() => expect(mocks.prepareAssignmentReview).toHaveBeenCalledWith({ assignmentId }));
    expect(mocks.saveProblemWorkPatch.mock.invocationCallOrder[0]).toBeLessThan(mocks.prepareAssignmentReview.mock.invocationCallOrder[0]);
    expect(window.localStorage.getItem(`diana:assignment:${assignmentId}:problem:${problemId}`)).toBeNull();
  });
  it("flushes recoverable math work before submission review", async () => {
    const problemId = "22222222-2222-4222-8222-222222222222";
    render(<AssignmentWorkspace {...baseProps} kind="problem_set" initialMode="math" assignmentProfile={resolveAssignmentProfile({ kind: "problem_set", className: "Algebra I", title: "Equations" })} initialProblems={[{
      id: problemId,
      problemNumber: 1,
      problemText: "Solve 2x = 10",
      studentWork: {},
    }]} />);

    fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: "x = 5" } });
    fireEvent.change(screen.getByLabelText("Show your work"), { target: { value: "Divide both sides by 2." } });
    fireEvent.click(screen.getByRole("button", { name: /review submission/i }));

    await waitFor(() => expect(mocks.saveProblemWorkPatch).toHaveBeenCalledWith({
      problemId,
      patch: { answer: "x = 5", work: "Divide both sides by 2." },
    }));
    await waitFor(() => expect(mocks.prepareAssignmentReview).toHaveBeenCalledWith({ assignmentId }));
    expect(mocks.saveProblemWorkPatch.mock.invocationCallOrder[0]).toBeLessThan(mocks.prepareAssignmentReview.mock.invocationCallOrder[0]);
    expect(window.localStorage.getItem(`diana:assignment:${assignmentId}:problem:${problemId}`)).toBeNull();
  });
});
