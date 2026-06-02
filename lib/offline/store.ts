import { del, get, keys, set } from "idb-keyval";

const NOTE_PREFIX = "diana-offline:note:";
const ASSIGNMENT_PREFIX = "diana-offline:assignment:";
const FLASHCARD_PREFIX = "diana-offline:flashcard:";
const FLASHCARD_CACHE_PREFIX = "diana-offline:flashcard-cache:";
const SYNC_TAG = "diana-offline-sync";

export type OfflineNoteSave = {
  tempId: string;
  noteId: string | null;
  title: string;
  bodyText: string;
  classId: string | null;
  assignmentId: string | null;
  source: "manual" | "voice" | "audio_upload" | "doc_upload" | "lecture";
  updatedAt: string;
};

export type OfflineAssignmentStatus = {
  tempId: string;
  assignmentId: string;
  from: string;
  to: string;
  queuedAt: string;
};

export type OfflineFlashcardReview = {
  tempId: string;
  cardId: string;
  rating: 1 | 2 | 3 | 4;
  queuedAt: string;
};

export type OfflineFlashcardSnapshot = {
  id: string;
  front: string;
  back: string;
  state: string;
  stability: number;
  difficulty: number;
  dueAt: string;
  reps: number;
  lapses: number;
  lastReviewAt: string | null;
};

export async function queueOfflineNoteSave(item: OfflineNoteSave): Promise<void> {
  await set(`${NOTE_PREFIX}${item.tempId}`, item);
}

export async function getOfflineNoteSaves(): Promise<OfflineNoteSave[]> {
  return readPrefix<OfflineNoteSave>(NOTE_PREFIX);
}

export async function removeOfflineNoteSave(tempId: string): Promise<void> {
  await del(`${NOTE_PREFIX}${tempId}`);
}

export async function queueOfflineAssignmentStatus(item: OfflineAssignmentStatus): Promise<void> {
  await set(`${ASSIGNMENT_PREFIX}${item.tempId}`, item);
}

export async function getOfflineAssignmentStatuses(): Promise<OfflineAssignmentStatus[]> {
  return readPrefix<OfflineAssignmentStatus>(ASSIGNMENT_PREFIX);
}

export async function removeOfflineAssignmentStatus(tempId: string): Promise<void> {
  await del(`${ASSIGNMENT_PREFIX}${tempId}`);
}

export async function queueOfflineFlashcardReview(item: OfflineFlashcardReview): Promise<void> {
  await set(`${FLASHCARD_PREFIX}${item.tempId}`, item);
}

export async function getOfflineFlashcardReviews(): Promise<OfflineFlashcardReview[]> {
  return readPrefix<OfflineFlashcardReview>(FLASHCARD_PREFIX);
}

export async function removeOfflineFlashcardReview(tempId: string): Promise<void> {
  await del(`${FLASHCARD_PREFIX}${tempId}`);
}

export async function cacheOfflineFlashcards(deckKey: string, cards: OfflineFlashcardSnapshot[]): Promise<void> {
  await set(`${FLASHCARD_CACHE_PREFIX}${deckKey}`, {
    cachedAt: new Date().toISOString(),
    cards,
  });
}

export async function getCachedOfflineFlashcards(deckKey: string): Promise<{
  cachedAt: string;
  cards: OfflineFlashcardSnapshot[];
} | null> {
  return (await get(`${FLASHCARD_CACHE_PREFIX}${deckKey}`)) ?? null;
}

export async function offlineQueueCounts(): Promise<{
  notes: number;
  assignments: number;
  flashcards: number;
}> {
  const [notes, assignments, flashcards] = await Promise.all([
    getOfflineNoteSaves(),
    getOfflineAssignmentStatuses(),
    getOfflineFlashcardReviews(),
  ]);
  return {
    notes: notes.length,
    assignments: assignments.length,
    flashcards: flashcards.length,
  };
}

export async function registerOfflineSync(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready.catch(() => null);
  const sync =
    registration && "sync" in registration
      ? (registration as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } }).sync
      : null;
  if (sync && typeof sync.register === "function") {
    await sync.register(SYNC_TAG).catch(() => {});
  }
}

async function readPrefix<T>(prefix: string): Promise<T[]> {
  const allKeys = (await keys()) as string[];
  const queueKeys = allKeys.filter((key) => key.startsWith(prefix)).sort();
  const rows = await Promise.all(queueKeys.map((key) => get<T | undefined>(key)));
  return rows.filter((row): row is NonNullable<typeof row> => Boolean(row));
}
