import { describe, expect, it } from "vitest";

import { hasValidCronBearer } from "./cron-auth";

describe("cron bearer authorization", () => {
  it("accepts only the exact configured bearer value", () => {
    expect(hasValidCronBearer("Bearer cron-secret", "cron-secret")).toBe(true);
    expect(hasValidCronBearer("Bearer other-secret", "cron-secret")).toBe(false);
    expect(hasValidCronBearer("cron-secret", "cron-secret")).toBe(false);
    expect(hasValidCronBearer("Bearer cron-secret ", "cron-secret")).toBe(false);
  });

  it("fails closed when either side is missing", () => {
    expect(hasValidCronBearer(null, "cron-secret")).toBe(false);
    expect(hasValidCronBearer("Bearer cron-secret", undefined)).toBe(false);
    expect(hasValidCronBearer("Bearer ", "")).toBe(false);
  });
});
