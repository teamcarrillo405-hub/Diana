import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("assignment-only LMS synchronization", () => {
  it("does not request or persist Classroom announcements", () => {
    const google = source("lib/lms/google.ts");
    const routes = [
      source("app/api/lms/classroom-sync/route.ts"),
      source("app/api/lms/sync-all/route.ts"),
    ].join("\n");

    expect(google).not.toContain("classroom.announcements.readonly");
    expect(routes).not.toContain("/announcements");
    expect(routes).not.toContain('from("inbox_items")');
  });
});
