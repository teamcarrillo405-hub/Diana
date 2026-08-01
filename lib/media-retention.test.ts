import { describe, expect, it } from "vitest";

import {
  ASSIGNMENT_MEDIA_RETENTION_DAYS,
  hasOwnedAssignmentMediaKey,
  isAuthorizedMediaRetentionRequest,
  mediaRetentionCutoff,
  runMediaRetentionOperation,
} from "./media-retention";
import { vi } from "vitest";

describe("assignment media retention", () => {
  it("requires an exact configured bearer secret", () => {
    expect(isAuthorizedMediaRetentionRequest("Bearer test-secret", "test-secret")).toBe(true);
    expect(isAuthorizedMediaRetentionRequest("Bearer another", "test-secret")).toBe(false);
    expect(isAuthorizedMediaRetentionRequest(null, "test-secret")).toBe(false);
    expect(isAuthorizedMediaRetentionRequest("Bearer test-secret", undefined)).toBe(false);
  });

  it("uses a stable ISO cutoff and a bounded retention window", () => {
    expect(ASSIGNMENT_MEDIA_RETENTION_DAYS).toBe(180);
    expect(mediaRetentionCutoff(new Date("2026-07-30T12:00:00.000Z"))).toBe(
      "2026-07-30T12:00:00.000Z",
    );
  });

  it("only accepts storage keys inside the row's owner and assignment boundary", () => {
    const row = {
      id: "media-1",
      owner_id: "student-a",
      assignment_id: "assignment-a",
      storage_key: "student-a/assignment-a/recording.webm",
    };

    expect(hasOwnedAssignmentMediaKey(row)).toBe(true);
    expect(hasOwnedAssignmentMediaKey({ ...row, storage_key: "student-b/assignment-a/recording.webm" })).toBe(false);
    expect(hasOwnedAssignmentMediaKey({ ...row, storage_key: "student-a/assignment-b/recording.webm" })).toBe(false);
    expect(hasOwnedAssignmentMediaKey({ ...row, storage_key: "student-a/assignment-a/../private" })).toBe(false);
  });

  it("retries a bounded operation once without returning provider details", async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error("private provider detail"))
      .mockResolvedValueOnce("done");
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(runMediaRetentionOperation(operation, { sleep })).resolves.toEqual({ ok: true, value: "done" });
    expect(operation).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(250);
  });
});
