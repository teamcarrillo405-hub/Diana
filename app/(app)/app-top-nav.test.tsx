// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppTopNav } from "./app-top-nav";

vi.mock("./dashboard/lobby-audio-note", () => ({
  LobbyAudioNote: () => <button type="button">Record</button>,
}));

vi.mock("./more-menu", () => ({
  MoreMenu: () => <button type="button">More</button>,
}));

vi.mock("./mobile-tab-bar", () => ({
  MobileTabBar: () => <nav>Mobile navigation</nav>,
}));

describe("AppTopNav", () => {
  it("includes its padding inside the viewport width", () => {
    const { container } = render(<AppTopNav active="Today" />);
    const desktopNav = container.querySelector(".gl-desktop-nav");

    expect(desktopNav).toHaveStyle({
      width: "100%",
      minWidth: "0",
      boxSizing: "border-box",
    });
    expect(container.querySelector("style")?.textContent).toContain("@media (max-width: 1100px)");
    expect(container.querySelector("style")?.textContent).toContain(".gl-nav-extra { display: none !important; }");
  });
});
