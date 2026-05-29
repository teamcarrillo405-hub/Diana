// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock idb-keyval with a plain Map — no IndexedDB needed in Node
const store = new Map<string, unknown>();
vi.mock("idb-keyval", () => ({
  get:  vi.fn((k: string) => Promise.resolve(store.get(k))),
  set:  vi.fn((k: string, v: unknown) => { store.set(k, v); return Promise.resolve(); }),
  del:  vi.fn((k: string) => { store.delete(k); return Promise.resolve(); }),
  keys: vi.fn(() => Promise.resolve([...store.keys()])),
}));

import { enqueueInboxItem, getQueuedItems, removeQueuedItem } from "./queue";
import type { QueuedInboxItem } from "./types";

const ITEM: QueuedInboxItem = {
  tempId: "temp-001",
  raw: "history essay due friday",
  captureMode: "text",
  queuedAt: "2026-05-28T20:00:00.000Z",
};

beforeEach(() => store.clear());

describe("enqueueInboxItem / getQueuedItems", () => {
  it("stores an item and retrieves it", async () => {
    await enqueueInboxItem(ITEM);
    const items = await getQueuedItems();
    expect(items).toHaveLength(1);
    expect(items[0].tempId).toBe("temp-001");
  });

  it("stores two items and retrieves both", async () => {
    await enqueueInboxItem(ITEM);
    await enqueueInboxItem({ ...ITEM, tempId: "temp-002" });
    const items = await getQueuedItems();
    expect(items).toHaveLength(2);
  });
});

describe("removeQueuedItem", () => {
  it("removes only the specified item", async () => {
    await enqueueInboxItem(ITEM);
    await enqueueInboxItem({ ...ITEM, tempId: "temp-002" });
    await removeQueuedItem("temp-001");
    const items = await getQueuedItems();
    expect(items).toHaveLength(1);
    expect(items[0].tempId).toBe("temp-002");
  });

  it("no-ops on a tempId that does not exist", async () => {
    await enqueueInboxItem(ITEM);
    await removeQueuedItem("nonexistent");
    const items = await getQueuedItems();
    expect(items).toHaveLength(1);
  });
});
