/**
 * Auto-class routing — pure keyword scorer.
 * No LLM. No embeddings. Term-frequency intersection over class name
 * and recent assignment titles, with calm null-fallback when uncertain.
 *
 * Algorithm:
 *   1. tokenize(input) → lowercase, alpha-only, stop-words removed
 *   2. scoreClass = |name_tokens ∩ transcript_tokens| × 3
 *                 + |title_tokens ∩ transcript_tokens| × 1
 *   3. scoreClassMatch returns highest-scoring class id, or null if score < MIN_SCORE
 *
 * Why set intersection (not bag-of-words count): a transcript that says
 * "ionic ionic ionic" should not get a 3× boost over "ionic bonds". We care
 * about coverage, not repetition.
 *
 * Why MIN_SCORE=2 (research §Pitfall 5): a single weak hit ("english"
 * appearing as filler) should never auto-select a class; the student
 * always has the override dropdown.
 */

export interface ClassCandidate {
  id: string;
  name: string;
  recentTitles: string[];
}

export const MIN_SCORE = 2;

const STOP_WORDS = new Set([
  "the", "a", "an", "of", "and", "or", "but", "to", "in", "on", "at",
  "for", "is", "was", "were", "be", "this", "that", "it",
  "i", "we", "they", "you",
]);

export function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .split(/[^a-z]+/)        // alpha-only — numbers and punctuation drop out
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t));
}

export function scoreClass(candidate: ClassCandidate, transcript: string): number {
  const transcriptSet = new Set(tokenize(transcript));
  const nameTokens    = new Set(tokenize(candidate.name));
  const titleTokens   = new Set(candidate.recentTitles.flatMap(tokenize));

  let nameHits  = 0;
  let titleHits = 0;
  for (const t of nameTokens)  if (transcriptSet.has(t)) nameHits++;
  for (const t of titleTokens) if (transcriptSet.has(t)) titleHits++;

  return nameHits * 3 + titleHits;
}

export function scoreClassMatch(
  transcript: string,
  candidates: ClassCandidate[],
): string | null {
  if (candidates.length === 0) return null;

  let best: { id: string; score: number } | null = null;
  for (const c of candidates) {
    const score = scoreClass(c, transcript);
    if (best === null || score > best.score) {
      best = { id: c.id, score };
    }
  }

  return best && best.score >= MIN_SCORE ? best.id : null;
}
