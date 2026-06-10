// OpenStax — free, CC-licensed, peer-reviewed textbooks (openstax.org).
// Free competitor-ecosystem adoption: aligned reading without AI generation
// cost, and citable in student work. Matching is deterministic keyword
// matching on the class name — no AI call, no network.

export type OpenStaxBook = {
  title: string;
  url: string;
  /** Lowercase keywords matched against the class name. */
  keywords: string[];
};

export const OPENSTAX_BOOKS: OpenStaxBook[] = [
  { title: "Biology for AP Courses", url: "https://openstax.org/details/books/biology-ap-courses", keywords: ["biology", "bio"] },
  { title: "Chemistry 2e", url: "https://openstax.org/details/books/chemistry-2e", keywords: ["chemistry", "chem"] },
  { title: "Physics", url: "https://openstax.org/details/books/physics", keywords: ["physics"] },
  { title: "Anatomy and Physiology 2e", url: "https://openstax.org/details/books/anatomy-and-physiology-2e", keywords: ["anatomy", "physiology"] },
  { title: "Astronomy 2e", url: "https://openstax.org/details/books/astronomy-2e", keywords: ["astronomy", "space science"] },
  { title: "Elementary Algebra 2e", url: "https://openstax.org/details/books/elementary-algebra-2e", keywords: ["algebra 1", "elementary algebra"] },
  { title: "Intermediate Algebra 2e", url: "https://openstax.org/details/books/intermediate-algebra-2e", keywords: ["algebra 2", "algebra ii", "intermediate algebra", "algebra"] },
  { title: "Precalculus 2e", url: "https://openstax.org/details/books/precalculus-2e", keywords: ["precalculus", "precalc", "pre-calculus"] },
  { title: "Calculus Volume 1", url: "https://openstax.org/details/books/calculus-volume-1", keywords: ["calculus", "calc ab", "calc bc"] },
  { title: "Introductory Statistics 2e", url: "https://openstax.org/details/books/introductory-statistics-2e", keywords: ["statistics", "stats"] },
  { title: "Geometry", url: "https://openstax.org/subjects/math", keywords: ["geometry"] },
  { title: "U.S. History", url: "https://openstax.org/details/books/us-history", keywords: ["us history", "u.s. history", "american history", "apush"] },
  { title: "World History Volume 2", url: "https://openstax.org/details/books/world-history-volume-2", keywords: ["world history", "global history"] },
  { title: "American Government 3e", url: "https://openstax.org/details/books/american-government-3e", keywords: ["government", "civics", "gov"] },
  { title: "Principles of Economics 3e", url: "https://openstax.org/details/books/principles-economics-3e", keywords: ["economics", "econ", "macro", "micro"] },
  { title: "Psychology 2e", url: "https://openstax.org/details/books/psychology-2e", keywords: ["psychology", "psych"] },
  { title: "Introduction to Sociology 3e", url: "https://openstax.org/details/books/introduction-sociology-3e", keywords: ["sociology"] },
  { title: "Writing Guide with Handbook", url: "https://openstax.org/details/books/writing-guide", keywords: ["english", "writing", "composition", "ela", "language arts", "literature"] },
];

const MAX_MATCHES = 2;

/** Free textbooks that plausibly match a class, best matches first. */
export function openStaxForClassName(className: string | null | undefined): OpenStaxBook[] {
  if (!className) return [];
  const haystack = className.toLowerCase();
  const matches: Array<{ book: OpenStaxBook; keywordLength: number }> = [];
  for (const book of OPENSTAX_BOOKS) {
    const hit = book.keywords.find((keyword) => haystack.includes(keyword));
    if (hit) matches.push({ book, keywordLength: hit.length });
  }
  // Longer keyword = more specific match ("algebra 2" beats "algebra").
  return matches
    .sort((a, b) => b.keywordLength - a.keywordLength)
    .slice(0, MAX_MATCHES)
    .map((m) => m.book);
}
