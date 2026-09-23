import { describe, expect, it, vi } from "vitest";

import {
  isConfirmedStorageAbsence,
  removeAndConfirmStorageObjectAbsent,
} from "./object-absence";

describe("Supabase Storage absence confirmation", () => {
  it.each([
    { data: false, error: { status: 404, statusCode: "not_found" } },
    { data: false, error: { status: 400, statusCode: "not_found" } },
    { data: false, error: { name: "StorageApiError", status: 400, statusCode: "object_not_found" } },
    { data: false, error: { name: "StorageApiError", status: 404, statusCode: "object_not_found" } },
    { data: false, error: { originalError: { status: 404, code: "NoSuchKey" } } },
  ])("accepts an expected absent object result", (result) => {
    expect(isConfirmedStorageAbsence(result)).toBe(true);
  });

  it.each([
    { data: true, error: null },
    { data: false, error: null },
    { data: false, error: { status: 404, statusCode: "bucket_not_found" } },
    { data: false, error: { status: 404, code: "route_not_found" } },
    { data: false, error: { status: 404 } },
    { data: false, error: { statusCode: "NoSuchKey" } },
    { data: false, error: { status: 401, statusCode: "not_found" } },
    { data: false, error: { status: 403 } },
    { data: false, error: { status: 500 } },
    { data: false, error: new Error("transport unavailable") },
  ])("fails closed for present, auth, transport, and provider failures", (result) => {
    expect(isConfirmedStorageAbsence(result)).toBe(false);
  });

  it("normalizes Supabase exists 404 semantics after removal", async () => {
    const bucket = {
      remove: vi.fn().mockResolvedValue({ error: null }),
      exists: vi.fn().mockResolvedValue({
        data: false,
        error: { name: "StorageApiError", status: 404, statusCode: "not_found" },
      }),
    };

    await expect(removeAndConfirmStorageObjectAbsent(bucket, "owner/assignment/object.mp4"))
      .resolves.toEqual({ removed: true, absenceConfirmed: true });
  });

  it("does not confirm absence when remove or exists cannot be trusted", async () => {
    const removeFailure = {
      remove: vi.fn().mockResolvedValue({ error: { status: 503 } }),
      exists: vi.fn(),
    };
    await expect(removeAndConfirmStorageObjectAbsent(removeFailure, "object"))
      .resolves.toEqual({ removed: false, absenceConfirmed: false });
    expect(removeFailure.exists).not.toHaveBeenCalled();

    const authFailure = {
      remove: vi.fn().mockResolvedValue({ error: null }),
      exists: vi.fn().mockResolvedValue({ data: false, error: { status: 403 } }),
    };
    await expect(removeAndConfirmStorageObjectAbsent(authFailure, "object"))
      .resolves.toEqual({ removed: true, absenceConfirmed: false });

    for (const failure of [
      new Error("transport unavailable"),
      { status: 401, statusCode: "unauthorized" },
      { status: 503, statusCode: "service_unavailable" },
    ]) {
      const throwingBucket = {
        remove: vi.fn().mockResolvedValue({ error: null }),
        exists: vi.fn().mockRejectedValue(failure),
      };
      await expect(removeAndConfirmStorageObjectAbsent(throwingBucket, "object"))
        .resolves.toEqual({ removed: false, absenceConfirmed: false });
    }
  });
});
