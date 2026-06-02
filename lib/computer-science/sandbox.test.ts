import { describe, expect, it } from "vitest";
import { runPythonLite } from "./sandbox";

describe("runPythonLite", () => {
  it("runs print, variables, and arithmetic", () => {
    const result = runPythonLite("x = 4\nprint(x + 3)");
    expect(result).toMatchObject({ ok: true, output: ["7"], error: null });
  });

  it("runs range loops", () => {
    const result = runPythonLite("for i in range(3):\n  print(i)");
    expect(result.output).toEqual(["0", "1", "2"]);
  });

  it("returns a calm unsupported-syntax message", () => {
    const result = runPythonLite("def add(a, b):\n  return a + b");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Python Lite supports");
  });
});
