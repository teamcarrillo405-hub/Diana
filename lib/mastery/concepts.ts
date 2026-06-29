import { normalizeNoteTags } from "@/lib/notes/tags";

const FALLBACK_CONCEPTS = [
  "key vocabulary",
  "main ideas",
  "worked examples",
  "review questions",
  "study strategy",
];

const SUBJECT_FALLBACKS: Array<{ pattern: RegExp; concepts: string[] }> = [
  {
    pattern: /\b(english|ela|literature|writing|reading)\b/i,
    concepts: ["claim evidence reasoning", "quote selection", "theme tracking", "paragraph structure", "citation setup"],
  },
  {
    pattern: /\b(algebra|math|geometry|calculus)\b/i,
    concepts: ["equation setup", "inverse operations", "slope intercept form", "graph interpretation", "answer checking"],
  },
  {
    pattern: /\b(biology|science|chemistry|physics)\b/i,
    concepts: ["cell organelles", "structure and function", "visual evidence", "lab reasoning", "science vocabulary"],
  },
  {
    pattern: /\b(history|civics|government|world)\b/i,
    concepts: ["cause and effect", "map recall", "source notes", "timeline context", "unit vocabulary"],
  },
  {
    pattern: /\b(spanish|french|latin|language)\b/i,
    concepts: ["pronunciation practice", "verb forms", "greetings", "unit vocabulary", "sentence patterns"],
  },
  {
    pattern: /\b(health|wellness|physical education|\bpe\b|\bp\.e\.)\b/i,
    concepts: ["wellness routines", "nutrition labels", "recovery and sleep", "reflection notes", "activity evidence"],
  },
  {
    pattern: /\b(digital|media|design|canva|art)\b/i,
    concepts: ["visual hierarchy", "source credit", "project brief", "export format", "digital citizenship"],
  },
];

const STOP_WORDS = new Set([
  "about",
  "accepted",
  "after",
  "again",
  "also",
  "assignment",
  "available",
  "because",
  "before",
  "class",
  "complete",
  "current",
  "diana",
  "format",
  "from",
  "gather",
  "grayson",
  "have",
  "homework",
  "into",
  "needs",
  "notes",
  "office",
  "preferred",
  "requirements",
  "rubric",
  "school",
  "student",
  "teacher",
  "that",
  "their",
  "there",
  "they",
  "this",
  "today",
  "wants",
  "with",
]);

const STOP_PHRASES = [
  /\b(ms|mr|mrs|dr|coach|senora)\b/i,
  /\bteacher gather\b/i,
  /\bstudent gather\b/i,
  /\bdiana use\b/i,
  /\bcurrent unit\b/i,
  /\boffice hours\b/i,
  /\bpreferred submission\b/i,
  /\bsubmission format\b/i,
  /\bteacher wants\b/i,
];

type ConceptSeedOptions = {
  className?: string | null;
  teacherName?: string | null;
};

export function deriveConceptSeeds(
  parts: string[],
  minCount = 5,
  options: ConceptSeedOptions = {},
): string[] {
  const subjectFallbacks = fallbackConceptsForClass(options.className);
  const teacherTokens = tokensFrom(options.teacherName ?? "");
  const classTokens = tokensFrom(options.className ?? "");

  const tagSeeds = normalizeNoteTags(parts.flatMap((part) => part.split(/[,\n;]/)), 18)
    .map((tag) => tag.replace(/-/g, " "))
    .filter((tag) => isUsefulConcept(tag, teacherTokens, classTokens));

  const phraseSeeds = rankedPhrases(parts, teacherTokens, classTokens);
  const wordSeeds = rankedWords(parts, teacherTokens, classTokens);

  const seeds = normalizeConceptNames([
    ...subjectFallbacks,
    ...tagSeeds,
    ...phraseSeeds,
    ...wordSeeds,
    ...FALLBACK_CONCEPTS,
  ]);
  return seeds.slice(0, Math.max(minCount, Math.min(10, seeds.length)));
}

export function fallbackConceptsForClass(className?: string | null): string[] {
  const name = className ?? "";
  return SUBJECT_FALLBACKS.find((entry) => entry.pattern.test(name))?.concepts ?? FALLBACK_CONCEPTS;
}

export function isWeakConceptName(
  name: string,
  options: ConceptSeedOptions = {},
): boolean {
  const cleaned = cleanConceptName(name);
  if (!cleaned) return true;
  if (FALLBACK_CONCEPTS.includes(cleaned)) return true;
  const teacherTokens = tokensFrom(options.teacherName ?? "");
  const classTokens = tokensFrom(options.className ?? "");
  return !isUsefulConcept(cleaned, teacherTokens, classTokens);
}

export function normalizeConceptNames(names: string[]): string[] {
  const seen = new Set<string>();
  const concepts: string[] = [];
  for (const name of names) {
    const cleaned = cleanConceptName(name);
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    concepts.push(cleaned);
  }
  return concepts;
}

export function masteryLevelFromCorrectReviews(correctReviewCount: number): number {
  return Math.min(4, Math.floor(Math.max(0, correctReviewCount) / 3));
}

export function masteryLevelFromAiQuizResult(currentLevel: number, quizRating: number): number {
  const current = clampMastery(currentLevel);
  const target = clampMastery(quizRating);
  if (target > current) {
    return roundMastery(current + Math.min(1, target - current));
  }
  if (target < current) {
    return roundMastery(current - Math.min(0.5, current - target));
  }
  return roundMastery(current);
}

export function gapBridgeSuggestion(strongConcept: string | null, reviewConcept: string): string {
  if (strongConcept && strongConcept !== reviewConcept) {
    return `Use what feels steady in ${strongConcept} to revisit ${reviewConcept}.`;
  }
  return `Start with one small example for ${reviewConcept}.`;
}

function rankedPhrases(parts: string[], teacherTokens: Set<string>, classTokens: Set<string>) {
  const counts = new Map<string, number>();
  for (const part of parts) {
    const words = Array.from(tokensFrom(part, true));
    for (const size of [3, 2]) {
      for (let index = 0; index <= words.length - size; index += 1) {
        const phrase = words.slice(index, index + size).join(" ");
        if (!isUsefulConcept(phrase, teacherTokens, classTokens)) continue;
        counts.set(phrase, (counts.get(phrase) ?? 0) + size);
      }
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([phrase]) => phrase);
}

function rankedWords(parts: string[], teacherTokens: Set<string>, classTokens: Set<string>) {
  const counts = new Map<string, number>();
  for (const part of parts) {
    for (const word of tokensFrom(part, true)) {
      if (!isUsefulConcept(word, teacherTokens, classTokens)) continue;
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([word]) => word);
}

function isUsefulConcept(raw: string, teacherTokens: Set<string>, classTokens: Set<string>) {
  const cleaned = cleanConceptName(raw);
  if (!cleaned) return false;
  if (STOP_PHRASES.some((pattern) => pattern.test(cleaned))) return false;
  const words = cleaned.split(" ");
  if (words.some((word) => STOP_WORDS.has(word) || teacherTokens.has(word))) return false;
  const meaningful = words.filter((word) => !classTokens.has(word));
  if (meaningful.length === 0) return false;
  if (meaningful.length === 1 && meaningful[0].length < 5) return false;
  return true;
}

function cleanConceptName(name: string) {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/-+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length < 3 || cleaned.length > 48) return "";
  return cleaned;
}

function tokensFrom(value: string, includeStopWords = false) {
  const tokens = new Set<string>();
  for (const token of value.toLowerCase().match(/[a-z][a-z0-9]{1,}/g) ?? []) {
    if (!includeStopWords && STOP_WORDS.has(token)) continue;
    tokens.add(token);
  }
  return tokens;
}

function clampMastery(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(4, value));
}

function roundMastery(value: number): number {
  return Math.round(clampMastery(value) * 4) / 4;
}
