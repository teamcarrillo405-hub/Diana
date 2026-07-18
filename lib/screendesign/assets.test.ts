import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  SCREEN_DESIGN_ASSET_IDS,
  getScreenDesignAsset,
} from "@/lib/screendesign/assets";
import { SCREEN_DESIGN_SCREENS } from "@/lib/screendesign/screens";

interface ManifestEntry {
  id: string;
  sourceUrl: string;
  localPath: string;
  sha256: string;
  mimeType: string;
  width: number;
  height: number;
  hasAlpha: boolean;
  alphaIntent: "opaque" | "preserve";
  semanticRole: string;
  consumers: string[];
}

interface AssetManifest {
  schemaVersion: number;
  assetCount: number;
  screenDesignAssetCount: number;
  avatarAssetCount: number;
  assets: ManifestEntry[];
}

interface ImageMetadata {
  width?: number;
  height?: number;
  hasAlpha?: boolean;
}

type SharpFactory = (
  input: Buffer,
  options?: { failOn?: "error" },
) => { metadata: () => Promise<ImageMetadata> };

const sharp = createRequire(import.meta.url)("sharp") as SharpFactory;

const PUBLIC_ROOT = path.resolve(process.cwd(), "public");
const MANIFEST_PATH = path.resolve(
  process.cwd(),
  "docs",
  "design",
  "screendesign-asset-provenance.json",
);

const loadManifest = async (): Promise<AssetManifest> =>
  JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as AssetManifest;

const extractRemoteUrls = (html: string): Set<string> =>
  new Set(
    (
      html.match(
        /https:\/\/(?:media\.screensdesign\.com|api\.dicebear\.com)\/[^\s"'()<>]+/gu,
      ) ?? []
    ).map((value) => value.replaceAll("&amp;", "&")),
  );

const localFileFor = (localPath: string): string =>
  path.join(PUBLIC_ROOT, ...localPath.slice(1).split("/"));

describe("ScreenDesign asset integrity", () => {
  it("resolves every typed asset id to frozen local-only rendering metadata", () => {
    expect(SCREEN_DESIGN_ASSET_IDS).toHaveLength(28);
    expect(new Set(SCREEN_DESIGN_ASSET_IDS).size).toBe(28);

    for (const id of SCREEN_DESIGN_ASSET_IDS) {
      const asset = getScreenDesignAsset(id);
      expect(asset.id).toBe(id);
      expect(asset.localPath).toMatch(/^\/screendesign\//u);
      expect(asset.localPath).not.toMatch(/^https?:/u);
      expect(asset).not.toHaveProperty("sourceUrl");
      expect(asset).not.toHaveProperty("sha256");
      expect(Object.isFrozen(asset)).toBe(true);
      expect(Object.isFrozen(asset.consumers)).toBe(true);
    }
  });

  it("keeps dashboard layers, brand art, tutors, and community avatars distinct", () => {
    const requiredIds = [
      "dashboard-stadium-background",
      "dashboard-athlete-cutout",
      "onboarding-welcome-background",
      "diana-logo",
      "diana-mascot",
      "tutor-math-expert",
      "tutor-science-expert",
      "community-sarah-avatar",
      "community-felix-avatar",
      "community-leo-avatar",
      "community-buster-avatar",
    ] as const;

    const required = requiredIds.map((id) => getScreenDesignAsset(id));
    expect(new Set(required.map((asset) => asset.id)).size).toBe(requiredIds.length);
    expect(new Set(required.map((asset) => asset.localPath)).size).toBe(
      requiredIds.length,
    );
    expect(getScreenDesignAsset("dashboard-stadium-background").localPath).toBe(
      "/screendesign/dashboard/stadium-background.jpg",
    );
    expect(getScreenDesignAsset("dashboard-athlete-cutout").localPath).toBe(
      "/screendesign/dashboard/athlete-cutout.png",
    );
  });

  it("rejects an unknown runtime id", () => {
    expect(() =>
      getScreenDesignAsset("not-a-canonical-asset" as never),
    ).toThrow(/Unknown ScreenDesign asset id/u);
  });

  it("matches every checked-in file to the manifest checksum and dimensions", async () => {
    const manifest = await loadManifest();
    expect(manifest).toMatchObject({
      schemaVersion: 1,
      assetCount: 28,
      screenDesignAssetCount: 24,
      avatarAssetCount: 4,
    });
    expect(manifest.assets).toHaveLength(28);

    for (const entry of manifest.assets) {
      const buffer = await readFile(localFileFor(entry.localPath));
      const checksum = createHash("sha256").update(buffer).digest("hex");
      const metadata = await sharp(buffer, { failOn: "error" }).metadata();

      expect(checksum, entry.id).toBe(entry.sha256);
      expect(metadata.width, entry.id).toBe(entry.width);
      expect(metadata.height, entry.id).toBe(entry.height);
      expect(metadata.hasAlpha === true, entry.id).toBe(entry.hasAlpha);
      expect(entry.semanticRole.length, entry.id).toBeGreaterThan(0);
      expect(entry.consumers.length, entry.id).toBeGreaterThan(0);
      expect(entry.alphaIntent, entry.id).toMatch(/^(opaque|preserve)$/u);
    }
  });

  it("maps the complete canonical remote URL inventory to local assets and consumers", async () => {
    const manifest = await loadManifest();
    const manifestBySourceUrl = new Map(
      manifest.assets.map((entry) => [entry.sourceUrl, entry]),
    );
    const consumersBySourceUrl = new Map<string, Set<string>>();

    for (const screen of SCREEN_DESIGN_SCREENS) {
      const html = await readFile(screen.source, "utf8");
      for (const sourceUrl of extractRemoteUrls(html)) {
        const consumers = consumersBySourceUrl.get(sourceUrl) ?? new Set<string>();
        consumers.add(screen.id);
        consumersBySourceUrl.set(sourceUrl, consumers);
      }
    }

    expect(consumersBySourceUrl.size).toBe(28);
    expect(
      [...consumersBySourceUrl.keys()].filter((sourceUrl) =>
        sourceUrl.startsWith("https://media.screensdesign.com/"),
      ),
    ).toHaveLength(24);
    expect(
      [...consumersBySourceUrl.keys()].filter((sourceUrl) =>
        sourceUrl.startsWith("https://api.dicebear.com/"),
      ),
    ).toHaveLength(4);
    expect([...manifestBySourceUrl.keys()].sort()).toEqual(
      [...consumersBySourceUrl.keys()].sort(),
    );

    for (const [sourceUrl, consumers] of consumersBySourceUrl) {
      const entry = manifestBySourceUrl.get(sourceUrl);
      expect(entry, sourceUrl).toBeDefined();
      expect(entry?.localPath, sourceUrl).toMatch(/^\/screendesign\//u);
      expect(entry?.consumers, sourceUrl).toEqual([...consumers].sort());
    }
  });
});
