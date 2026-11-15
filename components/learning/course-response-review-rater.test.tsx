// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { CourseResponseReviewRater } from "./course-response-review-rater";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("records two rubric descriptions with exact selected response evidence", async () => {
  const id = "00000000-0000-4000-8000-000000000051";
  const responseText = "The shuttle may help, but another cause is possible.";
  const request = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
    if (String(url).endsWith("?role=reviewer")) return Response.json({ requests: [
      { id, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86_400_000).toISOString(), revokedAt: null },
    ] });
    if (String(url).includes("?id=")) return Response.json({ owner: false, packet: { prompt: "Compare the claims.", response: responseText, sources: [], rubric: {
      criteria: [
        { id: "evidence", title: "Evidence in context", descriptors: ["No detail", "One detail", "Connected detail", "Contextual detail"] },
        { id: "reasoning", title: "Reasoning", descriptors: ["No claim", "Claim", "Connection", "Alternative"] },
      ],
    } } });
    if (String(url) === "/api/learning/response-review" && init?.method === "POST") return Response.json({ ratingId: "00000000-0000-4000-8000-000000000071" });
    throw new Error("Unexpected request");
  });
  render(<CourseResponseReviewRater />);
  const chooser = await screen.findByLabelText("Response request");
  fireEvent.change(chooser, { target: { value: id } });
  const saved = await screen.findByLabelText("Saved response text") as HTMLTextAreaElement;
  expect(saved.value).toBe(responseText);
  expect(screen.getByRole("region", { name: "Response rating" }).outerHTML).not.toContain("00000000-0000-4000-8000-000000000022");
  const add = screen.getByRole("button", { name: "Add selected response text" });
  saved.setSelectionRange(0, 11);
  fireEvent.click(add);
  fireEvent.change(screen.getByLabelText("Evidence for"), { target: { value: "reasoning" } });
  saved.setSelectionRange(26, 39);
  fireEvent.click(add);
  for (const [name, score] of [["Evidence in context", "2"], ["Reasoning", "3"]] as const) {
    const group = screen.getByRole("group", { name });
    fireEvent.change(within(group).getByLabelText("Descriptor"), { target: { value: score } });
    fireEvent.change(within(group).getByLabelText("Reason for this descriptor"), { target: { value: "The selected passage supports this descriptor." } });
  }
  fireEvent.click(screen.getByLabelText("I reviewed this response independently and have no conflict of interest."));
  fireEvent.click(screen.getByRole("button", { name: "Record independent review" }));
  await screen.findByText("Your independent review was recorded.");
  const post = request.mock.calls.find(([url, init]) => String(url) === "/api/learning/response-review" && init?.method === "POST");
  const body = JSON.parse(String(post?.[1]?.body));
  expect(body).toEqual({ action: "rateDraft", requestId: id, noConflict: true, criteria: [
    { criterionId: "evidence", score: 2, rationale: "The selected passage supports this descriptor.", evidence: [{ start: 0, end: 11, exactText: responseText.slice(0, 11) }] },
    { criterionId: "reasoning", score: 3, rationale: "The selected passage supports this descriptor.", evidence: [{ start: 26, end: 39, exactText: responseText.slice(26, 39) }] },
  ] });
  expect(body).not.toHaveProperty("reviewerId");
  expect(body).not.toHaveProperty("qualificationReference");
});

it("hides the rating path while review delivery is disabled", async () => {
  const request = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ error: "Unavailable" }, { status: 503 }));
  render(<CourseResponseReviewRater />);
  await waitFor(() => expect(request).toHaveBeenCalled());
  expect(screen.queryByRole("region", { name: "Response rating" })).toBeNull();
});
