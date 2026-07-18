import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import {
  SCREEN_DESIGN_DASHBOARD_SOURCE,
  SCREEN_DESIGN_EXPORT_DIR,
  SCREEN_DESIGN_SCREENS,
} from "../lib/screendesign/screens.ts";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(SCRIPT_DIR, "..");
const PUBLIC_ROOT = path.join(REPOSITORY_ROOT, "public");
const ASSET_ROOT = path.join(PUBLIC_ROOT, "screendesign");
const MANIFEST_PATH = path.join(ASSET_ROOT, "manifest.json");

const EXPECTED_SCREEN_COUNT = 47;
const EXPECTED_SCREENDESIGN_COUNT = 24;
const EXPECTED_AVATAR_COUNT = 4;
const EXPECTED_ASSET_COUNT =
  EXPECTED_SCREENDESIGN_COUNT + EXPECTED_AVATAR_COUNT;

const ALLOWED_HOSTS = new Set([
  "media.screensdesign.com",
  "api.dicebear.com",
]);

const MIME_BY_EXTENSION = Object.freeze({
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
});

const ASSET_SPECS = Object.freeze([
  {
    id: "diana-logo",
    sourceUrl:
      "https://media.screensdesign.com/afcmf/eed2ddf244dd465793f6486325426b68.png",
    localPath: "/screendesign/brand/diana-logo.png",
    semanticRole: "Diana wordmark",
    alphaIntent: "preserve",
  },
  {
    id: "diana-mascot",
    sourceUrl:
      "https://media.screensdesign.com/gasset/d501faa498344f1b95439dc9b2d59739_screen_image_diana_mascot_friendly_30d94ea9eb.png",
    localPath: "/screendesign/brand/diana-mascot.png",
    semanticRole: "Diana assistant mascot",
    alphaIntent: "preserve",
  },
  {
    id: "dashboard-stadium-background",
    sourceUrl:
      "https://media.screensdesign.com/gasset/426a3ecf94d741ae963be9ffc050d23d_screen_image_stadium_background_today_76926fe160.jpg",
    localPath: "/screendesign/dashboard/stadium-background.jpg",
    semanticRole: "Dashboard stadium backdrop",
    alphaIntent: "opaque",
  },
  {
    id: "dashboard-athlete-cutout",
    sourceUrl:
      "https://media.screensdesign.com/gasset/2d717941a747467bb083f62bdc484b8d_screen_image_athlete_cutout_324a52d432.png",
    localPath: "/screendesign/dashboard/athlete-cutout.png",
    semanticRole: "Dashboard student-athlete foreground",
    alphaIntent: "preserve",
  },
  {
    id: "onboarding-welcome-background",
    sourceUrl:
      "https://media.screensdesign.com/afcmf/ef36cec3c43641a1bfead749d915b1e0.png",
    localPath: "/screendesign/onboarding/welcome-background.png",
    semanticRole: "Onboarding welcome atmosphere",
    alphaIntent: "preserve",
  },
  {
    id: "onboarding-gpa-progress-chart",
    sourceUrl:
      "https://media.screensdesign.com/gasset/30c75f9bd24a4fd4baf35b948f0b6864_screen_image_gpa_progress_chart_0295b51ad0.png",
    localPath: "/screendesign/onboarding/gpa-progress-chart.png",
    semanticRole: "Onboarding GPA progress illustration",
    alphaIntent: "preserve",
  },
  {
    id: "academic-championship-ring",
    sourceUrl:
      "https://media.screensdesign.com/gasset/6286471053c242a2aa3028cf0c553983_screen_image_academic_championship_ring_167484ec42.png",
    localPath: "/screendesign/instructional/academic-championship-ring.png",
    semanticRole: "Academic achievement ring",
    alphaIntent: "preserve",
  },
  {
    id: "knowledge-graph-base",
    sourceUrl:
      "https://media.screensdesign.com/gasset/fbc2ea3fa03545f2aac757387b1b7b10_screen_image_knowledge_graph_base_910943a448.png",
    localPath: "/screendesign/instructional/knowledge-graph-base.png",
    semanticRole: "Knowledge graph instructional base",
    alphaIntent: "preserve",
  },
  {
    id: "krebs-cycle-visual",
    sourceUrl:
      "https://media.screensdesign.com/gasset/4c61eebb75574accb2e9b55aed4cfe44_screen_image_krebs_cycle_visual_7988172144.jpg",
    localPath: "/screendesign/instructional/krebs-cycle.jpg",
    semanticRole: "Krebs cycle instructional visual",
    alphaIntent: "opaque",
  },
  {
    id: "supply-demand-graph",
    sourceUrl:
      "https://media.screensdesign.com/gasset/126e460a7ea54a3ca7fcd1be06f61ace_screen_image_supply_demand_graph_bdf56001d4.jpg",
    localPath: "/screendesign/instructional/supply-demand-graph.jpg",
    semanticRole: "Supply and demand instructional graph",
    alphaIntent: "opaque",
  },
  {
    id: "practice-test-visual",
    sourceUrl:
      "https://media.screensdesign.com/gasset/2fadbbea36fc4634a2b2c7870014dee0_screen_image_practice_test_visual_107918cf53.jpg",
    localPath: "/screendesign/instructional/practice-test.jpg",
    semanticRole: "Practice test artifact thumbnail",
    alphaIntent: "opaque",
  },
  {
    id: "study-guide-visual",
    sourceUrl:
      "https://media.screensdesign.com/gasset/e7bf276a0d0741c5b37720f68d48967c_screen_image_study_guide_visual_3bc4b708a0.jpg",
    localPath: "/screendesign/instructional/study-guide.jpg",
    semanticRole: "Study guide artifact thumbnail",
    alphaIntent: "opaque",
  },
  {
    id: "flashcard-batch-visual",
    sourceUrl:
      "https://media.screensdesign.com/gasset/3b6bee35fbf2451097f7be4efe661eb2_screen_image_flashcard_batch_visual_98320d6be8.jpg",
    localPath: "/screendesign/instructional/flashcard-batch.jpg",
    semanticRole: "Flashcard batch artifact thumbnail",
    alphaIntent: "opaque",
  },
  {
    id: "search-biology-graphic",
    sourceUrl:
      "https://media.screensdesign.com/gasset/afe1ffc93d0445f7b661d47e04209810_screen_image_bio_graphic_4d1dfe1d3b.jpg",
    localPath: "/screendesign/instructional/search-biology.jpg",
    semanticRole: "Biology search result visual",
    alphaIntent: "opaque",
  },
  {
    id: "search-economics-graphic",
    sourceUrl:
      "https://media.screensdesign.com/gasset/6c12540c2a514e3d9163d599a07e3a43_screen_image_econ_graphic_fc1fcc678e.jpg",
    localPath: "/screendesign/instructional/search-economics.jpg",
    semanticRole: "Economics search result visual",
    alphaIntent: "opaque",
  },
  {
    id: "portfolio-calculus-project",
    sourceUrl:
      "https://media.screensdesign.com/gasset/22ef85f899c142f2b79241e250f8f777_screen_image_portfolio_calc_59e4c464c7.jpg",
    localPath: "/screendesign/portfolio/calculus-project.jpg",
    semanticRole: "Calculus portfolio project thumbnail",
    alphaIntent: "opaque",
  },
  {
    id: "portfolio-biology-project",
    sourceUrl:
      "https://media.screensdesign.com/gasset/8664fa3a11d645c88f089c1dc9e925ce_screen_image_portfolio_biology_a9ec2f8e6a.jpg",
    localPath: "/screendesign/portfolio/biology-project.jpg",
    semanticRole: "Biology portfolio project thumbnail",
    alphaIntent: "opaque",
  },
  {
    id: "student-profile-avatar",
    sourceUrl:
      "https://media.screensdesign.com/gasset/54a2c8030d624dcbb174237b15a97dd9_screen_image_profile_avatar_user_bed6cb99cf.jpg",
    localPath: "/screendesign/social/student-profile-avatar.jpg",
    semanticRole: "Student profile avatar",
    alphaIntent: "opaque",
  },
  {
    id: "search-student-avatar",
    sourceUrl:
      "https://media.screensdesign.com/gasset/42564a5c07e94d97875236b5d537b023_screen_image_user_avatar_a51849b9e3.jpg",
    localPath: "/screendesign/social/search-student-avatar.jpg",
    semanticRole: "Student search result avatar",
    alphaIntent: "opaque",
  },
  {
    id: "study-room-background",
    sourceUrl:
      "https://media.screensdesign.com/gasset/28c0f4e049664836991e771149c4bec3_screen_image_study_room_bg_texture_39fad1e5c4.jpg",
    localPath: "/screendesign/social/study-room-background.jpg",
    semanticRole: "Study room background texture",
    alphaIntent: "opaque",
  },
  {
    id: "study-room-jordan-avatar",
    sourceUrl:
      "https://media.screensdesign.com/gasset/c907709a42d94b0eb316ec75f3bba9c5_screen_image_avatar_jordan_2600ffc3ce.jpg",
    localPath: "/screendesign/social/study-room-jordan-avatar.jpg",
    semanticRole: "Study room Jordan avatar",
    alphaIntent: "opaque",
  },
  {
    id: "social-proof-marcus-avatar",
    sourceUrl:
      "https://media.screensdesign.com/gasset/b535350695c446df9c13cc9aeb1014c7_screen_image_athlete_avatar_marcus_cb35ef781c.jpg",
    localPath: "/screendesign/social/social-proof-marcus-avatar.jpg",
    semanticRole: "Community social proof avatar",
    alphaIntent: "opaque",
  },
  {
    id: "community-sarah-avatar",
    sourceUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    localPath: "/screendesign/social/community-sarah.svg",
    semanticRole: "Community Sarah avatar",
    alphaIntent: "preserve",
  },
  {
    id: "community-felix-avatar",
    sourceUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    localPath: "/screendesign/social/community-felix.svg",
    semanticRole: "Community Felix avatar",
    alphaIntent: "preserve",
  },
  {
    id: "community-leo-avatar",
    sourceUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Leo",
    localPath: "/screendesign/social/community-leo.svg",
    semanticRole: "Community Leo avatar",
    alphaIntent: "preserve",
  },
  {
    id: "community-buster-avatar",
    sourceUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Buster",
    localPath: "/screendesign/social/community-buster.svg",
    semanticRole: "Community Buster avatar",
    alphaIntent: "preserve",
  },
  {
    id: "tutor-math-expert",
    sourceUrl:
      "https://media.screensdesign.com/gasset/f8252e55bcef4329a1dbd000c4d23a7f_screen_image_tutor_math_expert_1b3db9a69c.jpg",
    localPath: "/screendesign/tutors/math-expert.jpg",
    semanticRole: "Math tutor portrait",
    alphaIntent: "opaque",
  },
  {
    id: "tutor-science-expert",
    sourceUrl:
      "https://media.screensdesign.com/gasset/ff915cddfbdf4204a2fb188546fca366_screen_image_tutor_science_expert_6c46f17496.jpg",
    localPath: "/screendesign/tutors/science-expert.jpg",
    semanticRole: "Science tutor portrait",
    alphaIntent: "opaque",
  },
]);

const normalizeMimeType = (value) =>
  value?.split(";", 1)[0]?.trim().toLowerCase() ?? "";

const sha256 = (buffer) =>
  createHash("sha256").update(buffer).digest("hex");

const toFilesystemPath = (localPath) => {
  if (!localPath.startsWith("/screendesign/")) {
    throw new Error(`Asset path must be Diana-owned: ${localPath}`);
  }

  const relativePath = localPath.slice(1).split("/").join(path.sep);
  const resolved = path.resolve(PUBLIC_ROOT, relativePath);
  const rootWithSeparator = `${path.resolve(ASSET_ROOT)}${path.sep}`;
  if (!resolved.startsWith(rootWithSeparator)) {
    throw new Error(`Asset path escapes public/screendesign: ${localPath}`);
  }

  return resolved;
};

const expectedMimeType = (localPath) => {
  const mimeType = MIME_BY_EXTENSION[path.extname(localPath).toLowerCase()];
  if (!mimeType) {
    throw new Error(`Unsupported asset extension: ${localPath}`);
  }
  return mimeType;
};

const validateBinarySignature = (buffer, mimeType, label) => {
  const isPng =
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  const isJpeg =
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff;
  const svgPrefix = buffer.subarray(0, 1024).toString("utf8").trimStart();
  const isSvg =
    svgPrefix.startsWith("<svg") ||
    (svgPrefix.startsWith("<?xml") && svgPrefix.includes("<svg"));

  const valid =
    (mimeType === "image/png" && isPng) ||
    (mimeType === "image/jpeg" && isJpeg) ||
    (mimeType === "image/svg+xml" && isSvg);

  if (!valid) {
    throw new Error(`Binary signature does not match ${mimeType}: ${label}`);
  }
};

const inspectImage = async (buffer, mimeType, label) => {
  if (buffer.length === 0) {
    throw new Error(`Missing response body: ${label}`);
  }

  validateBinarySignature(buffer, mimeType, label);

  let metadata;
  try {
    metadata = await sharp(buffer, { failOn: "error" }).metadata();
  } catch (error) {
    throw new Error(`Sharp could not decode ${label}: ${error.message}`);
  }

  if (
    !Number.isInteger(metadata.width) ||
    metadata.width <= 0 ||
    !Number.isInteger(metadata.height) ||
    metadata.height <= 0
  ) {
    throw new Error(`Missing intrinsic dimensions: ${label}`);
  }

  return {
    width: metadata.width,
    height: metadata.height,
    hasAlpha: metadata.hasAlpha === true,
  };
};

const extractRemoteUrls = (html) => {
  const matches = html.match(
    /https:\/\/(?:media\.screensdesign\.com|api\.dicebear\.com)\/[^\s"'()<>]+/gu,
  );

  return new Set(
    (matches ?? []).map((match) => match.replaceAll("&amp;", "&")),
  );
};

const validateSpecs = () => {
  if (ASSET_SPECS.length !== EXPECTED_ASSET_COUNT) {
    throw new Error(
      `Asset specification count must be ${EXPECTED_ASSET_COUNT}; received ${ASSET_SPECS.length}`,
    );
  }

  const ids = new Set();
  const urls = new Set();
  const localPaths = new Set();
  for (const spec of ASSET_SPECS) {
    const parsedUrl = new URL(spec.sourceUrl);
    if (parsedUrl.protocol !== "https:" || !ALLOWED_HOSTS.has(parsedUrl.hostname)) {
      throw new Error(`Source host is not allowlisted: ${spec.sourceUrl}`);
    }
    if (ids.has(spec.id)) {
      throw new Error(`Duplicate asset id: ${spec.id}`);
    }
    if (urls.has(spec.sourceUrl)) {
      throw new Error(`Duplicate source URL: ${spec.sourceUrl}`);
    }
    if (localPaths.has(spec.localPath)) {
      throw new Error(`Duplicate local path: ${spec.localPath}`);
    }
    ids.add(spec.id);
    urls.add(spec.sourceUrl);
    localPaths.add(spec.localPath);
    expectedMimeType(spec.localPath);
    toFilesystemPath(spec.localPath);
  }
};

const inventoryCanonicalSources = async () => {
  if (SCREEN_DESIGN_SCREENS.length !== EXPECTED_SCREEN_COUNT) {
    throw new Error(
      `Canonical registry must contain ${EXPECTED_SCREEN_COUNT} screens; received ${SCREEN_DESIGN_SCREENS.length}`,
    );
  }

  const folderDashboard = path.resolve(
    SCREEN_DESIGN_EXPORT_DIR,
    "dashboard_personalized.html",
  );
  const dashboardSource = path.resolve(SCREEN_DESIGN_DASHBOARD_SOURCE);
  const sourcePaths = new Set(
    SCREEN_DESIGN_SCREENS.map((screen) => path.resolve(screen.source)),
  );
  if (sourcePaths.has(folderDashboard)) {
    throw new Error("Conflicting folder dashboard entered the canonical registry");
  }
  if (!sourcePaths.has(dashboardSource)) {
    throw new Error("Attached dashboard override is missing from the canonical registry");
  }

  const folderScreens = SCREEN_DESIGN_SCREENS.filter((screen) =>
    path.resolve(screen.source).startsWith(`${path.resolve(SCREEN_DESIGN_EXPORT_DIR)}${path.sep}`),
  );
  if (folderScreens.length !== 46) {
    throw new Error(
      `Expected 46 canonical folder exports; received ${folderScreens.length}`,
    );
  }

  const consumersByUrl = new Map();
  for (const screen of SCREEN_DESIGN_SCREENS) {
    const html = await readFile(screen.source, "utf8");
    for (const sourceUrl of extractRemoteUrls(html)) {
      const consumers = consumersByUrl.get(sourceUrl) ?? new Set();
      consumers.add(screen.id);
      consumersByUrl.set(sourceUrl, consumers);
    }
  }

  const screenDesignCount = [...consumersByUrl.keys()].filter(
    (sourceUrl) => new URL(sourceUrl).hostname === "media.screensdesign.com",
  ).length;
  const avatarCount = [...consumersByUrl.keys()].filter(
    (sourceUrl) => new URL(sourceUrl).hostname === "api.dicebear.com",
  ).length;

  if (
    consumersByUrl.size !== EXPECTED_ASSET_COUNT ||
    screenDesignCount !== EXPECTED_SCREENDESIGN_COUNT ||
    avatarCount !== EXPECTED_AVATAR_COUNT
  ) {
    throw new Error(
      `Canonical media inventory must contain ${EXPECTED_SCREENDESIGN_COUNT} ScreenDesign assets plus ${EXPECTED_AVATAR_COUNT} avatars; received ${screenDesignCount} plus ${avatarCount}`,
    );
  }

  const specUrls = new Set(ASSET_SPECS.map((spec) => spec.sourceUrl));
  const missingSpecs = [...consumersByUrl.keys()].filter(
    (sourceUrl) => !specUrls.has(sourceUrl),
  );
  const staleSpecs = [...specUrls].filter(
    (sourceUrl) => !consumersByUrl.has(sourceUrl),
  );
  if (missingSpecs.length > 0 || staleSpecs.length > 0) {
    throw new Error(
      `Asset mapping drift detected. Missing mappings: ${missingSpecs.join(", ") || "none"}. Stale mappings: ${staleSpecs.join(", ") || "none"}.`,
    );
  }

  return consumersByUrl;
};

const fetchAsset = async (spec, consumers) => {
  const source = new URL(spec.sourceUrl);
  if (source.protocol !== "https:" || !ALLOWED_HOSTS.has(source.hostname)) {
    throw new Error(`Source host is not allowlisted: ${spec.sourceUrl}`);
  }

  const response = await fetch(spec.sourceUrl, {
    method: "GET",
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
    headers: { Accept: "image/avif,image/webp,image/svg+xml,image/png,image/jpeg" },
  });
  if (!response.ok) {
    throw new Error(`GET ${spec.sourceUrl} returned HTTP ${response.status}`);
  }

  const finalUrl = new URL(response.url);
  if (finalUrl.protocol !== "https:" || !ALLOWED_HOSTS.has(finalUrl.hostname)) {
    throw new Error(`Asset redirected to a non-allowlisted host: ${response.url}`);
  }

  const mimeType = normalizeMimeType(response.headers.get("content-type"));
  const expected = expectedMimeType(spec.localPath);
  if (mimeType !== expected) {
    throw new Error(
      `Unexpected MIME type for ${spec.id}: expected ${expected}, received ${mimeType || "missing"}`,
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const image = await inspectImage(buffer, mimeType, spec.sourceUrl);
  return {
    buffer,
    manifestEntry: {
      id: spec.id,
      sourceUrl: spec.sourceUrl,
      localPath: spec.localPath,
      sha256: sha256(buffer),
      mimeType,
      width: image.width,
      height: image.height,
      hasAlpha: image.hasAlpha,
      alphaIntent: spec.alphaIntent,
      semanticRole: spec.semanticRole,
      consumers: [...consumers].sort(),
    },
  };
};

const readManifest = async () => {
  const raw = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  if (
    !raw ||
    raw.schemaVersion !== 1 ||
    raw.assetCount !== EXPECTED_ASSET_COUNT ||
    raw.screenDesignAssetCount !== EXPECTED_SCREENDESIGN_COUNT ||
    raw.avatarAssetCount !== EXPECTED_AVATAR_COUNT ||
    !Array.isArray(raw.assets) ||
    raw.assets.length !== EXPECTED_ASSET_COUNT
  ) {
    throw new Error("ScreenDesign manifest header or asset count is invalid");
  }
  return raw;
};

const listOwnedAssetFiles = async (directory = ASSET_ROOT) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const resolved = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listOwnedAssetFiles(resolved)));
    } else if (entry.isFile() && resolved !== MANIFEST_PATH) {
      files.push(path.resolve(resolved));
    }
  }
  return files.sort();
};

const verifyLocalAssets = async (consumersByUrl) => {
  const manifest = await readManifest();
  const entriesById = new Map();
  const localPaths = new Set();

  for (const entry of manifest.assets) {
    if (!entry || typeof entry !== "object" || typeof entry.id !== "string") {
      throw new Error("Manifest contains an invalid asset entry");
    }
    if (entriesById.has(entry.id)) {
      throw new Error(`Manifest contains duplicate id: ${entry.id}`);
    }
    if (localPaths.has(entry.localPath)) {
      throw new Error(`Manifest contains duplicate local path: ${entry.localPath}`);
    }
    entriesById.set(entry.id, entry);
    localPaths.add(entry.localPath);
  }

  for (const spec of ASSET_SPECS) {
    const entry = entriesById.get(spec.id);
    if (!entry) {
      throw new Error(`Manifest is missing required asset: ${spec.id}`);
    }

    const expectedConsumers = [...consumersByUrl.get(spec.sourceUrl)].sort();
    const expectedMime = expectedMimeType(spec.localPath);
    if (
      entry.sourceUrl !== spec.sourceUrl ||
      entry.localPath !== spec.localPath ||
      entry.mimeType !== expectedMime ||
      entry.alphaIntent !== spec.alphaIntent ||
      entry.semanticRole !== spec.semanticRole ||
      JSON.stringify(entry.consumers) !== JSON.stringify(expectedConsumers)
    ) {
      throw new Error(`Manifest metadata drift detected for ${spec.id}`);
    }
    if (!/^[a-f0-9]{64}$/u.test(entry.sha256)) {
      throw new Error(`Manifest checksum is invalid for ${spec.id}`);
    }
    if (
      !Number.isInteger(entry.width) ||
      entry.width <= 0 ||
      !Number.isInteger(entry.height) ||
      entry.height <= 0 ||
      typeof entry.hasAlpha !== "boolean"
    ) {
      throw new Error(`Manifest dimensions or alpha metadata are invalid for ${spec.id}`);
    }

    const localFile = toFilesystemPath(entry.localPath);
    const fileStats = await stat(localFile);
    if (!fileStats.isFile() || fileStats.size === 0) {
      throw new Error(`Local asset is missing or empty: ${entry.localPath}`);
    }
    const buffer = await readFile(localFile);
    if (sha256(buffer) !== entry.sha256) {
      throw new Error(`Checksum mismatch: ${entry.localPath}`);
    }
    const image = await inspectImage(buffer, entry.mimeType, entry.localPath);
    if (
      image.width !== entry.width ||
      image.height !== entry.height ||
      image.hasAlpha !== entry.hasAlpha
    ) {
      throw new Error(`Intrinsic image metadata mismatch: ${entry.localPath}`);
    }
  }

  const expectedFiles = new Set(
    ASSET_SPECS.map((spec) => path.resolve(toFilesystemPath(spec.localPath))),
  );
  const actualFiles = await listOwnedAssetFiles();
  const unexpectedFiles = actualFiles.filter((file) => !expectedFiles.has(file));
  const missingFiles = [...expectedFiles].filter(
    (file) => !actualFiles.includes(file),
  );
  if (unexpectedFiles.length > 0 || missingFiles.length > 0) {
    throw new Error(
      `Owned asset tree drift detected. Missing files: ${missingFiles.join(", ") || "none"}. Unexpected files: ${unexpectedFiles.join(", ") || "none"}.`,
    );
  }

  return manifest;
};

const acquireAssets = async (consumersByUrl) => {
  const downloads = [];
  for (const spec of ASSET_SPECS) {
    downloads.push(
      await fetchAsset(spec, consumersByUrl.get(spec.sourceUrl)),
    );
  }

  for (const [index, spec] of ASSET_SPECS.entries()) {
    const localFile = toFilesystemPath(spec.localPath);
    await mkdir(path.dirname(localFile), { recursive: true });
    await writeFile(localFile, downloads[index].buffer);
  }

  const manifest = {
    schemaVersion: 1,
    assetCount: EXPECTED_ASSET_COUNT,
    screenDesignAssetCount: EXPECTED_SCREENDESIGN_COUNT,
    avatarAssetCount: EXPECTED_AVATAR_COUNT,
    assets: downloads.map((download) => download.manifestEntry),
  };
  await mkdir(ASSET_ROOT, { recursive: true });
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
};

const main = async () => {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--verify") || args.length > 1) {
    throw new Error("Usage: node scripts/localize-screendesign-assets.mjs [--verify]");
  }

  validateSpecs();
  const consumersByUrl = await inventoryCanonicalSources();
  if (args[0] !== "--verify") {
    await acquireAssets(consumersByUrl);
  }
  const manifest = await verifyLocalAssets(consumersByUrl);
  process.stdout.write(
    `Verified ${manifest.screenDesignAssetCount} ScreenDesign assets and ${manifest.avatarAssetCount} local avatars (${manifest.assetCount} total).\n`,
  );
};

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
