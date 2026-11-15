import { describe, it, expect } from "vitest";
import {
  MAX_CODE_BYTES,
  pyodideAvailable,
  runPython,
  validateCodeForRun,
} from "./pyodide-runner";

describe("pyodide-runner fallback", () => {
  it("reports unavailable outside the browser", () => {
    // vitest node environment: no window
    expect(pyodideAvailable()).toBe(false);
  });

  it("falls back to the lite runner when wasm/window is unavailable", async () => {
    const result = await runPython('print("hi")');
    expect(result.ok).toBe(true);
    expect(result.output).toEqual(["hi"]);
  });

  it("fallback surfaces lite-runner limits calmly", async () => {
    const result = await runPython("def f():\n    return 1");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Python Lite supports");
  });

  it("rejects source larger than the registered sandbox limit", async () => {
    const source = "a".repeat(MAX_CODE_BYTES + 1);

    expect(validateCodeForRun(source)).toContain("under 250 KB");
    await expect(runPython(source)).resolves.toMatchObject({
      ok: false,
      output: [],
    });
  });
});
