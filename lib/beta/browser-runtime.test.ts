import { describe, expect, it } from "vitest";

import { isIsolatedBetaBrowserRuntime } from "./browser-runtime";

describe("isIsolatedBetaBrowserRuntime", () => {
  it("enables the isolated browser behavior only for the explicit QA value", () => {
    expect(isIsolatedBetaBrowserRuntime("true")).toBe(true);
    expect(isIsolatedBetaBrowserRuntime("false")).toBe(false);
    expect(isIsolatedBetaBrowserRuntime("1")).toBe(false);
    expect(isIsolatedBetaBrowserRuntime("TRUE")).toBe(false);
  });
});
