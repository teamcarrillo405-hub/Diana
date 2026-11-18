// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { buildWellnessDashboardSummary } from "@/lib/wellness/history";
import { WellnessClient } from "./wellness-client";

afterEach(cleanup);
const today = "2026-11-17";
const summary = buildWellnessDashboardSummary({ today, sleepLogs: [{sleep_date:today,sleep_hours:7.5}],activityLogs:[],moodLogs:[{occurred_at:`${today}T12:00:00Z`,value:{energy:"okay",sleepDate:today}}],archivedDays:[] });

describe("optional Check-in history", () => {
  it("shows entries without a completion percentage or expectation to fill missing days", () => {
    render(<WellnessClient today={today} summary={summary} />);
    expect(screen.getByRole("heading", { name: "Check-in history" })).toBeInTheDocument();
    expect(screen.getByText("Every question is optional.", {exact:false})).toBeInTheDocument();
    expect(screen.getByText("Entries this month")).toBeInTheDocument();
    expect(screen.queryByText(/\d+%/)).toBeNull();
    expect(screen.getByRole("link", {name:"Open Check-in"})).toHaveAttribute("href","/dashboard?view=check-in");
  });
  it("keeps temporary support choices out of the historical record and shows an actual zero activity value", () => {
    render(<WellnessClient today={today} summary={summary} />);
    expect(screen.getByText(/Snack, water, and break choices are temporary/)).toBeInTheDocument();
    expect(screen.getAllByText("0 min").length).toBeGreaterThan(0);
    expect(screen.getAllByText("7.5 h", {selector:"strong"}).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", {name:"Month"}));
    expect(screen.getByRole("button", {name:"Month"})).toHaveAttribute("aria-pressed","true");
    expect(screen.getAllByText("No entry").length).toBeGreaterThan(0);
  });
});
