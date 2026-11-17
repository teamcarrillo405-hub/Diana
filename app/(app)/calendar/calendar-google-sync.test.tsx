// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CalendarGoogleSync } from "./calendar-google-sync";

const mocks = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("Google Calendar connection feedback", () => {
  it.each(["__proto__", "constructor", "unknown-status"])("ignores an unrecognized callback status %s", initialStatus => {
    render(<CalendarGoogleSync connected={false} available initialStatus={initialStatus} />);
    expect(screen.getByRole("link", { name: "Connect Google Calendar" })).toBeVisible();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
  it("preserves the selected Calendar context in Google consent", () => {
    const returnTo = "/calendar?day=2026-11-17&view=week&item=google-one";
    render(<CalendarGoogleSync connected={false} available returnTo={returnTo} />);
    const url = new URL(screen.getByRole("link", { name: "Connect Google Calendar" }).getAttribute("href")!, "https://diana.test");
    expect(url.searchParams.get("return_to")).toBe(returnTo);
    expect(url.searchParams.get("calendar")).toBe("1");
  });

  it("offers Calendar-specific reconnect while retaining the last successful sync", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ code: "reconnect_required", error: "Reconnect Google Classroom" }, { status: 401 })));
    render(<CalendarGoogleSync connected available lastSyncedAt="2026-11-17T15:00:00Z" timeZone="UTC" />);
    fireEvent.click(screen.getByRole("button", { name: "Sync" }));
    expect(await screen.findByRole("link", { name: "Reconnect Google Calendar" })).toBeVisible();
    expect(screen.getByText(/Last synced Nov 17/)).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Reconnect Google Calendar to continue syncing.");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("refreshes the current page after a completed sync and displays its actual range", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ imported: 2, syncedAt: "2026-11-17T15:00:00Z", rangeStart: "2026-10-13T15:00:00Z", rangeEnd: "2027-05-17T15:00:00Z" })));
    render(<CalendarGoogleSync connected available timeZone="UTC" />);
    fireEvent.click(screen.getByRole("button", { name: "Sync" }));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce());
    expect(screen.getByRole("status")).toHaveTextContent("2 events synced.");
    expect(screen.getByText("Events from Oct 13 through May 17")).toBeVisible();
  });

  it("shows Google consent denial and unavailable configuration without a live sync action", () => {
    render(<CalendarGoogleSync connected={false} available={false} initialStatus="denied" />);
    expect(screen.getByRole("status")).toHaveTextContent("permission wasn’t added");
    expect(screen.getByText("Unavailable here")).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
