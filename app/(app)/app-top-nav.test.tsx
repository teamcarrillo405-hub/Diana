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
    const desktopNav = container.querySelector(".sd-top-nav");

    expect(desktopNav).toHaveStyle({
      width: "100%",
      minWidth: "0",
      boxSizing: "border-box",
    });
  });
});
