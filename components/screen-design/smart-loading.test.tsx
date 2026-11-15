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

  it("uses one logo focal point and one route-safe loading message", () => {
    render(<SmartLoading label="Getting your next view ready" />);

    expect(screen.getByText("Getting your next view ready")).toBeVisible();
    expect(screen.getByText("Loading")).toBeVisible();
    expect(screen.queryByText("Diana is readying your space")).toBeNull();
    expect(componentSource).not.toMatch(/<header className="diana-cinematic-loading-header"/u);
    expect(componentSource).not.toMatch(/<div className="diana-cinematic-loading-orb"/u);
  });

  it("uses a visible static reduced-motion fallback and no artificial delay", () => {
    expect(componentSource).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.diana-cinematic-loading \*\s*\{\s*animation:\s*none !important;/u,
    );
    expect(componentSource).not.toMatch(/setTimeout|setInterval|requestAnimationFrame/u);
    expect(componentSource).not.toMatch(/Diana is readying your space/u);
  });

  it("uses a single forward progress fill instead of a reversing loop", () => {
    expect(componentSource).toMatch(/animation:\s*loading-progress-forward\s+3\.6s\s+linear\s+forwards/u);
    expect(componentSource).toMatch(/@keyframes\s+loading-progress-forward[\s\S]*to\s*\{\s*width:\s*90%;/u);
    expect(componentSource).not.toMatch(/loading-progress\s+1\.7s\s+ease-in-out\s+infinite/u);
  });

  it("uses the same desktop frame width limit as Today", () => {
    expect(componentSource).toMatch(
      /\.diana-cinematic-loading-main\s*\{[\s\S]*max-width:\s*1800px;/u,
    );
  });
});
