// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requestAssignmentReview: vi.fn(),
  addAssignmentSourceFile: vi.fn(),
  removeAssignmentSourceFile: vi.fn(),
  retryAssignmentSourceExtraction: vi.fn(),
  upsertAssignmentProblemMessage: vi.fn(),
}));

vi.mock("@/app/(app)/assignments/[id]/ai-tools-actions", () => ({
  requestAssignmentReview: mocks.requestAssignmentReview,
}));
vi.mock("@/app/(app)/assignments/[id]/workspace/source-actions", () => ({
  addAssignmentSourceFile: mocks.addAssignmentSourceFile,
  removeAssignmentSourceFile: mocks.removeAssignmentSourceFile,
  retryAssignmentSourceExtraction: mocks.retryAssignmentSourceExtraction,
}));
vi.mock("@/app/(app)/assignments/[id]/workspace-state-actions", () => ({
  upsertAssignmentProblemMessage: mocks.upsertAssignmentProblemMessage,
}));
vi.mock("@/components/assignment-realtime-tutor", () => ({
  AssignmentRealtimeTutor: () => <button type="button" aria-label="Live voice">Live voice</button>,
}));

import { AssignmentReviewPanel } from "./assignment-review-panel";

const fields = [
  { label: "Problem", value: "Solve x + 4 = 9" },
  { label: "Student answer", value: "" },
  { label: "Student work", value: "I think I subtract 4." },
];

const tutorEvidence = {
  verificationLevel: "source_checked",
  confidence: 0.9,
  validatedAnchors: [{
    sourceId: "assignment-directions",
    pageLabel: "Assignment directions",
    startOffset: 0,
    endOffset: "Solve x + 4 = 9.".length,
    exactText: "Solve x + 4 = 9.",
  }],
  verifierResult: null,
  limitations: [],
  escalationReason: null,
};

const availableProviderState = {
  availability: "available",
  visible: false,
  title: null,
  message: null,
  reasonCode: null,
  retryable: false,
  retryAfterSeconds: null,
  verificationLevelCap: "tool_checked",
  confidenceCap: 1,
  escalationReason: null,
};

function sseResponse(events: unknown[]) {
  return new Response(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""), {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AssignmentReviewPanel math chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
    mocks.addAssignmentSourceFile.mockResolvedValue({ ok: true, source: { id: "source-1", title: "work.png", mimeType: "image/png" } });
    mocks.removeAssignmentSourceFile.mockResolvedValue({ ok: true });
    mocks.retryAssignmentSourceExtraction.mockResolvedValue({ ok: true, source: { id: "source-1", title: "work.png", mimeType: "image/png" }, extractionStatus: "imported" });
    mocks.upsertAssignmentProblemMessage.mockResolvedValue({ ok: true, value: {} });
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url === "/api/diana/openai-status") {
        return new Response(JSON.stringify({
          ok: true,
          visible: true,
          connected: true,
          homeworkModel: "gpt-5-mini",
          fallback: "off",
          budgetGuard: "local daily limits active",
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return sseResponse([
        { type: "thinking" },
        { type: "streaming", delta: "What should happen to the +4 " },
        { type: "streaming", delta: "before x can be alone?" },
        { type: "complete", response: {
          title: "Guided step",
          main: "What should happen to the +4 before x can be alone?",
          reason: "Looking at the operation keeps the work in your hands.",
          steps: ["Write the inverse operation under both sides."],
          anchor: "Student work",
          visualAid: {
            kind: "equation_steps",
            title: "Line up both sides",
            description: "Put the same operation under each side.",
            steps: ["3x + 5 = 20", "-5      -5", "3x = 15", "Your turn: divide both sides by 3"],
            equationRows: [
              { kind: "equation", cells: [{ column: "left_term", value: "3x" }, { column: "left_constant", value: "+ 5" }, { column: "relation", value: "=" }, { column: "right_term", value: "20" }] },
              { kind: "operation", cells: [{ column: "left_constant", value: "-5" }, { column: "right_term", value: "-5" }] },
              { kind: "equation", cells: [{ column: "left_term", value: "3x" }, { column: "relation", value: "=" }, { column: "right_term", value: "15" }] },
            ],
          },
        }, evidence: tutorEvidence, providerState: availableProviderState },
      ]);
    }));
    mocks.requestAssignmentReview.mockResolvedValue({
      ok: true,
      sourceAnchors: [],
      result: {
        title: "Diana review",
        strength: "You identified the equation.",
        improvement: "Choose one operation and show it on both sides.",
        nextMove: "Try subtracting the same value from both sides.",
        question: "What operation keeps the equation balanced?",
        evidenceAnchor: "Student work",
        visualAid: {
          kind: "balance",
          title: "Equation balance",
          description: "Both sides must stay equal when you choose the next operation.",
          steps: ["Identify the operation attached to x.", "Use the inverse operation on both sides."],
        },
      },
    });
  });

  it("uses the same persistent chat composer for a non-math work unit", () => {
    render(
      <AssignmentReviewPanel
        assignmentId="11111111-1111-4111-8111-111111111111"
        problemId="22222222-2222-4222-8222-222222222222"
        template="writing"
        aiMode="green"
        fields={[{ label: "Work unit", value: "State a claim." }, { label: "Student work", value: "My claim is clear." }]}
      />,
    );

    expect(screen.getByLabelText("Message Diana")).toBeTruthy();
    expect(screen.getByLabelText("Upload images or PDFs")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Live voice" })).toBeTruthy();
  });

  it("sends math questions through the assignment-aware study buddy", async () => {
    render(
      <AssignmentReviewPanel
        assignmentId="11111111-1111-4111-8111-111111111111"
        template="math"
        aiMode="green"
        fields={fields}
      />,
    );

    expect(screen.getByLabelText("Ask Diana")).toBeTruthy();
    expect(screen.queryByText("I can work this with you. Try a step in the work box, then ask me to check it or tell me where you are stuck.")).toBeNull();
    expect(screen.getByLabelText("Upload images or PDFs")).toBeTruthy();
    expect(screen.getByLabelText("Live voice")).toBeTruthy();

    const composer = screen.getByPlaceholderText("Message Diana");
    fireEvent.change(composer, { target: { value: "Am I doing this right?" } });
    fireEvent.keyDown(composer, { key: "Enter" });

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/diana/study-buddy/stream", expect.objectContaining({ method: "POST" })));
    expect(screen.queryByText("OpenAI connected")).toBeNull();
    const studyBuddyCall = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.find((call) => call[0] === "/api/diana/study-buddy/stream");
    expect(studyBuddyCall).toBeTruthy();
    const body = JSON.parse(studyBuddyCall?.[1].body);
    expect(body).toEqual(expect.objectContaining({
      assignmentId: "11111111-1111-4111-8111-111111111111",
      mode: "guide",
      question: "Am I doing this right?",
    }));
    expect(body.source).toContain("Problem: Solve x + 4 = 9");
    expect(body.conversation).toEqual([
      expect.objectContaining({ role: "student", text: "Am I doing this right?" }),
    ]);
    expect(await screen.findByText(/What should happen to the \+4/)).toBeTruthy();
    expect(screen.getByLabelText("Diana math steps")).toBeTruthy();
    expect(screen.getAllByText("3x").length).toBeGreaterThan(0);
    expect(screen.getByText("+ 5")).toBeTruthy();
    expect(screen.getAllByText("-5")).toHaveLength(2);
    expect(screen.getByText("Source checked: Assignment directions")).toBeTruthy();
    expect(screen.queryByText(/Why this helps/)).toBeNull();
  });

  it("visibly labels a successful response when the provider is degraded", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => sseResponse([
      { type: "thinking" },
      {
        type: "complete",
        response: {
          title: "Source-grounded step",
          main: "Use the assignment sentence before choosing the next operation.",
          reason: "",
          steps: [],
          anchor: "Assignment directions",
          visualAid: { kind: "none", title: "", description: "", steps: [] },
        },
        evidence: tutorEvidence,
        providerState: {
          ...availableProviderState,
          availability: "degraded",
          visible: true,
          title: "Verification is limited right now",
          message: "Diana can still use exact source passages or offer clearly labeled guidance, but tool checking is temporarily unavailable.",
          reasonCode: "timeout",
          retryable: true,
          verificationLevelCap: "source_checked",
          confidenceCap: 0.7,
          escalationReason: "The verification provider is degraded, so this response cannot rely on a new tool-checked result.",
        },
      },
    ])));
    render(<AssignmentReviewPanel assignmentId="11111111-1111-4111-8111-111111111111" problemId="problem-1" template="math" aiMode="green" fields={fields} />);

    fireEvent.change(screen.getByLabelText("Message Diana"), { target: { value: "Can you check this?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("Use the assignment sentence before choosing the next operation.")).toBeTruthy();
    expect(screen.getByText("Verification is limited right now")).toBeTruthy();
    expect(screen.getByText(/tool checking is temporarily unavailable/u)).toBeTruthy();
    expect(screen.getByText("Source checked: Assignment directions")).toBeTruthy();
  });

  it("adds work-section review feedback to the chat transcript", async () => {
    const { rerender } = render(
      <AssignmentReviewPanel
        assignmentId="11111111-1111-4111-8111-111111111111"
        template="math"
        aiMode="green"
        fields={fields}
        mathReviewSignal={0}
      />,
    );

    expect(screen.queryByText("Review")).toBeNull();
    rerender(
      <AssignmentReviewPanel
        assignmentId="11111111-1111-4111-8111-111111111111"
        template="math"
        aiMode="green"
        fields={fields}
        mathReviewSignal={1}
      />,
    );

    await waitFor(() => expect(mocks.requestAssignmentReview).toHaveBeenCalledWith(expect.objectContaining({
      template: "math",
      question: "",
    })));
    expect(await screen.findByText(/Try subtracting the same value/)).toBeTruthy();
    expect(screen.getByLabelText("Diana visual helper")).toBeTruthy();
  });

  it("keeps each problem conversation separate", async () => {
    const { rerender } = render(
      <AssignmentReviewPanel assignmentId="11111111-1111-4111-8111-111111111111" problemId="problem-1" template="math" aiMode="green" fields={fields} />,
    );
    fireEvent.change(screen.getByLabelText("Message Diana"), { target: { value: "Help with problem one" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(await screen.findByText("Help with problem one")).toBeTruthy();

    rerender(<AssignmentReviewPanel assignmentId="11111111-1111-4111-8111-111111111111" problemId="problem-2" template="math" aiMode="green" fields={[{ label: "Problem", value: "Solve 2x = 12" }, { label: "Student work", value: "" }]} />);
    expect(screen.queryByText("Help with problem one")).toBeNull();
    expect(screen.queryByText(/I can work this with you/)).toBeNull();

    fireEvent.change(screen.getByLabelText("Message Diana"), { target: { value: "Help with problem two" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(await screen.findByText("Help with problem two")).toBeTruthy();

    rerender(<AssignmentReviewPanel assignmentId="11111111-1111-4111-8111-111111111111" problemId="problem-1" template="math" aiMode="green" fields={fields} />);
    expect(screen.getByText("Help with problem one")).toBeTruthy();
    expect(screen.queryByText("Help with problem two")).toBeNull();
  });

  it("retries an interrupted assistant turn without duplicating the student message", async () => {
    let attempt = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      attempt += 1;
      return attempt === 1
        ? sseResponse([{ type: "thinking" }, { type: "interrupted", error: "The reply paused. Your message is still here." }])
        : sseResponse([{ type: "thinking" }, { type: "complete", response: { title: "Guided step", main: "Try subtracting 4 from both sides.", reason: "", steps: [], anchor: "Student work", visualAid: { kind: "none", title: "", description: "", steps: [] } }, evidence: tutorEvidence, providerState: availableProviderState }]);
    }));
    render(<AssignmentReviewPanel assignmentId="11111111-1111-4111-8111-111111111111" problemId="problem-1" template="math" aiMode="green" fields={fields} />);

    fireEvent.change(screen.getByLabelText("Message Diana"), { target: { value: "I am confused" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    fireEvent.click(await screen.findByRole("button", { name: "Retry reply" }));

    expect(await screen.findByText("Try subtracting 4 from both sides.")).toBeTruthy();
    expect(screen.getAllByText("I am confused")).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("shows an attachment immediately and keeps it with the sent message", async () => {
    const { container } = render(<AssignmentReviewPanel assignmentId="11111111-1111-4111-8111-111111111111" problemId="problem-1" template="math" aiMode="green" fields={fields} />);
    const createObjectUrl = vi.fn(() => "blob:work-photo");
    const revokeObjectUrl = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectUrl });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectUrl });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["image"], "work.png", { type: "image/png" });

    fireEvent.change(input, { target: { files: [file] } });
    expect(screen.getByText("Uploading")).toBeTruthy();
    expect(await screen.findByText("Ready")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Message Diana"), { target: { value: "Can you check this photo?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("Can you check this photo?")).toBeTruthy();
    expect(screen.getByText("work.png")).toBeTruthy();
    expect(mocks.addAssignmentSourceFile).toHaveBeenCalled();
  });

  it("keeps a selected attachment visible when upload pauses and retries it", async () => {
    mocks.addAssignmentSourceFile.mockResolvedValueOnce({
      ok: false,
      error: "Upload paused. Try again.",
      source: { id: "source-2", title: "worksheet.pdf", mimeType: "application/pdf" },
      extractionStatus: "failed",
    });
    mocks.retryAssignmentSourceExtraction.mockResolvedValueOnce({
      ok: true,
      source: { id: "source-2", title: "worksheet.pdf", mimeType: "application/pdf" },
      extractionStatus: "imported",
    });
    const { container } = render(<AssignmentReviewPanel assignmentId="11111111-1111-4111-8111-111111111111" problemId="problem-1" template="math" aiMode="green" fields={fields} />);
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:worksheet") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["pdf"], "worksheet.pdf", { type: "application/pdf" })] } });

    expect(await screen.findByText("Upload paused. Try again.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry worksheet.pdf" }));
    expect(await screen.findByText("Ready")).toBeTruthy();
    expect(mocks.addAssignmentSourceFile).toHaveBeenCalledTimes(1);
    expect(mocks.retryAssignmentSourceExtraction).toHaveBeenCalledWith({
      assignmentId: "11111111-1111-4111-8111-111111111111",
      sourceId: "source-2",
    });
  });

  it("keeps partial extraction in needs-attention until the student confirms it", async () => {
    mocks.addAssignmentSourceFile.mockResolvedValueOnce({
      ok: true,
      source: { id: "source-3", title: "worksheet.pdf", mimeType: "application/pdf" },
      extractionStatus: "partial",
    });
    const { container } = render(<AssignmentReviewPanel assignmentId="11111111-1111-4111-8111-111111111111" problemId="22222222-2222-4222-8222-222222222222" template="math" aiMode="green" fields={fields} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["pdf"], "worksheet.pdf", { type: "application/pdf" })] } });

    expect(await screen.findByText(/found part of this file/i)).toBeTruthy();
    expect(screen.queryByText("Ready")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Confirm worksheet.pdf" }));
    expect(screen.getByText("Ready")).toBeTruthy();
  });

  it("keeps the student turn and offers retry for a malformed stream event", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url === "/api/diana/openai-status") {
        return new Response(JSON.stringify({ ok: true, visible: true, connected: true }), { headers: { "Content-Type": "application/json" } });
      }
      return new Response("data: {unreadable}\n\n", { status: 200, headers: { "Content-Type": "text/event-stream" } });
    }));
    render(<AssignmentReviewPanel assignmentId="11111111-1111-4111-8111-111111111111" problemId="problem-1" template="math" aiMode="green" fields={fields} />);

    fireEvent.change(screen.getByLabelText("Message Diana"), { target: { value: "Can you check this?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("Diana received an unreadable reply. Your message is still here.")).toBeTruthy();
    expect(screen.getByText("Can you check this?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry reply" })).toBeTruthy();
  });

  it("processes the trailing SSE buffer and makes EOF without a terminal event retryable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      `data: ${JSON.stringify({ type: "thinking" })}\n\ndata: ${JSON.stringify({ type: "streaming", delta: "Try the inverse operation first." })}`,
      { status: 200, headers: { "Content-Type": "text/event-stream" } },
    )));
    render(<AssignmentReviewPanel assignmentId="11111111-1111-4111-8111-111111111111" problemId="22222222-2222-4222-8222-222222222222" template="math" aiMode="green" fields={fields} />);

    fireEvent.change(screen.getByLabelText("Message Diana"), { target: { value: "What comes next?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("Try the inverse operation first.")).toBeTruthy();
    expect(screen.getByText("Diana was interrupted before the reply finished. Your message is still here.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry reply" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Message Diana"), { target: { value: "Try once more" } });
    expect((screen.getByRole("button", { name: "Send message" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("restores retry UI for a hydrated interrupted assistant reply", () => {
    render(<AssignmentReviewPanel
      assignmentId="11111111-1111-4111-8111-111111111111"
      problemId="22222222-2222-4222-8222-222222222222"
      template="math"
      aiMode="green"
      fields={fields}
      initialMessages={[
        {
          id: "student-message",
          problemId: "22222222-2222-4222-8222-222222222222",
          role: "student",
          content: "Can you check this?",
          attachments: [],
          visualAid: null,
          completionState: "complete",
          clientTurnId: "turn-1",
          createdAt: "2026-08-12T10:00:00.000Z",
        },
        {
          id: "assistant-message",
          problemId: "22222222-2222-4222-8222-222222222222",
          role: "assistant",
          content: "Start by isolating the x term.",
          attachments: [],
          visualAid: null,
          completionState: "interrupted",
          clientTurnId: "turn-1",
          createdAt: "2026-08-12T10:00:01.000Z",
        },
      ]}
    />);

    expect(screen.getByText("Start by isolating the x term.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry reply" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Message Diana"), { target: { value: "Continue" } });
    expect((screen.getByRole("button", { name: "Send message" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("recovers queued chat writes after reload and flushes them when the browser comes online", async () => {
    const assignmentId = "11111111-1111-4111-8111-111111111111";
    const problemId = "22222222-2222-4222-8222-222222222222";
    const queueKey = `diana:assignment:${assignmentId}:problem-chat-queue:v1`;
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: false });
    render(<AssignmentReviewPanel assignmentId={assignmentId} problemId={problemId} template="math" aiMode="green" fields={fields} />);

    fireEvent.change(screen.getByLabelText("Message Diana"), { target: { value: "Keep this message" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await screen.findByText(/What should happen to the \+4/);

    const queued = JSON.parse(window.localStorage.getItem(queueKey) ?? "[]") as Array<{ queueId: string }>;
    expect(queued).toHaveLength(2);
    expect(new Set(queued.map((item) => item.queueId)).size).toBe(2);
    expect(mocks.upsertAssignmentProblemMessage).not.toHaveBeenCalled();

    cleanup();
    render(<AssignmentReviewPanel assignmentId={assignmentId} problemId={problemId} template="math" aiMode="green" fields={fields} />);
    expect(await screen.findByText("Keep this message")).toBeTruthy();

    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
    window.dispatchEvent(new Event("online"));

    await waitFor(() => expect(mocks.upsertAssignmentProblemMessage).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(window.localStorage.getItem(queueKey)).toBeNull());
  });

  it("moves from reviewed work to student completion and the next clear action", () => {
    const onMarkDone = vi.fn();
    const onNextProblem = vi.fn();
    const onReviewSubmission = vi.fn();
    const common = {
      assignmentId: "11111111-1111-4111-8111-111111111111",
      problemId: "problem-1",
      template: "math" as const,
      aiMode: "green" as const,
      fields,
      onMarkDone,
      onNextProblem,
      onReviewSubmission,
    };
    const { rerender } = render(<AssignmentReviewPanel {...common} reviewed />);

    fireEvent.click(screen.getByRole("button", { name: "Mark problem done" }));
    expect(onMarkDone).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Keep working" })).toBeTruthy();

    rerender(<AssignmentReviewPanel {...common} reviewed done hasNextProblem />);
    expect(screen.queryByRole("button", { name: "Mark problem done" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Next problem" }));
    expect(onNextProblem).toHaveBeenCalledOnce();

    rerender(<AssignmentReviewPanel {...common} reviewed done hasNextProblem={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Review submission" }));
    expect(onReviewSubmission).toHaveBeenCalledOnce();
  });
});
