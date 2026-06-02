export type LanguageScaffoldMode =
  | "vocabulary"
  | "conjugation"
  | "reading"
  | "speaking"
  | "writing"
  | "culture";

export type VocabularyCard = {
  term: string;
  meaning: string;
  cognateHint: string | null;
  interestSentence: string;
  pronunciation: string | null;
};

export type ConjugationRow = {
  pronoun: string;
  prompt: string;
  example: string | null;
  studentHint: string | null;
};

export type LanguageReadingQuestion = {
  questionEnglish: string;
  answerFrameTarget: string;
};

export type SpeakingPrompt = {
  label: string;
  feedbackPrompt: string;
  practiceLine: string | null;
};

export type LanguageWritingSuggestion = {
  label: string;
  prompt: string;
  exampleFrame: string | null;
};

export type CultureCard = {
  title: string;
  context: string;
  comparePrompt: string;
};

export type LanguageScaffoldResult = {
  mode: LanguageScaffoldMode;
  targetLanguage: string;
  title: string;
  vocabularyCards: VocabularyCard[];
  conjugationRows: ConjugationRow[];
  readingQuestions: LanguageReadingQuestion[];
  speakingPrompts: SpeakingPrompt[];
  writingSuggestions: LanguageWritingSuggestion[];
  cultureCards: CultureCard[];
  checkPrompt: string;
};

export function parseLanguageScaffoldResponse(
  content: string,
  mode: LanguageScaffoldMode,
  targetLanguage: string,
): LanguageScaffoldResult {
  const json = extractJsonObject(content);
  if (!json) return fallbackLanguageScaffold(mode, targetLanguage);
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const fallback = fallbackLanguageScaffold(mode, targetLanguage);
    const vocabularyCards = normalizeVocabulary(parsed.vocabularyCards);
    const conjugationRows = normalizeConjugation(parsed.conjugationRows);
    const readingQuestions = normalizeReadingQuestions(parsed.readingQuestions);
    const speakingPrompts = normalizeSpeaking(parsed.speakingPrompts);
    const writingSuggestions = normalizeWriting(parsed.writingSuggestions);
    const cultureCards = normalizeCulture(parsed.cultureCards);
    return {
      mode,
      targetLanguage: stringOr(parsed.targetLanguage, targetLanguage),
      title: stringOr(parsed.title, fallback.title),
      vocabularyCards: vocabularyCards.length > 0 ? vocabularyCards : fallback.vocabularyCards,
      conjugationRows: conjugationRows.length > 0 ? conjugationRows : fallback.conjugationRows,
      readingQuestions: readingQuestions.length > 0 ? readingQuestions : fallback.readingQuestions,
      speakingPrompts: speakingPrompts.length > 0 ? speakingPrompts : fallback.speakingPrompts,
      writingSuggestions: writingSuggestions.length > 0 ? writingSuggestions : fallback.writingSuggestions,
      cultureCards: cultureCards.length > 0 ? cultureCards : fallback.cultureCards,
      checkPrompt: stringOr(parsed.checkPrompt, fallback.checkPrompt),
    };
  } catch {
    return fallbackLanguageScaffold(mode, targetLanguage);
  }
}

export function fallbackLanguageScaffold(
  mode: LanguageScaffoldMode,
  targetLanguage: string,
): LanguageScaffoldResult {
  return {
    mode,
    targetLanguage,
    title: titleForMode(mode, targetLanguage),
    vocabularyCards: mode === "vocabulary"
      ? [{
        term: "new word",
        meaning: "Add the meaning in English.",
        cognateHint: "Look for a familiar root or sound.",
        interestSentence: `Write one ${targetLanguage} sentence about something you like.`,
        pronunciation: null,
      }]
      : [],
    conjugationRows: mode === "conjugation"
      ? ["yo/I", "tú/you", "él/ella/he-she", "nosotros/we"].map((pronoun) => ({
        pronoun,
        prompt: `Fill the ${targetLanguage} verb form for ${pronoun}.`,
        example: null,
        studentHint: "Say the subject first, then listen for the ending.",
      }))
      : [],
    readingQuestions: mode === "reading"
      ? [
        { questionEnglish: "Who or what is this sentence about?", answerFrameTarget: "La frase trata de..." },
        { questionEnglish: "Which word gives the main action?", answerFrameTarget: "La acción es..." },
      ]
      : [],
    speakingPrompts: mode === "speaking"
      ? [
        { label: "Repeat", feedbackPrompt: "Which word should you say one more time slowly?", practiceLine: null },
        { label: "Phrase", feedbackPrompt: "Where could you pause to make the phrase clearer?", practiceLine: null },
      ]
      : [],
    writingSuggestions: mode === "writing"
      ? [
        { label: "Start", prompt: `Write one short sentence in ${targetLanguage}.`, exampleFrame: "I want to say..." },
        { label: "Check", prompt: "Underline the subject and verb.", exampleFrame: null },
      ]
      : [],
    cultureCards: mode === "culture"
      ? [{
        title: "Culture connection",
        context: "Connect one vocabulary word to a place, custom, food, song, sport, or daily routine.",
        comparePrompt: "What is similar or different from your own context?",
      }]
      : [],
    checkPrompt: "Try one short response before asking for another hint.",
  };
}

function normalizeVocabulary(value: unknown): VocabularyCard[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map((raw) => {
    const item = raw as Record<string, unknown>;
    return {
      term: stringOr(item.term, "").slice(0, 80),
      meaning: stringOr(item.meaning, "").slice(0, 180),
      cognateHint: nullableString(item.cognateHint),
      interestSentence: stringOr(item.interestSentence, "").slice(0, 220),
      pronunciation: nullableString(item.pronunciation),
    };
  }).filter((item) => item.term.length > 0 && item.meaning.length > 0);
}

function normalizeConjugation(value: unknown): ConjugationRow[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 10).map((raw, index) => {
    const item = raw as Record<string, unknown>;
    return {
      pronoun: stringOr(item.pronoun, `Form ${index + 1}`).slice(0, 80),
      prompt: stringOr(item.prompt, "").slice(0, 260),
      example: nullableString(item.example),
      studentHint: nullableString(item.studentHint),
    };
  }).filter((item) => item.prompt.length > 0);
}

function normalizeReadingQuestions(value: unknown): LanguageReadingQuestion[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map((raw) => {
    const item = raw as Record<string, unknown>;
    return {
      questionEnglish: stringOr(item.questionEnglish, "").slice(0, 260),
      answerFrameTarget: stringOr(item.answerFrameTarget, "").slice(0, 220),
    };
  }).filter((item) => item.questionEnglish.length > 0);
}

function normalizeSpeaking(value: unknown): SpeakingPrompt[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 6).map((raw, index) => {
    const item = raw as Record<string, unknown>;
    return {
      label: stringOr(item.label, `Practice ${index + 1}`).slice(0, 80),
      feedbackPrompt: stringOr(item.feedbackPrompt, "").slice(0, 260),
      practiceLine: nullableString(item.practiceLine),
    };
  }).filter((item) => item.feedbackPrompt.length > 0);
}

function normalizeWriting(value: unknown): LanguageWritingSuggestion[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map((raw, index) => {
    const item = raw as Record<string, unknown>;
    return {
      label: stringOr(item.label, `Move ${index + 1}`).slice(0, 80),
      prompt: stringOr(item.prompt, "").slice(0, 280),
      exampleFrame: nullableString(item.exampleFrame),
    };
  }).filter((item) => item.prompt.length > 0);
}

function normalizeCulture(value: unknown): CultureCard[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 6).map((raw, index) => {
    const item = raw as Record<string, unknown>;
    return {
      title: stringOr(item.title, `Culture ${index + 1}`).slice(0, 100),
      context: stringOr(item.context, "").slice(0, 260),
      comparePrompt: stringOr(item.comparePrompt, "").slice(0, 220),
    };
  }).filter((item) => item.context.length > 0);
}

function titleForMode(mode: LanguageScaffoldMode, targetLanguage: string): string {
  return mode === "vocabulary"
    ? `${targetLanguage} vocabulary`
    : mode === "conjugation"
    ? `${targetLanguage} conjugation`
    : mode === "reading"
    ? `${targetLanguage} reading`
    : mode === "speaking"
    ? `${targetLanguage} speaking`
    : mode === "writing"
    ? `${targetLanguage} writing`
    : `${targetLanguage} culture`;
}

function extractJsonObject(content: string): string | null {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  return content.slice(start, end + 1);
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
