// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CourseResponseReviewRequest } from "./course-response-review-request";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("shows the owner a descriptive report for the active saved response", async () => {
  const recordId = "00000000-0000-4000-8000-000000000041";
  const requestId = "00000000-0000-4000-8000-000000000051";
  const request = vi.spyOn(globalThis, "fetch").mockImplementation(async url => {
    if (String(url).endsWith("?role=owner")) return Response.json({ requests: [{
      id: requestId, recordId, revision: 1, expiresAt: new Date(Date.now() + 86_400_000).toISOString(), revokedAt: null,
    }] });
    if (String(url).includes("?id=")) return Response.json({ owner: true, packet: { rubric: { criteria: [
      { id: "evidence", title: "Evidence in context", descriptors: ["Zero", "One", "Connected detail", "Contextual detail"] },
    ] } }, report: { status: "review_complete", agreement: { pairedCriteria: 3, agreedCriteria: 2, exactRate: 2 / 3 },
      rows: [{ status: "agreed", criteria: [{ criterionId: "evidence", score: 2, rationale: "The response cites a relevant detail." }] }],
    } });
    throw new Error("Unexpected request");
  });
  render(<CourseResponseReviewRequest recordId={recordId} revision={1} subject="english" />);
  const region = await screen.findByRole("region", { name: "Educator response review" });
  await screen.findByText("Educator review complete.");
  expect(region.textContent).toContain("Educators agreed on 2 of 3 rubric criteria.");
  expect(region.textContent).toContain("Connected detail");
  expect(region.textContent).toContain("It is not a course grade or a claim of mastery.");
  expect(region.outerHTML).not.toContain(requestId);
  fireEvent.click(screen.getByRole("button", { name: "Refresh review status" }));
  await waitFor(() => expect(request.mock.calls.filter(([url]) => String(url).includes("?id="))).toHaveLength(2));
});

it("does not show owner review controls when delivery is disabled", async () => {
  const request = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ error: "Unavailable" }, { status: 503 }));
  render(<CourseResponseReviewRequest recordId="00000000-0000-4000-8000-000000000041" revision={1} subject="english" />);
  await waitFor(() => expect(request).toHaveBeenCalled());
  expect(screen.queryByRole("region", { name: "Educator response review" })).toBeNull();
});
