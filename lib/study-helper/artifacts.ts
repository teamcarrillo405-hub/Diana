import type { StudyHelperMode } from "./modes";
import { buildAuthorshipReceipt, type AuthorshipReceipt } from "./authorship";
import { buildVisualBreakdown, type VisualBreakdown } from "./visual-breakdown";

export type StudyArtifactSourceType = "assignment" | "note";
export type StudyArtifactType = "study_guide" | "practice_test" | "flashcard_set";

export type PracticeTestSettings = {
  questionCount: number;
  difficulty: "light" | "standard" | "challenge";
  questionTypes: Array<"short_response" | "multiple_choice" | "evidence_check" | "application">;
};

export type ArtifactEditState = {
  cardsReviewed: number;
  cardsEdited: number;
  lastEditedAt: string | null;
  readyForReview: boolean;
};

export type StudyLoopStage = "source" | "helper" | "artifact" | "review" | "mastery" | "next_support";

export type StudyLoopStep = {
  stage: StudyLoopStage;
  label: string;
  sourceAnchor: string;
  studentAction: string;
  masterySignal: string;
};

export type ArtifactReviewLoop = {
  currentStage: StudyLoopStage;
  steps: StudyLoopStep[];
  nextReviewAction: string;
  masterySignal: "still_learning" | "getting_there" | "secure";
  nextSupportUse: string;
};

export type StudyArtifactCard = {
  front: string;
  back: string;
  sourceAnchor: string;
  studentRequiredAction?: string;
};

export type StudyArtifactQuizItem = {
  question: string;
  choices: string[];
  answer: string;
  hint: string;
  sourceAnchor: string;
};

export type StudyArtifactGuideSection = {
  heading: string;
  bullets: string[];
};

export type StudyArtifact = {
  type: StudyArtifactType;
  title: string;
  sourceTitle: string;
  sourceType: StudyArtifactSourceType;
  mode: StudyHelperMode;
  summary: string;
  guide: StudyArtifactGuideSection[];
  quiz: StudyArtifactQuizItem[];
  cards: StudyArtifactCard[];
  nextSteps: string[];
  trustNote: string;
  authorshipReceipt: string;
  practiceSettings: PracticeTestSettings;
  editState: ArtifactEditState;
  reviewLoop: ArtifactReviewLoop;
  visualBreakdown: VisualBreakdown | null;
  authorshipReceiptDetail: AuthorshipReceipt;
};

export function artifactLabel(type: StudyArtifactType): string {
  if (type === "study_guide") return "Study guide";
  if (type === "practice_test") return "Practice test";
  return "Flashcards";
}

export function parseStudyArtifactResponse(
  raw: string,
  fallback: {
    type: StudyArtifactType;
    sourceTitle: string;
    sourceType: StudyArtifactSourceType;
    mode: StudyHelperMode;
    sourceText: string;
  },
): StudyArtifact {
  const parsed = parseJson(raw);
  const draft = parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  const fallbackArtifact = buildFallbackStudyArtifact(fallback);

  return {
    type: fallback.type,
    title: cleanString(draft.title, fallbackArtifact.title, 120),
    sourceTitle: fallback.sourceTitle,
    sourceType: fallback.sourceType,
    mode: fallback.mode,
    summary: cleanString(draft.summary, fallbackArtifact.summary, 700),
    guide: normalizeGuide(draft.guide, fallbackArtifact.guide),
    quiz: normalizeQuiz(draft.quiz, fallbackArtifact.quiz),
    cards: normalizeCards(draft.cards, fallbackArtifact.cards),
    nextSteps: normalizeStringList(draft.nextSteps, fallbackArtifact.nextSteps, 4, 140),
    trustNote: cleanString(draft.trustNote, fallbackArtifact.trustNote, 260),
    authorshipReceipt: cleanString(draft.authorshipReceipt, fallbackArtifact.authorshipReceipt, 260),
    practiceSettings: normalizePracticeSettings(draft.practiceSettings, fallbackArtifact.practiceSettings),
    editState: normalizeEditState(draft.editState, fallbackArtifact.editState),
    reviewLoop: normalizeReviewLoop(draft.reviewLoop, fallbackArtifact.reviewLoop),
    visualBreakdown: normalizeVisualBreakdown(draft.visualBreakdown, fallbackArtifact.visualBreakdown),
    authorshipReceiptDetail: normalizeAuthorshipReceipt(draft.authorshipReceiptDetail, fallbackArtifact.authorshipReceiptDetail),
  };
}

export function buildFallbackStudyArtifact(input: {
  type: StudyArtifactType;
  sourceTitle: string;
  sourceType: StudyArtifactSourceType;
  mode: StudyHelperMode;
  sourceText: string;
}): StudyArtifact {
  const sourceTitle = input.sourceTitle.trim() || "Class material";
  const sentences = extractSentences(input.sourceText);
  const terms = extractStudyTerms(input.sourceText, sourceTitle);
  const anchors = sentences.length > 0 ? sentences : terms.map((term) => `Review ${term}.`);
  const anchorLabels = sourceAnchorLabels(input.sourceText, input.sourceType);
  const summary = anchors.slice(0, 3).join(" ");
  const cards = terms.slice(0, 8).map((term, index) => ({
    front: `Explain ${term}`,
    back: anchors[index % anchors.length] ?? `Use your notes to define ${term}.`,
    sourceAnchor: anchorLabels[index % Math.max(anchorLabels.length, 1)] ?? anchorLabel(input.sourceType, index + 1),
  }));

  const quiz = anchors.slice(0, 5).map((sentence, index) => {
    const term = terms[index % Math.max(terms.length, 1)] ?? "this idea";
    return {
      question: `What does the material say about ${term}?`,
      choices: [],
      answer: sentence,
      hint: "Use the source line before opening more help.",
      sourceAnchor: anchorLabels[index % Math.max(anchorLabels.length, 1)] ?? anchorLabel(input.sourceType, index + 1),
    };
  });

  const artifactBase = {
    type: input.type,
    title: `${artifactLabel(input.type)} from ${sourceTitle}`,
    sourceTitle,
    sourceType: input.sourceType,
    mode: input.mode,
    summary: summary || `Use ${sourceTitle} as the source for this study set.`,
    guide: [
      {
        heading: "What to know",
        bullets: anchors.slice(0, 4).map((sentence) => sentence.slice(0, 180)),
      },
      {
        heading: "What to practice",
        bullets: terms.slice(0, 4).map((term) => `Say what ${term} means using your class words.`),
      },
    ],
    quiz,
    cards,
    nextSteps: [
      input.type === "flashcard_set"
        ? "Review each card and edit wording before saving it."
        : input.type === "practice_test"
          ? "Try one question before checking the source line."
          : "Pick one section and turn it into active recall.",
      "Keep the final answer in your own words.",
    ],
    trustNote: "Diana used the provided class material and kept the output as study support.",
    authorshipReceipt: "Student source material stayed primary; Diana created practice prompts, not final assignment work.",
    practiceSettings: defaultPracticeTestSettings(input.type),
    editState: defaultArtifactEditState(),
    reviewLoop: buildArtifactReviewLoop({
      type: input.type,
      sourceTitle,
      sourceAnchors: anchorLabels,
      cardsCreated: cards.length,
      quizCreated: quiz.length,
    }),
    visualBreakdown: buildVisualBreakdown({
      assignmentKind: input.type === "practice_test" ? "test_prep" : "reading",
      title: sourceTitle,
    }),
  } satisfies Omit<StudyArtifact, "authorshipReceiptDetail">;

  return {
    ...artifactBase,
    authorshipReceiptDetail: buildAuthorshipReceipt({
      artifact: artifactBase,
      aiPolicy: "green",
      aiContribution: "practice",
    }),
  };
}

export function defaultPracticeTestSettings(type: StudyArtifactType): PracticeTestSettings {
  return {
    questionCount: type === "practice_test" ? 8 : 4,
    difficulty: "standard",
    questionTypes: type === "flashcard_set"
      ? ["short_response", "evidence_check"]
      : ["short_response", "multiple_choice", "evidence_check", "application"],
  };
}

export function defaultArtifactEditState(): ArtifactEditState {
  return {
    cardsReviewed: 0,
    cardsEdited: 0,
    lastEditedAt: null,
    readyForReview: false,
  };
}

export function withEditedCards(
  artifact: StudyArtifact,
  cards: StudyArtifactCard[],
  nowIso: string,
): StudyArtifact {
  const cleanedCards = normalizeCards(cards, artifact.cards);
  const editedCount = cleanedCards.filter((card, index) =>
    card.front !== artifact.cards[index]?.front || card.back !== artifact.cards[index]?.back,
  ).length;
  const next = {
    ...artifact,
    cards: cleanedCards,
    editState: {
      cardsReviewed: cleanedCards.length,
      cardsEdited: editedCount,
      lastEditedAt: nowIso,
      readyForReview: cleanedCards.length > 0,
    },
    reviewLoop: buildArtifactReviewLoop({
      type: artifact.type,
      sourceTitle: artifact.sourceTitle,
      sourceAnchors: cleanedCards.map((card) => card.sourceAnchor),
      cardsCreated: cleanedCards.length,
      quizCreated: artifact.quiz.length,
      editedCards: editedCount,
    }),
  };
  return {
    ...next,
    authorshipReceiptDetail: buildAuthorshipReceipt({
      artifact: next,
      aiPolicy: "green",
      aiContribution: "practice",
      studentActions: [
        "Reviewed card drafts.",
        editedCount > 0 ? "Edited card wording before saving." : "Checked card wording before saving.",
        "Kept final assignment work student-made.",
      ],
    }),
  };
}

export function completeStudyArtifact(value: unknown): StudyArtifact {
  const raw = value && typeof value === "object" ? value as Partial<StudyArtifact> : {};
  const type = raw.type === "study_guide" || raw.type === "practice_test" || raw.type === "flashcard_set"
    ? raw.type
    : "study_guide";
  const sourceTitle = typeof raw.sourceTitle === "string" ? raw.sourceTitle : "Class material";
  const sourceType = raw.sourceType === "assignment" || raw.sourceType === "note" ? raw.sourceType : "assignment";
  const mode = raw.mode === "guided_steps" || raw.mode === "visual_breakdown" || raw.mode === "retrieval_quiz" || raw.mode === "flashcard_builder"
    ? raw.mode
    : "guided_steps";
  const fallback = buildFallbackStudyArtifact({
    type,
    sourceTitle,
    sourceType,
    mode,
    sourceText: [
      typeof raw.summary === "string" ? raw.summary : "",
      ...(Array.isArray(raw.cards) ? raw.cards.map((card) => `${card.front} ${card.back}`) : []),
    ].join(" "),
  });

  const completed = {
    ...fallback,
    ...raw,
    type,
    sourceTitle,
    sourceType,
    mode,
    guide: normalizeGuide(raw.guide, fallback.guide),
    quiz: normalizeQuiz(raw.quiz, fallback.quiz),
    cards: normalizeCards(raw.cards, fallback.cards),
    practiceSettings: normalizePracticeSettings(raw.practiceSettings, fallback.practiceSettings),
    editState: normalizeEditState(raw.editState, fallback.editState),
    reviewLoop: normalizeReviewLoop(raw.reviewLoop, fallback.reviewLoop),
    visualBreakdown: normalizeVisualBreakdown(raw.visualBreakdown, fallback.visualBreakdown),
  } satisfies Omit<StudyArtifact, "authorshipReceiptDetail"> & { authorshipReceiptDetail?: AuthorshipReceipt };

  return {
    ...completed,
    authorshipReceiptDetail: normalizeAuthorshipReceipt(
      raw.authorshipReceiptDetail,
      buildAuthorshipReceipt({
        artifact: completed,
        aiPolicy: "green",
        aiContribution: "practice",
      }),
    ),
  };
}

export function extractStudyTerms(text: string, fallbackTitle = ""): string[] {
  const words = `${fallbackTitle} ${text}`
    .replace(/['']/g, "")
    .split(/[^A-Za-z0-9-]+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 4 && !STOP_WORDS.has(word.toLowerCase()));

  const counts = new Map<string, { label: string; count: number }>();
  for (const word of words) {
    const key = word.toLowerCase();
    const current = counts.get(key);
    counts.set(key, { label: current?.label ?? titleCase(word), count: (current?.count ?? 0) + 1 });
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .map((entry) => entry.label)
    .slice(0, 12);
}

export function buildArtifactReviewLoop(input: {
  type: StudyArtifactType;
  sourceTitle: string;
  sourceAnchors: string[];
  cardsCreated: number;
  quizCreated: number;
  editedCards?: number;
}): ArtifactReviewLoop {
  const sourceAnchor = input.sourceAnchors[0] ?? "Source material";
  const editedCards = input.editedCards ?? 0;
  const masterySignal: ArtifactReviewLoop["masterySignal"] = editedCards > 0 || input.quizCreated >= 4
    ? "getting_there"
    : "still_learning";
  return {
    currentStage: input.cardsCreated > 0 || input.quizCreated > 0 ? "artifact" : "source",
    steps: [
      {
        stage: "source",
        label: "Class source",
        sourceAnchor,
        studentAction: `Confirm the source material from ${input.sourceTitle}.`,
        masterySignal: "Source is attached before practice starts.",
      },
      {
        stage: "helper",
        label: "Diana helper",
        sourceAnchor,
        studentAction: "Choose guided steps, visual breakdown, quiz, or cards.",
        masterySignal: "Help mode is recorded for future support.",
      },
      {
        stage: "artifact",
        label: artifactLabel(input.type),
        sourceAnchor,
        studentAction: input.type === "flashcard_set"
          ? "Edit card wording before saving to review."
          : "Try one source-anchored question before checking the answer.",
        masterySignal: `${input.cardsCreated + input.quizCreated} practice items are source-linked.`,
      },
      {
        stage: "review",
        label: "FSRS review",
        sourceAnchor,
        studentAction: "Rate recall honestly so Diana can schedule the next review.",
        masterySignal: "Recall rating feeds the next support level.",
      },
      {
        stage: "mastery",
        label: "Mastery signal",
        sourceAnchor,
        studentAction: "Mark whether the idea is still learning, getting there, or secure.",
        masterySignal,
      },
      {
        stage: "next_support",
        label: "Next assignment support",
        sourceAnchor,
        studentAction: "Let recall history shape the next helper mode.",
        masterySignal: "Future support starts with the weakest source-linked idea.",
      },
    ],
    nextReviewAction: input.type === "flashcard_set"
      ? "Save edited cards, then review the first due card."
      : "Try the first practice item, then rate recall.",
    masterySignal,
    nextSupportUse: "Diana uses recall ratings, edited-card count, and source anchors to choose steady, guided, scaffolded, or one-move support next time.",
  };
}

function normalizeGuide(value: unknown, fallback: StudyArtifactGuideSection[]): StudyArtifactGuideSection[] {
  if (!Array.isArray(value)) return fallback;
  const guide = value
    .map((item) => item as Record<string, unknown>)
    .map((item) => ({
      heading: cleanString(item.heading, "", 90),
      bullets: normalizeStringList(item.bullets, [], 5, 180),
    }))
    .filter((section) => section.heading && section.bullets.length > 0)
    .slice(0, 5);
  return guide.length > 0 ? guide : fallback;
}

function normalizeQuiz(value: unknown, fallback: StudyArtifactQuizItem[]): StudyArtifactQuizItem[] {
  if (!Array.isArray(value)) return fallback;
  const quiz = value
    .map((item) => item as Record<string, unknown>)
    .map((item) => ({
      question: cleanString(item.question, "", 220),
      choices: normalizeStringList(item.choices, [], 4, 120),
      answer: cleanString(item.answer, "", 400),
      hint: cleanString(item.hint, "Use the source before opening more help.", 180),
      sourceAnchor: cleanString(item.sourceAnchor, "Source material", 120),
    }))
    .filter((item) => item.question && item.answer)
    .slice(0, 8);
  return quiz.length > 0 ? quiz : fallback;
}

function normalizeCards(value: unknown, fallback: StudyArtifactCard[]): StudyArtifactCard[] {
  if (!Array.isArray(value)) return fallback;
  const cards = value
    .map((item) => item as Record<string, unknown>)
    .map((item) => ({
      front: cleanString(item.front, "", 240),
      back: cleanString(item.back, "", 600),
      sourceAnchor: cleanString(item.sourceAnchor, "Source material", 120),
      studentRequiredAction: cleanString(item.studentRequiredAction, "Review and edit before studying.", 140),
    }))
    .filter((card) => card.front && card.back)
    .slice(0, 12);
  return cards.length > 0 ? cards : fallback;
}

function normalizePracticeSettings(value: unknown, fallback: PracticeTestSettings): PracticeTestSettings {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const questionCount = typeof raw.questionCount === "number"
    ? Math.max(1, Math.min(20, Math.round(raw.questionCount)))
    : fallback.questionCount;
  const difficulty = raw.difficulty === "light" || raw.difficulty === "challenge" || raw.difficulty === "standard"
    ? raw.difficulty
    : fallback.difficulty;
  const allowed = new Set(["short_response", "multiple_choice", "evidence_check", "application"]);
  const questionTypes = Array.isArray(raw.questionTypes)
    ? raw.questionTypes.filter((item): item is PracticeTestSettings["questionTypes"][number] => typeof item === "string" && allowed.has(item)).slice(0, 4)
    : fallback.questionTypes;
  return {
    questionCount,
    difficulty,
    questionTypes: questionTypes.length > 0 ? questionTypes : fallback.questionTypes,
  };
}

function normalizeEditState(value: unknown, fallback: ArtifactEditState): ArtifactEditState {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    cardsReviewed: typeof raw.cardsReviewed === "number" ? Math.max(0, Math.round(raw.cardsReviewed)) : fallback.cardsReviewed,
    cardsEdited: typeof raw.cardsEdited === "number" ? Math.max(0, Math.round(raw.cardsEdited)) : fallback.cardsEdited,
    lastEditedAt: typeof raw.lastEditedAt === "string" ? raw.lastEditedAt : fallback.lastEditedAt,
    readyForReview: typeof raw.readyForReview === "boolean" ? raw.readyForReview : fallback.readyForReview,
  };
}

function normalizeReviewLoop(value: unknown, fallback: ArtifactReviewLoop): ArtifactReviewLoop {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const currentStage = isStudyLoopStage(raw.currentStage) ? raw.currentStage : fallback.currentStage;
  const masterySignal = raw.masterySignal === "still_learning" || raw.masterySignal === "getting_there" || raw.masterySignal === "secure"
    ? raw.masterySignal
    : fallback.masterySignal;
  const steps = Array.isArray(raw.steps)
    ? raw.steps
      .map((item) => item as Record<string, unknown>)
      .map((item) => ({
        stage: isStudyLoopStage(item.stage) ? item.stage : "artifact",
        label: cleanString(item.label, "", 80),
        sourceAnchor: cleanString(item.sourceAnchor, "Source material", 120),
        studentAction: cleanString(item.studentAction, "Complete the next study action.", 180),
        masterySignal: cleanString(item.masterySignal, "Review result updates future support.", 180),
      }))
      .filter((step) => step.label)
      .slice(0, 6)
    : fallback.steps;

  return {
    currentStage,
    steps: steps.length > 0 ? steps : fallback.steps,
    nextReviewAction: cleanString(raw.nextReviewAction, fallback.nextReviewAction, 180),
    masterySignal,
    nextSupportUse: cleanString(raw.nextSupportUse, fallback.nextSupportUse, 220),
  };
}

function normalizeVisualBreakdown(value: unknown, fallback: VisualBreakdown | null): VisualBreakdown | null {
  if (!value || typeof value !== "object") return fallback;
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.blocks)) return fallback;
  const blocks = raw.blocks
    .map((item) => item as Record<string, unknown>)
    .map((item) => ({
      label: cleanString(item.label, "", 80),
      prompt: cleanString(item.prompt, "", 180),
      sourceAnchor: cleanString(item.sourceAnchor, "Source material", 120),
      studentAction: cleanString(item.studentAction, "Add one student-owned note.", 140),
    }))
    .filter((block) => block.label && block.prompt)
    .slice(0, 6);
  if (blocks.length === 0 || typeof raw.kind !== "string") return fallback;
  return {
    kind: raw.kind as VisualBreakdown["kind"],
    title: cleanString(raw.title, fallback?.title ?? "Visual breakdown", 120),
    sourceAnchored: blocks.every((block) => block.sourceAnchor.length > 0),
    blocks,
    quizPrompt: cleanString(raw.quizPrompt, fallback?.quizPrompt ?? "What should you remember from the source?", 220),
    storyboard: normalizeStoryboard(raw.storyboard, fallback?.storyboard, blocks),
  };
}

function normalizeAuthorshipReceipt(value: unknown, fallback: AuthorshipReceipt): AuthorshipReceipt {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    sourceAnchors: normalizeStringList(raw.sourceAnchors, fallback.sourceAnchors, 12, 120),
    dianaActions: normalizeStringList(raw.dianaActions, fallback.dianaActions, 6, 140),
    studentActions: normalizeStringList(raw.studentActions, fallback.studentActions, 6, 140),
    aiContribution: raw.aiContribution === "none" || raw.aiContribution === "organize" || raw.aiContribution === "hint" || raw.aiContribution === "practice" || raw.aiContribution === "draft_suggestion"
      ? raw.aiContribution
      : fallback.aiContribution,
    finalWorkProtected: typeof raw.finalWorkProtected === "boolean" ? raw.finalWorkProtected : fallback.finalWorkProtected,
    refusalRedirectLogged: typeof raw.refusalRedirectLogged === "boolean" ? raw.refusalRedirectLogged : fallback.refusalRedirectLogged,
    sensitiveDataExcluded: typeof raw.sensitiveDataExcluded === "boolean" ? raw.sensitiveDataExcluded : fallback.sensitiveDataExcluded,
    teacherSafeSummary: cleanString(raw.teacherSafeSummary, fallback.teacherSafeSummary, 260),
    studentActionRequired: cleanString(raw.studentActionRequired, fallback.studentActionRequired, 180),
    shareSummary: cleanString(raw.shareSummary, fallback.shareSummary, 240),
  };
}

function normalizeStoryboard(
  value: unknown,
  fallback: VisualBreakdown["storyboard"] | undefined,
  blocks: VisualBreakdown["blocks"],
): VisualBreakdown["storyboard"] {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const format = raw.format === "board" || raw.format === "timeline" || raw.format === "concept_map" || raw.format === "process_diagram" || raw.format === "compare_table" || raw.format === "card_stack"
    ? raw.format
    : fallback?.format ?? "board";
  return {
    format,
    layout: cleanString(raw.layout, fallback?.layout ?? "Source-linked study blocks.", 180),
    altText: cleanString(raw.altText, fallback?.altText ?? "Source-linked visual study support.", 220),
    sourceAnchors: normalizeStringList(raw.sourceAnchors, fallback?.sourceAnchors ?? blocks.map((block) => block.sourceAnchor), 6, 120),
    interactionPrompt: cleanString(raw.interactionPrompt, fallback?.interactionPrompt ?? "Choose one source-linked block and add a student note.", 180),
  };
}

function isStudyLoopStage(value: unknown): value is StudyLoopStage {
  return value === "source" ||
    value === "helper" ||
    value === "artifact" ||
    value === "review" ||
    value === "mastery" ||
    value === "next_support";
}

function normalizeStringList(value: unknown, fallback: string[], maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return fallback;
  const list = value
    .map((item) => cleanString(item, "", maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
  return list.length > 0 ? list : fallback;
}

function parseJson(raw: string): unknown {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function cleanString(value: unknown, fallback: string, maxLength: number): string {
  const text = typeof value === "string" ? value : fallback;
  return text.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function extractSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 24)
    .slice(0, 10);
}

function anchorLabel(sourceType: StudyArtifactSourceType, index: number): string {
  return sourceType === "assignment" ? `Assignment prompt sentence ${index}` : `Note paragraph ${index}`;
}

function sourceAnchorLabels(text: string, sourceType: StudyArtifactSourceType): string[] {
  const labels: string[] = [];
  const sections = text.split(/\n{2,}/).map((section) => section.trim()).filter(Boolean);
  sections.forEach((section, sectionIndex) => {
    const lower = section.toLowerCase();
    if (lower.startsWith("rubric:")) {
      const lineCount = section.split(/\r?\n/).filter((line) => line.trim()).length;
      for (let i = 1; i <= Math.max(1, Math.min(4, lineCount - 1)); i += 1) labels.push(`Rubric line ${i}`);
      return;
    }
    if (lower.startsWith("prompt:") || lower.startsWith("assignment:")) {
      const sentenceCount = extractSentences(section).length || 1;
      for (let i = 1; i <= Math.min(4, sentenceCount); i += 1) labels.push(`Assignment prompt sentence ${i}`);
      return;
    }
    if (lower.startsWith("note:")) {
      labels.push(`Note paragraph ${sectionIndex + 1}`);
      return;
    }
    labels.push(anchorLabel(sourceType, sectionIndex + 1));
  });
  return labels.length > 0 ? labels.slice(0, 12) : [anchorLabel(sourceType, 1)];
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "because",
  "before",
  "class",
  "could",
  "does",
  "from",
  "have",
  "into",
  "just",
  "like",
  "more",
  "must",
  "need",
  "notes",
  "only",
  "other",
  "read",
  "should",
  "that",
  "their",
  "them",
  "then",
  "there",
  "these",
  "this",
  "through",
  "what",
  "when",
  "where",
  "which",
  "with",
  "write",
  "your",
]);
