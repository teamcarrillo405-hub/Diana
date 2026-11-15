import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Leave room below the provider's 250 MB limit for packaging metadata/runtime.
export const DEFAULT_TRACE_LIMIT_BYTES = 240_000_000;

async function traceFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await traceFiles(filename));
    else if (entry.isFile() && entry.name.endsWith(".js.nft.json")) result.push(filename);
  }
  return result;
}

function isWithin(directory, filename) {
  const relative = path.relative(directory, filename);
  return relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

export const CINEMATIC_LANDING_RUNTIME_ASSETS = new Set([
  "assets/landing-cinematic-v3/index.html",
  "assets/landing-cinematic-v3/style.css",
  "assets/landing-cinematic-v3/main.js",
]);

function publicRelativePath(publicRoot, filename) {
  return path.relative(publicRoot, filename).replaceAll("\\", "/");
}

function isRootPageTrace(app, trace) {
  return path.relative(app, trace).replaceAll("\\", "/") === "page.js.nft.json";
}

function isRequiredCinematicLandingAsset(app, trace, publicRoot, filename) {
  return isRootPageTrace(app, trace) && CINEMATIC_LANDING_RUNTIME_ASSETS.has(
    publicRelativePath(publicRoot, filename),
  );
}

async function rootCinematicTraceFiles(app, trace, publicRoot) {
  if (!isRootPageTrace(app, trace)) return [];

  const traceDirectory = path.dirname(trace);
  const files = [];
  for (const publicPath of CINEMATIC_LANDING_RUNTIME_ASSETS) {
    const filename = path.join(publicRoot, ...publicPath.split("/"));
    const info = await stat(filename);
    if (!info.isFile()) throw new Error(`Required cinematic landing asset is not a file: ${publicPath}`);
    files.push(path.relative(traceDirectory, filename).replaceAll("\\", "/"));
  }
  return files;
}

function parseTrace(text, filename) {
  const value = JSON.parse(text);
  if (value.version !== 1 || !Array.isArray(value.files) || value.files.some(file => typeof file !== "string"))
    throw new Error(`Invalid server trace: ${filename}`);
  return value;
}

/**
 * Next 15 joins exclusion globs with native Windows backslashes, which picomatch
 * interprets as escapes. Apply the same public/artifacts exclusions by resolved path
 * containment to the actual build artifacts, then run the unchanged strict gate.
 * Static assets stay in public and remain deployment inputs. No dependencies
 * outside those exact directories may be removed here.
 */
export async function applyPublicTraceExclusion(root, distDir = ".next") {
  const project = path.resolve(root), app = path.resolve(project, distDir, "server/app");
  const publicRoot = path.join(project, "public");
  const artifactsRoot = path.join(project, "artifacts");
  let changedTraces = 0, removedEntries = 0, removedArtifactEntries = 0, restoredEntries = 0;
  for (const trace of await traceFiles(app)) {
    const value = parseTrace(await readFile(trace, "utf8"), path.relative(project, trace));
    const additionalFiles = await rootCinematicTraceFiles(app, trace, publicRoot);
    const existingFiles = new Set(value.files.map(file => file.replaceAll("\\", "/")));
    const mergedFiles = [...value.files];
    for (const file of additionalFiles) {
      if (!existingFiles.has(file)) {
        mergedFiles.push(file);
        restoredEntries++;
      }
    }
    const files = [];
    for (const file of mergedFiles) {
      const filename = path.resolve(path.dirname(trace), file.replaceAll("\\", "/"));
      if (isWithin(artifactsRoot, filename)) {
        removedEntries++;
        removedArtifactEntries++;
      } else if (!isWithin(publicRoot, filename) || isRequiredCinematicLandingAsset(app, trace, publicRoot, filename)) {
        files.push(file);
      } else {
        removedEntries++;
      }
    }
    if (files.length === value.files.length && files.every((file, index) => file === value.files[index])) continue;
    // Use only generated trace paths discovered underneath the selected app build.
    await writeFile(trace, JSON.stringify({ ...value, files }) + "\n");
    changedTraces++;
  }
  return {
    changedTraces,
    removedEntries,
    removedArtifactEntries,
    restoredEntries,
    exclusion: "artifacts/**/*; public/**/* except the root cinematic landing source files",
  };
}

/** Read-only estimate of each server route's uncompressed traced files. */
export async function auditFunctionTraces(root, distDir = ".next", limitBytes = DEFAULT_TRACE_LIMIT_BYTES) {
  if (!Number.isSafeInteger(limitBytes) || limitBytes < 1) throw new Error("Invalid function trace limit.");
  const project = path.resolve(root), app = path.resolve(project, distDir, "server/app");
  const publicRoot = path.join(project, "public");
  const artifactsRoot = path.join(project, "artifacts");
  const traces = await traceFiles(app);
  if (!traces.length) throw new Error("No server route traces found. Run the production build first.");
  const sizes = new Map();
  const rows = [];
  for (const trace of traces) {
    const value = parseTrace(await readFile(trace, "utf8"), path.relative(project, trace));
    const paths = [...new Set([trace.slice(0, -".nft.json".length), ...value.files.map(file =>
      path.resolve(path.dirname(trace), file.replaceAll("\\", "/")))])];
    let bytes = 0;
    const publicAssets = [];
    const artifactAssets = [];
    for (const filename of paths) {
      if (!sizes.has(filename)) {
        const info = await stat(filename);
        if (!info.isFile()) throw new Error(`Trace entry is not a file: ${path.relative(project, filename)}`);
        sizes.set(filename, info.size);
      }
      bytes += sizes.get(filename);
      if (isWithin(publicRoot, filename) && !isRequiredCinematicLandingAsset(app, trace, publicRoot, filename)) {
        publicAssets.push(publicRelativePath(publicRoot, filename));
      }
      if (isWithin(artifactsRoot, filename)) {
        artifactAssets.push(path.relative(artifactsRoot, filename).replaceAll("\\", "/"));
      }
    }
    rows.push({ route: path.relative(app, trace).replaceAll("\\", "/").replace(/\/(?:route|page)\.js\.nft\.json$/u, ""),
      files: paths.length, bytes, exceedsLimit: bytes > limitBytes, publicAssetCount: publicAssets.length, publicAssets: publicAssets.slice(0, 10),
      artifactAssetCount: artifactAssets.length, artifactAssets: artifactAssets.slice(0, 10) });
  }
  rows.sort((left, right) => right.bytes - left.bytes);
  const failures = rows.filter(row => row.exceedsLimit || row.publicAssetCount || row.artifactAssetCount);
  return { version: "diana-function-trace-gate-v1", status: failures.length ? "blocked" : "passed", limitBytes,
    routes: rows.length, maximumBytes: rows[0].bytes, failures, largest: rows.slice(0, 10),
    qualification: "Local uncompressed trace estimate. Provider packaging adds overhead; deployment readiness still requires the provider's build result." };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.argv.slice(2).some(argument => argument !== "--apply-public-exclusion")) throw new Error("Unknown trace gate argument.");
    const publicExclusion = process.argv.includes("--apply-public-exclusion")
      ? await applyPublicTraceExclusion(process.cwd(), process.env.NEXT_DIST_DIR || ".next") : undefined;
    const result = await auditFunctionTraces(process.cwd(), process.env.NEXT_DIST_DIR || ".next");
    console.log(JSON.stringify({ ...result, ...(publicExclusion ? { publicExclusion } : {}) }, null, 2));
    if (result.status !== "passed") process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Function trace audit did not complete.");
    process.exitCode = 1;
  }
}
