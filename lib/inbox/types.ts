/** Capture mode for an inbox item */
export type CaptureMode = "voice" | "photo" | "text";

/** Lifecycle status of an inbox item */
export type InboxStatus =
  | "unclassified"
  | "classified"
  | "dismissed"
  | "converted";

/** Persisted inbox item (matches public.inbox_items row shape) */
export interface InboxItem {
  id: string;
  ownerId: string;
  raw: string;
  captureMode: CaptureMode;
  photoStorageKey: string | null;
  status: InboxStatus;
  suggestedClassId: string | null;
  suggestedKind: string | null;
  suggestedDueAt: string | null;
  suggestionConfidence: number | null;
  assignmentId: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Temporary inbox item queued in IndexedDB while offline.
 * Drained to Supabase when connectivity is restored.
 */
export interface QueuedInboxItem {
  tempId: string;
  raw: string;
  captureMode: CaptureMode;
  blob?: Blob;              // stored in IDB if photo taken offline
  photoStorageKey?: string; // Supabase Storage path, set after upload
  queuedAt: string;         // ISO 8601
}
