import { describe, expect, it } from "vitest";

import { isBrowserIssueAllowed } from "./helpers/beta-browser";

describe("beta browser warning allowlist", () => {
  const warning =
    "[.WebGL-0x59f2c8f0]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels";

  it("allows only the known Chromium screenshot warning", () => {
    expect(isBrowserIssueAllowed("console-warning", warning)).toBe(true);
    expect(
      isBrowserIssueAllowed("console-warning", `${warning} (this message will no longer repeat)`),
    ).toBe(true);
    expect(
      isBrowserIssueAllowed(
        "console-warning",
        "[.WebGL-0x59f2c8f0]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, Medium): GPU stall due to ReadPixels",
      ),
    ).toBe(false);
    expect(isBrowserIssueAllowed("console-warning", `${warning} while rendering`)).toBe(false);
    expect(isBrowserIssueAllowed("console-error", warning)).toBe(false);
  });
});
