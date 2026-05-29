// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { EveningPlanning } from "./evening-planning";

// Mock the server action so the test never tries to hit Supabase.
vi.mock("./actions", () => ({
  markIntentionFired: vi.fn(async () => ({ ok: true })),
}));

const sampleIntentions = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    cue_text: "after dinner",
    assignment_id: "22222222-2222-2222-2222-222222222222",
    assignment_title: "Chemistry problem set",
  },
];

describe("EveningPlanning", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("EVENING-01: renders nothing at 13:00 local time", () => {
    vi.setSystemTime(new Date(2026, 5, 1, 13, 0, 0)); // June 1 2026, 1pm
    const { container } = render(<EveningPlanning intentions={sampleIntentions} />);
    // useEffect runs synchronously after render in jsdom + act
    act(() => { vi.runAllTimers(); });
    expect(container.textContent ?? "").not.toContain("Your evening plan");
  });

  it("EVENING-02: renders the intention list at 18:00 local time", () => {
    vi.setSystemTime(new Date(2026, 5, 1, 18, 0, 0)); // June 1 2026, 6pm
    const { container } = render(<EveningPlanning intentions={sampleIntentions} />);
    // Flush useEffect synchronously with fake timers
    act(() => { vi.runAllTimers(); });
    expect(container.textContent ?? "").toContain("Your evening plan");
    expect(screen.getByText("Chemistry problem set")).toBeTruthy();
    expect(screen.getByText("after dinner")).toBeTruthy();
    expect(screen.getByRole("button", { name: /mark done/i })).toBeTruthy();
  });

  it("EVENING-03: renders nothing when intentions array is empty even at 18:00", () => {
    vi.setSystemTime(new Date(2026, 5, 1, 18, 0, 0));
    const { container } = render(<EveningPlanning intentions={[]} />);
    act(() => { vi.runAllTimers(); });
    expect(container.textContent ?? "").not.toContain("Your evening plan");
  });
});
