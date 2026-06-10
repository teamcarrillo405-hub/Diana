import { describe, it, expect } from "vitest";
import { pyodideAvailable, runPython } from "./pyodide-runner";

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
});
