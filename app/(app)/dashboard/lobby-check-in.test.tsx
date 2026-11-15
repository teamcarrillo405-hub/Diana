// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LobbyCheckIn } from "./lobby-check-in";

const mocks = vi.hoisted(() => ({ save: vi.fn(), refresh: vi.fn() }));
vi.mock("./actions", () => ({ saveLobbyCheckIn: mocks.save }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
const saved = { energy: "okay" as const, sleepHours: 8, movementType: "walk" as const, movementMinutes: 30 };
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });

describe("Today check-in persistence", () => {
  it("restores a saved check-in and does not write on mount", () => {
    render(<LobbyCheckIn appearance="today" initialValue={saved} sleepDate="2026-09-09" />);
    expect(screen.getByRole("button", { name: "Okay" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("slider", { name: "Sleep" }).getAttribute("value")).toBe("8");
    expect(screen.getByRole("button", { name: "Saved for today" }).getAttribute("data-state")).toBe("saved");
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("preserves autosave using the existing server action and refreshes after success", async () => {
    vi.useFakeTimers(); mocks.save.mockResolvedValue({ ok: true });
    render(<LobbyCheckIn appearance="today" initialValue={saved} sleepDate="2026-09-09" />);
    fireEvent.click(screen.getByRole("button", { name: "Good" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(700); });
    expect(mocks.save).toHaveBeenCalledWith({ ...saved, energy: "good", sleepDate: "2026-09-09" });
    expect(mocks.refresh).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Saved for today" }).getAttribute("data-state")).toBe("saved");
  });

  it("does not report a rejected save as persisted and supports retry", async () => {
    vi.useFakeTimers(); mocks.save.mockResolvedValueOnce({ ok: false, error: "The check-in could not be saved yet." }).mockResolvedValueOnce({ ok: true });
    render(<LobbyCheckIn appearance="today" initialValue={saved} sleepDate="2026-09-09" />);
    fireEvent.click(screen.getByRole("button", { name: "Good" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(700); });
    expect(mocks.refresh).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(700); });
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });
});
