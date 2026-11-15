import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("production route connectivity", () => {
  it("keeps quiz work free of the retired capture route", () => {
    const practiceSession = read("app/(app)/study-artifacts/[id]/practice-session.tsx");

    expect(practiceSession).not.toContain('href="/capture"');
  });

  it("routes capture class creation to the supported classes state", () => {
    const confirmForm = read("app/(app)/assignments/captures/[id]/confirm-form.tsx");

    expect(confirmForm).toContain('router.push("/classes?create=1")');
    expect(confirmForm).not.toContain('router.push("/classes/new")');
  });

  it("keeps Record and Sharing connected to mobile primary navigation", () => {
    const proof = read("app/(app)/proof/page.tsx");
    const sharing = read("app/(app)/sharing/page.tsx");

    expect(proof.match(/<StudentBottomNav \/>/gu)).toHaveLength(2);
    expect(sharing.match(/<StudentBottomNav \/>/gu)).toHaveLength(1);
  });

  it("connects directory matches to the mobile search result group", () => {
    const search = read("app/(app)/search/page.tsx");

    expect(search).toContain("<SearchDirectoryResults items={directoryMatches} />");
    expect(search).toContain("results.length === 0 && directoryMatches.length === 0");
  });
});
