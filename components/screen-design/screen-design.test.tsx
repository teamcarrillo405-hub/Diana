// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AccentChip,
  DianaWordmark,
  GlassPanel,
  NeonAction,
} from "./primitives";
import { ScreenDesignViewport } from "./screen-design-viewport";
import { SourceMedia } from "./source-media";
import { StudentBottomNav } from "./student-bottom-nav";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ScreenDesign source primitives", () => {
  it("keeps the 393 by 852 canvas separate from screen-specific hierarchy", () => {
    render(
      <ScreenDesignViewport aria-label="Source canvas">
        <GlassPanel>Source-specific composition</GlassPanel>
      </ScreenDesignViewport>,
    );

    const viewport = screen.getByLabelText("Source canvas");
    expect(viewport).toHaveAttribute("data-screen-design-viewport", "393x852");
    expect(viewport).toHaveClass("sd-source-viewport");
    expect(screen.getByText("Source-specific composition")).toHaveClass(
      "sd-source-glass",
    );
  });

  it("renders only typed local media with explicit dimensions and intent", () => {
    const { container } = render(
      <>
        <SourceMedia
          assetId="dashboard-stadium-background"
          width={393}
          height={852}
          alt="Stadium at night"
        />
        <SourceMedia
          assetId="dashboard-athlete-cutout"
          width={160}
          height={420}
          decorative
        />
      </>,
    );

    const contentImage = screen.getByRole("img", { name: "Stadium at night" });
    expect(contentImage.getAttribute("src")).toContain("screendesign");
    expect(contentImage).toHaveAttribute("width", "393");
    expect(contentImage).toHaveAttribute("height", "852");

    const decorativeImage = container.querySelector('img[aria-hidden="true"]');
    expect(decorativeImage).toHaveAttribute("alt", "");
    expect(decorativeImage?.getAttribute("src")).not.toMatch(/^https?:/u);
  });

  it("keeps chips presentational and actions semantic", () => {
    render(
      <>
        <AccentChip tone="pink">Needs attention</AccentChip>
        <NeonAction tone="teal">Start English</NeonAction>
        <NeonAction href="/assignments" variant="outline" tone="blue">
          View work
        </NeonAction>
        <DianaWordmark />
      </>,
    );

    expect(screen.getByText("Needs attention")).toHaveAttribute(
      "data-tone",
      "pink",
    );
    expect(screen.getByRole("button", { name: "Start English" })).toHaveAttribute(
      "type",
      "button",
    );
    expect(screen.getByRole("link", { name: "View work" })).toHaveAttribute(
      "href",
      "/assignments",
    );
    expect(screen.getByRole("img", { name: "Diana" })).toHaveAttribute(
      "src",
      expect.stringContaining("screendesign"),
    );
  });
});

describe("StudentBottomNav", () => {
  it("renders the locked five destinations as links", () => {
    vi.mocked(usePathname).mockReturnValue("/dashboard");
    render(<StudentBottomNav />);

    expect(
      screen.getAllByRole("link").map((link) => ({
        label: link.textContent,
        href: link.getAttribute("href"),
      })),
    ).toEqual([
      { label: "Today", href: "/dashboard" },
      { label: "Work", href: "/assignments" },
      { label: "Classes", href: "/classes" },
      { label: "Calendar", href: "/calendar" },
      { label: "More", href: "/settings" },
    ]);
  });

  it.each([
    ["/dashboard/lobby", "Today"],
    ["/assignments/assignment-1", "Work"],
    ["/classes/class-1", "Classes"],
    ["/calendar", "Calendar"],
    ["/settings/tutor", "More"],
    ["/study-buddy", "More"],
  ])("derives exactly one active destination for %s", (pathname, label) => {
    vi.mocked(usePathname).mockReturnValue(pathname);
    render(<StudentBottomNav />);

    const current = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAccessibleName(label);
  });
});
