import type { StudyHelperMode } from "./modes";

export type StudyArtifactSourceType = "assignment" | "note";
export type StudyArtifactType = "study_guide" | "practice_test" | "flashcard_set";

export type StudyArtifactCard = {
  front: string;
  back: string;
  sourceAnchor: string;
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
  const summary = anchors.slice(0, 3).join(" ");
  const cards = terms.slice(0, 8).map((term, index) => ({
    front: `Explain ${term}`,
    back: anchors[index % anchors.length] ?? `Use your notes to define ${term}.`,
    sourceAnchor: anchorLabel(input.sourceType, index + 1),
  }));

  const quiz = anchors.slice(0, 5).map((sentence, index) => {
    const term = terms[index % Math.max(terms.length, 1)] ?? "this idea";
    return {
      question: `What does the material say about ${term}?`,
      choices: [],
      answer: sentence,
      hint: "Use the source line before opening more help.",
      sourceAnchor: anchorLabel(input.sourceType, index + 1),
    };
  });

  return {
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
    }))
    .filter((card) => card.front && card.back)
    .slice(0, 12);
  return cards.length > 0 ? cards : fallback;
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
  return sourceType === "assignment" ? `Assignment line ${index}` : `Note line ${index}`;
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
