import { parentPort, workerData } from "node:worker_threads";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const pdfRoot = path.dirname(require.resolve("pdfjs-dist/package.json"));

try {
  const task = getDocument({
    data: new Uint8Array(workerData.bytes),
    isEvalSupported: false,
    useSystemFonts: false,
    disableFontFace: true,
    stopAtErrors: true,
    useWorkerFetch: false,
    standardFontDataUrl: path.join(pdfRoot,"standard_fonts").replaceAll("\\","/")+"/",
    cMapUrl: path.join(pdfRoot,"cmaps").replaceAll("\\","/")+"/",
    cMapPacked: true,
    wasmUrl: path.join(pdfRoot,"wasm").replaceAll("\\","/")+"/",
  });
  const document = await task.promise;
  if (document.numPages > 1500) throw new Error("PDF exceeds the page limit.");
  const labels = await document.getPageLabels();
  const pages = [];
  let total = 0;
  const startPage = workerData.startPage ?? 1;
  const lastPage = Math.min(document.numPages, startPage + (workerData.maxPages ?? 1500) - 1);
  if (!Number.isInteger(startPage) || startPage < 1 || startPage > document.numPages) throw new Error("Invalid page range.");
  for (let number = startPage; number <= lastPage; number++) {
    const page = await document.getPage(number);
    const content = await page.getTextContent();
    let text = "";
    const regions = [];
    const viewport = page.getViewport({ scale: 1 });
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const startOffset = text.length;
      text += item.str + (item.hasEOL ? "\n" : " ");
      if (item.str.trim() && regions.length < 4000) {
        const [a,b,c,d,e,f] = viewport.transform;
        const angle = Math.atan2(item.transform[1],item.transform[0]);
        const corners = [[0,0],[item.width,0],[0,item.height],[item.width,item.height]].map(([u,v])=>{
          const px=item.transform[4]+u*Math.cos(angle)-v*Math.sin(angle);
          const py=item.transform[5]+u*Math.sin(angle)+v*Math.cos(angle);
          return [a*px+c*py+e,b*px+d*py+f];
        });
        const left=Math.min(...corners.map(point=>point[0])),right=Math.max(...corners.map(point=>point[0]));
        const top=Math.min(...corners.map(point=>point[1])),bottom=Math.max(...corners.map(point=>point[1]));
        const x = Math.max(0, Math.min(1, left / viewport.width));
        const y = Math.max(0, Math.min(1, top / viewport.height));
        const width = Math.min(1 - x, (right-left) / viewport.width);
        const height = Math.min(1 - y, (bottom-top) / viewport.height);
        if (width > 0 && height > 0) regions.push({ id: "native-" + number + "-" + startOffset, kind: "text", box: {x,y,width,height}, startOffset, endOffset: startOffset + item.str.length, provenance: "native_pdf", confirmed: false });
      }
    }
    total += text.length;
    if (text.length > 250000 || total > 8000000) throw new Error("PDF exceeds the text limit.");
    // Native extraction can omit scanned formulas/diagrams. Never infer their
    // contents from nearby prose. Sparse pages remain queued for confirmation.
    pages.push({
      page: number, pageLabel: labels?.[number - 1] || "Page " + number,
      text, regions, interpretation: text.trim().length < 40 ? "model_extraction" : "original",
    });
    page.cleanup();
  }
  const totalPages = document.numPages;
  await task.destroy();
  parentPort.postMessage({ ok: true, pages, totalPages });
} catch {
  parentPort.postMessage({ ok: false, error: "This PDF needs another extraction pass." });
}
