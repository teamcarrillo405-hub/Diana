import { hasValidCronBearer } from "@/lib/security/cron-auth";

export const ASSIGNMENT_MEDIA_RETENTION_DAYS = 180;

export function isAuthorizedMediaRetentionRequest(
  authorization: string | null,
  secret: string | undefined,
): boolean {
  return hasValidCronBearer(authorization, secret);
}

export function mediaRetentionCutoff(now = new Date()): string {
  return now.toISOString();
}

export type AssignmentMediaRetentionRow = {
  id: string;
  owner_id: string;
  assignment_id: string;
  storage_key: string;
};

export function hasOwnedAssignmentMediaKey(row: AssignmentMediaRetentionRow): boolean {
  if (!row.id || !row.owner_id || !row.assignment_id || !row.storage_key) return false;
  if (row.storage_key.includes("\\") || row.storage_key.includes("..")) return false;
  const [ownerId, assignmentId, filename, ...extra] = row.storage_key.split("/");
  return (
    ownerId === row.owner_id &&
    assignmentId === row.assignment_id &&
    Boolean(filename) &&
    extra.length === 0
  );
}

export async function runMediaRetentionOperation<T>(
  operation: () => PromiseLike<T>,
  options: {
    timeoutMs?: number;
    attempts?: number;
    sleep?: (milliseconds: number) => Promise<void>;
  } = {},
): Promise<{ ok: true; value: T } | { ok: false }> {
  const timeoutMs = options.timeoutMs ?? 15_000;
  const attempts = Math.max(1, options.attempts ?? 2);
  const sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const value = await withTimeout(Promise.resolve(operation()), timeoutMs);
      return { ok: true, value };
    } catch {
      if (attempt === attempts) return { ok: false };
      await sleep(250);
    }
  }

  return { ok: false };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error("operation timeout")), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}
