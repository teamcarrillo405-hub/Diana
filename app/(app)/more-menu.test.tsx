// @vitest-environment jsdom
/// <reference types="@testing-library/jest-dom" />

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MoreMenu } from "./more-menu";

afterEach(() => cleanup());

describe("MoreMenu", () => {
  it("portals the drawer to the document body", () => {
    render(<MoreMenu active={false} />);

    fireEvent.click(screen.getByRole("button", { name: "More" }));

    const dialog = screen.getByRole("dialog", { name: "More destinations" });
    expect(dialog.parentElement).toBe(document.body);
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("closes the drawer with Escape and restores body scrolling", () => {
    render(<MoreMenu active={false} />);
    fireEvent.click(screen.getByRole("button", { name: "More" }));

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: "More destinations" })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });
});
