// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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
import {
  STUDENT_BOTTOM_NAV_ITEMS,
  StudentBottomNav,
} from "./student-bottom-nav";
import { ResponsiveProofGallery } from "./responsive-proof-gallery";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

const sourceCss = readFileSync(join(process.cwd(), "app", "screendesign.css"), "utf8");

const relativeLuminance = (hex: string): number => {
  const channels = hex
    .slice(1)
    .match(/.{2}/gu)
    ?.map((channel) => Number.parseInt(channel, 16) / 255);
  if (!channels || channels.length !== 3) throw new Error(`Invalid color ${hex}.`);
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

const contrastRatio = (foreground: string, background: string): number => {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
};

const cssHexVariable = (name: string): string => {
  const value = sourceCss.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, "iu"))?.[1];
  if (!value) throw new Error(`Missing ${name} color token.`);
  return value;
};

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
    expect(viewport).toHaveAttribute(
      "data-screen-design-responsive",
      "mobile-desktop",
    );
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

describe("ScreenDesign responsive and calm contracts", () => {
  it("locks source width without horizontal overflow and centers larger viewports", () => {
    const viewportRule = sourceCss.match(/\.sd-source-viewport\s*\{[^}]+\}/u)?.[0];

    expect(viewportRule).toContain("width: min(100%, 393px)");
    expect(viewportRule).toContain("max-width: 100vw");
    expect(viewportRule).toContain("min-height: max(100dvh, 852px)");
    expect(viewportRule).toContain("margin-inline: auto");
    expect(viewportRule).toContain("overflow-x: clip");
    expect(viewportRule).toContain("env(safe-area-inset-bottom, 0)");
  });

  it("keeps keyboard focus visible and removes press motion when requested", () => {
    expect(sourceCss).toMatch(/\.sd-source-action:focus-visible\s*\{[^}]*outline:/u);
    expect(sourceCss).toMatch(
      /\.sd-student-bottom-nav a:focus-visible\s*\{[^}]*outline:/u,
    );
    expect(sourceCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.sd-source-action:active,[\s\S]*\.sd-student-bottom-nav a:active\s*\{\s*transform: none;/u,
    );
  });

  it("keeps the shared caution accent amber", () => {
    expect(sourceCss).toContain("--sd-source-amber: #fbbf24");
    expect(sourceCss).toContain("--danger: 251 191 36");
  });
});

describe("StudentBottomNav", () => {
  it("keeps every inactive label at WCAG AA contrast on the shared background", () => {
    vi.mocked(usePathname).mockReturnValue("/settings");
    render(<StudentBottomNav />);

    const foreground = cssHexVariable("--sd-bottom-nav-inactive");
    const background = cssHexVariable("--sd-bottom-nav-background");
    const inactiveLinks = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") !== "page");

    expect(STUDENT_BOTTOM_NAV_ITEMS).toHaveLength(5);
    expect(inactiveLinks).toHaveLength(4);
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
    expect(sourceCss).toMatch(
      /\.sd-student-bottom-nav a\s*\{[^}]*color:\s*var\(--sd-bottom-nav-inactive\)/u,
    );
  });

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
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeVisible();
    expect(
      screen
        .getAllByRole("link")
        .every((link) => link.querySelector("svg")?.getAttribute("aria-hidden") === "true"),
    ).toBe(true);
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

describe("ResponsiveProofGallery", () => {
  it("keeps mobile and desktop proofs paired for the selected screen", () => {
    render(
      <ResponsiveProofGallery
        screens={[
          { id: "dashboard-personalized", label: "Dashboard Personalized" },
          { id: "onboarding-welcome", label: "Onboarding Welcome" },
        ]}
      />,
    );

    expect(screen.getByText("1 / 2")).toBeVisible();
    expect(screen.getByAltText("Dashboard Personalized mobile proof")).toHaveAttribute(
      "src",
      "/screendesign-proof/mobile/dashboard-personalized.webp",
    );
    expect(screen.getByAltText("Dashboard Personalized desktop proof")).toHaveAttribute(
      "src",
      "/screendesign-proof/desktop/dashboard-personalized.webp",
    );

    fireEvent.click(screen.getByRole("button", { name: "Next screen" }));

    expect(screen.getByText("2 / 2")).toBeVisible();
    expect(screen.getByAltText("Onboarding Welcome mobile proof")).toHaveAttribute(
      "src",
      "/screendesign-proof/mobile/onboarding-welcome.webp",
    );
    expect(screen.getByAltText("Onboarding Welcome desktop proof")).toHaveAttribute(
      "src",
      "/screendesign-proof/desktop/onboarding-welcome.webp",
    );
  });
});
