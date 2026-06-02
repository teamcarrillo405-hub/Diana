import { describe, expect, it } from "vitest";
import { buildAssignmentsIcs, escapeIcsText, formatIcsDate } from "./export-ics";

describe("assignment calendar export", () => {
  it("escapes ICS text fields", () => {
    expect(escapeIcsText("A, B; C\\D\nE")).toBe("A\\, B\\; C\\\\D\\nE");
  });

  it("formats dates as UTC ICS stamps", () => {
    expect(formatIcsDate("2026-06-15T23:59:00.000Z")).toBe("20260615T235900Z");
  });

  it("builds VEVENT rows for due assignments only", () => {
    const ics = buildAssignmentsIcs([
      {
        id: "a1",
        title: "Essay, draft",
        description: "Attach rubric",
        due_at: "2026-06-15T23:59:00.000Z",
        classes: { name: "English" },
      },
      {
        id: "a2",
        title: "No due date",
        description: null,
        due_at: null,
      },
    ], { now: new Date("2026-06-01T00:00:00.000Z") });

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("UID:a1@diana");
    expect(ics).toContain("SUMMARY:Essay\\, draft");
    expect(ics).toContain("DTSTART:20260615T235900Z");
    expect(ics).toContain("Class: English");
    expect(ics).not.toContain("No due date");
  });
});
