import { describe, expect, it } from "vitest";
import { buildCalendarReturnHref, safeCalendarReturnHref, withCalendarReturn } from "./calendar-return";

describe("Calendar return context", () => {
  it("keeps the selected date, view and item through assignment routes", () => {
    const calendar = buildCalendarReturnHref({ day: "2026-11-17", view: "week", item: "assignment-one" });
    const destination = new URL(withCalendarReturn("/assignments/one/submit?status=recorded", calendar), "https://diana.invalid");
    expect(destination.searchParams.get("status")).toBe("recorded");
    expect(safeCalendarReturnHref(destination.searchParams.get("calendarReturn"))).toBe(calendar);
  });

  it.each(["https://elsewhere.test/calendar", "//elsewhere.test/calendar", "/calendar/../settings", "/calendar?day=2026-02-30", "/calendar?view=other", "/calendar#external", "/settings"])("rejects an unsafe return value %s", value => {
    expect(safeCalendarReturnHref(value)).toBeNull();
    expect(withCalendarReturn("/assignments/one/workspace", value)).toBe("/assignments/one/workspace");
  });

  it("drops unrelated query fields and leaves other origins intact", () => {
    expect(safeCalendarReturnHref("/calendar?view=month&token=private")).toBe("/calendar?view=month");
    expect(withCalendarReturn("https://school.test/work", "/calendar")).toBe("https://school.test/work");
  });

  it("keeps the selected next-day slice of an overnight event", () => {
    const item = "google-11111111-1111-4111-8111-111111111111~2026-11-18";
    const calendar = buildCalendarReturnHref({ day: "2026-11-18", view: "schedule", item });
    expect(new URL(calendar, "https://diana.test").searchParams.get("item")).toBe(item);
    expect(safeCalendarReturnHref(calendar)).toBe(calendar);
  });
});
