import manifestJson from "@/public/screendesign/manifest.json";

const assetIds = [
  "diana-logo",
  "diana-mascot",
  "dashboard-stadium-background",
  "dashboard-athlete-cutout",
  "onboarding-welcome-background",
  "onboarding-gpa-progress-chart",
  "academic-championship-ring",
  "knowledge-graph-base",
  "krebs-cycle-visual",
  "supply-demand-graph",
  "practice-test-visual",
  "study-guide-visual",
  "flashcard-batch-visual",
  "search-biology-graphic",
  "search-economics-graphic",
  "portfolio-calculus-project",
  "portfolio-biology-project",
  "student-profile-avatar",
  "search-student-avatar",
  "study-room-background",
  "study-room-jordan-avatar",
  "social-proof-marcus-avatar",
  "community-sarah-avatar",
  "community-felix-avatar",
  "community-leo-avatar",
  "community-buster-avatar",
  "tutor-math-expert",
  "tutor-science-expert",
] as const;

export const SCREEN_DESIGN_ASSET_IDS = Object.freeze(assetIds);

export type ScreenDesignAssetId = (typeof SCREEN_DESIGN_ASSET_IDS)[number];
export type ScreenDesignAssetMimeType =
  | "image/jpeg"
  | "image/png"
  | "image/svg+xml";
export type ScreenDesignAlphaIntent = "opaque" | "preserve";

export interface ScreenDesignAsset {
  readonly id: ScreenDesignAssetId;
  readonly localPath: `/screendesign/${string}`;
  readonly mimeType: ScreenDesignAssetMimeType;
  readonly width: number;
  readonly height: number;
  readonly hasAlpha: boolean;
  readonly alphaIntent: ScreenDesignAlphaIntent;
  readonly semanticRole: string;
  readonly consumers: readonly string[];
}

interface ManifestEntry extends ScreenDesignAsset {
  readonly sha256: string;
}

const EXPECTED_ASSET_COUNT = 28;
const EXPECTED_SCREENDESIGN_COUNT = 24;
const EXPECTED_AVATAR_COUNT = 4;
const MIME_TYPES = new Set<ScreenDesignAssetMimeType>([
  "image/jpeg",
  "image/png",
  "image/svg+xml",
]);
const ALPHA_INTENTS = new Set<ScreenDesignAlphaIntent>([
  "opaque",
  "preserve",
]);
const ID_SET = new Set<string>(SCREEN_DESIGN_ASSET_IDS);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const manifestError = (message: string): never => {
  throw new Error(`Invalid ScreenDesign asset manifest: ${message}`);
};

const isPositiveInteger = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) > 0;

const validateEntry = (value: unknown, index: number): ManifestEntry => {
  const entry = isRecord(value)
    ? value
    : manifestError(`asset ${index} is not an object`);

  const {
    id,
    localPath,
    sha256,
    mimeType,
    width,
    height,
    hasAlpha,
    alphaIntent,
    semanticRole,
    consumers,
  } = entry;

  const validatedId =
    typeof id === "string" && ID_SET.has(id)
      ? (id as ScreenDesignAssetId)
      : manifestError(`asset ${index} has an unknown id`);
  const validatedLocalPath =
    typeof localPath !== "string" ||
    !localPath.startsWith("/screendesign/") ||
    localPath.includes("..") ||
    /^https?:/u.test(localPath)
      ? manifestError(`${validatedId} has an invalid local path`)
      : (localPath as `/screendesign/${string}`);
  const validatedSha256 =
    typeof sha256 === "string" && /^[a-f0-9]{64}$/u.test(sha256)
      ? sha256
      : manifestError(`${validatedId} has an invalid checksum`);
  const validatedMimeType =
    typeof mimeType === "string" &&
    MIME_TYPES.has(mimeType as ScreenDesignAssetMimeType)
      ? (mimeType as ScreenDesignAssetMimeType)
      : manifestError(`${validatedId} has an invalid MIME type`);
  const validatedWidth = isPositiveInteger(width)
    ? width
    : manifestError(`${validatedId} has invalid intrinsic width`);
  const validatedHeight = isPositiveInteger(height)
    ? height
    : manifestError(`${validatedId} has invalid intrinsic height`);
  const validatedHasAlpha =
    typeof hasAlpha === "boolean"
      ? hasAlpha
      : manifestError(`${validatedId} has invalid alpha metadata`);
  const validatedAlphaIntent =
    typeof alphaIntent === "string" &&
    ALPHA_INTENTS.has(alphaIntent as ScreenDesignAlphaIntent)
      ? (alphaIntent as ScreenDesignAlphaIntent)
      : manifestError(`${validatedId} has an invalid alpha intent`);
  const validatedSemanticRole =
    typeof semanticRole === "string" && semanticRole.trim().length > 0
      ? semanticRole
      : manifestError(`${validatedId} has no semantic role`);
  const consumerList = Array.isArray(consumers) ? consumers : [];
  if (
    consumerList.length === 0 ||
    consumerList.some(
      (consumer: unknown) =>
        typeof consumer !== "string" || consumer.trim().length === 0,
    ) ||
    new Set(consumerList).size !== consumerList.length
  ) {
    manifestError(`${validatedId} has invalid consumers`);
  }

  return {
    id: validatedId,
    localPath: validatedLocalPath,
    sha256: validatedSha256,
    mimeType: validatedMimeType,
    width: validatedWidth,
    height: validatedHeight,
    hasAlpha: validatedHasAlpha,
    alphaIntent: validatedAlphaIntent,
    semanticRole: validatedSemanticRole,
    consumers: Object.freeze([...consumerList] as string[]),
  };
};

const loadManifest = (value: unknown): readonly ManifestEntry[] => {
  const manifest = isRecord(value)
    ? value
    : manifestError("root is not an object");

  if (
    manifest.schemaVersion !== 1 ||
    manifest.assetCount !== EXPECTED_ASSET_COUNT ||
    manifest.screenDesignAssetCount !== EXPECTED_SCREENDESIGN_COUNT ||
    manifest.avatarAssetCount !== EXPECTED_AVATAR_COUNT
  ) {
    manifestError("header or canonical counts do not match the asset contract");
  }

  const assetValues = Array.isArray(manifest.assets)
    ? manifest.assets
    : manifestError("asset list is not an array");
  if (assetValues.length !== EXPECTED_ASSET_COUNT) {
    manifestError("asset list does not match the canonical count");
  }

  const entries = assetValues.map(validateEntry);
  const ids = entries.map((entry) => entry.id);
  const localPaths = entries.map((entry) => entry.localPath);
  if (new Set(ids).size !== EXPECTED_ASSET_COUNT) {
    manifestError("asset ids are not unique");
  }
  if (new Set(localPaths).size !== EXPECTED_ASSET_COUNT) {
    manifestError("local paths are not unique");
  }
  if (SCREEN_DESIGN_ASSET_IDS.some((id) => !ids.includes(id))) {
    manifestError("canonical ids do not match");
  }

  return Object.freeze(entries);
};

const manifestEntries = loadManifest(manifestJson);

const safeAssets = manifestEntries.map((entry): ScreenDesignAsset =>
  Object.freeze({
    id: entry.id,
    localPath: entry.localPath,
    mimeType: entry.mimeType,
    width: entry.width,
    height: entry.height,
    hasAlpha: entry.hasAlpha,
    alphaIntent: entry.alphaIntent,
    semanticRole: entry.semanticRole,
    consumers: entry.consumers,
  }),
);

export const SCREEN_DESIGN_ASSETS: readonly ScreenDesignAsset[] =
  Object.freeze(safeAssets);

const assetById: ReadonlyMap<ScreenDesignAssetId, ScreenDesignAsset> = new Map(
  SCREEN_DESIGN_ASSETS.map((asset) => [asset.id, asset]),
);

export const getScreenDesignAsset = (
  id: ScreenDesignAssetId,
): ScreenDesignAsset => {
  const asset = assetById.get(id);
  if (!asset) {
    throw new Error(`Unknown ScreenDesign asset id: ${String(id)}`);
  }
  return asset;
};
