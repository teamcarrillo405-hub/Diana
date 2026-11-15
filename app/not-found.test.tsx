// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import RootNotFound from "./not-found";

afterEach(cleanup);

describe("RootNotFound", () => {
  it("keeps the root 404 inside Diana's current recovery design", () => {
    render(<RootNotFound />);

    expect(screen.getByRole("heading", { name: "This page is not here anymore." })).toBeVisible();
    expect(screen.getByRole("link", { name: "Back to start" })).toHaveAttribute("href", "/");
  });
});
