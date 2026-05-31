// @vitest-environment jsdom
/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { AiUsageLog, tokensToWords } from "./ai-usage-log";

afterEach(() => cleanup());

describe("tokensToWords", () => {
  it("rounds tokens/4 to nearest 10", () => {
    expect(tokensToWords(400)).toBe(100);
    expect(tokensToWords(47)).toBe(10);
    expect(tokensToWords(0)).toBe(0);
    expect(tokensToWords(2000)).toBe(500);
  });
});

describe("AiUsageLog", () => {
  const rows = [
    { feature: "math_step",    model: "claude-haiku-4-5-20251001",  tokens_used: 120, created_at: "2026-05-29T10:00:00Z" },
    { feature: "writing_aid",  model: "claude-sonnet-4-6-20250929", tokens_used: 400, created_at: "2026-05-29T11:00:00Z" },
    { feature: "citation_gen", model: "claude-haiku-4-5-20251001",  tokens_used: 80,  created_at: "2026-05-29T12:00:00Z" },
  ];

  it("renders 'AI was used on this assignment 3 times'", () => {
    render(<AiUsageLog interactions={rows} />);
    expect(screen.getByText(/AI was used on this assignment 3 times/i)).toBeInTheDocument();
  });

  it("renders singular '1 time' for one interaction", () => {
    render(<AiUsageLog interactions={[rows[0]]} />);
    expect(screen.getByText(/AI was used on this assignment 1 time(?!s)/i)).toBeInTheDocument();
  });

  it("renders calm empty state for zero interactions", () => {
    render(<AiUsageLog interactions={[]} />);
    expect(screen.getByText(/AI hasn't been used on this assignment yet/i)).toBeInTheDocument();
  });

  it("does not use 'You used AI' framing", () => {
    const { container } = render(<AiUsageLog interactions={rows} />);
    expect(container.textContent).not.toMatch(/You used AI/i);
  });

  it("renders 'About N words of AI help' per row when expanded", () => {
    render(<AiUsageLog interactions={rows} />);
    fireEvent.click(screen.getByRole("button", { name: /show details|expand|details/i }));
    expect(screen.getByText(/About 100 words of AI help/i)).toBeInTheDocument();
    expect(screen.getByText(/About 30 words of AI help/i)).toBeInTheDocument(); // 120/4 = 30
    expect(screen.getByText(/About 20 words of AI help/i)).toBeInTheDocument(); // 80/4 = 20
  });
});
