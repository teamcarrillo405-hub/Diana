import { RETRIEVAL_VERSION, type CurriculumChunk, type RetrievalResult } from "./contracts";
import { curriculumSkills } from "./curriculum";

const STOP = new Set(["the", "and", "for", "this", "that", "with", "what", "how", "can", "you", "please", "help"]);
export function queryTerms(query: string): string[] {
  return [...new Set((query.slice(0, 1000).toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])
    .filter((term) => term.length > 1 && !STOP.has(term)))].slice(0, 40);
}

// Chat directives are not source claims. Retry an empty AND search without these
// words, retaining every subject term (never widening to OR or another assignment).
const DIRECTIVES = new Set(['compare', 'explain', 'describe', 'summarize', 'discuss', 'tell', 'give', 'show', 'me']);
export function lexicalDirectiveFallback(query: string): string | null {
  // Respect explicit websearch operators/phrases; tokenization cannot preserve them.
  if (/["'\-]/u.test(query) || /\bor\b/iu.test(query)) return null;
  const words = query.slice(0, 1000).toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const first = words.findIndex(word => !STOP.has(word));
  if (first < 0 || !DIRECTIVES.has(words[first])) return null;
  const terms = [...new Set(words.filter((word, index) => {
    const directive = index === first || (words[index - 1] === 'and' && DIRECTIVES.has(word));
    return !directive && !STOP.has(word);
  }))];
  return terms.length && terms.length <= 40 ? terms.join(' ') : null;
}

function documentTerms(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
}

export type RetrievalScope = {
  ownerId: string;
  assignmentId: string;
  classId: string | null;
  versionIds: string[];
  problemNumber?: string | null;
};

/** ACL and assigned versions are filtered before ranking, including semantic candidates. */
export function retrieveCurriculum(
  query: string,
  chunks: CurriculumChunk[],
  scope: RetrievalScope,
  semanticIds: string[] = [],
  lexicalIds?: string[],
): RetrievalResult {
  const terms = queryTerms(query);
  const skills = curriculumSkills(query);
  const eligible = chunks.filter((chunk) => chunk.ownerId === scope.ownerId
    && scope.versionIds.includes(chunk.versionId)
    && (chunk.assignmentId === scope.assignmentId
      || (chunk.assignmentId === null && scope.classId !== null && chunk.classId === scope.classId)));
  const lexical = eligible.map((chunk) => {
    const words = documentTerms(chunk.text);
    const score = terms.reduce((total, term) => total + (words.has(term) ? 1 : 0), 0)
      + skills.filter((skill) => chunk.skillIds.includes(skill)).length;
    return { chunk, score };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || a.chunk.id.localeCompare(b.chunk.id)).slice(0, 20);
  const semantic = [...new Set(semanticIds)].filter((id) => eligible.some((chunk) => chunk.id === id)).slice(0, 20);
  const scores = new Map<string, number>();
  // A numbered problem is an exact source lookup even when its terms are absent
  // from the prose query or its embedding falls below the similarity threshold.
  if(scope.problemNumber)for(const chunk of eligible){
    if(chunk.problemNumber===scope.problemNumber)scores.set(chunk.id,1);
  }
  const lexicalRanking = lexicalIds
    ? [...new Set(lexicalIds)].filter((id) => eligible.some((chunk) => chunk.id === id)).slice(0, 20)
    : lexical.map((item) => item.chunk.id);
  for (const ranking of [lexicalRanking, semantic]) {
    ranking.forEach((id, index) => scores.set(id, (scores.get(id) ?? 0) + 1 / (60 + index + 1)));
  }
  const ranked = eligible.filter((chunk) => scores.has(chunk.id)).map((chunk) => ({
    ...chunk, score: scores.get(chunk.id) ?? 0,
  })).sort((a, b) => {
    const priority = (chunk: CurriculumChunk) => Number(chunk.assignmentId === scope.assignmentId) * 2
      + Number(!!scope.problemNumber && chunk.problemNumber === scope.problemNumber);
    return priority(b) - priority(a) || b.score - a.score || a.id.localeCompare(b.id);
  }).slice(0, 6);
  return { version: RETRIEVAL_VERSION, status: ranked.length ? "matched" : "no_evidence", method: semantic.length ? "hybrid" : "keyword", chunks: ranked };
}
