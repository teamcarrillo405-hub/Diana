import { describe, expect, it, vi } from "vitest";

import { ACCOUNT_DELETION_BUCKETS, purgeOwnerStorage } from "./account-deletion-storage";

const OWNER_A = "11111111-1111-4111-8111-111111111111";
const OWNER_B = "22222222-2222-4222-8222-222222222222";

function fakeStorage(initial: Record<string, string[]>, transientListFailure = false) {
  const objects = new Map(
    Object.entries(initial).map(([bucket, paths]) => [bucket, new Set(paths)]),
  );
  const from = vi.fn((bucketName: string) => ({
    list: vi.fn(async (path: string) => {
      if (transientListFailure) {
        transientListFailure = false;
        return { data: null, error: { message: "private provider detail" } };
      }
      const prefix = `${path}/`;
      const children = new Map<string, { id: string | null; name: string }>();
      for (const objectPath of objects.get(bucketName) ?? []) {
        if (!objectPath.startsWith(prefix)) continue;
        const remainder = objectPath.slice(prefix.length);
        const [name, ...rest] = remainder.split("/");
        children.set(name, { id: rest.length > 0 ? null : `id:${objectPath}`, name });
      }
      return { data: [...children.values()].sort((a, b) => a.name.localeCompare(b.name)), error: null };
    }),
    remove: vi.fn(async (paths: string[]) => {
      for (const path of paths) objects.get(bucketName)?.delete(path);
      return { data: paths, error: null };
    }),
  }));
  return { storage: { from }, objects, from };
}

describe("account deletion storage purge", () => {
  it("includes assignment submission files in the deletion manifest", () => {
    expect(ACCOUNT_DELETION_BUCKETS).toContain("assignment-submissions");
  });

  it("recursively removes only the requested owner's objects from every private bucket", async () => {
    const initial = Object.fromEntries(ACCOUNT_DELETION_BUCKETS.map((bucket) => [bucket, [
      `${OWNER_A}/root.txt`,
      `${OWNER_A}/assignment/deep/recording.webm`,
      `${OWNER_B}/keep.txt`,
    ]]));
    const { storage, objects, from } = fakeStorage(initial);

    const result = await purgeOwnerStorage(storage, OWNER_A);

    expect(result).toEqual({ ok: true, deleted: ACCOUNT_DELETION_BUCKETS.length * 2 });
    expect(from.mock.calls.map(([bucket]) => bucket)).toEqual(ACCOUNT_DELETION_BUCKETS);
    for (const bucket of ACCOUNT_DELETION_BUCKETS) {
      expect([...objects.get(bucket)!]).toEqual([`${OWNER_B}/keep.txt`]);
    }
  });

  it("retries a transient Storage API failure and remains idempotent", async () => {
    const { storage, objects } = fakeStorage({ "note-docs": [`${OWNER_A}/file.pdf`] }, true);
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(purgeOwnerStorage(storage, OWNER_A, { sleep })).resolves.toEqual({ ok: true, deleted: 1 });
    await expect(purgeOwnerStorage(storage, OWNER_A, { sleep })).resolves.toEqual({ ok: true, deleted: 0 });
    expect(sleep).toHaveBeenCalledWith(250);
    expect(objects.get("note-docs")?.size).toBe(0);
  });

  it("rejects a non-UUID owner before selecting a bucket", async () => {
    const { storage, from } = fakeStorage({});

    await expect(purgeOwnerStorage(storage, "../another-student")).resolves.toEqual({
      ok: false,
      deleted: 0,
      reason: "invalid_owner",
    });
    expect(from).not.toHaveBeenCalled();
  });
});
