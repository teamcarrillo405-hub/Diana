import { describe, expect, it } from "vitest";
import { buildAuthorshipReceipt } from "./authorship";
import { buildArtifactReviewLoop, type StudyArtifact } from "./artifacts";

const artifact: StudyArtifact = {
  type: "practice_test",
  title: "Practice",
  sourceTitle: "Notes",
  sourceType: "note",
  mode: "retrieval_quiz",
  summary: "Practice from notes.",
  guide: [],
  quiz: [{ question: "Q", answer: "A", choices: [], hint: "H", sourceAnchor: "Note paragraph 2" }],
  cards: [{ front: "F", back: "B", sourceAnchor: "Rubric line 1" }],
  nextSteps: [],
  trustNote: "Trust",
  authorshipReceipt: "Receipt",
  practiceSettings: {
    questionCount: 4,
    difficulty: "standard",
    questionTypes: ["short_response"],
  },
  editState: {
    cardsReviewed: 0,
    cardsEdited: 0,
    lastEditedAt: null,
    readyForReview: false,
  },
  reviewLoop: buildArtifactReviewLoop({
    type: "practice_test",
    sourceTitle: "Notes",
    sourceAnchors: ["Note paragraph 2", "Rubric line 1"],
    cardsCreated: 1,
    quizCreated: 1,
  }),
  visualBreakdown: null,
  authorshipReceiptDetail: {
    sourceAnchors: [],
    dianaActions: [],
    studentActions: [],
    aiContribution: "practice",
    finalWorkProtected: true,
    refusalRedirectLogged: false,
    sensitiveDataExcluded: true,
    teacherSafeSummary: "",
    studentActionRequired: "",
    shareSummary: "",
  },
};

describe("authorship receipt", () => {
  it("summarizes Diana and student actions from artifacts", () => {
    const receipt = buildAuthorshipReceipt({ artifact, aiPolicy: "green", aiContribution: "practice" });
    expect(receipt.sourceAnchors).toEqual(["Note paragraph 2", "Rubric line 1"]);
    expect(receipt.dianaActions).toContain("Created recall questions with hints.");
    expect(receipt.finalWorkProtected).toBe(true);
    expect(receipt.sensitiveDataExcluded).toBe(true);
    expect(receipt.teacherSafeSummary).toContain("readiness details withheld");
  });

  it("keeps no-content policy as no AI contribution", () => {
    expect(buildAuthorshipReceipt({ aiPolicy: "red", aiContribution: "practice" }).aiContribution).toBe("none");
  });
});
