export type PhonicsBreakdown = {
  syllables: string[];
  stress: string;
  pronunciation: string;
};

export type VocabSupport = {
  definition: string;
  contextClue: string;
  phonics: PhonicsBreakdown;
};

const WORD_RE = /^[a-zA-Z][a-zA-Z'-]{0,31}$/;
const VOWEL_RE = /[aeiouy]/i;

export function validVocabularyWord(value: string): boolean {
  return WORD_RE.test(value.trim());
}

export function normalizeVocabularyWord(value: string): string {
  return value.trim().replace(/^[^a-zA-Z]+|[^a-zA-Z'-]+$/g, "").slice(0, 32);
}

export function buildContextClue(word: string, context: string): string {
  const cleanWord = normalizeVocabularyWord(word);
  const sentence = context
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .find((part) => part.toLowerCase().includes(cleanWord.toLowerCase()))
    ?? context.replace(/\s+/g, " ").slice(0, 160);
  if (!sentence.trim()) {
    return `Look at the words around "${cleanWord}" before opening the definition.`;
  }
  return `Context clue: in "${sentence.trim().slice(0, 140)}", notice what ${cleanWord} is doing in the sentence.`;
}

export function phonicsBreakdown(word: string): PhonicsBreakdown {
  const cleanWord = normalizeVocabularyWord(word).toLowerCase();
  if (!cleanWord) return { syllables: [], stress: "Say it slowly once.", pronunciation: "" };

  const syllables = splitSyllables(cleanWord);
  const stressIndex = syllables.length > 2 ? 1 : 0;
  const pronunciation = syllables
    .map((part, index) => (index === stressIndex ? part.toUpperCase() : part))
    .join("-");

  return {
    syllables,
    stress: `Stress ${syllables[stressIndex] ?? cleanWord}.`,
    pronunciation,
  };
}

export function parseVocabSupport(raw: unknown, word: string, context: string): VocabSupport {
  const fallback = fallbackVocabSupport(word, context);
  if (!raw || typeof raw !== "object") return fallback;
  const obj = raw as Record<string, unknown>;
  const definition = typeof obj.definition === "string" && obj.definition.trim()
    ? obj.definition.trim().slice(0, 360)
    : fallback.definition;
  const contextClue = typeof obj.contextClue === "string" && obj.contextClue.trim()
    ? obj.contextClue.trim().slice(0, 280)
    : fallback.contextClue;
  const phonics = parsePhonics(obj.phonics, word);
  return { definition, contextClue, phonics };
}

export function fallbackVocabSupport(word: string, context: string): VocabSupport {
  const cleanWord = normalizeVocabularyWord(word);
  return {
    definition: `A class word to define from the surrounding sentence: ${cleanWord}.`,
    contextClue: buildContextClue(cleanWord, context),
    phonics: phonicsBreakdown(cleanWord),
  };
}

export function adaptReadingLevelFallback(text: string, target: "simpler" | "more_detail"): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (target === "more_detail") {
    return `${trimmed}\n\nFocus points: name the main idea, circle two key terms, and connect one detail back to the assignment.`;
  }
  return trimmed
    .split(/(?<=[.!?])\s+/)
    .slice(0, 8)
    .map((sentence) => sentence.length > 140 ? `${sentence.slice(0, 137).trim()}...` : sentence)
    .join("\n");
}

function parsePhonics(raw: unknown, word: string): PhonicsBreakdown {
  const fallback = phonicsBreakdown(word);
  if (!raw || typeof raw !== "object") return fallback;
  const obj = raw as Record<string, unknown>;
  const syllables = Array.isArray(obj.syllables)
    ? obj.syllables.filter((part): part is string => typeof part === "string" && part.trim().length > 0).slice(0, 8)
    : fallback.syllables;
  return {
    syllables: syllables.length > 0 ? syllables : fallback.syllables,
    stress: typeof obj.stress === "string" && obj.stress.trim() ? obj.stress.trim().slice(0, 120) : fallback.stress,
    pronunciation: typeof obj.pronunciation === "string" && obj.pronunciation.trim()
      ? obj.pronunciation.trim().slice(0, 120)
      : fallback.pronunciation,
  };
}

function splitSyllables(word: string): string[] {
  const letters = word.replace(/[^a-z'-]/g, "");
  if (letters.length <= 4) return [letters];
  const chunks: string[] = [];
  let current = "";
  for (let index = 0; index < letters.length; index += 1) {
    current += letters[index];
    const next = letters[index + 1] ?? "";
    const nextNext = letters[index + 2] ?? "";
    if (
      current.length >= 2 &&
      VOWEL_RE.test(current) &&
      next &&
      !VOWEL_RE.test(next) &&
      nextNext &&
      VOWEL_RE.test(nextNext)
    ) {
      chunks.push(current);
      current = "";
    }
  }
  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [letters];
}
