import { normalizeNoteTags } from "./tags";

export type RelatedNoteCandidate = {
  id: string;
  title: string;
  body_text: string;
  transcript_text: string | null;
  class_id: string | null;
  tags: string[];
  ai_suggested_tags: string[];
  updated_at: string;
};

export type RelatedNote = {
  id: string;
  title: string;
  snippet: string;
  score: number;
};

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
  "into",
  "notes",
  "that",
  "their",
  "there",
  "they",
  "this",
  "with",
]);

export function noteTokens(note: Pick<RelatedNoteCandidate, "title" | "body_text" | "transcript_text" | "tags" | "ai_suggested_tags">): Set<string> {
  const text = [
    note.title,
    note.body_text,
    note.transcript_text ?? "",
    ...normalizeNoteTags([...(note.tags ?? []), ...(note.ai_suggested_tags ?? [])]),
  ].join(" ");

  return new Set(
    (text.toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) ?? [])
      .filter((token) => !STOP_WORDS.has(token)),
  );
}

export function scoreRelatedNote(current: RelatedNoteCandidate, candidate: RelatedNoteCandidate): number {
  if (current.id === candidate.id) return 0;

  const currentTokens = noteTokens(current);
  const candidateTokens = noteTokens(candidate);
  let overlap = 0;
  for (const token of candidateTokens) {
    if (currentTokens.has(token)) overlap += 1;
  }

  const currentTags = new Set(normalizeNoteTags([...(current.tags ?? []), ...(current.ai_suggested_tags ?? [])]));
  const candidateTags = normalizeNoteTags([...(candidate.tags ?? []), ...(candidate.ai_suggested_tags ?? [])]);
  const tagOverlap = candidateTags.filter((tag) => currentTags.has(tag)).length;
  const classBoost = current.class_id && current.class_id === candidate.class_id ? 2 : 0;

  return overlap + tagOverlap * 3 + classBoost;
}

export function findRelatedNotes(current: RelatedNoteCandidate, candidates: RelatedNoteCandidate[], limit = 5): RelatedNote[] {
  return candidates
    .map((candidate) => ({
      id: candidate.id,
      title: candidate.title,
      snippet: snippetForQuery(candidate.transcript_text || candidate.body_text || candidate.title, [...noteTokens(current)].slice(0, 5).join(" ")),
      score: scoreRelatedNote(current, candidate),
    }))
    .filter((note) => note.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}

export function snippetForQuery(text: string, query: string, maxLength = 150): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;

  const terms = query.toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) ?? [];
  const lower = clean.toLowerCase();
  const hit = terms.map((term) => lower.indexOf(term)).find((idx) => idx >= 0) ?? -1;
  const start = hit >= 0 ? Math.max(0, hit - 45) : 0;
  const snippet = clean.slice(start, start + maxLength).trim();
  return `${start > 0 ? "... " : ""}${snippet}${start + maxLength < clean.length ? " ..." : ""}`;
}
