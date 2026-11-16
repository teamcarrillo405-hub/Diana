// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { buildTodayView } from "@/lib/dashboard/today-view";
import { LobbyProgress } from "./lobby-progress";

const fixture = () => buildTodayView({
  now: new Date("2026-09-09T20:00:00Z"), timeZone: "America/Los_Angeles",
  ranked: [], assignments: [], weeklyAssignments: [], focusLogs: [], submittedAssignments: [],
});

describe("Lobby progress", () => {
  afterEach(cleanup);

  it("shows real weekly values and lets a student inspect a day", () => {
    render(<LobbyProgress data={{ ...fixture(), finished: 2, total: 3, planned: [20, 0, 0, 0, 0, 0, 0], studied: [15, 0, 0, 0, 0, 0, 0] }} />);
    expect(screen.getByRole("progressbar", { name: "Assignments due this week marked done" })).toHaveAttribute("value", "2");
    expect(screen.getByText("Completed focus time").closest("div")).toHaveTextContent("15m");
    fireEvent.click(screen.getByRole("button", { name: "Mon: 20 minutes session target, 15 minutes completed" }));
    expect(screen.getByText(/Mon.*session target/)).toHaveTextContent("20m session target / 15m completed");
    expect(screen.getByRole("link", { name: "View completed work" })).toHaveAttribute("href", "/proof");
  });

  it("keeps the sample preview from navigating to a student page", () => {
    render(<LobbyProgress data={fixture()} sample />);
    expect(screen.getByText("View completed work").tagName).toBe("SPAN");
    expect(screen.queryByRole("link", { name: "View completed work" })).toBeNull();
  });

  it("keeps the mobile Diana portrait decorative", () => {
    const { container } = render(<LobbyProgress data={fixture()} />);
    const portrait = container.querySelector('img[src="/assets/today-now/diana-relit-poster-v1.webp"]');
    expect(portrait).toHaveAttribute("alt", "");
    expect(portrait?.parentElement).toHaveAttribute("aria-hidden", "true");
  });

  it("shows a provided school mark as decoration without adding navigation", () => {
    const logoUrl = "data:image/webp;base64,YWJj";
    const { container } = render(<LobbyProgress data={fixture()} logoUrl={logoUrl} />);
    const mark = container.querySelector(`img[src="${logoUrl}"]`);
    expect(mark).toHaveAttribute("alt", "");
    expect(mark).toHaveAttribute("aria-hidden", "true");
  });
});
