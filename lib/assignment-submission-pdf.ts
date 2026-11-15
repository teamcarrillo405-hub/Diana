import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { parseAssignmentInkDocument } from "@/lib/assignment-ink";
import { canonicalSubmissionPayloadForTarget } from "@/lib/assignment-submission";
import { assignmentSubmissionCanonicalPayloadBytes } from "@/lib/assignment-submission-server";
import type { AssignmentSubmissionPreview } from "@/lib/assignment-workspace-contracts";
import { utf8ByteLength } from "@/lib/specialist-artifacts/bounds";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const TEXT_WIDTH = PAGE_WIDTH - MARGIN * 2;
export const ASSIGNMENT_SUBMISSION_PDF_TEXT_MAX_BYTES = 2 * 1024 * 1024;
export const ASSIGNMENT_SUBMISSION_PDF_MAX_BYTES = 20 * 1024 * 1024;

export function assertAssignmentSubmissionPdfByteLength(byteLength: number): void {
  if (!Number.isSafeInteger(byteLength) || byteLength < 0) {
    throw new TypeError("Assignment PDF byte length is invalid.");
  }
  if (byteLength > ASSIGNMENT_SUBMISSION_PDF_MAX_BYTES) {
    throw new RangeError(
      `Assignment PDF needs ${byteLength} bytes, above the ${ASSIGNMENT_SUBMISSION_PDF_MAX_BYTES}-byte limit.`,
    );
  }
}

type PdfGlyph = {
  font: PDFFont;
  text: string;
  width: number;
};

const PDF_TEXT_FALLBACKS: Readonly<Record<string, string>> = {
  "\u2070": "^0",
  "\u00B9": "^1",
  "\u00B2": "^2",
  "\u00B3": "^3",
  "\u2074": "^4",
  "\u2075": "^5",
  "\u2076": "^6",
  "\u2077": "^7",
  "\u2078": "^8",
  "\u2079": "^9",
  "\u2080": "_0",
  "\u2081": "_1",
  "\u2082": "_2",
  "\u2083": "_3",
  "\u2084": "_4",
  "\u2085": "_5",
  "\u2086": "_6",
  "\u2087": "_7",
  "\u2088": "_8",
  "\u2089": "_9",
  "\u2212": "-",
  "\u2248": "~=",
  "\u2260": "!=",
  "\u2264": "<=",
  "\u2265": ">=",
  "\u221A": "sqrt",
  "\u221E": "infinity",
  "\u2190": "<-",
  "\u2192": "->",
  "\u21D2": "=>",
};

function encodedGlyph(font: PDFFont, value: string, size: number): PdfGlyph | null {
  try {
    return { font, text: value, width: font.widthOfTextAtSize(value, size) };
  } catch {
    return null;
  }
}

function pdfGlyphs(value: string, primaryFont: PDFFont, symbolFont: PDFFont, size: number): PdfGlyph[] {
  const glyphs: PdfGlyph[] = [];
  for (const character of value) {
    const primary = encodedGlyph(primaryFont, character, size);
    if (primary) {
      glyphs.push(primary);
      continue;
    }

    const symbol = encodedGlyph(symbolFont, character, size);
    if (symbol) {
      glyphs.push(symbol);
      continue;
    }

    if (/\p{Mark}/u.test(character) || /[\u200B-\u200D\uFEFF]/u.test(character)) continue;
    const fallback = PDF_TEXT_FALLBACKS[character] ?? "?";
    for (const replacement of fallback) {
      const glyph = encodedGlyph(primaryFont, replacement, size);
      if (glyph) glyphs.push(glyph);
    }
  }
  return glyphs;
}

function glyphWidth(glyphs: readonly PdfGlyph[]): number {
  return glyphs.reduce((total, glyph) => total + glyph.width, 0);
}

function wrapText(value: string, primaryFont: PDFFont, symbolFont: PDFFont, size: number, width: number): PdfGlyph[][] {
  const lines: PdfGlyph[][] = [];
  const space = pdfGlyphs(" ", primaryFont, symbolFont, size);
  const spaceWidth = glyphWidth(space);
  for (const paragraph of value.replace(/\r\n?/gu, "\n").split("\n")) {
    if (!paragraph.trim()) {
      lines.push([]);
      continue;
    }
    const words = paragraph.split(/\s+/gu);
    let line: PdfGlyph[] = [];
    let lineWidth = 0;
    for (const word of words) {
      const wordGlyphs = pdfGlyphs(word, primaryFont, symbolFont, size);
      const wordWidth = glyphWidth(wordGlyphs);
      const candidateWidth = lineWidth + (line.length > 0 ? spaceWidth : 0) + wordWidth;
      if (line.length > 0 && candidateWidth > width) {
        lines.push(line);
        line = [];
        lineWidth = 0;
      }

      if (line.length > 0) {
        line.push(...space);
        lineWidth += spaceWidth;
      }
      for (const glyph of wordGlyphs) {
        if (line.length > 0 && lineWidth + glyph.width > width) {
          lines.push(line);
          line = [];
          lineWidth = 0;
        }
        line.push(glyph);
        lineWidth += glyph.width;
      }
    }
    if (line.length > 0) lines.push(line);
  }
  return lines;
}

function drawGlyphLine(page: PDFPage, glyphs: readonly PdfGlyph[], y: number, size: number, color: ReturnType<typeof rgb>) {
  let x = MARGIN;
  let runFont: PDFFont | null = null;
  let runText = "";
  let runWidth = 0;

  function flush() {
    if (!runFont || !runText) return;
    page.drawText(runText, { x, y, size, font: runFont, color });
    x += runWidth;
    runFont = null;
    runText = "";
    runWidth = 0;
  }

  for (const glyph of glyphs) {
    if (runFont && glyph.font !== runFont) flush();
    runFont = glyph.font;
    runText += glyph.text;
    runWidth += glyph.width;
  }
  flush();
}

export function assignmentSubmissionPdfPayload(
  preview: AssignmentSubmissionPreview,
) {
  return canonicalSubmissionPayloadForTarget(preview, "export");
}

export function assignmentSubmissionPdfSpecialistNotices(
  preview: AssignmentSubmissionPreview,
): string[] {
  const payload = assignmentSubmissionPdfPayload(preview);
  if (!payload.specialistDelivery.visibleSummaryIncluded) return [];
  const summaries = payload.specialistProjection.contextBlocks.map((block) =>
    `${block.label}: ${block.summary}`
  );
  const notices = [
    "Specialist artifact summary",
    ...summaries,
    `A bounded machine-readable artifact is attached as ${payload.specialistDelivery.machineReadableArtifact.fileName}.`,
  ];
  if (payload.specialistDelivery.blocks.some((block) => block.canonicalPayloadTruncated)) {
    notices.push("The attached artifact records its explicit item and byte bounds; omitted source content is not represented as complete.");
  }
  const handoffReasons = payload.specialistDelivery.blocks.flatMap((block) =>
    block.externalHandoffReason ? [block.externalHandoffReason] : []
  );
  if (handoffReasons.length > 0) {
    notices.push(...handoffReasons);
    notices.push("Submit each original CAD or media source file through the school system's external handoff.");
  }
  return notices;
}

export async function renderAssignmentSubmissionPdf(preview: AssignmentSubmissionPreview): Promise<Uint8Array> {
  const payload = assignmentSubmissionPdfPayload(preview);
  const canonicalPayloadBytes = assignmentSubmissionCanonicalPayloadBytes(preview);
  const textPayloadBytes = utf8ByteLength(payload.textPayload);
  if (textPayloadBytes > ASSIGNMENT_SUBMISSION_PDF_TEXT_MAX_BYTES) {
    throw new RangeError(
      `Assignment PDF text needs ${textPayloadBytes} bytes, above the ${ASSIGNMENT_SUBMISSION_PDF_TEXT_MAX_BYTES}-byte render limit.`,
    );
  }
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const symbol = await document.embedFont(StandardFonts.Symbol);
  let page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  function nextPage() {
    page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  }

  function ensureSpace(height: number) {
    if (y - height < MARGIN) nextPage();
  }

  function drawLine(value: string, options: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; gap?: number } = {}) {
    const size = options.size ?? 11;
    const lineHeight = size * 1.55;
    const selectedFont = options.font ?? regular;
    const color = options.color ?? rgb(0.08, 0.1, 0.14);
    const lines = wrapText(value, selectedFont, symbol, size, TEXT_WIDTH);
    for (const line of lines) {
      ensureSpace(lineHeight);
      if (line.length > 0) drawGlyphLine(page, line, y, size, color);
      y -= lineHeight;
    }
    y -= options.gap ?? 4;
  }

  drawLine(preview.assignmentTitle, { font: bold, size: 20, gap: 8 });
  drawLine(`Destination: ${preview.destination}`, { size: 10, color: rgb(0.35, 0.38, 0.43), gap: 12 });
  for (const notice of assignmentSubmissionPdfSpecialistNotices(preview)) {
    drawLine(notice, {
      font: notice === "Specialist artifact summary" ? bold : regular,
      size: notice === "Specialist artifact summary" ? 12 : 10,
      color: notice === "Specialist artifact summary"
        ? rgb(0.08, 0.1, 0.14)
        : rgb(0.28, 0.31, 0.36),
      gap: notice === "Specialist artifact summary" ? 5 : 2,
    });
  }
  if (payload.specialistDelivery.visibleSummaryIncluded) y -= 8;
  drawLine(payload.textPayload || "No typed work was added.", { size: 11, gap: 16 });

  for (const problem of preview.problems) {
    const inkDocument = parseAssignmentInkDocument(problem.inkData);
    if (inkDocument.strokes.length === 0) continue;
    const inkHeight = 190;
    ensureSpace(inkHeight + 42);
    drawLine(`Handwriting for Problem ${problem.number}`, { font: bold, size: 12, gap: 6 });
    const originY = y - inkHeight;
    page.drawRectangle({ x: MARGIN, y: originY, width: TEXT_WIDTH, height: inkHeight, borderColor: rgb(0.82, 0.84, 0.87), borderWidth: 1 });
    const scaleX = TEXT_WIDTH / inkDocument.logicalWidth;
    const scaleY = inkHeight / inkDocument.logicalHeight;
    for (const stroke of inkDocument.strokes) {
      for (let index = 1; index < stroke.points.length; index += 1) {
        const from = stroke.points[index - 1];
        const to = stroke.points[index];
        page.drawLine({
          start: { x: MARGIN + from.x * scaleX, y: originY + inkHeight - from.y * scaleY },
          end: { x: MARGIN + to.x * scaleX, y: originY + inkHeight - to.y * scaleY },
          thickness: 1.7,
          color: rgb(0.08, 0.1, 0.14),
        });
      }
    }
    y = originY - 18;
  }

  const pages = document.getPages();
  pages.forEach((currentPage, index) => {
    currentPage.drawText(`Page ${index + 1} of ${pages.length}`, {
      x: PAGE_WIDTH - MARGIN - 70,
      y: 24,
      size: 9,
      font: regular,
      color: rgb(0.45, 0.47, 0.5),
    });
  });

  document.setTitle(preview.assignmentTitle);
  document.setCreator("Diana");
  await document.attach(
    canonicalPayloadBytes,
    payload.specialistDelivery.machineReadableArtifact.fileName,
    {
      mimeType: "application/json",
      description: "Bounded canonical Diana assignment data used for the submission digest; separately referenced source binaries are not embedded",
    },
  );
  const bytes = await document.save();
  assertAssignmentSubmissionPdfByteLength(bytes.byteLength);
  return bytes;
}
