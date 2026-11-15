import {describe,it,expect,vi} from "vitest";
import {PDFDocument,StandardFonts} from "pdf-lib";
vi.mock("server-only",()=>({}));
import {extractNativePdf,extractPdfBatch} from "./pdf";

describe("native textbook extraction",()=>{
  it("extracts original text and retains page identities",async()=>{
    const document=await PDFDocument.create();
    const font=await document.embedFont(StandardFonts.Helvetica);
    document.addPage().drawText("1. Solve the linear equation 3x + 5 = 20. Show your reasoning.",{font});
    document.addPage().drawText("The area of a rectangle equals its length multiplied by its width.",{font});
    const pages=await extractNativePdf(await document.save());
    expect(pages).toHaveLength(2);
    expect(pages[0].page).toBe(1);
    expect(pages[0].text).toContain("3x + 5 = 20");
    expect(pages[1].interpretation).toBe("original");
    expect(pages[0].regions?.[0].provenance).toBe("native_pdf");
    const batch=await extractPdfBatch(await document.save(),2,1);
    expect(batch.totalPages).toBe(2);
    expect(batch.pages).toHaveLength(1);
    expect(batch.pages[0].page).toBe(2);
  },30000);
  it("rejects non-PDF input before starting the parser",async()=>{
    await expect(extractNativePdf(new TextEncoder().encode("not a PDF"))).rejects.toThrow("Choose a PDF");
  });
});
