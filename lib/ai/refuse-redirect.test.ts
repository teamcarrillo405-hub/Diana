import { describe, it, expect } from "vitest";
import { isRefusalNeeded, REDIRECT_PROMPT } from "./refuse-redirect";

describe("isRefusalNeeded", () => {
  it("returns true for 'just do it for me'", () => {
    expect(isRefusalNeeded("just do it for me")).toBe(true);
  });

  it("returns true for 'can you write this essay'", () => {
    expect(isRefusalNeeded("can you write this essay")).toBe(true);
  });

  it("returns true for 'write my paper'", () => {
    expect(isRefusalNeeded("write my paper")).toBe(true);
  });

  it("returns true for 'finish this for me'", () => {
    expect(isRefusalNeeded("finish this for me")).toBe(true);
  });

  it("returns true for 'give me the answer'", () => {
    expect(isRefusalNeeded("give me the answer")).toBe(true);
  });

  it("returns false for 'help me understand this'", () => {
    expect(isRefusalNeeded("help me understand this")).toBe(false);
  });

  it("returns false for \"what's the first step\"", () => {
    expect(isRefusalNeeded("what's the first step")).toBe(false);
  });

  it("REDIRECT_PROMPT includes 'I can help you plan this'", () => {
    expect(REDIRECT_PROMPT).toContain("I can help you plan this");
  });
});
