// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/study-buddy" }));

import { StudyBuddyClient } from "./study-buddy-client";

const evidence = {
  verificationLevel: "source_checked",
  confidence: 0.9,
  validatedAnchors: [{
    sourceId: "source-1",
    pageLabel: "Page 2",
    startOffset: 4,
    endOffset: 13,
    exactText: "formula x",
  }],
  verifierResult: null,
  limitations: [],
  escalationReason: null,
};

const availableProviderState = {
  availability: "available",
  visible: false,
  title: null,
  message: null,
  reasonCode: null,
  retryable: false,
  retryAfterSeconds: null,
  verificationLevelCap: "tool_checked",
  confidenceCap: 1,
  escalationReason: null,
};

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
        evidence,
        providerState: availableProviderState,
      }), { status: 200, headers: { "content-type": "application/json" } }),
    );

    render(
      <StudyBuddyClient
        initialSource="Quadratic formula"
        initialQuestion="How do I begin?"
        tutorName="Coach Diana"
        assignmentId="11111111-1111-4111-8111-111111111111"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Send tutor message" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/diana/study-buddy");
      expect(screen.getByText("Name the value of a before choosing the formula step.")).toBeVisible();
      expect(screen.getByText("How do I begin?")).toBeVisible();
      expect(screen.getByText("Source checked: Page 2")).toBeVisible();
    });
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain("api.anthropic.com");
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain("service_role");
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as { assignmentId?: string };
    expect(body.assignmentId).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("shows unavailable provider output as a labeled state without a coach success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({
        ok: false,
        error: "Provider output was not accepted.",
        evidence: {
          ...evidence,
          verificationLevel: "needs_more_information",
          confidence: 0.3,
          validatedAnchors: [],
          escalationReason: "The verification provider is unavailable.",
        },
        providerState: {
          ...availableProviderState,
          availability: "unavailable",
          visible: true,
          title: "Verification needs another try",
          message: "Diana needs the source or a working verification service before checking this response. Your work is still here.",
          reasonCode: "network",
          retryable: true,
          verificationLevelCap: "needs_more_information",
          confidenceCap: 0.3,
          escalationReason: "The verification provider is unavailable, so more information or a later retry is required.",
        },
      }), { status: 503, headers: { "content-type": "application/json" } }),
    );

    render(<StudyBuddyClient initialQuestion="Can you check this?" />);
    fireEvent.click(screen.getByRole("button", { name: "Send tutor message" }));

    expect(await screen.findByText("Verification needs another try")).toBeVisible();
    expect(screen.getByText(/working verification service/u)).toBeVisible();
    expect(screen.queryByText("Provider output was not accepted.")).not.toBeInTheDocument();
  });
});
