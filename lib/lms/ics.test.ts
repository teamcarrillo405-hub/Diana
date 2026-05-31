import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node-ical", () => ({
  default: {
    async: {
      fromURL: vi.fn(),
    },
  },
}));

import ical from "node-ical";
import { fetchIcsAssignments } from "./ics";

const fromURL = ical.async.fromURL as unknown as ReturnType<typeof vi.fn>;

describe("fetchIcsAssignments", () => {
  beforeEach(() => { fromURL.mockReset(); });

  it("parses a basic VEVENT", async () => {
    fromURL.mockResolvedValue({
      "evt-1": { type: "VEVENT", summary: "Essay due", start: new Date("2026-06-15T23:59:00Z"), uid: "evt-1" },
    });
    const r = await fetchIcsAssignments("https://x/cal.ics");
    expect(r.items).toHaveLength(1);
    expect(r.items[0].title).toBe("Essay due");
    expect(r.items[0].external_id).toBe("evt-1");
    expect(r.items[0].due_at).toBe("2026-06-15T23:59:00.000Z");
    expect(r.items[0].external_source).toBe("ics");
  });

  it("ignores VTODO and other non-VEVENT entries", async () => {
    fromURL.mockResolvedValue({
      "a": { type: "VTODO", summary: "todo" },
      "b": { type: "VEVENT", summary: "real", start: new Date("2026-06-15T23:59:00Z"), uid: "b" },
    });
    const r = await fetchIcsAssignments("https://x/cal.ics");
    expect(r.items).toHaveLength(1);
    expect(r.items[0].external_id).toBe("b");
  });

  it("normalizes DTSTART to UTC ISO", async () => {
    fromURL.mockResolvedValue({
      "tz": { type: "VEVENT", summary: "tz", start: new Date("2026-06-15T18:00:00-05:00"), uid: "tz" },
    });
    const r = await fetchIcsAssignments("https://x/cal.ics");
    expect(r.items[0].due_at).toBe("2026-06-15T23:00:00.000Z");
  });

  it("skips VEVENT with missing start", async () => {
    fromURL.mockResolvedValue({
      "no-start": { type: "VEVENT", summary: "x", uid: "no-start" },
    });
    const r = await fetchIcsAssignments("https://x/cal.ics");
    expect(r.items).toHaveLength(0);
    expect(r.skipped).toBe(1);
  });

  it("falls back to summary+start when UID missing", async () => {
    fromURL.mockResolvedValue({
      "k": { type: "VEVENT", summary: "X", start: new Date("2026-06-15T00:00:00Z") },
    });
    const r = await fetchIcsAssignments("https://x/cal.ics");
    expect(r.items[0].external_id).toBe("ics:X:2026-06-15T00:00:00.000Z");
  });
});
