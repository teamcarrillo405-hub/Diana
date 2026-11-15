import { del, get, keys, set,createStore } from "idb-keyval";
import { createClient } from "@/lib/supabase/client";

const NOTE_PREFIX = "diana-offline:note:";
const ASSIGNMENT_PREFIX = "diana-offline:assignment:";
const FLASHCARD_PREFIX = "diana-offline:flashcard:";
const FLASHCARD_CACHE_PREFIX = "diana-offline:flashcard-cache:";
const SYNC_TAG = "diana-offline-sync";

/** Local identity selects a partition only. The server authenticates every replay. */
export async function offlineOwner(): Promise<string | null> {
  const { data: { session } } = await createClient().auth.getSession();
  return session?.user.id ?? null;
}

async function ownerPrefix(prefix: string, expectedOwner?: string): Promise<string | null> {
  const owner = await offlineOwner();
  if (!owner || (expectedOwner && owner !== expectedOwner)) return null;
  return "diana-offline:v2:" + owner + ":" + prefix;
}

async function writeOwned<T>(prefix: string, id: string, value: T,expectedOwner?:string): Promise<void> {
  const scoped = await ownerPrefix(prefix,expectedOwner);
  if (!scoped) throw new Error("Sign in before saving work on this device.");
  await set(scoped + id, value);
}

async function readOwned<T>(prefix: string, expectedOwner?: string): Promise<T[]> {
  const scoped = await ownerPrefix(prefix, expectedOwner);
  return scoped ? readPrefix<T>(scoped) : [];
}

async function removeOwned(prefix: string, id: string, expectedOwner?: string): Promise<void> {
  const scoped = await ownerPrefix(prefix, expectedOwner);
  if (scoped) await del(scoped + id);
}

/** Legacy ownerless work is quarantined in place, never attached to the next login. */
export async function quarantinedOfflineCount(): Promise<number> {
  return (await keys()).filter((key) => typeof key === "string"
    && [NOTE_PREFIX, ASSIGNMENT_PREFIX, FLASHCARD_PREFIX, FLASHCARD_CACHE_PREFIX].some((prefix) => key.startsWith(prefix))).length;
}

export async function clearOfflineAccount(ownerId: string): Promise<void> {
  const prefix = "diana-offline:v2:" + ownerId + ":";
  await Promise.all((await keys()).filter((key) => typeof key === "string" && key.startsWith(prefix)).map((key) => del(key)));
}

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

export async function queueOfflineNoteSave(item: OfflineNoteSave,expectedOwner?:string): Promise<void> {
  await writeOwned(NOTE_PREFIX, item.tempId, item,expectedOwner);
}

export async function getOfflineNoteSaves(ownerId?: string): Promise<OfflineNoteSave[]> {
  return readOwned<OfflineNoteSave>(NOTE_PREFIX, ownerId);
}

export async function removeOfflineNoteSave(tempId: string, ownerId?: string, expectedUpdatedAt?: string): Promise<void> {
  const prefix = await ownerPrefix(NOTE_PREFIX, ownerId);
  if (!prefix) return;
  if(!expectedUpdatedAt){await del(prefix+tempId);return;}
  // Read and conditional delete share one transaction, including across tabs.
  await createStore("keyval-store","keyval")("readwrite",store=>new Promise<void>((resolve,reject)=>{
    const request=store.get(prefix+tempId);
    request.onsuccess=()=>{if((request.result as OfflineNoteSave|undefined)?.updatedAt===expectedUpdatedAt)store.delete(prefix+tempId);};
    request.onerror=()=>reject(request.error);
    store.transaction.oncomplete=()=>resolve();
    store.transaction.onabort=()=>reject(store.transaction.error);
  }));
}

export async function queueOfflineAssignmentStatus(item: OfflineAssignmentStatus): Promise<void> {
  await writeOwned(ASSIGNMENT_PREFIX, item.tempId, item);
}

export async function getOfflineAssignmentStatuses(ownerId?: string): Promise<OfflineAssignmentStatus[]> {
  return readOwned<OfflineAssignmentStatus>(ASSIGNMENT_PREFIX, ownerId);
}

export async function removeOfflineAssignmentStatus(tempId: string, ownerId?: string): Promise<void> {
  await removeOwned(ASSIGNMENT_PREFIX, tempId, ownerId);
}

export async function queueOfflineFlashcardReview(item: OfflineFlashcardReview): Promise<void> {
  await writeOwned(FLASHCARD_PREFIX, item.tempId, item);
}

export async function getOfflineFlashcardReviews(ownerId?: string): Promise<OfflineFlashcardReview[]> {
  return readOwned<OfflineFlashcardReview>(FLASHCARD_PREFIX, ownerId);
}

export async function removeOfflineFlashcardReview(tempId: string, ownerId?: string): Promise<void> {
  await removeOwned(FLASHCARD_PREFIX, tempId, ownerId);
}

export async function cacheOfflineFlashcards(deckKey: string, cards: OfflineFlashcardSnapshot[]): Promise<void> {
  await writeOwned(FLASHCARD_CACHE_PREFIX, deckKey, {
    cachedAt: new Date().toISOString(),
    cards,
  });
}

export async function getCachedOfflineFlashcards(deckKey: string): Promise<{
  cachedAt: string;
  cards: OfflineFlashcardSnapshot[];
} | null> {
  const prefix = await ownerPrefix(FLASHCARD_CACHE_PREFIX);
  return prefix ? (await get(prefix + deckKey)) ?? null : null;
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
  const allKeys = await keys();
  const queueKeys = allKeys.filter((key): key is string => typeof key === "string" && key.startsWith(prefix)).sort();
  const rows = await Promise.all(queueKeys.map((key) => get<T | undefined>(key)));
  return rows.filter((row): row is NonNullable<typeof row> => Boolean(row));
}
