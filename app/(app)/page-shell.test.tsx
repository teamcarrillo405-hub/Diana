// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PageShell } from "./page-shell";

vi.mock("./app-top-nav", () => ({
  AppTopNav: () => <nav>Navigation</nav>,
}));

describe("PageShell", () => {
  it("allows wide hero actions to stay inside a phone viewport", () => {
    const { getByTestId } = render(
      <PageShell
        active="More"
        eyebrow="My Brain"
        title="Understand how school works for you."
        action={<div data-testid="action-content">Actions</div>}
      >
        <p>Page content</p>
      </PageShell>,
    );

    const actionWrapper = getByTestId("action-content").parentElement;

    expect(actionWrapper).toHaveStyle({
      minWidth: "0",
      maxWidth: "100%",
      flexShrink: "1",
    });
  });
});
