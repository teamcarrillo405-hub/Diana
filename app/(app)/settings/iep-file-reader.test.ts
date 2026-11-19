import { beforeEach, describe, expect, it, vi } from "vitest";
import { IEP_FILE_LIMIT, IEP_TEXT_LIMIT, readIepFile } from "./iep-file-reader";
const mocks = vi.hoisted(() => ({ getDocument: vi.fn(), destroy: vi.fn(), getPage: vi.fn(), cleanup: vi.fn() }));
vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({ GlobalWorkerOptions: {}, getDocument: mocks.getDocument }));
function file(overrides: Partial<File> = {}): File {
  const bytes = new Uint8Array(new TextEncoder().encode("%PDF-1.7 test"));
  return { name: "supports.pdf", type: "application/pdf", size: bytes.length, arrayBuffer: vi.fn(async () => bytes.buffer), text: vi.fn(async () => "Allow extra time and read-aloud support."), ...overrides } as File;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.destroy.mockResolvedValue(undefined);
  mocks.getPage.mockResolvedValue({ getTextContent: async () => ({ items: [{ str: "Allow 50% extra time", hasEOL: true }, { str: "and read-aloud support." }] }), cleanup: mocks.cleanup });
  mocks.getDocument.mockReturnValue({ promise: Promise.resolve({ numPages: 1, getPage: mocks.getPage }), destroy: mocks.destroy });
});
describe("local IEP document reading", () => {
  it("extracts the native PDF text and releases the local document without uploading it", async () => {
    expect(await readIepFile(file())).toBe("Allow 50% extra time\nand read-aloud support.");
    expect(mocks.getDocument).toHaveBeenCalledWith({ data: expect.any(Uint8Array) });
    expect(mocks.cleanup).toHaveBeenCalledOnce();
    expect(mocks.destroy).toHaveBeenCalledOnce();
  });
  it("continues to read text and Markdown documents", async () => {
    expect(await readIepFile(file({ name: "supports.md", type: "text/markdown" }))).toContain("read-aloud");
    expect(mocks.getDocument).not.toHaveBeenCalled();
  });
  it("checks size and PDF signature before opening the parser", async () => {
    await expect(readIepFile(file({ size: IEP_FILE_LIMIT + 1 }))).rejects.toThrow("10 MB");
    await expect(readIepFile(file({ arrayBuffer: async () => new Uint8Array([110,111,116,32,97,32,80,68,70]).buffer }))).rejects.toThrow("could not be read as a PDF");
    expect(mocks.getDocument).not.toHaveBeenCalled();
  });
  it("explains scanned PDFs and does not pretend to have read their accommodations", async () => {
    mocks.getPage.mockResolvedValue({ getTextContent: async () => ({ items: [] }), cleanup: mocks.cleanup });
    await expect(readIepFile(file())).rejects.toThrow("scanned PDF");
    expect(mocks.destroy).toHaveBeenCalledOnce();
  });
  it("bounds page and text extraction", async () => {
    mocks.getDocument.mockReturnValueOnce({ promise: Promise.resolve({ numPages: 51, getPage: mocks.getPage }), destroy: mocks.destroy });
    await expect(readIepFile(file())).rejects.toThrow("50 pages");
    expect(mocks.getPage).not.toHaveBeenCalled();
    await expect(readIepFile(file({ name: "supports.txt", type: "text/plain", text: async () => "a".repeat(IEP_TEXT_LIMIT + 1) }))).rejects.toThrow("50,000 characters");
  });
  it("provides an actionable fallback for protected or unreadable PDFs", async () => {
    mocks.getDocument.mockReturnValueOnce({ promise: Promise.reject(new Error("PasswordException")), destroy: mocks.destroy });
    await expect(readIepFile(file())).rejects.toThrow("password protected");
    expect(mocks.destroy).toHaveBeenCalledOnce();
  });
  it("stops a stalled PDF parser and releases its worker", async () => {
    vi.useFakeTimers();
    try {
      mocks.getDocument.mockReturnValueOnce({ promise: new Promise(() => {}), destroy: mocks.destroy });
      const result = expect(readIepFile(file())).rejects.toThrow("took too long");
      await vi.advanceTimersByTimeAsync(20_000);
      await result;
      expect(mocks.destroy).toHaveBeenCalledOnce();
    } finally { vi.useRealTimers(); }
  });
});
