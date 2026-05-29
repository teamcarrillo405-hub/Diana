import { get, set, del, keys } from "idb-keyval";
import type { QueuedInboxItem } from "./types";

const KEY_PREFIX = "inbox-queue:";

export async function enqueueInboxItem(item: QueuedInboxItem): Promise<void> {
  await set(`${KEY_PREFIX}${item.tempId}`, item);
}

export async function getQueuedItems(): Promise<QueuedInboxItem[]> {
  const allKeys = (await keys()) as string[];
  const queueKeys = allKeys.filter((k) => k.startsWith(KEY_PREFIX));
  const items = await Promise.all(
    queueKeys.map((k) => get<QueuedInboxItem>(k).then((v) => v!))
  );
  return items;
}

export async function removeQueuedItem(tempId: string): Promise<void> {
  await del(`${KEY_PREFIX}${tempId}`);
}
