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

  it("allows only the disposable Next development HMR bundle cancellation", () => {
    const hmrAbort = "net::ERR_ABORTED [script] GET http://127.0.0.1:3005/_next/static/webpack/webpack.cac24af971fde713.hot-update.js";
    expect(isBrowserIssueAllowed("request-error", hmrAbort)).toBe(true);
    expect(
      isBrowserIssueAllowed(
        "request-error",
        "net::ERR_ABORTED [script] GET http://127.0.0.1:3005/_next/static/chunks/app/page.js",
      ),
    ).toBe(false);
    expect(
      isBrowserIssueAllowed(
        "request-error",
        "net::ERR_ABORTED [fetch] GET http://127.0.0.1:3005/_next/static/webpack/webpack.cac24af971fde713.hot-update.js",
      ),
    ).toBe(false);
  });
});
