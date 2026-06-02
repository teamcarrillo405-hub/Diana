import { normalizeNoteTags } from "@/lib/notes/tags";

const FALLBACK_CONCEPTS = [
  "key vocabulary",
  "main ideas",
  "worked examples",
  "review questions",
  "study strategy",
];

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "because",
  "before",
  "class",
  "from",
  "have",
  "homework",
  "into",
  "notes",
  "that",
  "their",
  "there",
  "they",
  "this",
  "with",
]);

export function deriveConceptSeeds(parts: string[], minCount = 5): string[] {
  const tagSeeds = normalizeNoteTags(parts.flatMap((part) => part.split(/[,\n;]/)), 12)
    .map((tag) => tag.replace(/-/g, " "));

  const counts = new Map<string, number>();
  for (const part of parts) {
    for (const raw of part.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) ?? []) {
      if (STOP_WORDS.has(raw)) continue;
      counts.set(raw, (counts.get(raw) ?? 0) + 1);
    }
  }

  const wordSeeds = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([word]) => word);

  const seeds = normalizeConceptNames([...tagSeeds, ...wordSeeds, ...FALLBACK_CONCEPTS]);
  return seeds.slice(0, Math.max(minCount, Math.min(10, seeds.length)));
}

export function normalizeConceptNames(names: string[]): string[] {
  const seen = new Set<string>();
  const concepts: string[] = [];
  for (const name of names) {
    const cleaned = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, "")
      .replace(/\s+/g, " ")
      .replace(/-+/g, " ")
      .trim();
    if (cleaned.length < 3 || cleaned.length > 48 || seen.has(cleaned)) continue;
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

function clampMastery(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(4, value));
}

function roundMastery(value: number): number {
  return Math.round(clampMastery(value) * 4) / 4;
}
