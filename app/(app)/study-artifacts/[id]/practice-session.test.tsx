// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/components/screen-design/student-desktop-nav", () => ({StudentDesktopNav:()=>null}));

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
import { savePracticeTestProgress } from "../actions";

const quiz = [{
  question: "Which detail supports the claim?",
  choices: ["The quoted detail"],
  answer: "The quoted detail",
  hint: "Use the source.",
  sourceAnchor: "Paragraph 2",
}];

describe("PracticeTestSession journey continuity", () => {
  afterEach(cleanup);

  it("keeps a draft visible when saving is unavailable", async () => {
    vi.mocked(savePracticeTestProgress).mockResolvedValueOnce({ok:false,error:"Try saving again."});
    render(<PracticeTestSession artifactId="quiz-1" artifactTitle="Quiz" assignmentId={null} quiz={[{...quiz[0],choices:[]}]} initialProgress={{currentQuestion:0,completed:false,completedAt:null,responses:{}}} initialResult={null} />);
    fireEvent.change(screen.getByLabelText("Practice response"),{target:{value:"My evidence"}});
    expect(screen.getByText("Draft",{selector:"small"})).toBeInTheDocument();
    expect(screen.getByText("0 of 1 saved")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"Finish quiz"}));
    expect(await screen.findByText("Try saving again.")).toBeInTheDocument();
    expect(screen.getByLabelText("Practice response")).toHaveValue("My evidence");
  });

  it("saves pending answers together and rejects a partial finish", async () => {
    vi.mocked(savePracticeTestProgress).mockClear();
    vi.mocked(savePracticeTestProgress).mockResolvedValueOnce({ok:true,progress:{currentQuestion:1,completed:true,completedAt:"2026-09-24T12:00:00Z",responses:{"0":"First","1":"Second"}},result:{results:[],questionCount:2,answeredCount:2,scoredCount:0,unscoredCount:2,matchedCount:0,checkAgainCount:0,reviewTogetherCount:2,notAnsweredCount:0,pointsEarned:0,pointsPossible:0,percentage:null},supportState:{stage:"guided",completedPasses:0} as never});
    render(<PracticeTestSession artifactId="quiz-1" artifactTitle="Quiz" assignmentId={null} quiz={[{...quiz[0],choices:[]},{...quiz[0],question:"Explain your idea",choices:[]}]} initialProgress={{currentQuestion:0,completed:false,completedAt:null,responses:{}}} initialResult={null} />);
    fireEvent.click(screen.getByRole("button",{name:/Question 2/}));
    fireEvent.change(screen.getByLabelText("Practice response"),{target:{value:"Second"}});
    fireEvent.click(screen.getByRole("button",{name:"Finish quiz"}));
    expect(screen.getByText("Add a response to each question before finishing.")).toBeInTheDocument();
    expect(savePracticeTestProgress).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button",{name:/Question 1/}));
    fireEvent.change(screen.getByLabelText("Practice response"),{target:{value:"First"}});
    fireEvent.click(screen.getByRole("button",{name:/Question 2/}));
    fireEvent.click(screen.getByRole("button",{name:"Finish quiz"}));
    await waitFor(()=>expect(savePracticeTestProgress).toHaveBeenCalledWith(expect.objectContaining({completed:true,responses:[{questionIndex:0,response:"First"},{questionIndex:1,response:"Second"}]})));
    expect(await screen.findByText("2 responses saved")).toBeInTheDocument();
  });

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

  it("returns standalone practice to saved Quiz material", () => {
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

    expect(screen.getByRole("link", { name: "Back to Quiz" })).toHaveAttribute(
      "href",
      "/study?view=saved",
    );
    expect(screen.getByRole("complementary", { name: "Quiz questions" })).toBeInTheDocument();
    expect(screen.getByLabelText("Ask Diana about this quiz")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Pause" })).not.toBeInTheDocument();
  });

  it("offers Diana chat after a below-passing quiz result", () => {
    render(
      <PracticeTestSession
        artifactId="22222222-2222-4222-8222-222222222222"
        artifactTitle="Algebra practice"
        assignmentId="11111111-1111-4111-8111-111111111111"
        quiz={quiz}
        initialProgress={{
          currentQuestion: 0,
          completed: true,
          completedAt: "2026-07-31T12:00:00.000Z",
          responses: { "0": "A different detail" },
        }}
        initialResult={{
          results: [],
          questionCount: 1,
          answeredCount: 1,
          scoredCount: 1,
          unscoredCount: 0,
          matchedCount: 0,
          checkAgainCount: 1,
          reviewTogetherCount: 0,
          notAnsweredCount: 0,
          pointsEarned: 0,
          pointsPossible: 1,
          percentage: 0,
        }}
      />,
    );

    expect(screen.getByLabelText("Ask Diana about this quiz")).toBeInTheDocument();
    expect(screen.getByLabelText("Message Diana about this quiz")).toBeInTheDocument();
  });
});
