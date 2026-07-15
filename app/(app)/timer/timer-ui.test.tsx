// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { TimerUi } from "./timer-ui";

describe("TimerUi break settings", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("distinguishes the preferred break from an adaptive session break", async () => {
    render(<TimerUi sessionMood="meh" />);

    expect(await screen.findByText("Preferred break: 5 min")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Diana adjusted this session break to 6 minutes based on today's check-in and workload.",
      ),
    ).toBeInTheDocument();
  });
});
