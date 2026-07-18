import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("ScreenDesign academic reporting route contracts", () => {
  it("keeps every report query explicitly owner scoped", () => {
    for (const paths of [
      ["app/(app)/ap/page.tsx", "app/(app)/ap/ap-client.tsx"],
      ["app/(app)/grades/page.tsx"],
      ["app/(app)/grades/transcript/page.tsx"],
    ]) {
      const source = paths.map(read).join("\n");
      expect(source).toContain("getUser()");
      expect(source).toContain('.eq("owner_id", user.id)');
    }
  });

  it("removes legacy shells from all three canonical report routes", () => {
    for (const paths of [
      ["app/(app)/ap/page.tsx", "app/(app)/ap/ap-client.tsx"],
      ["app/(app)/grades/page.tsx"],
      ["app/(app)/grades/transcript/page.tsx"],
    ]) {
      const source = paths.map(read).join("\n");
      expect(source).not.toContain("PageShell");
      expect(source).not.toContain("AppTopNav");
      expect(source).toContain("ScreenDesignViewport");
    }
  });

  it("does not retain the fabricated grade preview cards", () => {
    const source = read("app/(app)/grades/page.tsx");
    expect(source).not.toContain("gradePreviewSignals");
    expect(source).not.toContain("Biology first, then English evidence.");
    expect(source).not.toContain("ALL-PRO RANK");
    expect(source).toContain('from("mastery_concepts")');
    expect(source).toContain('from("mastery_events")');
    expect(source).toContain("self_confidence");
    expect(source).toContain("Open mastery detail");
  });

  it("keeps transcript claims and export routing evidence backed", () => {
    const source = read("app/(app)/grades/transcript/page.tsx");
    expect(source).not.toContain("GPA BOOST");
    expect(source).not.toContain("HONORS");
    expect(source).not.toContain("VERIFIED BY DIANA AI");
    expect(source).toContain('from("mastery_concepts")');
    expect(source).toContain('from("mastery_events")');
    expect(source).toContain("Export transcript");
    expect(source).toContain('/export?category=mastery_concepts');
  });
});
