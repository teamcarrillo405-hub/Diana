import {
  SCREEN_DESIGN_SCREEN_BY_ID,
  type ScreenDesignScreen,
} from "@/lib/screendesign/screens";

export const SCREENDESIGN_CAPTURE_STYLESHEET_PATH =
  "/__screendesign/source.css" as const;

export interface ScreenDesignSourceAsset {
  readonly sourceUrl: string;
  readonly localPath: `/screendesign/${string}`;
}

export interface NormalizeScreenDesignSourceInput {
  readonly screen: ScreenDesignScreen;
  readonly html: string;
  readonly assets: readonly ScreenDesignSourceAsset[];
}

const EXPECTED_ASSET_COUNT = 28;
const EXPECTED_SCREEN_DESIGN_ASSET_COUNT = 24;
const EXPECTED_AVATAR_ASSET_COUNT = 4;
const DASHBOARD_SCREEN_ID = "dashboard-personalized";
const DASHBOARD_STADIUM_SOURCE_URL =
  "https://media.screensdesign.com/gasset/426a3ecf94d741ae963be9ffc050d23d_screen_image_stadium_background_today_76926fe160.jpg";
const DASHBOARD_STADIUM_LOCAL_PATH =
  "/screendesign/dashboard/stadium-background.jpg";
const DASHBOARD_STADIUM_EXPORT_FRAGMENT = `url('${DASHBOARD_STADIUM_SOURCE_URL}') data-media-ref="generated:122834"`;
const DASHBOARD_STADIUM_REPAIRED_FRAGMENT = `url('${DASHBOARD_STADIUM_LOCAL_PATH}')`;

const fail = (message: string): never => {
  throw new Error(`ScreenDesign source could not be normalized: ${message}`);
};

const countOccurrences = (value: string, search: string): number =>
  value.split(search).length - 1;

const parseSourceUrl = (value: string): URL => {
  try {
    return new URL(value);
  } catch {
    return fail("manifest contains an invalid source URL");
  }
};

const assertCanonicalScreen = (screen: ScreenDesignScreen): void => {
  const canonical = SCREEN_DESIGN_SCREEN_BY_ID.get(screen.id);
  if (!canonical || canonical.source !== screen.source) {
    fail(
      `${screen.id || "unknown screen"} does not match the canonical ScreenDesign registry`,
    );
  }
};

const validateAssets = (
  assets: readonly ScreenDesignSourceAsset[],
): ReadonlyMap<string, `/screendesign/${string}`> => {
  if (assets.length !== EXPECTED_ASSET_COUNT) {
    fail(`expected exactly ${EXPECTED_ASSET_COUNT} manifest assets`);
  }

  const sourceUrls = new Set<string>();
  const localPaths = new Set<string>();
  const mapping = new Map<string, `/screendesign/${string}`>();
  let screenDesignCount = 0;
  let avatarCount = 0;

  for (const asset of assets) {
    const sourceUrl = parseSourceUrl(asset.sourceUrl);

    if (sourceUrl.protocol !== "https:") {
      fail(`manifest source must use HTTPS: ${asset.sourceUrl}`);
    }
    if (sourceUrl.hostname === "media.screensdesign.com") {
      screenDesignCount += 1;
    } else if (sourceUrl.hostname === "api.dicebear.com") {
      avatarCount += 1;
    } else {
      fail(`manifest source host is not allowlisted: ${sourceUrl.hostname}`);
    }

    if (
      typeof asset.localPath !== "string" ||
      !asset.localPath.startsWith("/screendesign/") ||
      asset.localPath.includes("..") ||
      asset.localPath.includes("\\")
    ) {
      fail(`manifest has an invalid local asset path: ${String(asset.localPath)}`);
    }
    if (sourceUrls.has(asset.sourceUrl)) {
      fail(`manifest source URL is duplicated: ${asset.sourceUrl}`);
    }
    if (localPaths.has(asset.localPath)) {
      fail(`manifest local path is duplicated: ${asset.localPath}`);
    }

    sourceUrls.add(asset.sourceUrl);
    localPaths.add(asset.localPath);
    mapping.set(asset.sourceUrl, asset.localPath);
  }

  if (
    screenDesignCount !== EXPECTED_SCREEN_DESIGN_ASSET_COUNT ||
    avatarCount !== EXPECTED_AVATAR_ASSET_COUNT
  ) {
    fail(
      `manifest must contain ${EXPECTED_SCREEN_DESIGN_ASSET_COUNT} ScreenDesign assets and ${EXPECTED_AVATAR_ASSET_COUNT} DiceBear avatars`,
    );
  }

  if (mapping.get(DASHBOARD_STADIUM_SOURCE_URL) !== DASHBOARD_STADIUM_LOCAL_PATH) {
    fail("dashboard stadium source is not mapped to its canonical local path");
  }

  return mapping;
};

const stripPairedElement = (html: string, tagName: string): string => {
  const paired = new RegExp(
    `<${tagName}\\b[^>]*>[\\s\\S]*?<\\/${tagName}\\s*>`,
    "giu",
  );
  const opening = new RegExp(`<${tagName}\\b[^>]*\\/?>`, "giu");
  return html.replace(paired, "").replace(opening, "");
};

const attributeValue = (tag: string, attribute: string): string | null => {
  const pattern = new RegExp(
    `\\s${attribute}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "iu",
  );
  const match = tag.match(pattern);
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
};

const stripExportRuntimeMarkup = (html: string): string => {
  let normalized = html;
  for (const tagName of ["script", "module", "iframe", "object"]) {
    normalized = stripPairedElement(normalized, tagName);
  }

  normalized = normalized
    .replace(/<(?:embed|base)\b[^>]*>/giu, "")
    .replace(/<meta\b[^>]*>/giu, (tag) => {
      const httpEquiv = attributeValue(tag, "http-equiv")?.toLowerCase();
      return httpEquiv === "refresh" ? "" : tag;
    })
    .replace(/<link\b[^>]*>/giu, (tag) => {
      const rel = (attributeValue(tag, "rel") ?? "")
        .toLowerCase()
        .split(/\s+/u)
        .filter(Boolean);
      const href = attributeValue(tag, "href") ?? "";
      const exportRuntimeLink = rel.some((value) =>
        ["stylesheet", "preload", "modulepreload", "prefetch"].includes(value),
      );
      return exportRuntimeLink || /^https?:\/\//iu.test(href) ? "" : tag;
    });

  return normalized;
};

const stripUnsafeAttributes = (html: string): string =>
  html.replace(/<[a-z][^<>]*>/giu, (tag) =>
    tag
      .replace(
        /\s+on[a-z][a-z0-9:_-]*\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/giu,
        "",
      )
      .replace(/\s+srcdoc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/giu, "")
      .replace(
        /\s+(?:href|src|action|formaction)\s*=\s*(?:"\s*(?:javascript|vbscript):[^"]*"|'\s*(?:javascript|vbscript):[^']*'|(?:javascript|vbscript):[^\s>]+)/giu,
        "",
      ),
  );

const repairAttachedDashboard = (
  screen: ScreenDesignScreen,
  html: string,
): string => {
  if (screen.id !== DASHBOARD_SCREEN_ID) {
    return html;
  }

  if (countOccurrences(html, DASHBOARD_STADIUM_EXPORT_FRAGMENT) !== 1) {
    fail("attached dashboard stadium declaration no longer matches its repair contract");
  }

  return html.replace(
    DASHBOARD_STADIUM_EXPORT_FRAGMENT,
    DASHBOARD_STADIUM_REPAIRED_FRAGMENT,
  );
};

const rewriteRemoteUrls = (
  html: string,
  assetMapping: ReadonlyMap<string, `/screendesign/${string}`>,
): string => {
  const remoteUrls = [
    ...new Set(html.match(/https?:\/\/[^\s"'<>)}\]]+/giu) ?? []),
  ];
  let normalized = html;

  for (const remoteUrl of remoteUrls) {
    const localPath = assetMapping.get(remoteUrl);
    if (!localPath) {
      fail(`unmapped remote URL: ${remoteUrl}`);
    }
    normalized = normalized.split(remoteUrl).join(localPath);
  }

  if (/\bhttps?:\/\//iu.test(normalized)) {
    fail("a remote URL remained after exact manifest rewriting");
  }

  return normalized;
};

const injectCaptureStylesheet = (html: string): string => {
  if (!/<head\b[^>]*>/iu.test(html) || !/<\/head\s*>/iu.test(html)) {
    fail("source document is missing a complete head element");
  }

  const stylesheet = `<link rel="stylesheet" href="${SCREENDESIGN_CAPTURE_STYLESHEET_PATH}" data-screendesign-capture-css="true">`;
  return html.replace(/<head\b[^>]*>/iu, (head) => `${head}\n${stylesheet}`);
};

export const normalizeScreenDesignSource = ({
  screen,
  html,
  assets,
}: NormalizeScreenDesignSourceInput): string => {
  assertCanonicalScreen(screen);
  if (typeof html !== "string" || !/<html\b/iu.test(html)) {
    fail(`${screen.id} is not an HTML document`);
  }

  const assetMapping = validateAssets(assets);
  const withoutRuntime = stripExportRuntimeMarkup(html);
  const withoutUnsafeAttributes = stripUnsafeAttributes(withoutRuntime);
  const repaired = repairAttachedDashboard(screen, withoutUnsafeAttributes);
  const localOnly = rewriteRemoteUrls(repaired, assetMapping);

  return injectCaptureStylesheet(localOnly);
};
