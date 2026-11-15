import { describe, expect, it } from "vitest";

import { safeQaRedirect } from "./safe-redirect";

describe("QA session redirect", () => {
  it("allows local absolute paths and preserves their query", () => {
    expect(safeQaRedirect("/course-mode?view=student")).toBe(
      "/course-mode?view=student",
    );
  });

  it.each([null, "", "https://example.com", "//example.com", "course-mode"])(
    "falls back for unsafe redirect value %s",
    (value) => {
      expect(safeQaRedirect(value)).toBe("/dashboard");
    },
  );
});
