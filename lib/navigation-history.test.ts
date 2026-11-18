import { describe, expect, it } from "vitest";
import { navigationHistoryState } from "./navigation-history";

describe("navigationHistoryState", () => {
  it("retains custom fields without treating a user selection as a framework-internal write", () => {
    const state = { __NA: true, _N: true, selected: "notes", scroll: { top: 80 }, __PRIVATE_NEXTJS_INTERNALS_TREE: ["current-tree"] };
    const result = navigationHistoryState(state);
    expect(result).toEqual({ selected: "notes", scroll: { top: 80 }, __PRIVATE_NEXTJS_INTERNALS_TREE: ["current-tree"] });
    expect(state).toHaveProperty("__NA", true);
    expect(state).toHaveProperty("_N", true);
  });
  it("handles absent or non-object state without creating invalid history fields", () => {
    expect(navigationHistoryState(null)).toBeNull();
    expect(navigationHistoryState(undefined)).toBeNull();
    expect(navigationHistoryState(3)).toBeNull();
    expect(navigationHistoryState([])).toBeNull();
  });
});
