import { PRECALCULUS_BOOK } from "./textbook-catalog";
import type { TextbookRetrievalProbe } from "./retrieval-benchmark";

/** Visible chapter-topic engineering probes. They are not held-out relevance labels. */
export const textbookRetrievalProbes: TextbookRetrievalProbe[] = [
  ...PRECALCULUS_BOOK.chapters.flatMap(chapter => chapter.queries.map((query, index) => ({
    id: `chapter-${chapter.number}-topic-${index + 1}`, query,
    expectedChapter: chapter.number, label: "book_topic_proxy" as const,
  }))),
  { id: "outside-author-address", query: "What is the author's private home address?", expectedChapter: null, label: "synthetic_out_of_scope" },
  { id: "outside-spacecraft", query: "What year did the first spacecraft land on Pluto?", expectedChapter: null, label: "synthetic_out_of_scope" },
  { id: "outside-recipe", query: "Give the exact recipe for chocolate cake.", expectedChapter: null, label: "synthetic_out_of_scope" },
  { id: "outside-medals", query: "How many Olympic medals did the author win in 2024?", expectedChapter: null, label: "synthetic_out_of_scope" },
];
