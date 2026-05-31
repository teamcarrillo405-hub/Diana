// @vitest-environment jsdom
/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

afterEach(() => cleanup());
import { AiTooltip, AI_FEATURE_DESCRIPTIONS } from "./ai-tooltip";

describe("AiTooltip", () => {
  it("renders the correct description for each known feature key", () => {
    for (const key of Object.keys(AI_FEATURE_DESCRIPTIONS)) {
      const { unmount } = render(<AiTooltip feature={key} />);
      fireEvent.click(screen.getByRole("button"));
      expect(screen.getByText(AI_FEATURE_DESCRIPTIONS[key])).toBeInTheDocument();
      unmount();
    }
  });

  it("renders nothing for an unknown feature key", () => {
    const { container } = render(<AiTooltip feature="totally_unknown" />);
    expect(container.firstChild).toBeNull();
  });

  it("toggles description visibility on click", () => {
    render(<AiTooltip feature="math_step" />);
    const desc = AI_FEATURE_DESCRIPTIONS["math_step"];
    expect(screen.queryByText(desc)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText(desc)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button"));
    expect(screen.queryByText(desc)).not.toBeInTheDocument();
  });

  it("has an accessible aria-label on the (i) button", () => {
    render(<AiTooltip feature="math_step" />);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toMatch(/AI|Claude|help/i);
  });
});
