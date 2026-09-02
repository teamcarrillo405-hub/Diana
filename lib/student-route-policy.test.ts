import { describe, expect, it } from "vitest";

import { isRetiredStudentRoute } from "./student-route-policy";

describe("student route retirement", () => {
  it.each([
    "/assignments/new",
    "/templates",
    "/inbox/capture-1",
    "/course-mode/courses/course-1",
    "/flashcards",
    "/flashcards/card-1/review",
    "/grades",
    "/grades/transcript",
    "/insights",
    "/concepts/concept-1",
    "/knowledge-graph",
    "/notifications",
    "/export",
    "/settings/ai-history",
    "/design/compare",
  ])("retires %s", (route) => {
    expect(isRetiredStudentRoute(route)).toBe(true);
  });

  it.each([
    "/dashboard",
    "/assignments/captures/capture-1",
    "/classes/class-1",
    "/notes",
    "/landing-3d/logo-mask",
  ])("keeps %s available", (route) => {
    expect(isRetiredStudentRoute(route)).toBe(false);
  });
});
