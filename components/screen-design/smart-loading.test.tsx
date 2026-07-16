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
    expect(screen.getByRole("img", { name: "Diana" }).getAttribute("src")).toContain(
      "/screendesign/",
    );
  });

  it("preserves the source hierarchy without fabricating completion", () => {
    render(<SmartLoading label="Getting your next view ready" />);

    expect(screen.getByText("Did You Know?")).toBeVisible();
    expect(screen.getByText("Humans share 50% of DNA with bananas")).toBeVisible();
    expect(screen.getByText("Pro Study Tip")).toBeVisible();
    expect(screen.queryByText(/\d+%/u)).toBeNull();
    expect(screen.queryByText(/syncing/iu)).toBeNull();
  });

  it("uses a visible static reduced-motion fallback and no artificial delay", () => {
    expect(componentSource).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.sd-smart-loading-ring\s*\{[\s\S]*animation: none;/u,
    );
    expect(componentSource).not.toMatch(/setTimeout|setInterval|requestAnimationFrame/u);
    expect(componentSource).not.toMatch(/\bprogress\b|\bpercentage\b/iu);
  });
});
