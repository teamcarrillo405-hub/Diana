import type { Tables } from "@/lib/supabase/types";

/** Persisted note row (matches public.notes). */
export interface Note {
  id: string;
  ownerId: string;
  assignmentId: string | null;
  title: string;
  bodyText: string;
  audioStorageKey: string | null;
  transcriptText: string | null;
  outlineJson: OutlineNode[] | null;
  createdAt: string;
  updatedAt: string;
}

/** AI-generated outline node (stored as outline_json[]). */
export interface OutlineNode {
  heading: string;
  bullets: string[];
}

/** Persisted flashcard row (matches public.flashcards). */
export interface Flashcard {
  id: string;
  ownerId: string;
  sourceNoteId: string | null;
  front: string;
  back: string;
  imageStorageKey: string | null;
  state: FsrsState;
  stability: number;
  difficulty: number;
  dueAt: string;
  reps: number;
  lapses: number;
  lastReviewAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Review log row (matches public.flashcard_reviews). */
export interface FlashcardReview {
  id: number;
  cardId: string;
  ownerId: string;
  rating: Rating;
  scheduledFor: string;
  reviewedAt: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: FsrsState;
}

export type FsrsState = "new" | "learning" | "review" | "relearning";

/** FSRS rating values per F12 — 1=Again, 2=Hard, 3=Good, 4=Easy. */
export type Rating = 1 | 2 | 3 | 4;

/** Compile-time check that camelCase aliases stay in sync with DB rows. */
type _NoteRowCheck = Tables<"notes">;
type _FlashcardRowCheck = Tables<"flashcards">;
type _FlashcardReviewRowCheck = Tables<"flashcard_reviews">;
