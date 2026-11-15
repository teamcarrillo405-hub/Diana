// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TodayCheckInReview } from "./today-check-in-review";

afterEach(cleanup);

describe("Check-In review", () => {
  it("confirms saving once and allows another save after values change", () => {
    const onSaved = vi.fn();
    render(<TodayCheckInReview onSaved={onSaved} />);
    fireEvent.click(screen.getByRole("button", { name: "Good" }));
    expect(within(screen.getByRole("group", { name: "Energy" })).getAllByRole("button", { pressed: true })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Save check-in" }));
    const saved = screen.getByRole("button", { name: "Saved for today" });
    expect(saved.getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByText("Check-in saved in this preview only.")).toBeTruthy();
    fireEvent.click(saved);
    fireEvent.click(screen.getByRole("button", { name: "Good" }));
    expect(screen.getByRole("button", { name: "Saved for today" })).toBe(saved);
    expect(onSaved).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByRole("slider", { name: "Sleep" }), { target: { value: "8.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Save check-in" }));
    expect(onSaved).toHaveBeenCalledTimes(2);
  });

  it("keeps exact values and units at the range endpoints", () => {
    render(<TodayCheckInReview />);
    const sleep = screen.getByRole("slider", { name: "Sleep" });
    const movement = screen.getByRole("slider", { name: "Movement minutes" });
    fireEvent.change(sleep, { target: { value: "0" } });
    fireEvent.change(movement, { target: { value: "180" } });
    expect(sleep.getAttribute("aria-valuetext")).toBe("0 hours");
    expect(movement.getAttribute("aria-valuetext")).toBe("180 minutes");
    fireEvent.change(screen.getByRole("combobox", { name: "Movement type" }), { target: { value: "Team sport" } });
    expect((screen.getByRole("combobox", { name: "Movement type" }) as HTMLSelectElement).value).toBe("Team sport");
    expect((movement as HTMLInputElement).value).toBe("180");
  });
});
