type StorageErrorLike = {
  status?: unknown;
  statusCode?: unknown;
  code?: unknown;
  originalError?: unknown;
  cause?: unknown;
};

type StorageExistenceResult = {
  data: boolean;
  error: unknown;
};

export type StorageObjectRemoval = {
  removed: boolean;
  absenceConfirmed: boolean;
};

const NOT_FOUND_CODES = new Set([
  "notfound",
  "not_found",
  "objectnotfound",
  "object_not_found",
  "nosuchkey",
  "no_such_key",
]);

export function isConfirmedStorageAbsence(result: StorageExistenceResult): boolean {
  if (result.data !== false) return false;
  return isExpectedStorageNotFound(result.error);
}

export async function removeAndConfirmStorageObjectAbsent(
  bucket: {
    remove(keys: string[]): PromiseLike<{ error: unknown }>;
    exists(key: string): PromiseLike<StorageExistenceResult>;
  },
  storageKey: string,
): Promise<StorageObjectRemoval> {
  try {
    const removal = await bucket.remove([storageKey]);
    if (removal.error) return { removed: false, absenceConfirmed: false };

    const existence = await bucket.exists(storageKey);
    return {
      removed: true,
      absenceConfirmed: isConfirmedStorageAbsence(existence),
    };
  } catch {
    return { removed: false, absenceConfirmed: false };
  }
}

function isExpectedStorageNotFound(error: unknown): boolean {
  for (const candidate of errorChain(error)) {
    const status = numericStatus(candidate.status);
    if (status !== 400 && status !== 404) continue;

    const codes = [candidate.statusCode, candidate.code]
      .filter((value): value is string | number => typeof value === "string" || typeof value === "number")
      .map((value) => String(value).replace(/[\s-]/gu, "").toLowerCase());
    if (codes.some((code) => NOT_FOUND_CODES.has(code))) return true;
  }
  return false;
}

function errorChain(error: unknown): StorageErrorLike[] {
  const chain: StorageErrorLike[] = [];
  const seen = new Set<unknown>();
  let current = error;
  while (current && typeof current === "object" && !seen.has(current) && chain.length < 4) {
    seen.add(current);
    const candidate = current as StorageErrorLike;
    chain.push(candidate);
    current = candidate.originalError ?? candidate.cause;
  }
  return chain;
}

function numericStatus(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^\d{3}$/u.test(value)) return Number(value);
  return null;
}
