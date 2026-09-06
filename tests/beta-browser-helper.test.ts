import { describe, expect, it } from "vitest";

import {
  isBrowserIssueAllowed,
  isExpectedNextRouterPrefetchAbort,
} from "./helpers/beta-browser";

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

  it("allows only the disposable Next development HMR bundle cancellations", () => {
    const hmrAbort = "net::ERR_ABORTED [script] GET http://127.0.0.1:3005/_next/static/webpack/webpack.cac24af971fde713.hot-update.js";
    expect(isBrowserIssueAllowed("request-error", hmrAbort)).toBe(true);
    expect(
      isBrowserIssueAllowed(
        "request-error",
        "net::ERR_ABORTED [script] GET http://127.0.0.1:3005/_next/static/chunks/_app-pages-browser_node_modules_next_dist_client_dev_noop-turbopack-hmr_js.js",
      ),
    ).toBe(true);
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

  it("allows only the known local Next font-preload warning", () => {
    const preloadWarning =
      "The resource http://127.0.0.1:3005/_next/static/media/lexend.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.";

    expect(isBrowserIssueAllowed("console-warning", preloadWarning)).toBe(true);
    expect(
      isBrowserIssueAllowed(
        "console-warning",
        preloadWarning.replace("127.0.0.1:3005", "example.com"),
      ),
    ).toBe(false);
    expect(
      isBrowserIssueAllowed("console-warning", preloadWarning.replace(".woff2", ".js")),
    ).toBe(false);
  });

  it("allows only canceled same-origin Next router prefetches", () => {
    const expected = {
      errorText: "net::ERR_ABORTED",
      headers: { rsc: "1", "next-router-prefetch": "1" },
      method: "GET",
      resourceType: "fetch",
      url: "http://127.0.0.1:3005/classes",
    };

    expect(isExpectedNextRouterPrefetchAbort(expected, "http://127.0.0.1:3005")).toBe(true);
    expect(isExpectedNextRouterPrefetchAbort(
      { ...expected, headers: { rsc: "1" } },
      "http://127.0.0.1:3005",
    )).toBe(false);
    expect(isExpectedNextRouterPrefetchAbort(
      { ...expected, url: "http://127.0.0.1:3006/classes" },
      "http://127.0.0.1:3005",
    )).toBe(false);
    expect(isExpectedNextRouterPrefetchAbort(
      { ...expected, errorText: "net::ERR_CONNECTION_REFUSED" },
      "http://127.0.0.1:3005",
    )).toBe(false);
  });

  it("allows the exact Playwright service-worker isolation warning", () => {
    expect(isBrowserIssueAllowed(
      "console-warning",
      "Service Worker registration blocked by Playwright",
    )).toBe(true);
    expect(isBrowserIssueAllowed(
      "console-warning",
      "Service Worker registration blocked by an extension",
    )).toBe(false);
  });
});
