// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import type { PropsWithChildren } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MoreMenu } from "./more-menu";

vi.mock("./student-shell", () => ({ StudentShell: ({ children }: PropsWithChildren) => <div>{children}</div> }));

beforeEach(() => {
  window.history.replaceState(null, "", "/more");
  vi.stubGlobal("matchMedia", vi.fn().mockImplementation((query: string) => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("More navigation", () => {
  it("restores the current URL category even when the cached page supplied an older selection", () => {
    window.history.replaceState(null, "", "/more?section=account");
    render(<MoreMenu initialMode="study" schoolName="Tigard High School" />);
    expect(screen.getByText("Tigard Campus")).toBeVisible();
    expect(screen.getByRole("tab", { name: "Account" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("link", { name: /settings/i })).toHaveAttribute("href", "/settings");
    expect(screen.queryByRole("link", { name: "Notes" })).not.toBeInTheDocument();
  });
  it("updates the URL when switching categories and restores it after browser navigation", () => {
    render(<MoreMenu />);
    fireEvent.click(screen.getByRole("tab", { name: "Wellness" }));
    expect(window.location.search).toBe("?section=wellness");
    expect(screen.getByRole("link", { name: /check-in history/i })).toHaveAttribute("href", "/wellness");
    window.history.replaceState(null, "", "/more?section=record");
    fireEvent.popState(window);
    expect(screen.getByRole("tab", { name: "Record" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("link", { name: /completed work/i })).toHaveAttribute("href", "/proof");
  });
  it("keeps roving keyboard focus and a single selected tab", () => {
    render(<MoreMenu />);
    const tools = screen.getByRole("tab", { name: "Study tools" });
    tools.focus();
    fireEvent.keyDown(tools, { key: "ArrowDown" });
    const record = screen.getByRole("tab", { name: "Record" });
    expect(record).toHaveFocus();
    expect(record).toHaveAttribute("tabindex", "0");
    expect(tools).toHaveAttribute("tabindex", "-1");
    fireEvent.keyDown(record, { key: "End" });
    expect(screen.getByRole("tab", { name: "Account" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("tab", { name: "Account" }), { key: "Home" });
    expect(tools).toHaveFocus();
    expect(window.location.search).toBe("?section=study");
  });
  it("falls back to study tools for an unknown category and supports clearing search", () => {
    window.history.replaceState(null, "", "/more?section=unknown");
    render(<MoreMenu />);
    expect(screen.getByRole("tab", { name: "Study tools" })).toHaveAttribute("aria-selected", "true");
    const search = screen.getByRole("searchbox", { name: "Search" });
    fireEvent.change(search, { target: { value: "algebra" } });
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(search).toHaveValue("");
    expect(search).toHaveFocus();
    expect(search.closest("form")).toHaveAttribute("action", "/search");
  });
});
