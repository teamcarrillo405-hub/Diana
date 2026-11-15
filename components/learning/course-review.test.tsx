// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CourseReview } from "./course-review";

const profile = (roles: string[] = ["reviewer"]) => ({
  profile: { roles, subjects: ["english"] }, courses: [], modules: [], reviews: [], publications: [],
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("shows only safe pending and accepted educator invitations, then accepts a pending one", async () => {
  const firstId = "00000000-0000-4000-8000-000000000011";
  const secondId = "00000000-0000-4000-8000-000000000012";
  const now = new Date().toISOString();
  const future = new Date(Date.now() + 86_400_000).toISOString();
  let accepted = false;
  const request = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
    if (String(url) === "/api/learning/course-review") return Response.json(profile());
    if (String(url).includes("?invitations=1&role=reviewer")) return Response.json({ invitations: [
      { id: firstId, displayLabel: "English response review", subject: "english", expiresAt: future, acceptedAt: accepted ? now : null },
      { id: secondId, displayLabel: "Reading response review", subject: "reading", expiresAt: future, acceptedAt: now },
    ] });
    if (String(url) === "/api/learning/response-review" && init?.method === "POST") { accepted = true; return Response.json({ accepted: true }); }
    throw new Error("Unexpected request");
  });
  render(<CourseReview/>);
  const section = await screen.findByRole("region", { name: "Response review invitations" });
  expect(section.textContent).toContain("English response review");
  expect(section.textContent).toContain("Reading response review");
  expect(section.textContent).toContain("Waiting for a response request.");
  expect(section.outerHTML).not.toContain(firstId);
  expect(screen.getAllByRole("button", { name: "Accept invitation" })).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Accept invitation" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "Accept invitation" })).toBeNull());
  expect(screen.getAllByText("Accepted. Waiting for a response request.")).toHaveLength(2);
  const post = request.mock.calls.find(([url, init]) => String(url) === "/api/learning/response-review" && init?.method === "POST");
  expect(JSON.parse(String(post?.[1]?.body))).toEqual({ action: "accept", invitationId: firstId });
});

it("stays hidden when invitation delivery is disabled or the educator has no invitation", async () => {
  const request = vi.spyOn(globalThis, "fetch").mockImplementation(async url => String(url) === "/api/learning/course-review"
    ? Response.json(profile()) : Response.json({ error: "Unavailable" }, { status: 503 }));
  const mounted = render(<CourseReview/>);
  await screen.findByRole("heading", { name: "Course review" });
  await waitFor(() => expect(request.mock.calls.some(([url]) => String(url).includes("?invitations=1&role=reviewer"))).toBe(true));
  expect(screen.queryByRole("region", { name: "Response review invitations" })).toBeNull();
  mounted.unmount();
  request.mockClear();
  request.mockImplementation(async url => String(url) === "/api/learning/course-review"
    ? Response.json(profile([])) : Response.json({ invitations: [] }));
  render(<CourseReview/>);
  await screen.findByRole("heading", { name: "Course review" });
  await waitFor(() => expect(request).toHaveBeenCalled());
  expect(request.mock.calls.some(([url]) => String(url).includes("?invitations=1&role=reviewer"))).toBe(false);
});
