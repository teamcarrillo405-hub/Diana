// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LobbyCheckIn } from "./lobby-check-in";
import { LobbyCheckInCompletion } from "@/components/dashboard/lobby/lobby-check-in-completion";

const mocks = vi.hoisted(() => ({ save: vi.fn(), refresh: vi.fn(), getSupport: vi.fn(), saveNeed: vi.fn(), saveSharing: vi.fn() }));
vi.mock("./actions", () => ({ saveLobbyCheckIn: mocks.save, getStudentSupportPreferences: mocks.getSupport, saveStudentDailySupportNeed: mocks.saveNeed, saveTutorPersonalizationPreference: mocks.saveSharing }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
const saved = { energy: "okay" as const, sleepHours: 8, movementType: "walk" as const, movementMinutes: 30 };
beforeEach(() => { mocks.getSupport.mockResolvedValue({ ok: true, need: null, personalizationEnabled: false }); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });

function openSharingPreference() {
  fireEvent.click(screen.getByText("AI sharing preference"));
  return screen.getByRole<HTMLInputElement>("checkbox", { name: /Allow general guidance/ });
}

describe("Today check-in persistence", () => {
  it("restores a saved check-in and does not write on mount", () => {
    render(<LobbyCheckIn appearance="today" initialValue={saved} sleepDate="2026-09-09" />);
    expect(screen.getByRole("button", { name: "Okay" }).getAttribute("aria-pressed")).toBe("true");
    expect((screen.getByRole("spinbutton", { name: "Sleep hours" }) as HTMLInputElement).value).toBe("8");
    expect(screen.getByRole("button", { name: "Saved for today" }).getAttribute("data-state")).toBe("saved");
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("saves energy only on explicit confirmation and does not invent optional values", async () => {
    mocks.save.mockResolvedValue({ ok: true, signalId: "9007199254740993" });
    const completed = vi.fn();
    render(<LobbyCheckInCompletion.Provider value={completed}><LobbyCheckIn appearance="today" initialValue={null} sleepDate="2026-09-09" /></LobbyCheckInCompletion.Provider>);
    expect((screen.getByRole("spinbutton", { name: "Sleep hours" }) as HTMLInputElement).value).toBe("");
    expect((screen.getByRole("spinbutton", { name: "Movement minutes" }) as HTMLInputElement).value).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Good" }));
    expect(mocks.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save check-in" }));
    await waitFor(() => expect(completed).toHaveBeenCalledOnce());
    expect(completed).toHaveBeenCalledWith("good", "9007199254740993");
    expect(mocks.save).toHaveBeenCalledWith({ energy: "good", sleepHours: null, movementType: null, movementMinutes: null, sleepDate: "2026-09-09" });
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("saves edited complete check-ins and refreshes without a parent callback", async () => {
    mocks.save.mockResolvedValue({ ok: true, signalId: "42" });
    render(<LobbyCheckIn appearance="today" initialValue={saved} sleepDate="2026-09-09" />);
    fireEvent.click(screen.getByRole("button", { name: "Good" }));
    fireEvent.click(screen.getByRole("button", { name: "Save check-in" }));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce());
    expect(mocks.save).toHaveBeenCalledWith({ ...saved, energy: "good", sleepDate: "2026-09-09" });
    expect(screen.getByRole("button", { name: "Saved for today" }).getAttribute("data-state")).toBe("saved");
  });

  it("does not report a rejected save as persisted and supports retry", async () => {
    mocks.save.mockResolvedValueOnce({ ok: false, error: "The check-in could not be saved yet." }).mockResolvedValueOnce({ ok: true, signalId: "42" });
    render(<LobbyCheckIn appearance="today" initialValue={saved} sleepDate="2026-09-09" />);
    fireEvent.click(screen.getByRole("button", { name: "Good" }));
    fireEvent.click(screen.getByRole("button", { name: "Save check-in" }));
    await screen.findByText("The check-in could not be saved yet.");
    expect(mocks.refresh).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce());
  });

  it("requires both movement values when the student supplies one", async () => {
    render(<LobbyCheckIn appearance="today" initialValue={null} sleepDate="2026-09-09" />);
    fireEvent.click(screen.getByRole("button", { name: "Low" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Movement type" }), { target: { value: "walk" } });
    fireEvent.click(screen.getByRole("button", { name: "Save check-in" }));
    expect(screen.getByText(/choose an activity and 1 to 180 minutes/i)).toBeTruthy();
    expect(mocks.save).not.toHaveBeenCalled();
  });
});

describe("Optional daily support choices", () => {
  it("starts with no sharing, and selecting a need does not save it automatically", async () => {
    render(<LobbyCheckIn initialValue={null} sleepDate="2026-09-09" />);
    const food = screen.getByRole<HTMLInputElement>("radio", { name: "A snack or food" });
    await waitFor(() => expect(food.disabled).toBe(false));
    const sharing = openSharingPreference();
    expect(sharing.checked).toBe(false);
    expect(screen.getByText(/Sharing changes apply to future requests\. They cannot recall a request already sent/)).toBeTruthy();
    expect(screen.getByRole("group", { name: /What would help right now/ }).closest("form")).not.toBeNull();
    expect(screen.getAllByRole<HTMLInputElement>("radio").every(option => !option.checked)).toBe(true);
    expect(food.compareDocumentPosition(screen.getByRole("button", { name: "Save check-in" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(food);
    expect(mocks.saveNeed).not.toHaveBeenCalled();
    expect(mocks.saveSharing).not.toHaveBeenCalled();
    mocks.saveNeed.mockResolvedValue({ ok: true });
    fireEvent.click(screen.getByRole("button", { name: "Save support choice" }));
    await waitFor(() => expect(mocks.saveNeed).toHaveBeenCalledWith("food"));
    await screen.findByText("Support choice saved for 24 hours.");
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.saveSharing).not.toHaveBeenCalled();
  });

  it("saves consent separately and can explicitly clear an existing support choice", async () => {
    mocks.getSupport.mockResolvedValue({ ok: true, need: "water", personalizationEnabled: false });
    mocks.saveSharing.mockResolvedValue({ ok: true });
    mocks.saveNeed.mockResolvedValue({ ok: true });
    render(<LobbyCheckIn initialValue={null} sleepDate="2026-09-09" />);
    const checkbox = openSharingPreference();
    await waitFor(() => expect(checkbox.hasAttribute("disabled")).toBe(false));
    expect(screen.getByRole<HTMLInputElement>("radio", { name: "Water" }).checked).toBe(true);
    fireEvent.click(checkbox);
    expect(mocks.saveSharing).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save sharing preference" }));
    await waitFor(() => expect(mocks.saveSharing).toHaveBeenCalledWith(true));
    await screen.findByText("Sharing preference saved.");
    fireEvent.click(screen.getByRole("button", { name: "Clear support choice" }));
    await waitFor(() => expect(mocks.saveNeed).toHaveBeenCalledWith(null));
    await screen.findByText("Support choice cleared.");
  });

  it("does not claim a failed save succeeded", async () => {
    mocks.saveNeed.mockResolvedValue({ ok: false, error: "Your support choice could not be saved yet." });
    render(<LobbyCheckIn initialValue={null} sleepDate="2026-09-09" />);
    const breakOption = screen.getByRole<HTMLInputElement>("radio", { name: "A break" });
    await waitFor(() => expect(breakOption.disabled).toBe(false));
    fireEvent.click(breakOption);
    fireEvent.click(screen.getByRole("button", { name: "Save support choice" }));
    expect(await screen.findByText("Your support choice could not be saved yet.")).toBeTruthy();
    expect(screen.queryByText("Support choice saved for 24 hours.")).toBeNull();
  });

  it("shows that consent changes are unsaved and restores the last saved state on failure", async () => {
    mocks.saveSharing.mockResolvedValue({ ok: false, error: "Your sharing preference could not be saved yet." });
    render(<LobbyCheckIn initialValue={null} sleepDate="2026-09-09" />);
    const checkbox = openSharingPreference();
    await waitFor(() => expect(checkbox.disabled).toBe(false));
    fireEvent.click(checkbox);
    expect(screen.getByText("Sharing preference changed. Save to apply it.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Save sharing preference" }));
    await screen.findByText(/Reload to confirm your saved preference/);
    expect(checkbox.checked).toBe(false);
    expect(screen.queryByText("Sharing preference saved.")).toBeNull();
  });

  it("allows an enabled student to explicitly turn sharing off", async () => {
    mocks.getSupport.mockResolvedValue({ ok: true, need: null, personalizationEnabled: true });
    mocks.saveSharing.mockResolvedValue({ ok: true });
    render(<LobbyCheckIn initialValue={null} sleepDate="2026-09-09" />);
    const checkbox = openSharingPreference();
    await waitFor(() => expect(checkbox.disabled).toBe(false));
    expect(checkbox.checked).toBe(true);
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole("button", { name: "Save sharing preference" }));
    await waitFor(() => expect(mocks.saveSharing).toHaveBeenCalledWith(false));
    await screen.findByText("Sharing preference saved.");
  });

  it("offers a retry when support choices cannot be loaded", async () => {
    mocks.getSupport.mockResolvedValueOnce({ ok: false, error: "Your support choices are unavailable right now." })
      .mockResolvedValueOnce({ ok: true, need: "break", personalizationEnabled: false });
    render(<LobbyCheckIn initialValue={null} sleepDate="2026-09-09" />);
    const retry = await screen.findByRole("button", { name: "Retry loading support choices" });
    const breakOption = screen.getByRole<HTMLInputElement>("radio", { name: "A break" });
    expect(breakOption.disabled).toBe(true);
    fireEvent.click(retry);
    await waitFor(() => expect(breakOption.checked).toBe(true));
    expect(screen.queryByRole("button", { name: "Retry loading support choices" })).toBeNull();
  });
});
