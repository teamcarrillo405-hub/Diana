import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const source = readFileSync("public/sw.js", "utf8");
const isPublicAsset = runInNewContext(`${source}\nisPublicStaticAsset`, {
  self: { addEventListener() {} }, URL,
}) as (path: string) => boolean;

describe("campus service worker asset boundary", () => {
  it("caches only repository-owned presentation assets", () => {
    for (const path of ["/assets/campus/entry-mobile.webp", "/assets/classes/academic-hall-4k.webp", "/assets/fonts/roboto-slab-latin.woff2", "/assets/today-now/selection-brush-v1.webp", "/icons/diana-icon.svg"]) expect(isPublicAsset(path)).toBe(true);
  });
  it("keeps private work, school uploads, API results and route HTML out of the shared asset cache", () => {
    for (const path of ["/dashboard", "/auth/callback", "/api/notes", "/storage/v1/object/private/student.pdf", "/assets/campus/student.pdf", "/assets/campus/nested/private.webp", "/assets/today-now/student-logo.webp", "/uploads/school-logo.webp"]) expect(isPublicAsset(path)).toBe(false);
  });
  it("lets an update wait without taking over an open assignment", () => {
    expect(source).not.toContain("self.skipWaiting()");
    expect(source).toContain('const CORE_ROUTES = ["/offline", "/icons/diana-icon.svg"]');
  });
});
