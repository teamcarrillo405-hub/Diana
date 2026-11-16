// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LobbyPreviewPage from "./page";

afterEach(() => vi.unstubAllGlobals());

describe("public Lobby preview", () => {
  it("switches sample sections without exposing live account actions", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const { container } = render(<LobbyPreviewPage />);
    expect(screen.getByText(/Lobby design preview · Sample data · Read-only/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Linear equations practice set/i })).toBeTruthy();
    const lobby = container.querySelector<HTMLElement>("[data-today-dashboard]");
    expect(lobby?.style.getPropertyValue("--school-primary")).toBe("#086224");
    expect(lobby?.style.getPropertyValue("--school-secondary")).toBe("#000000");
    expect(screen.getAllByText("Tigard Campus")).toHaveLength(2);
    expect(container.querySelector("[data-today-stage-rail] img")).toBeNull();
    expect(screen.queryByText(/your personalized/i)).toBeNull();
    const schoolLogos = [...container.querySelectorAll('img[src="/assets/school-examples/tigard-t-mark.jpg"]')];
    expect(schoolLogos).toHaveLength(2);
    expect(schoolLogos.every(logo => Boolean(logo.closest("[data-school-scene]")))).toBe(true);
    expect(container.querySelectorAll("a[href], form")).toHaveLength(0);
    fireEvent.click(screen.getByRole("tab", { name: "Check-in" }));
    const checkIn = within(screen.getByRole("tabpanel", { name: "Check-in" }));
    expect(checkIn.getByText("Optional")).toBeVisible();
    expect(checkIn.getByRole("button", { name: "Save check-in" })).toBeDisabled();
    fireEvent.click(screen.getByRole("tab", { name: "This Week" }));
    expect(screen.getByRole("heading", { name: "This Week" })).toBeVisible();
    expect(within(screen.getByRole("tabpanel", { name: "This Week" })).getAllByText("Due this week marked done")).toHaveLength(1);
    expect(screen.getByText("Submitted this week")).toBeVisible();
    expect(screen.getByText("Cell structure notes")).toBeVisible();
    expect(container.querySelectorAll("a[href], form")).toHaveLength(0);
    fireEvent.click(screen.getByRole("tab", { name: "Now" }));
    expect(within(screen.getByRole("tabpanel", { name: "Now" })).queryByRole("button", { name: "Check-in" })).toBeNull();
  });
});
