// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PortfolioClient } from "./portfolio-client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("./actions", () => ({
  addPortfolioItem: vi.fn(),
  createPortfolio: vi.fn(),
  uploadPortfolioFile: vi.fn(),
}));

afterEach(cleanup);

describe("PortfolioClient", () => {
  it("opens a real owner-scoped item and exposes the supported share route", () => {
    render(
      <PortfolioClient
        canvaState="disconnected"
        portfolios={[
          {
            id: "portfolio-1",
            title: "Freshman portfolio",
            description: "Work I chose to keep",
            items: [
              {
                id: "item-1",
                title: "Identity quote response",
                reflection_text: "I revised the explanation.",
                mime_type: null,
              },
            ],
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open portfolio item" }));

    expect(screen.getByRole("dialog", { name: "Identity quote response" })).toBeInTheDocument();
    expect(screen.getByText("I revised the explanation.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Share portfolio" })).toHaveAttribute("href", "/sharing");
  });

  it("keeps the empty state truthful", () => {
    render(<PortfolioClient canvaState="disconnected" portfolios={[]} />);

    expect(screen.getByText("No portfolio work yet.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open portfolio item" })).not.toBeInTheDocument();
  });
});
