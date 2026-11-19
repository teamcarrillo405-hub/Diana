// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import RootNotFound from "./not-found";
import PublicNotFoundPage, { dynamic as publicRecoveryRendering } from "./public-not-found/page";

afterEach(cleanup);

describe("RootNotFound", () => {
  it.each([
    { label: "root", Page: RootNotFound },
    { label: "public rewrite", Page: PublicNotFoundPage },
  ])("keeps the $label 404 inside Diana's current recovery design", ({ Page }) => {
    const { container } = render(<Page />);

    expect(screen.getByRole("heading", { name: "This page is not here anymore." })).toBeVisible();
    expect(screen.getByRole("link", { name: "Back to start" })).toHaveAttribute("href", "/");
    expect(container.querySelector('[data-campus-family="entry"][data-campus-mode="system"]')).not.toBeNull();
  });

  it("renders the public rewrite dynamically for its request nonce", () => {
    expect(publicRecoveryRendering).toBe("force-dynamic");
  });
});
