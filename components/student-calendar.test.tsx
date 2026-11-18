// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StudentCalendar } from "@/app/(app)/calendar/student-calendar";
import { EventEditor } from "@/app/(app)/calendar/event-editor";
import { newPersonalEvent } from "@/lib/calendar/personal-events";
import type { CalendarItem } from "@/lib/calendar/calendar-items";

const mocks = vi.hoisted(() => ({ remove: vi.fn(), save: vi.fn(), planning: vi.fn(), phone: false }));
vi.mock("@/app/(app)/calendar/actions", () => ({ saveCalendarEvent: mocks.save, setCalendarEventDeleted: mocks.remove }));
vi.mock("@/app/(app)/calendar/calendar-week-planning", () => ({ CalendarWeekPlanning: (props: unknown) => { mocks.planning(props); return <section aria-label="Weekly planning" />; } }));
vi.mock("@/components/student-shell/student-shell", () => ({ StudentShell: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("next/link", () => ({ default: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={String(href)} {...props}>{children}</a> }));

const assignment: CalendarItem = {
  id: "assignment-one", assignmentId: "11111111-1111-4111-8111-111111111111", day: "2026-11-17", time: "17:00",
  title: "Biology lab observations", subject: "Biology", kind: "deadline", status: "Not started", minutes: 90,
  href: "/assignments/11111111-1111-4111-8111-111111111111/workspace", image: "/biology.webp", imageAlt: "", color: "#086224", source: "Diana", brief: "Label the structures.",
};
const event = { ...newPersonalEvent("2026-11-17"), id: "22222222-2222-4222-8222-222222222222", title: "Study at the library" };
function openCalendar(props: Partial<Parameters<typeof StudentCalendar>[0]> = {}) {
  const url = new URL(window.location.href);
  if (props.initialDay) url.searchParams.set("day", props.initialDay);
  if (props.initialView) url.searchParams.set("view", props.initialView.toLowerCase());
  if (props.initialItem) url.searchParams.set("item", props.initialItem);
  window.history.replaceState(null, "", url);
  return render(<StudentCalendar today="2026-11-17" timeZone="America/Los_Angeles" importedItems={[assignment]} savedEvents={[event]} profile={{}} sync={<span>Google Calendar</span>} schoolName="Tigard High School" {...props} />);
}

beforeEach(() => {
  mocks.phone = false;
  mocks.remove.mockReset();
  mocks.save.mockReset();
  mocks.planning.mockReset();
  window.history.replaceState({}, "", "/calendar?day=2026-11-17");
  Object.defineProperty(window, "matchMedia", { configurable: true, value: vi.fn(() => ({ matches: mocks.phone, addEventListener: vi.fn(), removeEventListener: vi.fn() })) });
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value() { this.setAttribute("open", ""); this.querySelector("button")?.focus(); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value() { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); } });
});

describe("Calendar event editor", () => {
  it("unlinks the assignment when changing a Study event to another category", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(<EventEditor initial={{ ...event, category: "Study", assignmentId: assignment.assignmentId }} timeZone="America/Los_Angeles" assignmentTitle={assignment.title} onSave={save} onCancel={vi.fn()} />);
    expect(screen.getByText("Linked assignment · Biology lab observations")).toBeTruthy();
    fireEvent.click(screen.getByText("Details and reminders"));
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "Personal" } });
    expect(screen.queryByText("Linked assignment · Biology lab observations")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ category: "Personal", assignmentId: undefined })));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("retains overnight dates and linked assignment data on save", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const initial = { ...event, assignmentId: assignment.assignmentId, category: "Study" as const, time: "23:30", endTime: "00:30", endDay: "2026-11-18" };
    render(<EventEditor initial={initial} timeZone="America/Los_Angeles" assignmentTitle={assignment.title} onSave={save} onCancel={vi.fn()} />);
    expect((screen.getByLabelText("End date") as HTMLInputElement).value).toBe("2026-11-18");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ assignmentId: assignment.assignmentId, endDay: "2026-11-18", time: "23:30", endTime: "00:30" })));
  });

  it("announces a nonexistent daylight saving time before saving", async () => {
    const save = vi.fn();
    render(<EventEditor initial={{ ...event, day: "2026-03-08", time: "02:30", endTime: "03:30" }} timeZone="America/Los_Angeles" onSave={save} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/time|clock/i);
    expect(save).not.toHaveBeenCalled();
    await waitFor(() => expect(document.activeElement).toBe(alert));
  });
});
afterEach(cleanup);

describe("campus Calendar interactions", () => {
  it("keeps the server's safe date when a restored URL contains an impossible day", () => {
    window.history.replaceState(null, "", "/calendar?day=2026-02-31&view=week&item=assignment-one");
    render(<StudentCalendar today="2026-11-17" timeZone="America/Los_Angeles" importedItems={[assignment]} savedEvents={[event]} profile={{}} sync={<span>Google Calendar</span>} initialDay="2026-11-17" />);
    expect(screen.getByRole("tab", { name: "Week" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("heading", { name: "Nov 16 - 22, 2026" })).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Schedule" }));
    expect(screen.getByRole("tab", { name: "Biology lab observations" }).getAttribute("aria-selected")).toBe("true");
  });

  it.each([false, true])("restores the current URL when Back remounts stale cached Calendar props (phone: %s)", async (phone) => {
    mocks.phone = phone;
    window.history.replaceState(null, "", `/calendar?day=2026-11-17&view=schedule&item=${event.id}%402026-11-17`);
    render(<StudentCalendar today="2026-11-17" timeZone="America/Los_Angeles" importedItems={[assignment]} savedEvents={[event]} profile={{}} sync={<span>Google Calendar</span>} initialDay="2026-11-19" initialView="Month" />);
    await waitFor(() => expect(screen.getByRole("tab", { name: "Schedule" }).getAttribute("aria-selected")).toBe("true"));
    expect(screen.getByRole("tab", { name: "Study at the library" }).getAttribute("aria-selected")).toBe("true");
    expect(within(screen.getByRole("tablist", { name: "Schedule days" })).getByRole("tab", { name: "Tuesday, November 17" }).getAttribute("aria-selected")).toBe("true");
  });

  it.each([false, true])("keeps Next's canonical date, view, and selection through save and reload (phone: %s)", async (phone) => {
    mocks.phone = phone;
    const nativeReplaceState = window.history.replaceState.bind(window.history);
    const tree = { calendar: "retained router tree" };
    nativeReplaceState({ __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: tree }, "", "/calendar?day=2026-11-19&view=month");
    let canonicalUrl = window.location.pathname + window.location.search;
    // Model the installed Next router: internal history payloads bypass URL synchronization.
    const replaceState = vi.spyOn(window.history, "replaceState").mockImplementation((data, unused, url) => {
      if (data?.__NA || data?._N) {
        nativeReplaceState(data, unused, url);
        return;
      }
      const state = { ...data, __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: tree };
      if (url) canonicalUrl = String(url);
      nativeReplaceState(state, unused, url);
    });
    try {
      mocks.save.mockImplementation(async (draft) => {
        // The server-action request and its revalidation use Next's canonical URL.
        expect(canonicalUrl).toBe(`/calendar?day=2026-11-17&view=schedule&item=${event.id}%402026-11-17`);
        return { event: { ...draft, id: event.id } };
      });
      const rendered = openCalendar({ initialDay: "2026-11-19", initialView: "Month" });
      fireEvent.click(screen.getByRole("button", { name: /^Tuesday, November 17,/ }));
      fireEvent.click(screen.getByRole("tab", { name: "Schedule" }));
      fireEvent.click(screen.getByRole("tab", { name: "Study at the library" }));
      const details = phone ? screen.getByRole("dialog", { name: "Study at the library" }) : document.getElementById("selected-event")!;
      fireEvent.click(within(details).getByRole("button", { name: "Edit event" }));
      const editor = await screen.findByRole("dialog", { name: "Edit event" });
      fireEvent.change(within(editor).getByLabelText("Event title"), { target: { value: "Campus review" } });
      fireEvent.change(within(editor).getByLabelText("Start date"), { target: { value: "2026-11-20" } });
      fireEvent.click(within(editor).getByRole("button", { name: "Save changes" }));
      await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
      await waitFor(() => expect(canonicalUrl).toBe(`/calendar?day=2026-11-20&view=schedule&item=${event.id}%402026-11-20`));
      expect(window.location.pathname + window.location.search).toBe(canonicalUrl);
      expect(window.history.state).toEqual({ __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: tree });
      rendered.unmount();
      const params = new URL(canonicalUrl, window.location.origin).searchParams;
      openCalendar({ initialDay: params.get("day")!, initialView: "Schedule", initialItem: params.get("item")!, savedEvents: [{ ...event, day: "2026-11-20", title: "Campus review" }] });
      expect(screen.getByRole("tab", { name: "Schedule" }).getAttribute("aria-selected")).toBe("true");
      expect(screen.getByRole("tab", { name: "Campus review" }).getAttribute("aria-selected")).toBe("true");
    } finally {
      replaceState.mockRestore();
    }
  });

  it("keeps Month and its chosen date in the URL", () => {
    openCalendar({ initialView: "Month" });
    fireEvent.click(screen.getByRole("button", { name: /Thursday, November 19, 0 items/ }));
    expect(window.location.search).toContain("day=2026-11-19");
    expect(window.location.search).toContain("view=month");
    expect(screen.getByRole("tab", { name: "Month" }).getAttribute("aria-selected")).toBe("true");
    expect(within(screen.getByRole("region", { name: "Selected date agenda" })).getByText("Thursday, November 19")).toBeTruthy();
  });

  it("opens an immediately visible phone details dialog and restores the tapped row", async () => {
    mocks.phone = true;
    openCalendar();
    const row = screen.getByRole("tab", { name: "Study at the library" });
    fireEvent.click(row);
    const dialog = await screen.findByRole("dialog", { name: "Study at the library" });
    expect(dialog.hasAttribute("open")).toBe(true);
    expect(within(dialog).getByRole("button", { name: "Close event details" })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Close event details" }));
    await waitFor(() => expect(document.activeElement).toBe(row));
  });

  it("retains Calendar context on assignment destinations and presets adjusted study time", async () => {
    openCalendar({ savedEvents: [] });
    const start = screen.getByRole("link", { name: "Start assignment" });
    const href = new URL(start.getAttribute("href")!, window.location.origin);
    expect(href.searchParams.get("calendarReturn")).toBe("/calendar?day=2026-11-17&view=schedule&item=assignment-one");
    fireEvent.click(screen.getByRole("button", { name: "Plan study time" }));
    const dialog = await screen.findByRole("dialog", { name: "Plan study time" });
    expect((within(dialog).getByLabelText("End time") as HTMLInputElement).value).toBe("17:30");
    expect(within(dialog).getByText("Linked assignment · Biology lab observations")).toBeTruthy();
  });

  it("shows a deletion error inside the open confirmation", async () => {
    mocks.remove.mockResolvedValue({ error: "The event could not be removed. Try again." });
    openCalendar();
    fireEvent.click(screen.getByRole("button", { name: "Delete Study at the library" }));
    const dialog = await screen.findByRole("dialog", { name: "Delete Study at the library?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete event" }));
    expect(await within(dialog).findByRole("alert")).toHaveProperty("textContent", "The event could not be removed. Try again.");
    expect(dialog.hasAttribute("open")).toBe(true);
  });

  it("uses submission language and preserves per-feed load errors", () => {
    openCalendar({ importedItems: [{ ...assignment, status: "Submitted", href: assignment.href?.replace("workspace", "submit") }], savedEvents: [], feedErrors: { personal: "Your saved events could not load." } });
    expect(screen.getByRole("link", { name: "View submission" })).toBeTruthy();
    expect(screen.getByText("Your saved events could not load.").getAttribute("role")).toBe("status");
    expect(screen.getByText("0 due · 1 handed in")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Plan study time" })).toBeNull();
  });

  it("excludes ready and handed-in work from estimated working time", () => {
    openCalendar({ importedItems: [assignment, { ...assignment, id: "ready", status: "Ready to submit", minutes: 120 }, { ...assignment, id: "graded", status: "Graded", minutes: 180 }] });
    expect(mocks.planning).toHaveBeenLastCalledWith(expect.objectContaining({ estimatedMinutes: 90 }));
  });

  it("counts active assignments with unknown estimates separately", () => {
    openCalendar({ importedItems: [assignment,
      { ...assignment, id: "unknown", minutes: undefined },
      { ...assignment, id: "ready-unknown", status: "Ready to submit", minutes: undefined },
      { ...assignment, id: "submitted-unknown", status: "Submitted", minutes: undefined },
    ] });
    expect(mocks.planning).toHaveBeenLastCalledWith(expect.objectContaining({ estimatedMinutes: 90, unknownEstimateCount: 1 }));
  });

  it.each([
    { day: "2026-11-17", end: "16:15", note: "A shorter study block may help today." },
    { day: "2026-11-19", end: "17:30", note: null },
  ])("uses the current check-in suggestion only for today ($day)", async ({ day, end, note }) => {
    openCalendar({ initialDay: day, importedItems: [{ ...assignment, day }], savedEvents: [], suggestedBlockMinutes: 15, planningNote: "A shorter study block may help today." });
    expect(mocks.planning).toHaveBeenLastCalledWith(expect.objectContaining({ planningNote: note }));
    fireEvent.click(screen.getByRole("button", { name: "Plan study time" }));
    const dialog = await screen.findByRole("dialog", { name: "Plan study time" });
    expect((within(dialog).getByLabelText("End time") as HTMLInputElement).value).toBe(end);
  });
});
