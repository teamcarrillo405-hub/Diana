// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { SmartLoading } from "./smart-loading";

const componentSource = readFileSync(
  join(process.cwd(), "components", "screen-design", "smart-loading.tsx"),
  "utf8",
);

afterEach(cleanup);

describe("SmartLoading", () => {
  it("announces only the truthful route-safe loading label", () => {
    render(<SmartLoading label="Getting your notes ready" />);

    expect(screen.getByRole("status")).toHaveTextContent("Getting your notes ready");
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("status")).toHaveAttribute("aria-atomic", "true");
    expect(screen.getByRole("img", { name: "Diana" }).getAttribute("src")).toMatch(
      /(?:\/screendesign\/|screendesign%2F)/u,
    );
  });

  it("uses one wordmark and one route-safe message", () => {
    render(<SmartLoading label="Getting your next view ready" />);
    expect(screen.getAllByRole("img", { name: "Diana" })).toHaveLength(1);
    expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Getting your next view ready");
  });
  it("keeps loading honest without artificial delays and supports reduced motion", () => {
    const css = readFileSync(join(process.cwd(), "components/student-shell/recovery.module.css"), "utf8");
    expect(css).toContain("@media(prefers-reduced-motion:reduce)");
    expect(css).toContain("animation:none");
    expect(css).toContain("loading-progress-forward 3.6s linear forwards");
    expect(css).not.toContain("infinite alternate");
    expect(componentSource).not.toMatch(/setTimeout|setInterval|requestAnimationFrame/u);
  });
});
