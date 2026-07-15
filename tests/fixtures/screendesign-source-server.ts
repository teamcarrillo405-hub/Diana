import { readFile, stat } from "node:fs/promises";
import { createServer, type Server as HttpServer } from "node:http";
import path from "node:path";

import type { Page, Request, Route } from "@playwright/test";
import postcss from "postcss";
import tailwindcss from "tailwindcss";

import {
  SCREEN_DESIGN_SCREEN_BY_ID,
  SCREEN_DESIGN_SCREENS,
} from "@/lib/screendesign/screens";
import {
  SCREENDESIGN_CAPTURE_STYLESHEET_PATH,
  normalizeScreenDesignSource,
  type ScreenDesignSourceAsset,
} from "@/tests/helpers/normalize-screendesign-source";

export interface ScreenDesignSourceManifestEntry extends ScreenDesignSourceAsset {
  readonly id: string;
  readonly mimeType: string;
}

interface SourceManifest {
  readonly schemaVersion: number;
  readonly assetCount: number;
  readonly screenDesignAssetCount: number;
  readonly avatarAssetCount: number;
  readonly assets: readonly ScreenDesignSourceManifestEntry[];
}

export interface ScreenDesignServedRequest {
  readonly method: string;
  readonly pathname: string;
  readonly status: number;
}

export type ScreenDesignBrowserRequestOutcome =
  | "pending"
  | "completed"
  | "failed"
  | "blocked";

export interface ScreenDesignBrowserRequestRecord {
  readonly screenId: string;
  readonly url: string;
  readonly method: string;
  readonly resourceType: string;
  readonly remote: boolean;
  readonly allowed: boolean;
  readonly outcome: ScreenDesignBrowserRequestOutcome;
  readonly failureText: string | null;
}

interface MutableBrowserRequestRecord {
  screenId: string;
  url: string;
  method: string;
  resourceType: string;
  remote: boolean;
  allowed: boolean;
  outcome: ScreenDesignBrowserRequestOutcome;
  failureText: string | null;
}

export interface InstalledScreenDesignRequestPolicy {
  readonly evidence: ScreenDesignRequestEvidence;
  readonly dispose: () => Promise<void>;
}

export interface StartScreenDesignSourceServerOptions {
  readonly host?: string;
  readonly port?: number;
  readonly projectRoot?: string;
  readonly publicRoot?: string;
}

export interface ScreenDesignSourceServer {
  readonly origin: string;
  readonly servedRequests: readonly ScreenDesignServedRequest[];
  readonly sourceUrl: (screenId: string) => string;
  readonly installRequestPolicy: (
    page: Page,
    screenId: string,
  ) => Promise<InstalledScreenDesignRequestPolicy>;
  readonly close: () => Promise<void>;
}

const EXPECTED_ASSET_COUNT = 28;
const SOURCE_ROUTE_PREFIX = "/source/";
const TAILWIND_INPUT =
  "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n";
const CAPTURE_OVERRIDES = `
html,
body {
  width: 100%;
  min-height: 100%;
  margin: 0;
  background: #0f172a;
}

body > .iphone-frame {
  margin: 0 auto !important;
}

iconify-icon {
  display: inline-block;
  width: 1em;
  height: 1em;
  flex: 0 0 auto;
  vertical-align: -0.125em;
}
`;

const fail = (message: string): never => {
  throw new Error(`ScreenDesign source server failed: ${message}`);
};

const manifestPathFor = (publicRoot: string): string =>
  path.join(publicRoot, "screendesign", "manifest.json");

const localAssetFile = (publicRoot: string, localPath: string): string => {
  const normalizedSegments = localPath.slice(1).split("/");
  const resolved = path.resolve(publicRoot, ...normalizedSegments);
  const resolvedRoot = path.resolve(publicRoot);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    fail(`asset path escapes the public root: ${localPath}`);
  }
  return resolved;
};

const loadManifest = async (publicRoot: string): Promise<SourceManifest> => {
  let manifest: SourceManifest;
  try {
    manifest = JSON.parse(
      await readFile(manifestPathFor(publicRoot), "utf8"),
    ) as SourceManifest;
  } catch (error) {
    return fail(
      `could not read the checked-in manifest: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (
    manifest.schemaVersion !== 1 ||
    manifest.assetCount !== EXPECTED_ASSET_COUNT ||
    manifest.screenDesignAssetCount !== 24 ||
    manifest.avatarAssetCount !== 4 ||
    !Array.isArray(manifest.assets) ||
    manifest.assets.length !== EXPECTED_ASSET_COUNT
  ) {
    fail("manifest header does not match the canonical 24 plus four asset contract");
  }

  return manifest;
};

export const assertScreenDesignSourceAssetsExist = async (
  assets: readonly ScreenDesignSourceManifestEntry[],
  publicRoot: string,
): Promise<void> => {
  for (const asset of assets) {
    const fileStats = await stat(localAssetFile(publicRoot, asset.localPath)).catch(
      () => fail(`missing local asset: ${asset.localPath}`),
    );
    if (!fileStats.isFile() || fileStats.size <= 0) {
      fail(`local asset is not a non-empty file: ${asset.localPath}`);
    }
  }
};

const compileCaptureStylesheet = async (
  documents: readonly string[],
): Promise<string> => {
  const result = await postcss([
    tailwindcss({
      content: documents.map((raw) => ({ raw, extension: "html" })),
      theme: { extend: {} },
      plugins: [],
    }),
  ]).process(TAILWIND_INPUT, { from: undefined });

  return `${result.css}\n${CAPTURE_OVERRIDES}`;
};

const securityHeaders = (contentType: string): Record<string, string> => ({
  "cache-control": "no-store",
  "content-type": contentType,
  "content-security-policy":
    "default-src 'none'; script-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; frame-ancestors 'none'",
  "cross-origin-resource-policy": "same-origin",
  "permissions-policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
});

const allowedPath = (
  urlValue: string,
  method: string,
  origin: string,
  assetPaths: ReadonlySet<string>,
): boolean => {
  let url: URL;
  try {
    url = new URL(urlValue);
  } catch {
    return false;
  }

  if (
    url.origin !== origin ||
    !["GET", "HEAD"].includes(method.toUpperCase()) ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    return false;
  }
  if (
    url.pathname === SCREENDESIGN_CAPTURE_STYLESHEET_PATH ||
    assetPaths.has(url.pathname)
  ) {
    return true;
  }
  if (!url.pathname.startsWith(SOURCE_ROUTE_PREFIX)) {
    return false;
  }

  const encodedId = url.pathname.slice(SOURCE_ROUTE_PREFIX.length);
  if (encodedId.includes("/")) {
    return false;
  }

  try {
    return SCREEN_DESIGN_SCREEN_BY_ID.has(decodeURIComponent(encodedId));
  } catch {
    return false;
  }
};

export class ScreenDesignRequestEvidence {
  readonly #origin: string;
  readonly #screenId: string;
  readonly #assetPaths: ReadonlySet<string>;
  readonly #records: MutableBrowserRequestRecord[] = [];
  readonly #recordIndexByRequest = new WeakMap<object, number>();

  constructor(
    origin: string,
    screenId: string,
    assetPaths: ReadonlySet<string>,
  ) {
    if (!SCREEN_DESIGN_SCREEN_BY_ID.has(screenId)) {
      fail(`request evidence cannot target unknown screen id: ${screenId}`);
    }
    this.#origin = origin;
    this.#screenId = screenId;
    this.#assetPaths = assetPaths;
  }

  get records(): readonly ScreenDesignBrowserRequestRecord[] {
    return this.#records.map((record) => Object.freeze({ ...record }));
  }

  get remoteAttempts(): readonly ScreenDesignBrowserRequestRecord[] {
    return this.records.filter((record) => record.remote);
  }

  recordAttempt(request: Request): boolean {
    const url = request.url();
    const method = request.method();
    const allowed = allowedPath(
      url,
      method,
      this.#origin,
      this.#assetPaths,
    );
    let remote = true;
    try {
      remote = new URL(url).origin !== this.#origin;
    } catch {
      remote = true;
    }

    const record: MutableBrowserRequestRecord = {
      screenId: this.#screenId,
      url,
      method,
      resourceType: request.resourceType(),
      remote,
      allowed,
      outcome: allowed ? "pending" : "blocked",
      failureText: null,
    };
    this.#recordIndexByRequest.set(request, this.#records.length);
    this.#records.push(record);
    return allowed;
  }

  recordFinished(request: Request): void {
    const index = this.#recordIndexByRequest.get(request);
    if (index !== undefined && this.#records[index]?.outcome === "pending") {
      this.#records[index].outcome = "completed";
    }
  }

  recordFailed(request: Request): void {
    const index = this.#recordIndexByRequest.get(request);
    const record = index === undefined ? undefined : this.#records[index];
    if (record && record.outcome === "pending") {
      record.outcome = "failed";
      record.failureText = request.failure()?.errorText ?? "request failed";
    }
  }

  assertNoRemoteRequests(): void {
    const remote = this.remoteAttempts;
    if (remote.length > 0) {
      const urls = [...new Set(remote.map((record) => record.url))].join(", ");
      throw new Error(
        `ScreenDesign source ${this.#screenId} attempted remote requests: ${urls}`,
      );
    }
  }

  assertIsolated(): void {
    this.assertNoRemoteRequests();
    const deniedOrFailed = this.records.filter(
      (record) => !record.allowed || record.outcome === "failed",
    );
    if (deniedOrFailed.length > 0) {
      throw new Error(
        `ScreenDesign source ${this.#screenId} made denied or failed requests: ${deniedOrFailed
          .map((record) => record.url)
          .join(", ")}`,
      );
    }
  }
}

const installRequestPolicy = async (
  page: Page,
  origin: string,
  screenId: string,
  assetPaths: ReadonlySet<string>,
): Promise<InstalledScreenDesignRequestPolicy> => {
  const evidence = new ScreenDesignRequestEvidence(
    origin,
    screenId,
    assetPaths,
  );
  const onRoute = async (route: Route): Promise<void> => {
    if (evidence.recordAttempt(route.request())) {
      await route.continue();
      return;
    }
    await route.abort("blockedbyclient");
  };
  const onFinished = (request: Request): void => evidence.recordFinished(request);
  const onFailed = (request: Request): void => evidence.recordFailed(request);

  page.on("requestfinished", onFinished);
  page.on("requestfailed", onFailed);
  await page.route("**/*", onRoute);

  return {
    evidence,
    dispose: async () => {
      await page.unroute("**/*", onRoute);
      page.off("requestfinished", onFinished);
      page.off("requestfailed", onFailed);
    },
  };
};

const closeServer = async (server: HttpServer): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

export const startScreenDesignSourceServer = async (
  options: StartScreenDesignSourceServerOptions = {},
): Promise<ScreenDesignSourceServer> => {
  const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
  const publicRoot = path.resolve(
    options.publicRoot ?? path.join(projectRoot, "public"),
  );
  const manifest = await loadManifest(publicRoot);
  await assertScreenDesignSourceAssetsExist(manifest.assets, publicRoot);

  const normalizedDocuments = new Map<string, string>();
  for (const screen of SCREEN_DESIGN_SCREENS) {
    let source: string;
    try {
      source = await readFile(screen.source, "utf8");
    } catch (error) {
      return fail(
        `could not read canonical source ${screen.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    normalizedDocuments.set(
      screen.id,
      normalizeScreenDesignSource({
        screen,
        html: source,
        assets: manifest.assets,
      }),
    );
  }

  if (normalizedDocuments.size !== SCREEN_DESIGN_SCREENS.length) {
    fail("normalized source document set is incomplete");
  }

  const captureStylesheet = await compileCaptureStylesheet([
    ...normalizedDocuments.values(),
  ]);
  const assetByPath = new Map(
    manifest.assets.map((asset) => [asset.localPath, asset] as const),
  );
  const assetPaths: ReadonlySet<string> = new Set(assetByPath.keys());
  const servedRequests: ScreenDesignServedRequest[] = [];
  const host = options.host ?? "127.0.0.1";

  const server = createServer(async (request, response) => {
    const method = (request.method ?? "GET").toUpperCase();
    const requestUrl = new URL(request.url ?? "/", "http://source.invalid");
    const respond = (
      status: number,
      body: string | Buffer,
      contentType = "text/plain; charset=utf-8",
    ): void => {
      const payload = Buffer.isBuffer(body) ? body : Buffer.from(body);
      servedRequests.push({ method, pathname: requestUrl.pathname, status });
      response.writeHead(status, {
        ...securityHeaders(contentType),
        "content-length": String(payload.byteLength),
      });
      response.end(method === "HEAD" ? undefined : payload);
    };

    if (!["GET", "HEAD"].includes(method)) {
      respond(405, "Method not allowed");
      return;
    }
    if (requestUrl.search || requestUrl.hash) {
      respond(404, "Not found");
      return;
    }
    if (requestUrl.pathname === SCREENDESIGN_CAPTURE_STYLESHEET_PATH) {
      respond(200, captureStylesheet, "text/css; charset=utf-8");
      return;
    }
    if (requestUrl.pathname.startsWith(SOURCE_ROUTE_PREFIX)) {
      const encodedId = requestUrl.pathname.slice(SOURCE_ROUTE_PREFIX.length);
      let screenId = "";
      try {
        screenId = decodeURIComponent(encodedId);
      } catch {
        respond(404, "Unknown ScreenDesign source");
        return;
      }
      const document =
        encodedId.includes("/") || !SCREEN_DESIGN_SCREEN_BY_ID.has(screenId)
          ? undefined
          : normalizedDocuments.get(screenId);
      respond(
        document ? 200 : 404,
        document ?? "Unknown ScreenDesign source",
        document ? "text/html; charset=utf-8" : undefined,
      );
      return;
    }

    const asset = assetByPath.get(
      requestUrl.pathname as `/screendesign/${string}`,
    );
    if (!asset) {
      respond(404, "Not found");
      return;
    }
    try {
      respond(
        200,
        await readFile(localAssetFile(publicRoot, asset.localPath)),
        asset.mimeType,
      );
    } catch {
      respond(500, `Missing local asset: ${asset.localPath}`);
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port ?? 0, host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    await closeServer(server);
    return fail("could not resolve the isolated source server address");
  }
  const origin = `http://${host}:${address.port}`;

  return {
    origin,
    get servedRequests() {
      return servedRequests.map((request) => Object.freeze({ ...request }));
    },
    sourceUrl: (screenId: string): string => {
      if (!SCREEN_DESIGN_SCREEN_BY_ID.has(screenId)) {
        fail(`cannot create a source URL for unknown screen id: ${screenId}`);
      }
      return `${origin}${SOURCE_ROUTE_PREFIX}${encodeURIComponent(screenId)}`;
    },
    installRequestPolicy: (page, screenId) =>
      installRequestPolicy(page, origin, screenId, assetPaths),
    close: () => closeServer(server),
  };
};
