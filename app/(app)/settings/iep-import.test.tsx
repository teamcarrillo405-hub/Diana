// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IepImport } from "./iep-import";
import { readIepFile } from "./iep-file-reader";
import { importIepText } from "./lms-actions";
vi.mock("./iep-file-reader", () => ({ IEP_TEXT_LIMIT: 50_000, readIepFile: vi.fn() }));
vi.mock("./lms-actions", () => ({ importIepText: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); });
afterEach(cleanup);
describe("IEP import review", () => {
  it("lets the student review locally extracted PDF text before explicitly applying it", async () => {
    vi.mocked(readIepFile).mockResolvedValue("Allow 50% extra time and read-aloud support.");
    vi.mocked(importIepText).mockResolvedValue({ ok: true, message: "Accommodations applied" });
    render(<IepImport />);
    fireEvent.change(screen.getByLabelText(/upload/i), { target: { files: [new File(["%PDF-"], "supports.pdf", { type: "application/pdf" })] } });
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Accommodation text" })).toHaveValue("Allow 50% extra time and read-aloud support."));
    expect(importIepText).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: "Document name" })).toHaveValue("supports.pdf");
    fireEvent.click(screen.getByRole("button", { name: "Apply accommodations" }));
    await waitFor(() => expect(importIepText).toHaveBeenCalledOnce());
    const submitted = vi.mocked(importIepText).mock.calls[0][0];
    expect(submitted.get("text")).toBe("Allow 50% extra time and read-aloud support.");
    expect(submitted.get("source_name")).toBe("supports.pdf");
  });
  it("clears previous text when a new PDF cannot be read and keeps Apply unavailable", async () => {
    vi.mocked(readIepFile).mockRejectedValue(new Error("This PDF is scanned. Paste its accommodation text instead."));
    render(<IepImport />);
    fireEvent.change(screen.getByRole("textbox", { name: "Accommodation text" }), { target: { value: "An earlier document has extra time." } });
    fireEvent.change(screen.getByLabelText(/upload/i), { target: { files: [new File(["%PDF-"], "scan.pdf", { type: "application/pdf" })] } });
    await screen.findByText("This PDF is scanned. Paste its accommodation text instead.");
    expect(screen.getByRole("textbox", { name: "Accommodation text" })).toHaveValue("");
    expect(screen.getByRole("button", { name: "Apply accommodations" })).toBeDisabled();
    expect(importIepText).not.toHaveBeenCalled();
  });
});
