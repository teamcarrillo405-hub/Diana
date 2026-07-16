import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  getScreenDesignRouteOwnerFile,
} from "../lib/navigation";
import { SCREEN_DESIGN_SCREENS } from "../lib/screendesign/screens";

export interface RemovalFinding {
  readonly file: string;
  readonly line: number;
  readonly ruleId:
    | "deleted-module"
    | "legacy-selector"
    | "remote-media-host"
    | "legacy-copy";
  readonly excerpt: string;
}

interface RemovalRule {
  readonly ruleId: RemovalFinding["ruleId"];
  readonly pattern: RegExp;
}

const ROOT = process.cwd();
const SOURCE_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".jsx",
  ".json",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
]);
const COMPILED_EXTENSIONS = new Set([".css", ".html", ".js", ".json"]);

const DELETED_PRESENTATION_FILES = [
  "app/(app)/app-top-nav.tsx",
  "app/(app)/mobile-tab-bar.tsx",
  "app/(app)/more-menu.tsx",
  "app/(app)/page-shell.tsx",
  "app/(app)/assignments/[id]/homework-mission.tsx",
  "app/(app)/dashboard/today-game-plan.tsx",
  "app/(app)/quiet-command.module.css",
] as const;

const RULES: readonly RemovalRule[] = [
  {
    ruleId: "deleted-module",
    pattern:
      /(?:PageShell|AppTopNav|TodayGamePlan|quiet-command\.module\.css|homework-mission\.tsx|(?:app\/\(app\)\/)?(?:page-shell|app-top-nav|mobile-tab-bar|more-menu|dashboard\/today-game-plan))(?:["'/.]|\b)/u,
  },
  {
    ruleId: "legacy-selector",
    pattern:
      /(?:\bpm-[a-z0-9-]+\b|\bstudent-(?:today|command)-[a-z0-9-]+\b|\bsd-(?:today-layout|today-head|coach-card|metric(?:-[a-z0-9-]+)?|nav-icon|drawer(?:-[a-z0-9-]+)?)\b)/iu,
  },
  {
    ruleId: "remote-media-host",
    pattern: /https?:\/\/(?:media\.screensdesign\.com|api\.dicebear\.com)\//iu,
  },
  {
    ruleId: "legacy-copy",
    pattern:
      /(?:\bNexus(?:\s+Arcade)?\b|\bMission Control\b|Today(?:'|’|&apos;)s game plan)/iu,
  },
];

export function scanTextForProhibitedPresentation(
  text: string,
  file: string,
): RemovalFinding[] {
  const findings: RemovalFinding[] = [];
  const lines = text.split(/\r?\n/u);

  for (const [index, line] of lines.entries()) {
    for (const rule of RULES) {
      if (rule.pattern.test(line)) {
        findings.push({
          file,
          line: index + 1,
          ruleId: rule.ruleId,
          excerpt: line.trim().slice(0, 180),
        });
      }
    }
  }

  return findings;
}

const walkFiles = (
  directory: string,
  extensions: ReadonlySet<string>,
): string[] => {
  if (!existsSync(directory)) return [];
  const files: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (
      entry.name === "node_modules" ||
      entry.name === ".git" ||
      entry.name === "cache"
    ) {
      continue;
    }
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(absolute, extensions));
    } else if (extensions.has(path.extname(entry.name))) {
      files.push(absolute);
    }
  }

  return files;
};

const relative = (file: string): string =>
  path.relative(ROOT, file).replaceAll(path.sep, "/");

const isProductionTestFile = (file: string): boolean =>
  /(?:^|\/)(?:__tests__|tests)(?:\/|$)|\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(
    relative(file),
  );

const resolveImport = (fromFile: string, specifier: string): string | null => {
  if (!(specifier.startsWith("@/") || specifier.startsWith("."))) return null;
  const base = specifier.startsWith("@/")
    ? path.join(ROOT, specifier.slice(2))
    : path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    base,
    ...[".ts", ".tsx", ".js", ".jsx", ".css"].map(
      (extension) => `${base}${extension}`,
    ),
    ...[".ts", ".tsx", ".js", ".jsx"].map((extension) =>
      path.join(base, `index${extension}`),
    ),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
};

const importSpecifiers = (source: string): string[] => {
  const specifiers: string[] = [];
  const pattern =
    /(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/gu;
  for (const match of source.matchAll(pattern)) {
    specifiers.push(match[1] ?? match[2]);
  }
  return specifiers;
};

const verifyCanonicalOwnerGraphs = (): string[] => {
  const errors: string[] = [];
  if (SCREEN_DESIGN_SCREENS.length !== 47) {
    errors.push(
      `Expected 47 canonical ScreenDesign states, found ${SCREEN_DESIGN_SCREENS.length}.`,
    );
  }

  const prohibited = new Set<string>(DELETED_PRESENTATION_FILES);
  const visited = new Set<string>();
  const queue = SCREEN_DESIGN_SCREENS.map((screen) =>
    path.join(ROOT, getScreenDesignRouteOwnerFile(screen)),
  );

  for (const owner of queue) {
    if (!existsSync(owner)) {
      errors.push(`Canonical route owner is missing: ${relative(owner)}`);
    }
  }

  while (queue.length > 0) {
    const file = queue.shift();
    if (!file || visited.has(file) || !existsSync(file)) continue;
    visited.add(file);
    const source = readFileSync(file, "utf8");

    for (const specifier of importSpecifiers(source)) {
      const imported = resolveImport(file, specifier);
      if (!imported) continue;
      const importedRelative = relative(imported);
      if (prohibited.has(importedRelative)) {
        errors.push(
          `${relative(file)} reaches deleted presentation ${importedRelative}.`,
        );
      }
      if (
        importedRelative.startsWith("app/") ||
        importedRelative.startsWith("components/") ||
        importedRelative.startsWith("lib/")
      ) {
        queue.push(imported);
      }
    }
  }

  return errors;
};

interface RuntimeManifestEntry {
  readonly id?: unknown;
  readonly localPath?: unknown;
  readonly sourceUrl?: unknown;
}

const verifyRuntimeAssets = (): string[] => {
  const errors: string[] = [];
  const manifestPath = path.join(ROOT, "public", "screendesign", "manifest.json");
  if (!existsSync(manifestPath)) return ["Runtime asset manifest is missing."];

  const raw = readFileSync(manifestPath, "utf8");
  if (/https?:\/\//iu.test(raw)) {
    errors.push("Runtime asset manifest contains a remote URL.");
  }

  const manifest = JSON.parse(raw) as {
    assetCount?: unknown;
    assets?: RuntimeManifestEntry[];
  };
  if (manifest.assetCount !== 28 || manifest.assets?.length !== 28) {
    errors.push("Runtime asset manifest does not contain the 28 canonical assets.");
    return errors;
  }

  for (const entry of manifest.assets) {
    if ("sourceUrl" in entry) {
      errors.push(`${String(entry.id)} exposes sourceUrl in the runtime manifest.`);
    }
    if (
      typeof entry.localPath !== "string" ||
      !entry.localPath.startsWith("/screendesign/") ||
      !existsSync(path.join(ROOT, "public", entry.localPath.slice(1)))
    ) {
      errors.push(`${String(entry.id)} does not resolve to a checked-in local asset.`);
    }
  }

  return errors;
};

const report = (findings: readonly RemovalFinding[], errors: readonly string[]) => {
  for (const finding of findings) {
    console.error(
      `${finding.file}:${finding.line} [${finding.ruleId}] ${finding.excerpt}`,
    );
  }
  for (const error of errors) console.error(`[contract] ${error}`);
};

const runSourceAudit = (): number => {
  const roots = ["app", "components", "lib", "public/screendesign"].map(
    (directory) => path.join(ROOT, directory),
  );
  const files = roots
    .flatMap((root) => walkFiles(root, SOURCE_EXTENSIONS))
    .filter((file) => !isProductionTestFile(file));
  const findings = files.flatMap((file) =>
    scanTextForProhibitedPresentation(readFileSync(file, "utf8"), relative(file)),
  );
  const errors = [
    ...DELETED_PRESENTATION_FILES.filter((file) => existsSync(path.join(ROOT, file))).map(
      (file) => `Deleted presentation file still exists: ${file}`,
    ),
    ...verifyCanonicalOwnerGraphs(),
    ...verifyRuntimeAssets(),
  ];

  report(findings, errors);
  if (findings.length > 0 || errors.length > 0) return 1;
  console.log(
    `ScreenDesign source removal audit passed: ${files.length} production files, 47 canonical states, 28 local assets.`,
  );
  return 0;
};

const runCompiledAudit = (): number => {
  const nextDirectory = path.join(ROOT, ".next");
  if (!existsSync(nextDirectory)) {
    console.error("[contract] .next is missing; run a clean production build first.");
    return 1;
  }
  const files = walkFiles(nextDirectory, COMPILED_EXTENSIONS);
  const findings = files.flatMap((file) =>
    scanTextForProhibitedPresentation(readFileSync(file, "utf8"), relative(file)),
  );
  report(findings, []);
  if (findings.length > 0) return 1;
  console.log(
    `ScreenDesign compiled removal audit passed: ${files.length} build artifacts scanned.`,
  );
  return 0;
};

const main = (): number => {
  const modes = new Set(process.argv.slice(2));
  if (modes.size !== 1 || (!modes.has("--source") && !modes.has("--compiled"))) {
    console.error(
      "Usage: npx tsx scripts/verify-screendesign-removal.ts --source|--compiled",
    );
    return 1;
  }
  return modes.has("--source") ? runSourceAudit() : runCompiledAudit();
};

const isDirectInvocation =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectInvocation) process.exitCode = main();
