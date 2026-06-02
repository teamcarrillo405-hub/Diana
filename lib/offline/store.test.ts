import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cacheOfflineFlashcards,
  getCachedOfflineFlashcards,
  getOfflineAssignmentStatuses,
  getOfflineFlashcardReviews,
  getOfflineNoteSaves,
  offlineQueueCounts,
  queueOfflineAssignmentStatus,
  queueOfflineFlashcardReview,
  queueOfflineNoteSave,
  removeOfflineAssignmentStatus,
  removeOfflineFlashcardReview,
  removeOfflineNoteSave,
} from "./store";

const store = new Map<string, unknown>();

vi.mock("idb-keyval", () => ({
  get: vi.fn(async (key: string) => store.get(key)),
  set: vi.fn(async (key: string, value: unknown) => {
    store.set(key, value);
  }),
  del: vi.fn(async (key: string) => {
    store.delete(key);
  }),
  keys: vi.fn(async () => [...store.keys()]),
}));

describe("offline store", () => {
  beforeEach(() => {
    store.clear();
  });

  it("queues and removes note saves", async () => {
    await queueOfflineNoteSave({
      tempId: "n1",
      noteId: null,
      title: "Lab note",
      bodyText: "Observation",
      classId: null,
      assignmentId: null,
      source: "manual",
      updatedAt: "2026-06-01T00:00:00Z",
    });
    expect(await getOfflineNoteSaves()).toHaveLength(1);
    await removeOfflineNoteSave("n1");
    expect(await getOfflineNoteSaves()).toHaveLength(0);
  });

  it("queues assignment status changes and flashcard reviews separately", async () => {
    await queueOfflineAssignmentStatus({
      tempId: "a1",
      assignmentId: "assignment-1",
      from: "todo",
      to: "drafting",
      queuedAt: "2026-06-01T00:00:00Z",
    });
    await queueOfflineFlashcardReview({
      tempId: "f1",
      cardId: "card-1",
      rating: 3,
      queuedAt: "2026-06-01T00:00:00Z",
    });

    expect(await getOfflineAssignmentStatuses()).toHaveLength(1);
    expect(await getOfflineFlashcardReviews()).toHaveLength(1);
    expect(await offlineQueueCounts()).toEqual({ notes: 0, assignments: 1, flashcards: 1 });

    await removeOfflineAssignmentStatus("a1");
    await removeOfflineFlashcardReview("f1");
    expect(await offlineQueueCounts()).toEqual({ notes: 0, assignments: 0, flashcards: 0 });
  });

  it("stores cached flashcards by deck key", async () => {
    await cacheOfflineFlashcards("due", [
      {
        id: "card-1",
        front: "Front",
        back: "Back",
        state: "review",
        stability: 2,
        difficulty: 4,
        dueAt: "2026-06-01T00:00:00Z",
        reps: 3,
        lapses: 0,
        lastReviewAt: "2026-05-31T00:00:00Z",
      },
    ]);

    const cached = await getCachedOfflineFlashcards("due");
    expect(cached?.cards[0].front).toBe("Front");
  });
});
