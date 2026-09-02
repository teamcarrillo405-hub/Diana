// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { HomeworkProgressGauge } from "./today-dashboard-visuals";

describe("HomeworkProgressGauge", () => {
  afterEach(cleanup);

  it("renders the factual completion percentage", () => {
    const { container } = render(
      <HomeworkProgressGauge percent={38} completed={3} total={8} />,
    );

    expect(screen.getByRole("img", { name: "38% complete this week. 3 of 8 assignments complete" })).toBeTruthy();
    expect(screen.getByText("38%")).toBeTruthy();
    expect(screen.getByText("This Week")).toBeTruthy();
    expect(screen.getByText("3 of 8 assignments complete")).toBeTruthy();
    expect(container.querySelectorAll(".today-homework-progress-track > span")).toHaveLength(8);
    expect(container.querySelectorAll('[data-complete="true"]')).toHaveLength(3);
  });

  it("clamps completion and shows an honest empty-week caption", () => {
    render(<HomeworkProgressGauge percent={140} completed={0} total={0} />);

    expect(screen.getByRole("img", { name: "100% complete this week. No assignments due this week" })).toBeTruthy();
    expect(screen.getByText("No assignments due this week")).toBeTruthy();
  });
});
