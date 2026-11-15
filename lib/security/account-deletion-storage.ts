export const ACCOUNT_DELETION_BUCKETS = [
  "note-docs",
  "portfolio-evidence",
  "note-audio",
  "inbox-photos",
  "assignment-media",
  "assignment-submissions",
] as const;

const LIST_PAGE_SIZE = 1_000;
const REMOVE_BATCH_SIZE = 500;
const MAX_OBJECTS_PER_OWNER = 20_000;
const MAX_DIRECTORY_DEPTH = 20;

type StorageEntry = {
  id?: string | null;
  name: string;
};

type StorageBucket = {
  list: (
    path: string,
    options: { limit: number; offset: number; sortBy: { column: "name"; order: "asc" } },
  ) => PromiseLike<{ data: StorageEntry[] | null; error: unknown }>;
  remove: (paths: string[]) => PromiseLike<{ data: unknown; error: unknown }>;
};

type StorageClient = {
  from: (bucket: string) => StorageBucket;
};

export type AccountStoragePurgeResult =
  | { ok: true; deleted: number }
  | { ok: false; deleted: number; reason: "invalid_owner" | "scope_limit" | "storage_unavailable" };

export async function purgeOwnerStorage(
  storage: StorageClient,
  ownerId: string,
  options: { timeoutMs?: number; sleep?: (milliseconds: number) => Promise<void> } = {},
): Promise<AccountStoragePurgeResult> {
  if (!isUuid(ownerId)) return { ok: false, deleted: 0, reason: "invalid_owner" };

  const state = { deleted: 0 };
  try {
    for (const bucketName of ACCOUNT_DELETION_BUCKETS) {
      await purgeDirectory(storage.from(bucketName), ownerId, 0, state, options);
    }
    return { ok: true, deleted: state.deleted };
  } catch (error) {
    return {
      ok: false,
      deleted: state.deleted,
      reason: error instanceof ScopeLimitError ? "scope_limit" : "storage_unavailable",
    };
  }
}

async function purgeDirectory(
  bucket: StorageBucket,
  path: string,
  depth: number,
  state: { deleted: number },
  options: { timeoutMs?: number; sleep?: (milliseconds: number) => Promise<void> },
): Promise<void> {
  if (depth > MAX_DIRECTORY_DEPTH) throw new ScopeLimitError();

  while (true) {
    const entries = await storageOperation(() => bucket.list(path, {
      limit: LIST_PAGE_SIZE,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    }), options);
    if (!entries || entries.length === 0) return;

    const folders: StorageEntry[] = [];
    const files: string[] = [];
    for (const entry of entries) {
      if (!isSafePathSegment(entry.name)) throw new ScopeLimitError();
      const objectPath = `${path}/${entry.name}`;
      if (entry.id === null) folders.push(entry);
      else if (typeof entry.id === "string" && entry.id) files.push(objectPath);
      else throw new ScopeLimitError();
    }

    for (const folder of folders) {
      await purgeDirectory(bucket, `${path}/${folder.name}`, depth + 1, state, options);
    }

    for (let index = 0; index < files.length; index += REMOVE_BATCH_SIZE) {
      const batch = files.slice(index, index + REMOVE_BATCH_SIZE);
      if (state.deleted + batch.length > MAX_OBJECTS_PER_OWNER) throw new ScopeLimitError();
      await storageOperation(() => bucket.remove(batch), options);
      state.deleted += batch.length;
    }

    if (files.length === 0 && folders.length === 0) return;
  }
}

async function storageOperation<T>(
  operation: () => PromiseLike<{ data: T | null; error: unknown }>,
  options: { timeoutMs?: number; sleep?: (milliseconds: number) => Promise<void> },
): Promise<T | null> {
  const timeoutMs = options.timeoutMs ?? 15_000;
  const sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const result = await withTimeout(Promise.resolve(operation()), timeoutMs);
      if (!result.error) return result.data;
    } catch {
      // A second attempt is safe because list and remove are idempotent here.
    }
    if (attempt === 1) await sleep(250);
  }
  throw new Error("storage operation unavailable");
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error("storage timeout")), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

function isSafePathSegment(value: string): boolean {
  return Boolean(value) && value !== "." && value !== ".." && !/[\\/]/u.test(value);
}

class ScopeLimitError extends Error {}
