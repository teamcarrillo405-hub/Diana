// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LobbyProgressReview } from "./lobby-progress-review";
import { getPreviewData } from "./preview-data";

afterEach(cleanup);
const typical = getPreviewData("typical");
const props = { completed: typical.finished, total: typical.total, planned: typical.planned, studied: typical.studied, subjects: typical.subjects, unavailable: typical.unavailable };

describe("Lobby weekly performance", () => {
  it("uses one Progress heading and a truthful completion meter instead of two circular charts", () => {
    const { container } = render(<LobbyProgressReview {...props} />);
    expect(screen.getAllByRole("heading", { level: 2 }).map(heading => heading.textContent)).toEqual(["Progress"]);
    const completion = screen.getByRole("progressbar", { name: "Weekly assignments complete" });
    expect(completion).toHaveAttribute("value", "5");
    expect(completion).toHaveAttribute("max", "8");
    expect(screen.getByText("63%")).toBeTruthy();
    expect(screen.getByText("2h 15m")).toBeTruthy();
    expect(container.querySelectorAll("circle")).toHaveLength(0);
    expect(screen.queryByText("Study Mix")).toBeNull();
  });

  it("uses estimated class workload as the denominator, not completed study minutes", () => {
    const { container } = render(<LobbyProgressReview {...props} />);
    const rows = within(screen.getByRole("list", { name: "Class workload shares" })).getAllByRole("listitem");
    expect(rows).toHaveLength(4);
    expect(rows[0]).toHaveTextContent("History1h 30m30%");
    expect(rows[1]).toHaveTextContent("Algebra I1h 15m25%");
    expect(rows[0].querySelector<HTMLElement>("[aria-hidden] i")?.style.width).toBe("30%");
    expect(screen.getByText("Estimated workload")).toBeTruthy();
    expect(container.querySelectorAll("[data-class-workload] button")).toHaveLength(0);
  });

  it("keeps the weekly chart operable by pointer and keyboard focus without changing the totals", () => {
    render(<LobbyProgressReview {...props} />);
    const monday = screen.getByRole("button", { name: "Mon: 45 minutes planned, 45 minutes studied" });
    fireEvent.focus(monday);
    expect(monday).toHaveAttribute("aria-pressed", "true");
    const friday = screen.getByRole("button", { name: "Fri: 60 minutes planned, 0 minutes studied" });
    fireEvent.mouseEnter(friday);
    expect(friday).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(monday);
    expect(monday).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("2h 15m")).toBeTruthy();
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "5");
  });

  it("does not present unavailable data as zero completion or a zero workload", () => {
    render(<LobbyProgressReview {...props} unavailable />);
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.queryByRole("list", { name: "Class workload shares" })).toBeNull();
    expect(screen.getByText("Completion unavailable")).toBeTruthy();
    expect(screen.getByText("Class workload temporarily unavailable.")).toBeTruthy();
    expect(screen.getAllByText("--")).toHaveLength(2);
    expect(screen.queryByText("0%")).toBeNull();
  });

  it("distinguishes an unplanned week from a completed goal", () => {
    render(<LobbyProgressReview {...props} completed={0} total={0} subjects={[]} planned={[0, 0, 0, 0, 0, 0, 0]} studied={[0, 0, 0, 0, 0, 0, 0]} />);
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.getByText("No weekly goal yet")).toBeTruthy();
    expect(screen.getByText("Your classes appear here when you plan some work.")).toBeTruthy();
    expect(screen.queryByText("100%")).toBeNull();
  });

  it("caps the goal track while preserving actual work and studied time beyond plan", () => {
    render(<LobbyProgressReview {...props} completed={10} studied={[90, 90, 120, 30, 0, 0, 0]} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "8");
    expect(screen.getByText("10")).toBeTruthy();
    expect(screen.getByText("100%")).toBeTruthy();
    expect(screen.getByText("5h 30m")).toBeTruthy();
  });

  it("handles a class with no estimated minutes without invalid percentages", () => {
    const { container } = render(<LobbyProgressReview {...props} subjects={[{ name: "Art", minutes: 0, color: "#6fc8e2" }]} />);
    expect(screen.getByRole("listitem")).toHaveTextContent("Art0m0%");
    expect(container.innerHTML).not.toContain("NaN");
    expect(container.innerHTML).not.toContain("Infinity");
  });

  it("keeps all six busy-week subjects and uses the same subject symbols and colors as Now", () => {
    const { container } = render(<LobbyProgressReview {...props} subjects={getPreviewData("busy").subjects} />);
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(6);
    expect(screen.getByText("Spanish Language and Culture")).toBeTruthy();
    expect(rows[0].querySelector("svg")?.getAttribute("class")).toContain("landmark");
    expect((rows[0] as HTMLElement).style.getPropertyValue("--class-color")).toContain("--subject-cyan");
    expect(container.innerHTML).not.toContain("--subject-violet");
  });
});
