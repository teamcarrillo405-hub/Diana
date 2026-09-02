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

const HELP_MODE_ASSETS = [
  "public/assets/help-modes/make-the-game-poster.webp",
  "public/assets/help-modes/make-the-game.mp4",
  "public/assets/help-modes/make-the-game.webm",
  "public/assets/help-modes/show-up-for-your-club-poster.webp",
  "public/assets/help-modes/show-up-for-your-club.mp4",
  "public/assets/help-modes/show-up-for-your-club.webm",
] as const;

function readManifest(): ReleaseManifest {
  return JSON.parse(
    readFileSync(path.resolve("config", "beta-release-manifest.json"), "utf8"),
  ) as ReleaseManifest;
}

describe("beta release composition", () => {
  it("ships every source the canonical help-mode videos advertise", () => {
    const manifest = readManifest();
    expect(manifest.restoreFromHead).toContain("public/assets/help-modes");
    for (const asset of HELP_MODE_ASSETS) {
      expect(manifest.includeFromWorktree).toContain(asset);
      expect(existsSync(path.resolve(asset))).toBe(true);
    }
  });

  it("holds unfinished 3D landing work out of the web beta", () => {
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
    expect(manifest.restoreFromHead).toEqual(expect.arrayContaining([
      "app/landing-3d",
      "components/cinematic-logo-mask-hero.tsx",
      "public/landing-3d",
    ]));
  });
});
