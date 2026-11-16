import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("production route connectivity", () => {
  it("routes visible capture actions to quick add and keeps quiz work free of the retired capture route", () => {
    const flashcardReview = read("app/(app)/flashcards/[id]/review/review-session.tsx");
    const practiceSession = read("app/(app)/study-artifacts/[id]/practice-session.tsx");

    expect(flashcardReview).toContain('href="/quick-add"');
    expect(flashcardReview).not.toContain('href="/capture"');
    expect(practiceSession).not.toContain('href="/capture"');
  });

  it("returns to the intake screen after class creation", () => {
    const confirmForm = read("app/(app)/inbox/[id]/confirm-form.tsx");
    const quickAdd = read("app/(app)/quick-add/page.tsx");
    const classes = read("app/(app)/classes/page.tsx");
    const classForm = read("app/(app)/classes/class-form.tsx");

    expect(confirmForm).toContain('/classes?create=1&intake=${inboxItemId}');
    expect(quickAdd).toContain('/classes?create=1&intake=add');
    expect(classes).toContain('z.string().uuid().safeParse(intake)');
    expect(classes).toContain('captureId.success ? `/assignments/captures/${captureId.data}`');
    expect(classes).toContain('intake === "add" ? "/quick-add"');
    expect(classForm).toContain('router.replace(returnTo)');
  });

  it("keeps Record and Sharing connected to mobile primary navigation", () => {
    const proof = read("app/(app)/proof/page.tsx");
    const sharing = read("app/(app)/sharing/page.tsx");

    expect(proof).toContain('<StudentShell active="More"');
    expect(sharing).toContain('<StudentShell active="More"');
  });

  it("connects directory matches to the mobile search result group", () => {
    const search = read("app/(app)/search/page.tsx");

    expect(search).toContain("directoryMatches.map(item=><Link");
    expect(search).toContain("!results.length && !directoryMatches.length");
  });
});
