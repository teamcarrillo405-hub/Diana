import { globSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Worker } from "node:worker_threads";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { expect, it } from "vitest";
import nextConfig from "../../next.config";

it("runs resumed PDF extraction with only the jobs route's explicitly traced worker package", async () => {
  // The worker's dynamic imports are invisible to Next's ordinary module trace.
  // Use an isolated directory outside the checkout so parent node_modules cannot
  // hide a missing package. This previously failed for /api/learning/jobs.
  const root = await mkdtemp(path.join(os.tmpdir(), "diana-pdf-package-"));
  try {
    const patterns = nextConfig.outputFileTracingIncludes?.["/api/learning/jobs"] ?? [];
    expect(patterns.length).toBeGreaterThan(0);
    const files = [...new Set(patterns.flatMap(pattern => [...globSync(pattern, { cwd: process.cwd() })]))];
    for (const relative of files) {
      const source = path.resolve(relative);
      if (!(await stat(source)).isFile()) continue;
      const destination = path.join(root, relative);
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(source, destination);
    }

    const document = await PDFDocument.create();
    const font = await document.embedFont(StandardFonts.Helvetica);
    document.addPage().drawText("First page remains available.", { font });
    document.addPage().drawText("Resume the original source on page two.", { font });
    const bytes = await document.save();
    const worker = new Worker(path.join(root, "lib/learning-engine/pdf-worker.mjs"), {
      execArgv: [], workerData: { bytes, startPage: 2, maxPages: 1 },
      resourceLimits: { maxOldGenerationSizeMb: 192, stackSizeMb: 4 },
      stdout: true, stderr: true,
    });
    const timeout = setTimeout(() => { void worker.terminate(); }, 20_000);
    try {
      const result = await new Promise<{ ok: boolean; totalPages: number; pages: { page: number; text: string }[] }>((resolve, reject) => {
        worker.once("message", resolve);
        worker.once("error", reject);
        worker.once("exit", code => reject(new Error(`Isolated PDF worker exited before a result: ${code}`)));
      });
      expect(result).toMatchObject({ ok: true, totalPages: 2, pages: [{ page: 2 }] });
      expect(result.pages[0].text).toContain("Resume the original source on page two.");
    } finally {
      clearTimeout(timeout);
      await worker.terminate();
    }
  } finally {
    if (!root.startsWith(path.resolve(os.tmpdir(), "diana-pdf-package-"))) throw new Error("Unsafe PDF fixture cleanup path.");
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);
