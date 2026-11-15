// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { CalendarConceptReview } from "./calendar-concept-review";
import { createCalendarItems, dayKey, itemTime, weekDays } from "./fixtures";

const today = "2026-09-16";
const schedule = () => screen.getByRole("tabpanel", { name: "Schedule" });
const dateTab = (name: string) => within(screen.getByRole("tablist", { name: "Schedule days" })).getByRole("tab", { name });
const eventTab = (name: string) => within(screen.getByRole("tablist", { name: "Day agenda" })).getByRole("tab", { name });

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); } });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Calendar event hub", () => {
  it("opens the current day in Schedule with one featured event and sample labeling", () => {
    render(<CalendarConceptReview today={today} />);
    expect(screen.getByText(/SAMPLE DATA/)).toBeVisible();
    expect(dateTab("Wednesday, September 16")).toHaveAttribute("aria-current", "date");
    expect(dateTab("Wednesday, September 16")).toHaveAttribute("aria-selected", "true");
    expect(eventTab("Basketball practice")).toHaveAttribute("aria-selected", "true");
    expect(within(schedule()).getByRole("heading", { name: "Basketball practice" })).toBeVisible();
    expect(screen.queryByRole("tabpanel", { name: "Week" })).not.toBeInTheDocument();
  });

  it("moves the day and actual focus with arrows, Home and End", async () => {
    render(<CalendarConceptReview today={today} />);
    fireEvent.keyDown(dateTab("Wednesday, September 16"), { key: "ArrowRight" });
    await waitFor(() => expect(dateTab("Thursday, September 17")).toHaveFocus());
    expect(screen.getByRole("heading", { name: "Reaction lab" })).toBeVisible();
    fireEvent.keyDown(dateTab("Thursday, September 17"), { key: "End" });
    await waitFor(() => expect(dateTab("Sunday, September 20")).toHaveFocus());
    expect(screen.getByRole("heading", { name: "NOTHING SCHEDULED" })).toBeVisible();
    fireEvent.keyDown(dateTab("Sunday, September 20"), { key: "Home" });
    await waitFor(() => expect(dateTab("Monday, September 14")).toHaveFocus());
  });

  it("moves event selection with arrows and exposes matching panel semantics", () => {
    render(<CalendarConceptReview today={today} />);
    fireEvent.keyDown(eventTab("Cell structure & function"), { key: "ArrowDown" });
    expect(eventTab("Cell diagram review")).toHaveFocus();
    const panel = screen.getByRole("tabpanel", { name: "Cell diagram review" });
    expect(panel).toHaveAttribute("id", "selected-event");
    expect(within(panel).getByText("Planned time")).toBeVisible();
    fireEvent.keyDown(eventTab("Cell diagram review"), { key: "End" });
    expect(eventTab("Robotics club")).toHaveFocus();
    expect(screen.getByRole("button", { name: "Event details" })).toBeVisible();
    fireEvent.keyDown(eventTab("Robotics club"), { key: "Home" });
    expect(eventTab("Cell structure & function")).toHaveFocus();
  });

  it("scrolls keyboard-selected agenda items into view", () => {
    const scroll = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: scroll });
    render(<CalendarConceptReview today={today} />);
    fireEvent.keyDown(eventTab("Cell structure & function"), { key: "End" });
    expect(scroll).toHaveBeenCalledWith({ block: "nearest", inline: "nearest" });
    expect(eventTab("Robotics club")).toHaveFocus();
    delete (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView;
  });

  it("navigates weeks, handles empty schedules, and returns to Today", () => {
    render(<CalendarConceptReview today={today} />);
    fireEvent.click(screen.getByRole("button", { name: "Next week" }));
    expect(dateTab("Wednesday, September 23")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "Basketball practice" })).toBeVisible();
    fireEvent.click(dateTab("Sunday, September 27"));
    expect(screen.getByRole("heading", { name: "NOTHING SCHEDULED" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Previous week" }));
    expect(dateTab("Sunday, September 20")).toHaveAttribute("aria-selected", "true");
    fireEvent.click(dateTab("Friday, September 18"));
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(dateTab("Wednesday, September 16")).toHaveAttribute("aria-selected", "true");
  });

  it("keeps deadline estimates distinct from a scheduled study block", () => {
    render(<CalendarConceptReview today={today} />);
    fireEvent.click(eventTab("Cell structure & function"));
    let details = screen.getByRole("complementary", { name: "Event details" });
    expect(within(details).getByText("Estimated work")).toBeVisible();
    expect(within(details).getByText("8:00 PM")).toBeVisible();
    fireEvent.click(eventTab("Cell diagram review"));
    details = screen.getByRole("complementary", { name: "Event details" });
    expect(within(details).getByText("Planned time")).toBeVisible();
    expect(within(details).getByText("4:00 PM")).toBeVisible();
    expect(within(details).getByText("TO 4:25 PM")).toBeVisible();
    expect(within(details).queryByText("Assignment status")).not.toBeInTheDocument();
  });

  it("does not label ready work as submitted", () => {
    render(<CalendarConceptReview today={today} />);
    fireEvent.click(dateTab("Friday, September 18"));
    fireEvent.click(eventTab("Reaction lab notes"));
    expect(within(schedule()).getByText("Ready to submit")).toBeVisible();
    expect(within(schedule()).queryByText("Submitted")).not.toBeInTheDocument();
    fireEvent.click(dateTab("Monday, September 14"));
    expect(within(screen.getByRole("complementary", { name: "Event details" })).getByText("Submitted")).toBeVisible();
  });

  it("opens a preview dialog and restores focus without starting a real session", () => {
    render(<CalendarConceptReview today={today} />);
    fireEvent.click(eventTab("Cell structure & function"));
    const opener = screen.getByRole("button", { name: "Open assignment" });
    fireEvent.click(opener);
    const dialog = screen.getByRole("dialog", { name: "Cell structure & function" });
    expect(dialog).toBeVisible();
    expect(within(dialog).getByText(/No assignment, session, or calendar event has been changed/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Close preview" }));
    expect(opener).toHaveFocus();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("uses keyboard view selection and preserves the selected item", () => {
    render(<CalendarConceptReview today={today} />);
    fireEvent.click(eventTab("Robotics club"));
    fireEvent.keyDown(screen.getByRole("tab", { name: "Schedule" }), { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Week" })).toHaveFocus();
    expect(screen.getByRole("tabpanel", { name: "Week" })).toBeVisible();
    fireEvent.keyDown(screen.getByRole("tab", { name: "Week" }), { key: "Home" });
    expect(eventTab("Robotics club")).toHaveAttribute("aria-selected", "true");
  });

  it("opens a specific item from Week and transfers focus", async () => {
    render(<CalendarConceptReview today={today} />);
    fireEvent.click(screen.getByRole("tab", { name: "Week" }));
    const week = screen.getByRole("tabpanel", { name: "Week" });
    expect(within(week).getAllByRole("heading", { name: "Due" })).toHaveLength(7);
    expect(within(week).getAllByRole("heading", { name: "Scheduled" })).toHaveLength(7);
    fireEvent.click(within(week).getByRole("button", { name: /Reaction lab notes/ }));
    expect(screen.getByRole("heading", { name: "Reaction lab notes" })).toBeVisible();
    await waitFor(() => expect(eventTab("Reaction lab notes")).toHaveFocus());
  });

  it("navigates months and opens a selected date in Schedule", async () => {
    render(<CalendarConceptReview today={today} />);
    fireEvent.click(screen.getByRole("tab", { name: "Month" }));
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByRole("heading", { name: "October 2026" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    const month = screen.getByRole("tabpanel", { name: "Month" });
    fireEvent.click(within(month).getByRole("button", { name: "Wednesday, September 16, today, 4 items" }));
    await waitFor(() => expect(dateTab("Wednesday, September 16")).toHaveFocus());
    expect(schedule()).toBeVisible();
  });

  it("keeps the primary navigation in the review environment", () => {
    render(<CalendarConceptReview today={today} />);
    expect(screen.getByRole("link", { name: "Work" })).toHaveAttribute("href", "/landing-3d/work-concept-review");
    expect(screen.getByRole("link", { name: "Classes" })).toHaveAttribute("href", "/landing-3d/classes-concept-review");
    expect(screen.getByRole("link", { name: "Calendar" })).toHaveAttribute("href", "/landing-3d/calendar-concept-review");
    expect(screen.getByRole("link", { name: "More" })).toHaveAttribute("href", "/landing-3d/more-concept-review");
  });

  it("adds a personal event, preserves it across views, and edits it without touching imports", async () => {
    render(<CalendarConceptReview today={today} />);
    fireEvent.click(screen.getByRole("button", { name: "Add event" }));
    fireEvent.change(screen.getByLabelText("Event title"), { target: { value: "Soccer practice" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "Sports" } });
    fireEvent.change(screen.getByLabelText(/Location/), { target: { value: "East field" } });
    fireEvent.change(screen.getByLabelText("Reminder"), { target: { value: "15" } });
    expect(screen.getByText(/reminder preferences do not send notifications/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Add to preview" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Soccer practice" })).toHaveFocus());
    expect(screen.getByText("15 minutes before")).toBeVisible();
    fireEvent.click(screen.getByRole("tab", { name: "Week" }));
    expect(within(screen.getByRole("tabpanel", { name: "Week" })).getByRole("button", { name: /Soccer practice/ })).toBeVisible();
    fireEvent.click(screen.getByRole("tab", { name: "Schedule" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit event" }));
    expect(screen.getByLabelText(/Location/)).toHaveValue("East field");
    fireEvent.change(screen.getByLabelText("Event title"), { target: { value: "Soccer match" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(eventTab("Soccer match")).toHaveAttribute("aria-selected", "true");
    fireEvent.click(eventTab("Cell structure & function"));
    expect(screen.queryByRole("button", { name: "Edit event" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open assignment" })).toBeVisible();
  });

  it("validates event times, supports all-day events, and cancels without saving", async () => {
    render(<CalendarConceptReview today={today} />);
    fireEvent.click(screen.getByRole("button", { name: "Add event" }));
    fireEvent.click(screen.getByRole("button", { name: "Add to preview" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveFocus());
    expect(screen.getByRole("alert")).toHaveTextContent("Add a title");
    fireEvent.change(screen.getByLabelText("Event title"), { target: { value: "Day trip" } });
    fireEvent.change(screen.getByLabelText("End time"), { target: { value: "15:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Add to preview" }));
    expect(screen.getByRole("alert")).toHaveTextContent("end time after");
    fireEvent.click(screen.getByLabelText("All day"));
    expect(screen.queryByLabelText("Start time")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add to preview" }));
    expect(within(screen.getByRole("complementary", { name: "Event details" })).getByText("ALL DAY")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Edit event" }));
    fireEvent.change(screen.getByLabelText("Event title"), { target: { value: "Uncommitted change" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(eventTab("Day trip")).toBeVisible();
    expect(screen.queryByRole("tab", { name: "Uncommitted change" })).not.toBeInTheDocument();
  });

  it("requires confirmation to delete a repeating series and restores focus", async () => {
    render(<CalendarConceptReview today={today} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete Basketball practice" }));
    expect(screen.getByText(/entire repeating series/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Keep event" }));
    expect(eventTab("Basketball practice")).toBeVisible();
    expect(screen.getByRole("button", { name: "Delete Basketball practice" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Delete Basketball practice" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete series" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Add event" })).toHaveFocus());
    expect(screen.queryByRole("tab", { name: "Basketball practice" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next week" }));
    expect(screen.getByRole("heading", { name: "NOTHING SCHEDULED" })).toBeVisible();
  });

  it("shows overlaps for personal events but not deadline estimates", () => {
    render(<CalendarConceptReview today={today} />);
    expect(screen.getByText(/Overlaps with Robotics club/)).toBeVisible();
    fireEvent.click(eventTab("Cell structure & function"));
    expect(screen.queryByText(/Overlaps with/)).not.toBeInTheDocument();
  });

  it("rejects unsupported photos and resets unsaved preview events on remount", () => {
    const first = render(<CalendarConceptReview today={today} />);
    fireEvent.click(screen.getByRole("button", { name: "Add event" }));
    fireEvent.change(screen.getByLabelText("Event photo"), { target: { files: [new File(["text"], "notes.txt", { type: "text/plain" })] } });
    expect(screen.getByRole("alert")).toHaveTextContent("Choose a JPG, PNG, or WebP");
    fireEvent.change(screen.getByLabelText("Event title"), { target: { value: "Temporary event" } });
    fireEvent.click(screen.getByRole("button", { name: "Add to preview" }));
    expect(eventTab("Temporary event")).toBeVisible();
    first.unmount();
    render(<CalendarConceptReview today={today} />);
    expect(screen.queryByRole("tab", { name: "Temporary event" })).not.toBeInTheDocument();
  });
});

describe("Calendar fixture semantics", () => {
  it("uses real calendar weeks across month and year boundaries", () => {
    expect(weekDays("2027-01-01").map(dayKey)).toEqual(["2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03"]);
    expect(createCalendarItems("2027-01-01").find(item => item.id === "chemistry")?.day).toBe("2027-01-01");
  });
  it("only assigns end times to actual scheduled sessions and events", () => {
    const items = createCalendarItems(today);
    expect(items.filter(item => item.kind === "deadline").every(item => !item.endTime)).toBe(true);
    expect(items.filter(item => item.kind !== "deadline").every(item => item.endTime)).toBe(true);
    expect(itemTime(items.find(item => item.id === "history")!)).toBe("11:59 PM");
  });
});
