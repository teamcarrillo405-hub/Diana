// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SchoolBrandingForm } from "./school-branding-form";
import { saveSchoolBranding } from "@/app/(app)/settings/school-branding-actions";

const mocks = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/app/(app)/settings/school-branding-actions", () => ({ saveSchoolBranding: vi.fn() }));

describe("SchoolBrandingForm", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(saveSchoolBranding).mockResolvedValue({ ok: true }); });
  afterEach(cleanup);

  it("saves both colors and retains the existing logo", async () => {
    const logo = "data:image/webp;base64,AAAA";
    render(<SchoolBrandingForm initialSchoolBranding={{ primaryColor: "#123456", secondaryColor: "#abcdef", logoDataUrl: logo }} />);
    fireEvent.change(screen.getByLabelText("First school color"), { target: { value: "#8C1D40" } });
    fireEvent.change(screen.getByLabelText("Second school color"), { target: { value: "#FFC627" } });
    fireEvent.click(screen.getByRole("button", { name: "Save school look" }));
    await waitFor(() => expect(saveSchoolBranding).toHaveBeenCalledWith({ schoolName: null, primaryColor: "#8C1D40", secondaryColor: "#FFC627", logoDataUrl: logo }));
    expect(await screen.findByRole("status")).toHaveTextContent("School look saved.");
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("can clear branding and reports save errors", async () => {
    vi.mocked(saveSchoolBranding).mockResolvedValue({ ok: false, error: "Please try again." });
    render(<SchoolBrandingForm initialSchoolBranding={{ primaryColor: "#123456", secondaryColor: null, logoDataUrl: "data:image/webp;base64,AAAA" }} />);
    fireEvent.change(screen.getByLabelText("First school color"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Remove logo" }));
    fireEvent.click(screen.getByRole("button", { name: "Save school look" }));
    await waitFor(() => expect(saveSchoolBranding).toHaveBeenCalledWith({ schoolName: null, primaryColor: null, secondaryColor: null, logoDataUrl: null }));
    expect(await screen.findByRole("status")).toHaveTextContent("Please try again.");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("saves the entered school name and keeps previously selected colors", async () => {
    render(<SchoolBrandingForm initialSchoolBranding={{ schoolName: null, primaryColor: "#8C1D40", secondaryColor: "#FFC627", logoDataUrl: null }} />);
    fireEvent.change(screen.getByLabelText("School name"), { target: { value: "Tigard High School" } });
    fireEvent.click(screen.getByRole("button", { name: "Save school look" }));
    await waitFor(() => expect(saveSchoolBranding).toHaveBeenCalledWith({ schoolName: "Tigard High School", primaryColor: "#8C1D40", secondaryColor: "#FFC627", logoDataUrl: null }));
  });

  it("blocks invalid colors and unsupported logo files before saving", async () => {
    render(<SchoolBrandingForm initialSchoolBranding={{ primaryColor: null, secondaryColor: null, logoDataUrl: null }} />);
    fireEvent.change(screen.getByLabelText("First school color"), { target: { value: "pink" } });
    fireEvent.click(screen.getByRole("button", { name: "Save school look" }));
    expect(screen.getByRole("status")).toHaveTextContent("six-digit color code");
    expect(saveSchoolBranding).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("School logo"), { target: { files: [new File(["x"], "logo.svg", { type: "image/svg+xml" })] } });
    expect(screen.getByRole("status")).toHaveTextContent("PNG, JPG, or WebP");
  });
});
