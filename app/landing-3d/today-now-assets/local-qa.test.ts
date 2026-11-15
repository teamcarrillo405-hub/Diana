import { describe, expect, it } from "vitest";
import { isLocalNowQa, isLoopbackHost } from "./local-qa";

describe("isolated Now production QA", () => {
  it("requires explicit opt-in and the isolated output, and rejects deployment", () => {
    expect(isLocalNowQa({})).toBe(false);
    expect(isLocalNowQa({ DIANA_NOW_LOCAL_QA: "1" })).toBe(false);
    expect(isLocalNowQa({ DIANA_NOW_LOCAL_QA: "1", NEXT_DIST_DIR: ".next" })).toBe(false);
    expect(isLocalNowQa({ DIANA_NOW_LOCAL_QA: "1", NEXT_DIST_DIR: ".next-now-qa", VERCEL: "1" })).toBe(false);
    expect(isLocalNowQa({ DIANA_NOW_LOCAL_QA: "1", NEXT_DIST_DIR: ".next-now-qa" })).toBe(true);
    expect(isLocalNowQa({ DIANA_NOW_LOCAL_QA: "1", NEXT_DIST_DIR: ".next-now-finish" })).toBe(true);
    expect(isLocalNowQa({ DIANA_NOW_LOCAL_QA: "1", NEXT_DIST_DIR: ".next-now-finish", VERCEL: "1" })).toBe(false);
    expect(isLocalNowQa({ DIANA_NOW_LOCAL_QA: "1", NEXT_DIST_DIR: ".next-now-relit" })).toBe(true);
    expect(isLocalNowQa({ DIANA_NOW_LOCAL_QA: "1", NEXT_DIST_DIR: ".next-now-diana" })).toBe(true);
    expect(isLocalNowQa({ DIANA_NOW_LOCAL_QA: "1", NEXT_DIST_DIR: ".next-now-graphics" })).toBe(true);
    expect(isLocalNowQa({ DIANA_NOW_LOCAL_QA: "1", NEXT_DIST_DIR: ".next-now-timing" })).toBe(true);
    expect(isLocalNowQa({ NEXT_DIST_DIR: ".next-now-timing" })).toBe(false);
    expect(isLocalNowQa({ DIANA_NOW_LOCAL_QA: "1", NEXT_DIST_DIR: ".next-now-timing", VERCEL: "1" })).toBe(false);
    expect(isLocalNowQa({ NEXT_DIST_DIR: ".next-now-graphics" })).toBe(false);
    expect(isLocalNowQa({ DIANA_NOW_LOCAL_QA: "1", NEXT_DIST_DIR: ".next-now-graphics", VERCEL: "1" })).toBe(false);
    expect(isLocalNowQa({ NEXT_DIST_DIR: ".next-now-diana" })).toBe(false);
    expect(isLocalNowQa({ DIANA_NOW_LOCAL_QA: "1", NEXT_DIST_DIR: ".next-now-diana", VERCEL: "1" })).toBe(false);
    expect(isLocalNowQa({ NEXT_DIST_DIR: ".next-now-relit" })).toBe(false);
    expect(isLocalNowQa({ DIANA_NOW_LOCAL_QA: "1", NEXT_DIST_DIR: ".next-now-relit", VERCEL: "1" })).toBe(false);
    expect(isLocalNowQa({ DIANA_NOW_LOCAL_QA: "1", NEXT_DIST_DIR: ".next-now-relit-other" })).toBe(false);
    expect(isLocalNowQa({ DIANA_NOW_LOCAL_QA: "1", NEXT_DIST_DIR: ".next-now-unapproved" })).toBe(false);
  });

  it("accepts only loopback hostnames with a port", () => {
    for (const host of ["localhost:3014", "127.0.0.1:3014", "[::1]:3014"]) expect(isLoopbackHost(host)).toBe(true);
    for (const host of [null, "diana.app", "localhost.example:3014", "127.0.0.1:3014@evil.test", "0.0.0.0:3014"]) expect(isLoopbackHost(host)).toBe(false);
  });
});
