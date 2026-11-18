import { describe, it, expect } from "vitest";
import { safeAuthDestination, passwordValidation, validRecoveryEmail } from "./entry";
describe("post-auth destinations", () => {
  it.each([null, 1, "https://other.example", "//other.example", "/\\evil", "/x\nlocation", "/%2f%2fevil", "/%255cother", "/%25252f%25252fevil", "/api/lms/x", "/%61uth/callback", "/login?next=/calendar", "/reset-password", "/a/../auth/callback", "/%ZZ", "/..//evil.example", "/%2e%2e//evil.example", "/foo/..//evil.example", "/.//evil.example"])("rejects unsafe destination %s", value => {
    expect(safeAuthDestination(value)).toBe("/dashboard");
  });
  it.each(["/calendar?view=week", "/settings?section=security", "/homework/example#review", "/classes/course%20one"])("keeps a student destination %s", value => {
    expect(safeAuthDestination(value)).toBe(value);
  });
});
describe("password and email validation", () => {
  it("accepts a long matching phrase", () => expect(passwordValidation("a calm long phrase", "a calm long phrase")).toBeNull());
  it.each([["short", "short"], ["            ", "            "], ["a calm long phrase", "different phrase"], ["x".repeat(129), "x".repeat(129)]])("rejects unusable new passwords", (a, b) => expect(passwordValidation(a, b)).not.toBeNull());
  it("validates email without accepting multiple addresses", () => {
    expect(validRecoveryEmail(" student@example.test ")).toBe(true);
    expect(validRecoveryEmail("student@example.test,other@example.test")).toBe(false);
    expect(validRecoveryEmail("no-address")).toBe(false);
  });
});
