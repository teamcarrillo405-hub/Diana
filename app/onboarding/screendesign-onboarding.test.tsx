// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { completeScreenDesignOnboarding } from "./actions";
import { ScreenDesignOnboarding } from "./screendesign-onboarding";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("./actions", () => ({
  completeScreenDesignOnboarding: vi.fn(),
}));

describe("ScreenDesignOnboarding", () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    vi.mocked(completeScreenDesignOnboarding).mockReset();
  });

  afterEach(cleanup);

  it("renders the local welcome source and advances to the educational source", () => {
    render(<ScreenDesignOnboarding />);

    expect(screen.getByRole("heading", { name: /diana\s*ai tutor/iu })).toBeInTheDocument();
    expect(
      decodeURIComponent(screen.getByAltText("DIANA logo").getAttribute("src") ?? ""),
    ).toContain("/screendesign/brand/diana-logo.png");
    expect(document.querySelector('[src*="media.screensdesign.com"]')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "GET STARTED" }));

    expect(screen.getByRole("heading", { name: "DID YOU KNOW?" })).toBeInTheDocument();
    expect(
      decodeURIComponent(screen.getByAltText("GPA progress chart").getAttribute("src") ?? ""),
    ).toContain("/screendesign/onboarding/gpa-progress-chart.png");
  });

  it("moves back and forward without completing onboarding early", () => {
    render(<ScreenDesignOnboarding initialStep="educational" />);

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("button", { name: "GET STARTED" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "GET STARTED" }));
    fireEvent.click(screen.getByRole("button", { name: "CONTINUE" }));

    expect(screen.getByRole("heading", { name: /biggest hurdle/iu })).toBeInTheDocument();
    expect(completeScreenDesignOnboarding).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
