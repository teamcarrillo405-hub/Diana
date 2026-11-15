import { describe, expect, it } from "vitest";

import {
  MAX_JAVASCRIPT_BYTES,
  runJavaScript,
  validateJavaScriptForRun,
} from "./javascript-runner";

describe("JavaScript sandbox validation", () => {
  it("rejects dynamic and static module imports", () => {
    expect(validateJavaScriptForRun("import('https://example.com/x.js')")).toContain(
      "imports are disabled",
    );
    expect(validateJavaScriptForRun("import value from './module.js'")).toContain(
      "imports are disabled",
    );
  });

  it("rejects source above the registered limit", () => {
    expect(validateJavaScriptForRun("a".repeat(MAX_JAVASCRIPT_BYTES + 1))).toContain(
      "under 250 KB",
    );
  });

  it("returns a clear non-browser state", async () => {
    await expect(runJavaScript("console.log(5)")).resolves.toMatchObject({
      ok: false,
      output: [],
    });
  });
});
