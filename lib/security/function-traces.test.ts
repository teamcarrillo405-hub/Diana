import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  applyPublicTraceExclusion,
  auditFunctionTraces,
  CINEMATIC_LANDING_RUNTIME_ASSETS,
} from "../../scripts/check-function-traces.mjs";

const roots: string[] = [];
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "diana-function-trace-")); roots.push(root);
  const route = path.join(root, ".next/server/app/api/example");
  await mkdir(route, { recursive: true });
  await mkdir(path.join(root, "content/textbooks"), { recursive: true });
  await mkdir(path.join(root, "lib/learning-engine"), { recursive: true });
  await writeFile(path.join(route, "route.js"), "route");
  await writeFile(path.join(root, "content/textbooks/chapter.json.gz"), "textbook");
  await writeFile(path.join(root, "lib/learning-engine/pdf-worker.mjs"), "parser");
  const files = ["content/textbooks/chapter.json.gz", "lib/learning-engine/pdf-worker.mjs"].map(file => path.relative(route, path.join(root, file)));
  const trace = path.join(route, "route.js.nft.json");
  await writeFile(trace, JSON.stringify({ version: 1, files }));
  return { root, route, trace, files };
}
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });

describe("server function trace deployment gate", () => {
  it("counts retained textbook and PDF runtime assets plus the route entry exactly once", async () => {
    const { root, trace, files } = await fixture();
    await writeFile(trace, JSON.stringify({ version: 1, files: [...files, files[0].replaceAll("\\", "/")] }));
    const result = await auditFunctionTraces(root, ".next", 100);
    expect(result).toMatchObject({ status: "passed", routes: 1, maximumBytes: 19 });
    expect(result.largest[0]).toMatchObject({ files: 3, publicAssets: [] });
  });
  it("blocks oversized functions even when no public assets leaked into them", async () => {
    const { root } = await fixture();
    const result = await auditFunctionTraces(root, ".next", 18);
    expect(result.status).toBe("blocked");
    expect(result.failures[0]).toMatchObject({ exceedsLimit: true, bytes: 19 });
  });
  it("blocks accidental public media tracing even below the size ceiling", async () => {
    const { root, route, trace, files } = await fixture();
    await mkdir(path.join(root, "public/vendor"), { recursive: true });
    const asset = path.join(root, "public/vendor/runtime.wasm");
    await writeFile(asset, "public");
    await writeFile(trace, JSON.stringify({ version: 1, files: [...files, path.relative(route, asset)] }));
    const result = await auditFunctionTraces(root, ".next", 100);
    expect(result.failures[0]).toMatchObject({ exceedsLimit: false, publicAssets: ["vendor/runtime.wasm"] });
  });
  it("refuses missing traced dependencies instead of reporting an artificially small function", async () => {
    const { root, trace } = await fixture();
    await writeFile(trace, JSON.stringify({ version: 1, files: ["missing.js"] }));
    await expect(auditFunctionTraces(root, ".next", 100)).rejects.toThrow();
  });

  it("repairs actual Windows/POSIX public entries while retaining content, runtime and similarly named directories", async () => {
    const { root, route, trace, files } = await fixture();
    await mkdir(path.join(root, "public/vendor"), { recursive: true });
    await mkdir(path.join(root, "publicity"), { recursive: true });
    const asset = path.join(root, "public/vendor/runtime.wasm");
    const retained = path.join(root, "publicity/private.json");
    await writeFile(asset, "public"); await writeFile(retained, "private");
    const publicPath = path.relative(route, asset);
    await writeFile(trace, JSON.stringify({ version: 1, files: [...files, publicPath.replaceAll("/", "\\"), publicPath.replaceAll("\\", "/"), path.relative(route, retained)] }));
    expect((await auditFunctionTraces(root, ".next", 100)).status).toBe("blocked");
    expect(await applyPublicTraceExclusion(root)).toMatchObject({ changedTraces: 1, removedEntries: 2 });
    expect(JSON.parse(await readFile(trace, "utf8")).files).toEqual([...files, path.relative(route, retained)]);
    expect((await stat(asset)).isFile()).toBe(true);
    expect((await auditFunctionTraces(root, ".next", 100))).toMatchObject({ status: "passed", maximumBytes: 26 });
    expect(await applyPublicTraceExclusion(root)).toMatchObject({ changedTraces: 0, removedEntries: 0 });
  });

  it("restores only the root cinematic landing sources after public trace exclusion", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "diana-function-trace-"));
    roots.push(root);
    const rootRoute = path.join(root, ".next/server/app");
    const trace = path.join(rootRoute, "page.js.nft.json");
    const entry = path.join(rootRoute, "page.js");
    const cinematicRoot = path.join(root, "public/assets/landing-cinematic-v3");
    const privateDependency = path.join(root, "content/root-page/runtime.json");
    await mkdir(rootRoute, { recursive: true });
    await mkdir(cinematicRoot, { recursive: true });
    await mkdir(path.dirname(privateDependency), { recursive: true });
    await writeFile(entry, "root page");
    await writeFile(privateDependency, "private");

    const sourceFiles = [];
    for (const publicPath of CINEMATIC_LANDING_RUNTIME_ASSETS) {
      const filename = path.join(root, "public", ...publicPath.split("/"));
      await writeFile(filename, publicPath);
      sourceFiles.push(path.relative(rootRoute, filename).replaceAll("\\", "/"));
    }
    const excludedMedia = path.join(cinematicRoot, "poster.mp4");
    await writeFile(excludedMedia, "large media");
    await writeFile(trace, JSON.stringify({
      version: 1,
      files: [path.relative(rootRoute, privateDependency), path.relative(rootRoute, excludedMedia)],
    }));

    expect(await applyPublicTraceExclusion(root)).toMatchObject({
      changedTraces: 1,
      removedEntries: 1,
      restoredEntries: 3,
    });
    const restored = JSON.parse(await readFile(trace, "utf8"));
    expect(restored.files).toEqual(expect.arrayContaining(sourceFiles));
    expect(restored.files).not.toContain(path.relative(rootRoute, excludedMedia));
    expect(await auditFunctionTraces(root, ".next", 1_000)).toMatchObject({
      status: "passed",
      failures: [],
    });
  });

  it("does not remove a private dependency through a public/../ path or waive its absence", async () => {
    const { root, route, trace, files } = await fixture();
    const outsidePublic = path.relative(route, root).replaceAll("\\", "/") + "/public/../private-model.json";
    await writeFile(trace, JSON.stringify({ version: 1, files: [...files, outsidePublic] }));
    expect(await applyPublicTraceExclusion(root)).toMatchObject({ changedTraces: 0, removedEntries: 0 });
    await expect(auditFunctionTraces(root, ".next", 100)).rejects.toThrow();
  });
});
