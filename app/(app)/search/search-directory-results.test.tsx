// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SearchDirectoryResults } from "./search-directory-results";

describe("SearchDirectoryResults", () => {
  it("renders matching pages and tools as mobile links", () => {
    render(
      <SearchDirectoryResults
        items={[
          {
            key: "tool-capture",
            title: "Quick capture",
            detail: "Add work by text, photo, or voice",
            href: "/quick-add",
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Pages and tools" })).toBeVisible();
    expect(screen.getByRole("link", { name: /quick capture/iu })).toHaveAttribute(
      "href",
      "/quick-add",
    );
  });

  it("does not render an empty group", () => {
    const { container } = render(<SearchDirectoryResults items={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
