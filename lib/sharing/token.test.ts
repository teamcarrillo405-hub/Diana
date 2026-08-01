import { describe, expect, it } from "vitest";

import { createShareToken, digestShareToken } from "./token";

describe("share token protection", () => {
  it("creates high-entropy URL-safe bearer tokens", () => {
    const first = createShareToken();
    const second = createShareToken();

    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(second).not.toBe(first);
  });

  it("stores a deterministic one-way digest instead of the bearer token", () => {
    expect(digestShareToken("example-token")).toBe(
      "4d1566a1d7df42a8517456d60ea06ed284e535cfe4c956aa6ee172dbcdf945f7",
    );
  });
});
