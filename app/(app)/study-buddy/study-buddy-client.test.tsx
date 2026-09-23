// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/study-buddy" }));

import { StudyBuddyClient } from "./study-buddy-client";

describe("StudyBuddyClient", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends only to the authenticated application route and keeps the conversation visible", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({
        ok: true,
        response: {
          title: "Guided step",
          main: "Name the value of a before choosing the formula step.",
          reason: "That keeps the setup in your own reasoning.",
          steps: ["Find a.", "Find b.", "Find c."],
          anchor: "Quadratic formula",
        },
      }), { status: 200, headers: { "content-type": "application/json" } }),
    );

    render(
      <StudyBuddyClient
        initialSource="Quadratic formula"
        initialQuestion="How do I begin?"
        tutorName="Coach Diana"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Send tutor message" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/diana/study-buddy");
      expect(screen.getByText("Name the value of a before choosing the formula step.")).toBeVisible();
      expect(screen.getByText("How do I begin?")).toBeVisible();
    });
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain("api.anthropic.com");
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain("service_role");
  });
});
