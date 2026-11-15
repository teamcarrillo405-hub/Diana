import "server-only";
import { Worker } from "node:worker_threads";
import path from "node:path";
import { z } from "zod";
import type { SourcePage } from "./contracts";
import { sourcePageSchema } from "./source-layout";

const outputSchema = z.object({ ok: z.literal(true), pages: z.array(sourcePageSchema).min(1).max(1500), totalPages:z.number().int().min(1).max(1500) });

/** Parser work has its own memory limit and terminable time budget. */
export async function extractNativePdf(bytes: Uint8Array): Promise<SourcePage[]> {
  return (await extractPdfBatch(bytes, 1, 1500)).pages;
}
export async function extractPdfBatch(bytes: Uint8Array, startPage: number, maxPages = 10): Promise<{pages:SourcePage[];totalPages:number}> {
  if (!Number.isInteger(startPage) || startPage < 1 || !Number.isInteger(maxPages) || maxPages < 1 || maxPages > 1500) throw new Error("Invalid PDF page range.");
  if (bytes.length > 30_000_000 || new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
    throw new Error("Choose a PDF smaller than 30 MB.");
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(process.cwd(),"lib/learning-engine/pdf-worker.mjs"), {
      workerData: { bytes, startPage, maxPages }, resourceLimits: { maxOldGenerationSizeMb: 192, stackSizeMb: 4 },
    });
    let completed = false;
    const finish = (error?: Error, value?: {pages:SourcePage[];totalPages:number}) => {
      if (completed) return;
      completed = true; clearTimeout(timeout); void worker.terminate();
      if (error) reject(error); else resolve(value!);
    };
    const timeout = setTimeout(() => finish(new Error("PDF extraction paused at the time limit.")), 20000);
    worker.once("message", (value: unknown) => {
      const result = outputSchema.safeParse(value);
      finish(result.success ? undefined : new Error("This PDF needs a page review."), result.success ? result.data : undefined);
    });
    worker.once("error", () => finish(new Error("PDF extraction is unavailable.")));
    worker.once("exit", (code) => { if (!completed) finish(new Error("PDF extraction ended before completion: " + code)); });
  });
}
