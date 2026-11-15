// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DianaWeeklyTrophy } from "./diana-weekly-trophy";

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  vi.stubGlobal("IntersectionObserver", class {
    observe = vi.fn();
    disconnect = vi.fn();
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Diana weekly trophy", () => {
  it("keeps the decorative neon fallback inside the actual logo silhouette", () => {
    const { container } = render(<DianaWeeklyTrophy earned />);
    const trophy = container.querySelector("[data-diana-weekly-trophy]");
    expect(trophy?.getAttribute("aria-hidden")).toBe("true");
    expect(trophy?.getAttribute("data-earned")).toBe("true");
    const mask = container.querySelector("mask")!;
    expect(mask.style.maskType).toBe("alpha");
    expect(mask.querySelector("image")?.getAttribute("href")).toBe("/landing-3d/logo-mask/diana-logo-header.svg");
    expect(container.querySelector("rect")?.getAttribute("mask")).toBe(`url(#${mask.id})`);
    expect(container.querySelectorAll("stop")).toHaveLength(4);
    expect(container.querySelector("text")).toBeNull();
  });

  it("preserves the unearned state when the weekly goal has not been completed", () => {
    const { container, rerender } = render(<DianaWeeklyTrophy earned={false} />);
    expect(container.querySelector("[data-diana-weekly-trophy]")?.getAttribute("data-earned")).toBe("false");
    rerender(<DianaWeeklyTrophy earned />);
    expect(container.querySelector("[data-diana-weekly-trophy]")?.getAttribute("data-earned")).toBe("true");
    rerender(<DianaWeeklyTrophy earned={false} />);
    expect(container.querySelector("[data-diana-weekly-trophy]")?.getAttribute("data-earned")).toBe("false");
  });

  it("does not share SVG mask or gradient IDs between trophy instances", () => {
    const { container } = render(<><DianaWeeklyTrophy earned /><DianaWeeklyTrophy earned={false} /></>);
    const ids = Array.from(container.querySelectorAll("[id]"), element => element.id);
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
