// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ParentSummary } from "@/lib/sharing/types";

import { ParentSummaryView } from "./parent-summary";

const summary: ParentSummary = {
  completedThisWeek: 8,
  upcomingNext7Days: 2,
  studyMinutesThisWeek: 45,
  masteryConcepts: [{ name: "Claim evidence reasoning", level: 2 }],
  progressNotes: [
    {
      authorName: "Teacher",
      noteText: "The student is revising explanations consistently.",
      createdAt: "2026-09-13T16:30:00.000Z",
    },
  ],
  weekStartIso: "2026-09-14T00:00:00.000Z",
  expiresAt: "2026-10-14T16:30:00.000Z",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ParentSummaryView", () => {
  it("prints only the already-loaded scoped report", () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    render(<ParentSummaryView summary={summary} />);

    fireEvent.click(screen.getByRole("button", { name: "Print report" }));

    expect(print).toHaveBeenCalledOnce();
    expect(screen.getByText("Shared progress report")).toBeInTheDocument();
    expect(screen.queryByText(/grade/iu)).not.toBeInTheDocument();
  });
});
