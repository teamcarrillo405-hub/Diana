// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  getSession: vi.fn(),
  saveHandInPatch: vi.fn(),
  saveProblemWorkPatch: vi.fn(),
  prepareAssignmentReview: vi.fn(),
  selectAssignmentWorkspaceMode: vi.fn(),
  startStudentStudy: vi.fn(),
  previewProblemsFromAssignmentSources: vi.fn(),
  confirmProblemQueueFromPreview: vi.fn(),
  markProblemReviewed: vi.fn(),
  markProblemDone: vi.fn(),
  reviewPanelProps: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={String(href)} {...props}>{children}</a> }));
vi.mock("@/app/(app)/study/actions", () => ({
  startStudentStudy: mocks.startStudentStudy,
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { getSession: mocks.getSession } }),
}));
vi.mock("@/app/(app)/assignments/[id]/hm-actions", () => ({
  addProblem: vi.fn(),
  confirmProblemQueueFromPreview: mocks.confirmProblemQueueFromPreview,
  previewProblemsFromAssignmentSources: mocks.previewProblemsFromAssignmentSources,
  prepareAssignmentReview: mocks.prepareAssignmentReview,
  saveHandInPatch: mocks.saveHandInPatch,
  saveProblemScaffold: vi.fn(),
  saveProblemWorkPatch: mocks.saveProblemWorkPatch,
  markProblemReviewed: mocks.markProblemReviewed,
  markProblemDone: mocks.markProblemDone,
  selectAssignmentWorkspaceMode: mocks.selectAssignmentWorkspaceMode,
}));
vi.mock("@/app/(app)/assignments/[id]/ai-tools-actions", () => ({ requestMathScaffold: vi.fn(), requestScienceScaffold: vi.fn() }));
vi.mock("@/components/assignment-focus-clock", () => ({ AssignmentFocusClock: () => <section aria-label="Focus clock">Start focus 30-min</section> }));
vi.mock("@/components/assignment-source-importer", () => ({ AssignmentSourceImporter: () => null }));
vi.mock("@/components/assignment-plan-panel", () => ({ AssignmentPlanPanel: () => null }));
vi.mock("@/components/assignment-review-panel", () => ({
  AssignmentReviewPanel: (props: Record<string, unknown>) => {
    mocks.reviewPanelProps(props);
    return null;
  },
}));
vi.mock("@/components/screen-design/student-bottom-nav", () => ({ StudentBottomNav: () => null }));
vi.mock("@/components/screen-design/student-desktop-nav", () => ({ StudentDesktopNav: () => null }));

import { AssignmentWorkspace } from "./assignment-workspace";
import { resolveAssignmentProfile } from "@/lib/assignment-profile";
import { buildAssignmentUnderstanding } from "@/lib/assignment-help/methodology";

const assignmentId = "11111111-1111-4111-8111-111111111111";
const baseAssignmentProfile = resolveAssignmentProfile({
  kind: "essay",
  className: "English 9",
  title: "Rhetorical analysis",
});
const baseSourcePacket = { directions: "Write a rhetorical analysis.", rubric: "", materialText: "", citations: [] };
const baseProps = {
  assignmentId,
  title: "Rhetorical analysis",
  courseLabel: "English 9",
  kind: "essay" as const,
  description: "Write a rhetorical analysis.",
  sourcePacket: baseSourcePacket,
  assignmentUnderstanding: buildAssignmentUnderstanding({
    profile: baseAssignmentProfile,
    sourcePacket: baseSourcePacket,
    importStatuses: [],
  }),
  sources: [],
  steps: [],
  aiMode: "green" as const,
  initialMode: "writing" as const,
  assignmentProfile: baseAssignmentProfile,
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
  it("uses the Algebra shell and the persistent Diana thread for a writing unit", () => {
    render(<AssignmentWorkspace {...baseProps} initialProblems={[{
      id: "99999999-9999-4999-8999-999999999999",
      problemNumber: 1,
      problemText: "State the main idea you will support.",
      scaffold: { unitLabel: "Claim", unitType: "section" },
      studentWork: {},
    }]} />);

    expect(screen.getByText(/Claim of 1/, { selector: ".sd-assignment-problem-card .sd-assignment-mode-title" })).toBeTruthy();
    expect(screen.queryByText("Writing document")).toBeNull();
    expect(mocks.reviewPanelProps).toHaveBeenCalledWith(expect.objectContaining({
      template: "writing",
      problemId: "99999999-9999-4999-8999-999999999999",
    }));
  });

  it("offers the first problem action directly in the empty math workspace", () => {
    const profile = resolveAssignmentProfile({ kind: "problem_set", className: "Algebra I", title: "Equations" });
    render(<AssignmentWorkspace
      {...baseProps}
      kind="problem_set"
      initialMode="math"
      assignmentProfile={profile}
      initialProblems={[]}
    />);

    expect(screen.getByRole("button", { name: "Add or import problem" })).toBeTruthy();
  });

  it("keeps method, optional plan, and study controls out from below work", () => {
    render(<AssignmentWorkspace {...baseProps} />);

    expect(screen.queryByText("Diana picked this format")).toBeNull();
    expect(screen.queryByText("Optional plan")).toBeNull();
    expect(screen.queryByText("Study this assignment")).toBeNull();
    expect(screen.queryByText("Change work format")).toBeNull();
  });

  it("puts assignment details in the math right panel", () => {
    const profile = resolveAssignmentProfile({ kind: "problem_set", className: "Algebra I", title: "Equations" });
    const sourcePacket = {
      directions: "Complete problems 1 through 3.",
      rubric: "Show each operation on both sides.",
      materialText: "1. Solve 2x = 10",
      citations: [],
    };

    render(<AssignmentWorkspace
      {...baseProps}
      kind="problem_set"
      initialMode="math"
      assignmentProfile={profile}
      sourcePacket={sourcePacket}
      assignmentUnderstanding={buildAssignmentUnderstanding({
        profile,
        sourcePacket,
        importStatuses: ["imported"],
      })}
      sources={[{
        id: "66666666-6666-4666-8666-666666666666",
        source_type: "upload",
        title: "Algebra worksheet",
        url: null,
        extracted_text: sourcePacket.materialText,
        source_location: "page 1",
        import_status: "imported",
      }]}
      initialProblems={[{
        id: "22222222-2222-4222-8222-222222222222",
        problemNumber: 1,
        problemText: "Solve 2x = 10",
        studentWork: {},
      }, {
        id: "33333333-3333-4333-8333-333333333333",
        problemNumber: 2,
        problemText: "Solve 4x = 16",
        studentWork: {},
      }]}
    />);

    const actions = screen.getByLabelText("Assignment actions");
    const problemsPanel = screen.getByLabelText("Assignment problems");
    expect(screen.getByLabelText("Focus clock")).toBeTruthy();
    expect(actions.textContent).not.toContain("Start focus");
    expect(actions.textContent).toContain("Assignment details");
    expect(actions.textContent).not.toContain("Previous");
    expect(actions.textContent).not.toContain("Next");
    expect(problemsPanel.textContent).toContain("Problem 1");
    expect(problemsPanel.textContent).toContain("Problem 2");
    expect(problemsPanel.textContent).not.toContain("Previous");
    expect(problemsPanel.textContent).not.toContain("Next");
    expect(actions.textContent).toContain("Complete problems 1 through 3.");
    expect(actions.textContent).toContain("Show each operation on both sides.");
    expect(actions.textContent).toContain("Algebra worksheet");
    const details = screen.getByText("Assignment details").closest("details");
    expect(details).toBeTruthy();
    expect(details?.hasAttribute("open")).toBe(false);
    expect(screen.queryByText("Diana picked this format")).toBeNull();
    expect(screen.queryByText("Study this assignment")).toBeNull();
  });

  it("shows the active math problem before setup details", () => {
    render(<AssignmentWorkspace {...baseProps} kind="problem_set" initialMode="math" assignmentProfile={resolveAssignmentProfile({ kind: "problem_set", className: "Algebra I", title: "Equations" })} initialProblems={[{
      id: "22222222-2222-4222-8222-222222222222",
      problemNumber: 1,
      problemText: "Solve 2x = 10",
      studentWork: {},
    }]} />);

    const problem = screen.getByText("Solve 2x = 10", { selector: ".sd-assignment-problem-text" });
    const details = screen.getByText("Assignment details");

    expect(problem.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(/Problem\s*1\s*of\s*1/, { selector: ".sd-assignment-problem-card .sd-assignment-mode-title" })).toBeTruthy();
  });
  it("reviews imported math problems before creating the problem queue", async () => {
    render(<AssignmentWorkspace
      {...baseProps}
      kind="problem_set"
      initialMode="math"
      assignmentProfile={resolveAssignmentProfile({ kind: "problem_set", className: "Algebra I", title: "Equations" })}
      initialProblems={[]}
    />);

    fireEvent.click(screen.getByRole("button", { name: /review source problems/i }));

    await screen.findByText("Confirm problems");
    expect(screen.getByText(/needs check/i)).toBeTruthy();
    const preview = screen.getByDisplayValue("1. Solve 3x + 5 = 20");
    fireEvent.change(preview, { target: { value: "1. Solve 3x + 5 = 20. Find x." } });
    fireEvent.click(screen.getByRole("button", { name: /add confirmed problems/i }));

    await waitFor(() => expect(mocks.confirmProblemQueueFromPreview).toHaveBeenCalledWith({
      assignmentId,
      problems: [{ text: "1. Solve 3x + 5 = 20. Find x." }],
    }));
    expect(await screen.findByText("1. Solve 3x + 5 = 20", { selector: ".sd-assignment-problem-text" })).toBeTruthy();
  });
  it("shows a confirmation cue for partial math source material", () => {
    render(<AssignmentWorkspace
      {...baseProps}
      kind="problem_set"
      initialMode="math"
      assignmentProfile={resolveAssignmentProfile({ kind: "problem_set", className: "Algebra I", title: "Equations" })}
      sources={[{
        id: "44444444-4444-4444-8444-444444444444",
        source_type: "upload",
        title: "worksheet.pdf",
        url: null,
        extracted_text: "1. Solve 2x = 10",
        source_location: null,
        import_status: "partial",
      }]}
      initialProblems={[]}
    />);

    expect(screen.getByText("Confirm source")).toBeTruthy();
    expect(screen.getByText(/needs a quick check/i)).toBeTruthy();
    expect(screen.getByText("needs check")).toBeTruthy();
  });
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mocks.getSession.mockResolvedValue({
      data: { session: { expires_at: Math.floor(Date.now() / 1_000) + 3_600 } },
      error: null,
    });
    mocks.saveHandInPatch.mockResolvedValue({ ok: true });
    mocks.saveProblemWorkPatch.mockResolvedValue({ ok: true });
    mocks.markProblemReviewed.mockResolvedValue({
      ok: true,
      progressStatus: "in_progress",
      reviewedAt: "2026-08-11T12:00:00.000Z",
      completedAt: null,
    });
    mocks.markProblemDone.mockResolvedValue({
      ok: true,
      progressStatus: "done",
      reviewedAt: "2026-08-11T12:00:00.000Z",
      completedAt: "2026-08-11T12:05:00.000Z",
    });
    mocks.prepareAssignmentReview.mockResolvedValue({ ok: true });
    mocks.selectAssignmentWorkspaceMode.mockResolvedValue({ ok: true });
    mocks.previewProblemsFromAssignmentSources.mockResolvedValue({
      ok: true,
      requiresConfirmation: true,
      problems: [{ draftId: "problem-1", problemNumber: 1, text: "1. Solve 3x + 5 = 20", sourceStatus: "partial" }],
    });
    mocks.confirmProblemQueueFromPreview.mockResolvedValue({
      ok: true,
      problems: [{ id: "55555555-5555-4555-8555-555555555555", problemNumber: 1, problemText: "1. Solve 3x + 5 = 20" }],
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("flushes the latest unit edit before opening submission review", async () => {
    const problemId = "22222222-2222-4222-8222-222222222222";
    render(<AssignmentWorkspace {...baseProps} initialProblems={[{
      id: problemId,
      problemNumber: 1,
      problemText: "Draft the central claim.",
      scaffold: { unitLabel: "Claim", unitType: "section" },
      studentWork: {},
    }]} />);
    fireEvent.change(screen.getByLabelText("Show your work"), { target: { value: "My current draft" } });
    const reviewProps = mocks.reviewPanelProps.mock.calls.at(-1)?.[0] as { onMarkDone(): void };
    await act(async () => reviewProps.onMarkDone());
    fireEvent.click(screen.getByRole("button", { name: /review submission/i }));

    await waitFor(() => expect(mocks.saveProblemWorkPatch).toHaveBeenCalledWith({
      problemId,
      patch: { work: "My current draft" },
    }));
    await waitFor(() => expect(mocks.prepareAssignmentReview).toHaveBeenCalledWith({ assignmentId }));
    expect(mocks.saveProblemWorkPatch.mock.invocationCallOrder[0]).toBeLessThan(mocks.prepareAssignmentReview.mock.invocationCallOrder[0]);
    expect(mocks.push).toHaveBeenCalledWith(`/assignments/${assignmentId}/submit`);
  });

  it("recovers a pending unit patch without a mount-time network write", async () => {
    const problemId = "22222222-2222-4222-8222-222222222222";
    window.localStorage.setItem(`diana:assignment:${assignmentId}:problem:${problemId}`, JSON.stringify({ work: "Recovered draft" }));
    render(<AssignmentWorkspace {...baseProps} initialProblems={[{
      id: problemId,
      problemNumber: 1,
      problemText: "Draft the central claim.",
      scaffold: { unitLabel: "Claim", unitType: "section" },
      studentWork: {},
    }]} />);

    expect((screen.getByLabelText("Show your work") as HTMLTextAreaElement).value).toBe("Recovered draft");
    await waitFor(() => expect(screen.getByText("Saved on this device")).toBeTruthy());
    expect(mocks.saveProblemWorkPatch).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(`diana:assignment:${assignmentId}:problem:${problemId}`)).toContain("Recovered draft");
  });
  it("flushes recoverable math work before submission review", async () => {
    const problemId = "22222222-2222-4222-8222-222222222222";
    render(<AssignmentWorkspace {...baseProps} kind="problem_set" initialMode="math" assignmentProfile={resolveAssignmentProfile({ kind: "problem_set", className: "Algebra I", title: "Equations" })} initialProblems={[{
      id: problemId,
      problemNumber: 1,
      problemText: "Solve 2x = 10",
      studentWork: {},
    }]} />);

    fireEvent.change(screen.getByLabelText("Show your work"), { target: { value: "Divide both sides by 2.\nx = 5" } });
    const reviewProps = mocks.reviewPanelProps.mock.calls.at(-1)?.[0] as { onMarkDone(): void };
    await act(async () => reviewProps.onMarkDone());
    fireEvent.click(screen.getByRole("button", { name: /review submission/i }));

    await waitFor(() => expect(mocks.saveProblemWorkPatch).toHaveBeenCalledWith({
      problemId,
      patch: { work: "Divide both sides by 2.\nx = 5" },
    }));
    await waitFor(() => expect(mocks.prepareAssignmentReview).toHaveBeenCalledWith({ assignmentId }));
    expect(mocks.saveProblemWorkPatch.mock.invocationCallOrder[0]).toBeLessThan(mocks.prepareAssignmentReview.mock.invocationCallOrder[0]);
    expect(window.localStorage.getItem(`diana:assignment:${assignmentId}:problem:${problemId}`)).toBeNull();
  });
  it("lets the student mark a worked problem done", async () => {
    const problemId = "22222222-2222-4222-8222-222222222222";
    render(<AssignmentWorkspace {...baseProps} kind="problem_set" initialMode="math" assignmentProfile={resolveAssignmentProfile({ kind: "problem_set", className: "Algebra I", title: "Equations" })} initialProblems={[{
      id: problemId,
      problemNumber: 1,
      problemText: "Solve 2x = 10",
      studentWork: { work: "Divide both sides by 2.\nx = 5" },
      progressStatus: "in_progress",
      reviewedAt: "2026-08-11T12:00:00.000Z",
    }]} />);

    const reviewProps = mocks.reviewPanelProps.mock.calls.at(-1)?.[0] as { onMarkDone(): void };
    await act(async () => reviewProps.onMarkDone());

    await waitFor(() => expect(mocks.markProblemDone).toHaveBeenCalledWith({ problemId }));
    expect(screen.getByLabelText("Assignment problems").textContent).toContain("Done");
    expect(screen.getByRole("button", { name: "Review submission" })).toHaveAttribute("data-primary", "true");
  });

  it("carries the reviewed work snapshot through the save and review marker", async () => {
    const problemId = "22222222-2222-4222-8222-222222222222";
    render(<AssignmentWorkspace {...baseProps} kind="problem_set" initialMode="math" assignmentProfile={resolveAssignmentProfile({ kind: "problem_set", className: "Algebra I", title: "Equations" })} initialProblems={[{
      id: problemId,
      problemNumber: 1,
      problemText: "Solve x + 4 = 9",
      studentWork: { work: "Subtract 4." },
      progressStatus: "in_progress",
    }]} />);

    const reviewProps = mocks.reviewPanelProps.mock.calls.at(-1)?.[0] as {
      reviewSnapshot: Record<string, unknown>;
      onReviewed(snapshot: Record<string, unknown>): Promise<boolean | undefined>;
    };
    const reviewedSnapshot = reviewProps.reviewSnapshot;
    fireEvent.change(screen.getByLabelText("Show your work"), { target: { value: "Subtract 4 from both sides." } });

    await act(async () => {
      await reviewProps.onReviewed(reviewedSnapshot);
    });

    expect(mocks.saveProblemWorkPatch).toHaveBeenCalledWith({
      problemId,
      patch: { work: "Subtract 4 from both sides." },
    });
    expect(mocks.markProblemReviewed).toHaveBeenCalledWith({ problemId, reviewedSnapshot });
    expect(mocks.saveProblemWorkPatch.mock.invocationCallOrder[0]).toBeLessThan(mocks.markProblemReviewed.mock.invocationCallOrder[0]);
  });

  it("saves touch-written math work with the problem", async () => {
    const problemId = "22222222-2222-4222-8222-222222222222";
    render(<AssignmentWorkspace {...baseProps} kind="problem_set" initialMode="math" assignmentProfile={resolveAssignmentProfile({ kind: "problem_set", className: "Algebra I", title: "Equations" })} initialProblems={[{
      id: problemId,
      problemNumber: 1,
      problemText: "Solve 2x = 10",
      studentWork: {},
    }]} />);
    const pad = screen.getByLabelText("Handwriting work pad");
    fireEvent.pointerDown(pad, { clientX: 10, clientY: 12, pointerId: 1, pointerType: "pen" });
    fireEvent.pointerMove(pad, { clientX: 72, clientY: 66, pointerId: 1, pointerType: "pen" });
    fireEvent.pointerUp(pad, { clientX: 72, clientY: 66, pointerId: 1, pointerType: "pen" });
    fireEvent.change(screen.getByLabelText("Show your work"), { target: { value: "Divide both sides by 2.\nx = 5" } });
    const reviewProps = mocks.reviewPanelProps.mock.calls.at(-1)?.[0] as { reviewSnapshot: Record<string, unknown>; onReviewed(snapshot: Record<string, unknown>): Promise<boolean | undefined> };
    await act(async () => reviewProps.onReviewed(reviewProps.reviewSnapshot));

    await waitFor(() => expect(mocks.saveProblemWorkPatch).toHaveBeenCalledWith({
      problemId,
      patch: expect.objectContaining({
        work: "Divide both sides by 2.\nx = 5",
        workInk: expect.stringContaining("x"),
      }),
    }));
  });
  it("clears typed and handwritten math work from the same box", async () => {
    const problemId = "33333333-3333-4333-8333-333333333333";
    render(<AssignmentWorkspace {...baseProps} kind="problem_set" initialMode="math" assignmentProfile={resolveAssignmentProfile({ kind: "problem_set", className: "Algebra I", title: "Equations" })} initialProblems={[{
      id: problemId,
      problemNumber: 1,
      problemText: "Solve x + 4 = 9",
      studentWork: {},
    }]} />);

    fireEvent.change(screen.getByLabelText("Show your work"), { target: { value: "Subtract 4 from both sides." } });
    const pad = screen.getByLabelText("Handwriting work pad");
    fireEvent.pointerDown(pad, { clientX: 12, clientY: 14, pointerId: 1, pointerType: "pen" });
    fireEvent.pointerMove(pad, { clientX: 80, clientY: 70, pointerId: 1, pointerType: "pen" });
    fireEvent.pointerUp(pad, { clientX: 80, clientY: 70, pointerId: 1, pointerType: "pen" });

    fireEvent.click(screen.getByRole("button", { name: "Clear work" }));
    expect(screen.getByLabelText("Show your work")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Undo clear" })).toBeTruthy();
    const reviewProps = mocks.reviewPanelProps.mock.calls.at(-1)?.[0] as { reviewSnapshot: Record<string, unknown>; onReviewed(snapshot: Record<string, unknown>): Promise<boolean | undefined> };
    await act(async () => reviewProps.onReviewed(reviewProps.reviewSnapshot));

    await waitFor(() => expect(mocks.saveProblemWorkPatch).toHaveBeenCalledWith({
      problemId,
      patch: expect.objectContaining({
        work: "",
        workInk: "",
      }),
    }));
  });

  it("restores typed and handwritten work after clear", async () => {
    const problemId = "33333333-3333-4333-8333-333333333333";
    render(<AssignmentWorkspace {...baseProps} kind="problem_set" initialMode="math" assignmentProfile={resolveAssignmentProfile({ kind: "problem_set", className: "Algebra I", title: "Equations" })} initialProblems={[{
      id: problemId,
      problemNumber: 1,
      problemText: "Solve x + 4 = 9",
      studentWork: { work: "Subtract 4.", workInk: JSON.stringify({ version: 2, strokes: [{ id: "stroke-1", points: [{ x: 10, y: 10 }, { x: 20, y: 20 }] }] }) },
    }]} />);

    fireEvent.click(screen.getByRole("button", { name: "Clear work" }));
    fireEvent.click(screen.getByRole("button", { name: "Undo clear" }));

    expect(screen.getByLabelText("Show your work")).toHaveValue("Subtract 4.");
    const reviewProps = mocks.reviewPanelProps.mock.calls.at(-1)?.[0] as { reviewSnapshot: Record<string, unknown>; onReviewed(snapshot: Record<string, unknown>): Promise<boolean | undefined> };
    await act(async () => reviewProps.onReviewed(reviewProps.reviewSnapshot));
    await waitFor(() => expect(mocks.saveProblemWorkPatch).toHaveBeenCalledWith({
      problemId,
      patch: expect.objectContaining({
        work: "Subtract 4.",
        workInk: expect.stringContaining("stroke-1"),
      }),
    }));
  });

  it("returns a completed problem to working when the student edits it", () => {
    const problemId = "33333333-3333-4333-8333-333333333333";
    render(<AssignmentWorkspace {...baseProps} kind="problem_set" initialMode="math" assignmentProfile={resolveAssignmentProfile({ kind: "problem_set", className: "Algebra I", title: "Equations" })} initialProblems={[{
      id: problemId,
      problemNumber: 1,
      problemText: "Solve x + 4 = 9",
      studentWork: { work: "x = 5" },
      progressStatus: "done",
      reviewedAt: "2026-08-11T12:00:00.000Z",
      completedAt: "2026-08-11T12:05:00.000Z",
    }]} />);

    expect(screen.getByLabelText("Assignment problems").textContent).toContain("Done");
    fireEvent.change(screen.getByLabelText("Show your work"), { target: { value: "x = 5, checked" } });
    expect(screen.getByLabelText("Assignment problems").textContent).toContain("Current");
    expect(screen.getByRole("button", { name: "Review" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Mark done" })).toBeNull();
  });

  it("shows autosave progress, success, and local recovery states", async () => {
    vi.useFakeTimers();
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
    let resolveSave!: (value: { ok: true }) => void;
    mocks.saveProblemWorkPatch.mockImplementationOnce(() => new Promise((resolve) => { resolveSave = resolve; }));
    const problemId = "33333333-3333-4333-8333-333333333333";
    render(<AssignmentWorkspace {...baseProps} kind="problem_set" initialMode="math" assignmentProfile={resolveAssignmentProfile({ kind: "problem_set", className: "Algebra I", title: "Equations" })} initialProblems={[{
      id: problemId,
      problemNumber: 1,
      problemText: "Solve x + 4 = 9",
      studentWork: {},
    }]} />);

    fireEvent.change(screen.getByLabelText("Show your work"), { target: { value: "Subtract 4." } });
    expect(screen.getByText("Saving")).toBeTruthy();
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(mocks.saveProblemWorkPatch).toHaveBeenCalledWith({ problemId, patch: { work: "Subtract 4." } });
    await act(async () => resolveSave({ ok: true }));
    expect(screen.getByText("Saved")).toBeTruthy();

    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: false });
    fireEvent.change(screen.getByLabelText("Show your work"), { target: { value: "Subtract 4 from both sides." } });
    expect(screen.getByText("Saved on this device")).toBeTruthy();
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
  });

  it("keeps recoverable work and shows a calm retry state when autosave pauses", async () => {
    vi.useFakeTimers();
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
    mocks.saveProblemWorkPatch.mockResolvedValueOnce({ ok: false, error: "The save paused. Try again." });
    const problemId = "33333333-3333-4333-8333-333333333333";
    render(<AssignmentWorkspace {...baseProps} kind="problem_set" initialMode="math" assignmentProfile={resolveAssignmentProfile({ kind: "problem_set", className: "Algebra I", title: "Equations" })} initialProblems={[{
      id: problemId,
      problemNumber: 1,
      problemText: "Solve x + 4 = 9",
      studentWork: {},
    }]} />);

    fireEvent.change(screen.getByLabelText("Show your work"), { target: { value: "Subtract 4." } });
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(screen.getByText("Save needs attention")).toHaveAttribute("title", "The save paused. Try again.");
    expect(window.localStorage.getItem(`diana:assignment:${assignmentId}:problem:${problemId}`)).toContain("Subtract 4.");
  });

  it("keeps recovery local until reconnect, then retries every pending draft", async () => {
    const firstProblemId = "33333333-3333-4333-8333-333333333333";
    const secondProblemId = "44444444-4444-4444-8444-444444444444";
    window.localStorage.setItem(`diana:assignment:${assignmentId}:problem:${firstProblemId}`, JSON.stringify({ work: "First recovered step" }));
    window.localStorage.setItem(`diana:assignment:${assignmentId}:problem:${secondProblemId}`, JSON.stringify({ work: "Second recovered step" }));
    mocks.saveProblemWorkPatch.mockImplementation(async ({ problemId }: { problemId: string }) => problemId === firstProblemId
      ? { ok: false, error: "The save paused. Try again." }
      : { ok: true });

    render(<AssignmentWorkspace {...baseProps} kind="problem_set" initialMode="math" assignmentProfile={resolveAssignmentProfile({ kind: "problem_set", className: "Algebra I", title: "Equations" })} initialProblems={[{
      id: firstProblemId,
      problemNumber: 1,
      problemText: "Solve x + 4 = 9",
      studentWork: {},
    }, {
      id: secondProblemId,
      problemNumber: 2,
      problemText: "Solve 2x = 12",
      studentWork: {},
    }]} />);

    expect(mocks.saveProblemWorkPatch).not.toHaveBeenCalled();
    await act(async () => window.dispatchEvent(new Event("online")));
    await waitFor(() => expect(mocks.saveProblemWorkPatch).toHaveBeenCalledWith({ problemId: firstProblemId, patch: { work: "First recovered step" } }));
    expect(mocks.saveProblemWorkPatch).not.toHaveBeenCalledWith({ problemId: secondProblemId, patch: expect.anything() });
    expect(screen.getByText("Save needs attention")).toHaveAttribute("title", "The save paused. Try again.");

    mocks.saveProblemWorkPatch.mockResolvedValue({ ok: true });
    fireEvent.click(screen.getByRole("button", { name: "Retry save" }));

    await waitFor(() => expect(mocks.saveProblemWorkPatch).toHaveBeenCalledWith({ problemId: secondProblemId, patch: { work: "Second recovered step" } }));
    expect(window.localStorage.getItem(`diana:assignment:${assignmentId}:problem:${firstProblemId}`)).toBeNull();
    expect(window.localStorage.getItem(`diana:assignment:${assignmentId}:problem:${secondProblemId}`)).toBeNull();
  });

  it("keeps a queued draft on the device when the page is hidden", async () => {
    vi.useFakeTimers();
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
    const problemId = "55555555-5555-4555-8555-555555555555";
    render(<AssignmentWorkspace {...baseProps} initialProblems={[{
      id: problemId,
      problemNumber: 1,
      problemText: "Draft the central claim.",
      scaffold: { unitLabel: "Claim", unitType: "section" },
      studentWork: {},
    }]} />);

    fireEvent.change(screen.getByLabelText("Show your work"), { target: { value: "Keep this local before leaving." } });
    await act(async () => window.dispatchEvent(new Event("pagehide")));
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });

    expect(mocks.saveProblemWorkPatch).not.toHaveBeenCalled();
    expect(screen.getByText("Saved on this device")).toBeTruthy();
    expect(window.localStorage.getItem(`diana:assignment:${assignmentId}:problem:${problemId}`)).toContain("Keep this local before leaving.");
  });

  it("opens and closes the accessible tools drawer without losing keyboard focus", () => {
    render(<AssignmentWorkspace {...baseProps} kind="problem_set" initialMode="math" assignmentProfile={resolveAssignmentProfile({ kind: "problem_set", className: "Algebra I", title: "Equations" })} initialProblems={[{
      id: "33333333-3333-4333-8333-333333333333",
      problemNumber: 1,
      problemText: "Solve x + 4 = 9",
      studentWork: {},
    }]} />);

    const tools = screen.getByRole("button", { name: "Tools" });
    fireEvent.click(tools);
    const close = screen.getAllByRole("button", { name: "Close assignment tools" })
      .find((button) => button.classList.contains("sd-assignment-tools-close"));
    expect(close).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(tools).toHaveFocus();
    expect(tools).toHaveAttribute("aria-expanded", "false");
  });

  it("erases only intersected ink and supports undo and redo without changing typed work", async () => {
    const problemId = "33333333-3333-4333-8333-333333333333";
    const originalInk = JSON.stringify({
      version: 2,
      strokes: [
        { id: "stroke-a", points: [{ x: 10, y: 10 }, { x: 40, y: 40 }] },
        { id: "stroke-b", points: [{ x: 300, y: 200 }, { x: 340, y: 240 }] },
      ],
    });
    render(<AssignmentWorkspace {...baseProps} kind="problem_set" initialMode="math" assignmentProfile={resolveAssignmentProfile({ kind: "problem_set", className: "Algebra I", title: "Equations" })} initialProblems={[{
      id: problemId,
      problemNumber: 1,
      problemText: "Solve x + 4 = 9",
      studentWork: { work: "Subtract 4 from both sides.", workInk: originalInk },
    }]} />);
    const pad = screen.getByLabelText("Handwriting work pad");
    const workBox = pad.closest(".sd-assignment-work-box") as HTMLElement;
    vi.spyOn(workBox, "getBoundingClientRect").mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 640, bottom: 300, width: 640, height: 300, toJSON: () => ({}) });

    fireEvent.click(screen.getByRole("button", { name: "Eraser" }));
    fireEvent.pointerDown(pad, { clientX: 20, clientY: 20, pointerId: 1, pointerType: "pen", buttons: 1 });
    fireEvent.pointerUp(pad, { clientX: 20, clientY: 20, pointerId: 1, pointerType: "pen" });
    fireEvent.click(screen.getByRole("button", { name: "Undo handwriting" }));
    fireEvent.click(screen.getByRole("button", { name: "Redo handwriting" }));
    const reviewProps = mocks.reviewPanelProps.mock.calls.at(-1)?.[0] as { reviewSnapshot: Record<string, unknown>; onReviewed(snapshot: Record<string, unknown>): Promise<boolean | undefined> };
    await act(async () => reviewProps.onReviewed(reviewProps.reviewSnapshot));

    await waitFor(() => expect(mocks.saveProblemWorkPatch).toHaveBeenCalled());
    const inkCall = mocks.saveProblemWorkPatch.mock.calls.find((call) => typeof call[0]?.patch?.workInk === "string");
    expect(inkCall?.[0].patch.workInk).not.toContain("stroke-a");
    expect(inkCall?.[0].patch.workInk).toContain("stroke-b");
    expect(screen.getByLabelText("Show your work")).toHaveValue("Subtract 4 from both sides.");
  });
});
