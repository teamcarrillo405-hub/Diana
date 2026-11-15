import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type ReleaseManifest = {
  schemaVersion: number;
  kind: string;
  profile: string;
  ageBoundary: {
    minimumAccountAge: number;
    under13AccountsEnabled: boolean;
    under13DirectAiEnabled: boolean;
    guardianFoundation: string;
    under13ReleaseGateContractVersion: number;
  };
  restoreFromHead: string[];
  includeFromWorktree: string[];
};

const REQUIRED_WORKTREE_ASSETS = [
  "public/assets/dashboard/diana-dashboard-school-1472x778.webp",
  "public/assets/dashboard/diana-today-home-screen.png",
  "public/assets/fonts/outfit-landing.woff2",
  "public/assets/video/diana-work-stays-yours-film-poster-v2.webp",
  "public/images/assignment/gamer-study-room-blur.png",
  "public/images/assignment/gamer-study-room.png",
  "public/images/auth-command-space.png",
  "public/images/calendar-gamer-planning-studio.png",
  "public/images/classes-gamer-classroom.png",
  "public/images/classes-high-tech-classroom.png",
  "public/images/diana-loading-empty-studio.png",
  "public/images/more-gamer-classroom.png",
  "public/images/onboarding-study-sunlight.png",
  "public/images/record-gamer-gallery-v2.png",
  "public/images/today-future-academy-4k.webp",
  "public/images/today-gamer-high-school.png",
  "public/images/today-milestones/sessions-finished.svg",
  "public/images/today-milestones/work-completed.svg",
  "public/images/today-milestones/work-submitted.svg",
  "public/privacy.html",
  "public/screendesign/brand/diana-logo-no-shadow.png",
  "public/screendesign/brand/diana-logo-tight-dark-wordmark.png",
  "public/screendesign/brand/diana-logo-tight-no-shadow.png",
  "public/trust.html",
] as const;

function readManifest(): ReleaseManifest {
  return JSON.parse(
    readFileSync(path.resolve("config", "beta-release-manifest.json"), "utf8"),
  ) as ReleaseManifest;
}

describe("beta release composition", () => {
  it("ships only the active public assets the current runtime requires", () => {
    const manifest = readManifest();
    expect(manifest.restoreFromHead).toEqual([".planning"]);
    expect(manifest.includeFromWorktree).toEqual(REQUIRED_WORKTREE_ASSETS);
    for (const asset of REQUIRED_WORKTREE_ASSETS) {
      expect(existsSync(path.resolve(asset))).toBe(true);
    }
  });

  it("keeps retired preview systems out of the release manifest", () => {
    const manifest = readManifest();
    expect(manifest).toMatchObject({
      schemaVersion: 2,
      kind: "diana-beta-release-manifest",
      profile: "web-pwa-13-plus",
      ageBoundary: {
        minimumAccountAge: 13,
        under13AccountsEnabled: false,
        under13DirectAiEnabled: false,
        guardianFoundation: "disabled",
        under13ReleaseGateContractVersion: 1,
      },
    });
    for (const retiredPath of [
      "app/landing-3d",
      "components/cinematic-logo-mask-hero.tsx",
      "diana-logo.png",
      "public/landing-3d",
      "public/assets/comfyui-i2v",
      "public/assets/candidates",
      "public/assets/final",
      "public/assets/hero",
      "public/assets/help-fit",
      "public/assets/help-modes",
      "public/assets/homework",
      "public/assets/video",
    ]) {
      expect(manifest.restoreFromHead).not.toContain(retiredPath);
      expect(manifest.includeFromWorktree).not.toContain(retiredPath);
    }
  });
});
