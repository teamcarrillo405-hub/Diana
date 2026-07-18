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
    render(<TimerUi assignment={{ id: "00000000-0000-4000-8000-000000000001", title: "Biology review", kind: "study", estimatedMinutes: 25 }} sessionMood="meh" />);

    expect(await screen.findByText("Start focus session")).toBeInTheDocument();
    expect(screen.getByText("Biology review")).toBeInTheDocument();
    expect(
      screen.getByText("Today's break is 6 minutes based on the current check-in."),
    ).toBeInTheDocument();
  });
});
