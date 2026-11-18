/** Reads a student's IEP locally. Only the reviewed text enters the existing import action. */
export const IEP_FILE_LIMIT = 10_000_000;
export const IEP_TEXT_LIMIT = 50_000;
const IEP_PAGE_LIMIT = 50;
const PDF_WORKER = "/assets/learning/pdf-worker-6.3.289.min.mjs";

export async function readIepFile(file: File): Promise<string> {
  if (file.size > IEP_FILE_LIMIT) throw new Error("Choose a document smaller than 10 MB, or paste its accommodation text.");
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (!isPdf) {
    if (!/\.(txt|md)$/i.test(file.name) && !["text/plain", "text/markdown"].includes(file.type)) {
      throw new Error("Choose a PDF, text, or Markdown document.");
    }
    return checkedText(await file.text());
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") throw new Error("This file could not be read as a PDF. Choose another document or paste its text.");
  const pdf = await import("pdfjs-dist/legacy/build/pdf.mjs").catch(() => { throw new Error("PDF reading is unavailable on this device. Paste its accommodation text instead."); });
  pdf.GlobalWorkerOptions.workerSrc = PDF_WORKER;
  let task: ReturnType<typeof pdf.getDocument>;
  try { task = pdf.getDocument({ data: bytes }); } catch { throw new Error("This PDF could not be read. Choose another document or paste its accommodation text."); }
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        const document = await task.promise;
        if (document.numPages > IEP_PAGE_LIMIT) throw new Error("Choose a PDF with 50 pages or fewer, or paste only the accommodation text.");
        const pages: string[] = [];
        let length = 0;
        for (let number = 1; number <= document.numPages; number++) {
          const page = await document.getPage(number);
          try {
            const content = await page.getTextContent();
            const text = content.items.map(item => "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "").join("");
            length += text.length;
            if (length > IEP_TEXT_LIMIT) throw new Error("This document has a lot of text. Paste only the accommodation section, up to 50,000 characters.");
            pages.push(text);
          } finally { page.cleanup(); }
        }
        return checkedText(pages.join("\n\n"));
      })(),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("Reading this PDF took too long. Paste its accommodation text instead.")), 20_000); }),
    ]);
  } catch (error) {
    if (error instanceof Error && /^(Choose|This document|Reading|No readable)/.test(error.message)) throw error;
    throw new Error("This PDF could not be read. If it is scanned or password protected, paste its accommodation text instead.");
  } finally {
    clearTimeout(timeout);
    await task.destroy().catch(() => undefined);
  }
}

function checkedText(text: string): string {
  const trimmed = text.replace(/\u0000/g, "").trim();
  if (trimmed.length < 20) throw new Error("No readable accommodation text was found. If this is a scanned PDF, paste the text instead.");
  if (trimmed.length > IEP_TEXT_LIMIT) throw new Error("This document has a lot of text. Paste only the accommodation section, up to 50,000 characters.");
  return trimmed;
}
