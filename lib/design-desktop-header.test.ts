import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { COMPARISON_PAGES } from "@/lib/design-comparison";

const expectedActive = new Map<string, string>([
  ["Student Lobby.dc.html", "today"],
  ["Work.dc.html", "work"],
  ["Classes.dc.html", "classes"],
  ["Calendar.dc.html", "calendar"],
]);

function desktopFileName(designPath: string) {
  return decodeURIComponent(designPath.replace("/design/", ""));
}

describe("desktop design header", () => {
  it("uses one shared header across primary comparison screens", () => {
    expect(COMPARISON_PAGES).toHaveLength(14);

    for (const page of COMPARISON_PAGES.filter((item) => item.group === "Primary")) {
      if (!page.desktopDesign) continue;
      const fileName = desktopFileName(page.desktopDesign);
      const source = readFileSync(
        path.join(process.cwd(), "public", "design", fileName),
        "utf8",
      );
      const imports = source.match(
        /<dc-import name="Student Desktop Header"[^>]*><\/dc-import>/gu,
      );

      expect(imports, fileName).toHaveLength(1);
      expect(source.slice(0, 8_000), fileName).not.toContain('title="More tools"');
      expect(source.slice(0, 8_000), fileName).not.toContain('title="Search"');

      const active = expectedActive.get(fileName);
      if (active) expect(imports?.[0]).toContain(`active="${active}"`);
    }
  });

  it("keeps the approved desktop navigation and actions in the shared component", () => {
    const source = readFileSync(
      path.join(process.cwd(), "public", "design", "Student Desktop Header.dc.html"),
      "utf8",
    );

    for (const label of [
      "Today",
      "Work",
      "Classes",
      "Calendar",
      "More",
      "Capture",
      "VOICE NOTE",
    ]) {
      expect(source).toContain(label);
    }
    expect(source).toContain("/screendesign/brand/diana-logo-tight.png");
    expect(source).toContain('aria-label="Settings"');
  });
});