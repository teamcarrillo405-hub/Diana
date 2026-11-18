// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ disconnect: vi.fn(), refresh: vi.fn() }));
vi.mock("./lms-actions", () => ({ disconnectLms: mocks.disconnect }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
import { SourceDisconnectButton } from "./source-disconnect-button";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.disconnect.mockResolvedValue({ ok: true, message: "Connection removed" });
});
afterEach(cleanup);

describe("owner-facing saved Google connection removal", () => {
  it("requires confirmation and lets the owner cancel without changing the connection", () => {
    render(<SourceDisconnectButton connectionId="owner-connection" />);
    const trigger = screen.getByRole("button", { name: "Remove connection" });
    fireEvent.click(trigger);
    const confirmation = screen.getByRole("group", { name: "Confirm Google connection removal" });
    expect(confirmation.textContent).toContain("Google Calendar and Google Classroom syncing will stop.");
    expect(confirmation.textContent).toContain("Imported events, classes, and assignments will stay in Diana.");
    expect(confirmation.textContent).toContain("Google Account permissions stay unchanged.");
    expect(mocks.disconnect).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("group")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(mocks.disconnect).not.toHaveBeenCalled();
  });

  it("uses the displayed saved connection ID after explicit confirmation and refreshes", async () => {
    render(<SourceDisconnectButton connectionId="owner-connection" calendarOnly />);
    fireEvent.click(screen.getByRole("button", { name: "Remove connection" }));
    expect(screen.getByRole("group").textContent).toContain("Google Calendar syncing will stop.");
    fireEvent.click(screen.getByRole("button", { name: "Confirm removal" }));
    await waitFor(() => expect(mocks.disconnect).toHaveBeenCalledWith("owner-connection"));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce());
    expect(screen.getByRole("status").textContent).toBe("Connection removed. Imported data is still in Diana.");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("blocks repeated confirmation while removal is pending", async () => {
    let resolve: (value: { ok: boolean; message: string }) => void = () => {};
    mocks.disconnect.mockReturnValue(new Promise(value => { resolve = value; }));
    render(<SourceDisconnectButton connectionId="owner-connection" />);
    fireEvent.click(screen.getByRole("button", { name: "Remove connection" }));
    const confirm = screen.getByRole("button", { name: "Confirm removal" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(mocks.disconnect).toHaveBeenCalledTimes(1);
    expect((screen.getByRole("button", { name: "Removing" }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => resolve({ ok: true, message: "Connection removed" }));
  });

  it.each(["action", "network"])("keeps the saved connection visible and gives a calm retry when %s prevents removal", async problem => {
    if (problem === "action") mocks.disconnect.mockResolvedValue({ ok: false, message: "Could not remove the connection: try again in a moment" });
    else mocks.disconnect.mockRejectedValue(new Error("private transport detail"));
    render(<SourceDisconnectButton connectionId="owner-connection" />);
    fireEvent.click(screen.getByRole("button", { name: "Remove connection" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm removal" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/try again/iu));
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Remove connection" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirm removal" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).not.toContain("private transport detail");
  });
});
