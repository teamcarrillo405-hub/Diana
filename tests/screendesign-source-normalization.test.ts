import { readFile } from "node:fs/promises";
import path from "node:path";

import postcss from "postcss";
import type { Page, Request, Route } from "@playwright/test";
import { describe, expect, it } from "vitest";

import {
  SCREEN_DESIGN_EXPORT_DIR,
  SCREEN_DESIGN_SCREENS,
  type ScreenDesignScreen,
} from "@/lib/screendesign/screens";
import {
  SCREENDESIGN_CAPTURE_STYLESHEET_PATH,
  normalizeScreenDesignSource,
  type ScreenDesignSourceAsset,
} from "@/tests/helpers/normalize-screendesign-source";
import {
  assertScreenDesignSourceAssetsExist,
  startScreenDesignSourceServer,
  type ScreenDesignSourceManifestEntry,
} from "@/tests/fixtures/screendesign-source-server";

interface ScreenDesignManifest {
  readonly assetCount: number;
  readonly screenDesignAssetCount: number;
  readonly avatarAssetCount: number;
  readonly assets: readonly ScreenDesignSourceManifestEntry[];
}

interface SourceDocument {
  readonly screen: ScreenDesignScreen;
  readonly source: string;
  readonly normalized: string;
}

const MANIFEST_PATH = path.join(
  process.cwd(),
  "public",
  "screendesign",
  "manifest.json",
);

const readManifest = async (): Promise<ScreenDesignManifest> =>
  JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as ScreenDesignManifest;

const countOccurrences = (value: string, search: string): number =>
  value.split(search).length - 1;

const extractStyle = (html: string): string => {
  const match = html.match(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style\s*>/iu);
  if (!match?.[1]) {
    throw new Error("Expected the source document to contain an inline style block");
  }

  return match[1];
};

const readCorpus = async (): Promise<{
  readonly assets: readonly ScreenDesignSourceAsset[];
  readonly documents: readonly SourceDocument[];
}> => {
  const manifest = await readManifest();
  const documents = await Promise.all(
    SCREEN_DESIGN_SCREENS.map(async (screen): Promise<SourceDocument> => {
      const source = await readFile(screen.source, "utf8");
      return {
        screen,
        source,
        normalized: normalizeScreenDesignSource({
          screen,
          html: source,
          assets: manifest.assets,
        }),
      };
    }),
  );

  return { assets: manifest.assets, documents };
};

describe("normalizeScreenDesignSource", () => {
  it("normalizes exactly the 47 canonical sources into inert local documents", async () => {
    const manifest = await readManifest();
    const { documents } = await readCorpus();

    expect(SCREEN_DESIGN_SCREENS).toHaveLength(47);
    expect(documents).toHaveLength(47);
    expect(manifest).toMatchObject({
      assetCount: 28,
      screenDesignAssetCount: 24,
      avatarAssetCount: 4,
    });
    expect(
      SCREEN_DESIGN_SCREENS.some((screen) =>
        screen.source.endsWith("/dashboard_personalized.html"),
      ),
    ).toBe(false);

    for (const { screen, normalized } of documents) {
      expect(normalized, screen.id).not.toMatch(
        /<(?:script|module|iframe|object|embed|base)\b/iu,
      );
      expect(normalized, screen.id).not.toMatch(
        /<link\b[^>]*\bhref\s*=\s*["']https?:\/\//iu,
      );
      expect(normalized, screen.id).not.toMatch(
        /\son[a-z][a-z0-9:_-]*\s*=/iu,
      );
      expect(normalized, screen.id).not.toMatch(/\bhttps?:\/\//iu);
      expect(normalized, screen.id).not.toMatch(/\bjavascript\s*:/iu);
      expect(
        countOccurrences(normalized, SCREENDESIGN_CAPTURE_STYLESHEET_PATH),
        screen.id,
      ).toBe(1);
    }
  });

  it("rewrites every occurrence of all 24 ScreenDesign and four DiceBear resources exactly", async () => {
    const { assets, documents } = await readCorpus();

    expect(assets).toHaveLength(28);
    expect(
      assets.filter(
        (asset) => new URL(asset.sourceUrl).hostname === "media.screensdesign.com",
      ),
    ).toHaveLength(24);
    expect(
      assets.filter(
        (asset) => new URL(asset.sourceUrl).hostname === "api.dicebear.com",
      ),
    ).toHaveLength(4);

    for (const asset of assets) {
      const remoteOccurrences = documents.reduce(
        (count, document) => count + countOccurrences(document.source, asset.sourceUrl),
        0,
      );
      const localOccurrences = documents.reduce(
        (count, document) =>
          count + countOccurrences(document.normalized, asset.localPath),
        0,
      );

      expect(remoteOccurrences, asset.sourceUrl).toBeGreaterThan(0);
      expect(localOccurrences, asset.localPath).toBe(remoteOccurrences);
    }
  });

  it("repairs only the attached dashboard stadium declaration and preserves separate image layers", async () => {
    const manifest = await readManifest();
    const dashboard = SCREEN_DESIGN_SCREENS.find(
      (screen) => screen.id === "dashboard-personalized",
    );
    expect(dashboard).toBeDefined();

    const source = await readFile(dashboard!.source, "utf8");
    const normalized = normalizeScreenDesignSource({
      screen: dashboard!,
      html: source,
      assets: manifest.assets,
    });
    const stadium = manifest.assets.find(
      (asset) => asset.localPath === "/screendesign/dashboard/stadium-background.jpg",
    );
    const athlete = manifest.assets.find(
      (asset) => asset.localPath === "/screendesign/dashboard/athlete-cutout.png",
    );
    expect(stadium).toBeDefined();
    expect(athlete).toBeDefined();

    const sourceCss = extractStyle(source);
    const normalizedCss = extractStyle(normalized);
    const expectedCss = sourceCss
      .replace(stadium!.sourceUrl, stadium!.localPath)
      .replace(
        `) data-media-ref="generated:122834"`,
        ")",
      );

    expect(normalizedCss).toBe(expectedCss);
    expect(() => postcss.parse(normalizedCss)).not.toThrow();

    let stadiumDeclaration: string | undefined;
    postcss.parse(normalizedCss).walkDecls("background-image", (declaration) => {
      if (declaration.parent?.toString().includes(".stadium-bg")) {
        stadiumDeclaration = declaration.value;
      }
    });
    expect(stadiumDeclaration).toBe(
      `linear-gradient(rgba(15, 23, 42, 0.1), rgba(15, 23, 42, 0.7)), url('${stadium!.localPath}')`,
    );
    expect(normalized).toContain(`src="${athlete!.localPath}"`);
    expect(normalized).toContain('class="athlete-cutout"');
  });

  it("strips executable export markup and inline handlers without evaluating it", async () => {
    const manifest = await readManifest();
    const screen = SCREEN_DESIGN_SCREENS[0];
    const logo = manifest.assets.find((asset) => asset.localPath.includes("diana-logo"));
    expect(screen).toBeDefined();
    expect(logo).toBeDefined();

    const html = `<!doctype html>
      <html lang="en" onload="globalThis.compromised = true">
        <head>
          <link rel="stylesheet" href="https://example.test/export.css">
          <link rel="preload" href="/runtime.js" as="script">
          <meta http-equiv="refresh" content="0; url=https://example.test">
          <base href="https://example.test/">
          <script>globalThis.compromised = true</script>
          <script type="module" src="https://example.test/runtime.js"></script>
          <module src="https://example.test/legacy-module.js"></module>
          <style>.kept { color: rgb(1 2 3); }</style>
        </head>
        <body>
          <button onclick='globalThis.compromised = true'>Keep this button</button>
          <a href="javascript:globalThis.compromised = true">Keep this label</a>
          <img src="${logo!.sourceUrl}" onerror=globalThis.compromised=true alt="DIANA">
          <iframe src="https://example.test/frame"></iframe>
          <object data="https://example.test/object"></object>
          <embed src="https://example.test/embed">
        </body>
      </html>`;

    const normalized = normalizeScreenDesignSource({
      screen,
      html,
      assets: manifest.assets,
    });

    expect(normalized).toContain("Keep this button");
    expect(normalized).toContain("Keep this label");
    expect(normalized).toContain(".kept { color: rgb(1 2 3); }");
    expect(normalized).toContain(`src="${logo!.localPath}"`);
    expect(normalized).not.toMatch(/compromised/iu);
    expect(normalized).not.toMatch(/<(?:script|module|iframe|object|embed|base)\b/iu);
    expect(normalized).not.toMatch(/\son[a-z][a-z0-9:_-]*\s*=/iu);
    expect(normalized).not.toMatch(/\b(?:https?:\/\/|javascript\s*:)/iu);
  });

  it("rejects the excluded folder dashboard and any fuzzy or unmapped media URL", async () => {
    const manifest = await readManifest();
    const dashboard = SCREEN_DESIGN_SCREENS.find(
      (screen) => screen.id === "dashboard-personalized",
    );
    expect(dashboard).toBeDefined();
    const folderDashboard = path.join(
      SCREEN_DESIGN_EXPORT_DIR,
      "dashboard_personalized.html",
    );
    const folderDashboardHtml = await readFile(folderDashboard, "utf8");

    expect(() =>
      normalizeScreenDesignSource({
        screen: { ...dashboard!, source: folderDashboard },
        html: folderDashboardHtml,
        assets: manifest.assets,
      }),
    ).toThrow(/canonical ScreenDesign registry/iu);

    const screen = SCREEN_DESIGN_SCREENS[0];
    const source = await readFile(screen.source, "utf8");
    const referencedAsset = manifest.assets.find((asset) =>
      source.includes(asset.sourceUrl),
    );
    expect(referencedAsset).toBeDefined();
    const fuzzySource = source.replace(
      referencedAsset!.sourceUrl,
      `${referencedAsset!.sourceUrl}?unmapped=1`,
    );

    expect(() =>
      normalizeScreenDesignSource({
        screen,
        html: fuzzySource,
        assets: manifest.assets,
      }),
    ).toThrow(/unmapped remote URL/iu);
  });
});

describe("isolated ScreenDesign source server", () => {
  it("serves all 47 normalized documents, compiled capture CSS, and all local assets", async () => {
    const manifest = await readManifest();
    const server = await startScreenDesignSourceServer();

    try {
      for (const screen of SCREEN_DESIGN_SCREENS) {
        const response = await fetch(server.sourceUrl(screen.id));
        const html = await response.text();
        expect(response.status, screen.id).toBe(200);
        expect(response.headers.get("content-type"), screen.id).toContain(
          "text/html",
        );
        expect(response.headers.get("content-security-policy"), screen.id).toContain(
          "script-src 'none'",
        );
        expect(html, screen.id).toContain(SCREENDESIGN_CAPTURE_STYLESHEET_PATH);
        expect(html, screen.id).not.toMatch(/\bhttps?:\/\//iu);
      }

      const stylesheetResponse = await fetch(
        new URL(SCREENDESIGN_CAPTURE_STYLESHEET_PATH, server.origin),
      );
      const stylesheet = await stylesheetResponse.text();
      expect(stylesheetResponse.status).toBe(200);
      expect(stylesheetResponse.headers.get("content-type")).toContain("text/css");
      expect(stylesheet).toContain(".flex");
      expect(stylesheet).toContain("width: 180px");
      expect(stylesheet).toContain("body > .iphone-frame");

      for (const asset of manifest.assets) {
        const response = await fetch(new URL(asset.localPath, server.origin));
        expect(response.status, asset.localPath).toBe(200);
        expect(response.headers.get("content-type"), asset.localPath).toContain(
          asset.mimeType,
        );
        expect((await response.arrayBuffer()).byteLength, asset.localPath).toBeGreaterThan(
          0,
        );
      }

      const unknown = await fetch(`${server.origin}/source/dashboard_personalized`);
      expect(unknown.status).toBe(404);
      expect(server.servedRequests.filter((request) => request.status === 200)).toHaveLength(
        47 + 1 + 28,
      );
    } finally {
      await server.close();
    }
  }, 30_000);

  it("fails before listening when any checked-in manifest asset is missing", async () => {
    const manifest = await readManifest();
    await expect(
      assertScreenDesignSourceAssetsExist(
        manifest.assets,
        path.join(process.cwd(), "tests", "fixtures", "missing-public-root"),
      ),
    ).rejects.toThrow(/missing local asset/iu);
  });

  it("aborts and records every remote browser request", async () => {
    const manifest = await readManifest();
    const server = await startScreenDesignSourceServer();
    let routeHandler: ((route: Route) => Promise<void>) | undefined;
    const listeners = new Map<string, (request: Request) => void>();
    const page = {
      on: (event: string, listener: (request: Request) => void) => {
        listeners.set(event, listener);
      },
      off: (event: string) => {
        listeners.delete(event);
      },
      route: async (_pattern: string, handler: (route: Route) => Promise<void>) => {
        routeHandler = handler;
      },
      unroute: async () => {
        routeHandler = undefined;
      },
    } as unknown as Page;

    const makeRoute = (url: string) => {
      const state = { aborted: false, continued: false };
      const request = {
        url: () => url,
        method: () => "GET",
        resourceType: () => "document",
        failure: () => null,
      } as unknown as Request;
      const route = {
        request: () => request,
        continue: async () => {
          state.continued = true;
        },
        abort: async () => {
          state.aborted = true;
        },
      } as unknown as Route;
      return { request, route, state };
    };

    try {
      const installed = await server.installRequestPolicy(page, "dashboard-personalized");
      expect(routeHandler).toBeDefined();

      const allowedUrls = [
        server.sourceUrl("dashboard-personalized"),
        new URL(SCREENDESIGN_CAPTURE_STYLESHEET_PATH, server.origin).href,
        new URL(manifest.assets[0]!.localPath, server.origin).href,
      ];
      for (const url of allowedUrls) {
        const local = makeRoute(url);
        await routeHandler!(local.route);
        expect(local.state, url).toEqual({ aborted: false, continued: true });
        listeners.get("requestfinished")?.(local.request);
      }

      const deniedUrls = [
        "https://media.screensdesign.com/gasset/export.png",
        "https://api.dicebear.com/9.x/thumbs/svg?seed=student",
        "https://cdn.tailwindcss.com/runtime.js",
        "https://code.iconify.design/iconify-icon/3.0.0/iconify-icon.min.js",
        "https://fonts.googleapis.com/css2?family=Inter",
        "https://example.test/other-internet-host",
      ];
      const remoteRoutes = deniedUrls.map(makeRoute);
      for (const remote of remoteRoutes) {
        await routeHandler!(remote.route);
        expect(remote.state, remote.request.url()).toEqual({
          aborted: true,
          continued: false,
        });
      }

      expect(installed.evidence.remoteAttempts).toHaveLength(deniedUrls.length);
      expect(
        installed.evidence.remoteAttempts.every(
          (record) => !record.allowed && record.outcome === "blocked",
        ),
      ).toBe(true);
      expect(() => installed.evidence.assertNoRemoteRequests()).toThrow(
        /attempted remote requests/iu,
      );
      expect(installed.evidence.records).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            url: deniedUrls[0],
            allowed: false,
            outcome: "blocked",
          }),
        ]),
      );

      await installed.dispose();
    } finally {
      await server.close();
    }
  }, 30_000);
});
