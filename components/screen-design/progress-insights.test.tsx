// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { InsightsClient, type DailyInsightPoint } from "@/app/(app)/insights/insights-client";

const days: DailyInsightPoint[] = Array.from({ length: 28 }, (_, index) => ({
  date: `2026-09-${String(index + 1).padStart(2, "0")}`,
  label: "M",
  focusMinutes: index === 27 ? 25 : 0,
  workEvents: index >= 26 ? 1 : 0,
  activityEvents: index >= 25 ? 1 : 0,
}));

const renderInsights = () => render(
  <InsightsClient
    days={days}
    evidenceMix={18}
    trendLabel="Up 2 from last week."
    completedCount={1}
    assignmentCount={3}
    evidenceLinks={[{
      href: "/assignments/assignment-one",
      title: "Evidence response",
      detail: "Submitted assignment evidence",
      primary: true,
    }]}
  />,
);

afterEach(cleanup);

describe("Progress Insights interactions", () => {
  it("switches range and metric using real derived points", () => {
    renderInsights();

    expect(screen.getByRole("region", { name: "Focus chart for 7 days" })).toBeTruthy();
    expect(screen.getByText("25 min")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Work" }));
    expect(screen.getByRole("region", { name: "Work chart for 7 days" })).toBeTruthy();
    expect(screen.getByText("2 events")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "28 days" }));
    expect(screen.getByRole("region", { name: "Work chart for 28 days" })).toBeTruthy();
  });

  it("keeps the primary evidence route operational", () => {
    renderInsights();
    expect(screen.getByRole("link", { name: "Open insight detail" })).toHaveAttribute(
      "href",
      "/assignments/assignment-one",
    );
  });
});
