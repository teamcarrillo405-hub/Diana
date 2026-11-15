import { describe, expect, it } from "vitest";

import { currentStudentDestination, isRetiredStudentRoute } from "./student-route-policy";

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
    "/upgrade",
    "/landing-3d/logo-mask",
  ])("keeps %s available", (route) => {
    expect(isRetiredStudentRoute(route)).toBe(false);
  });
});

describe("current student destinations", () => {
  it.each([
    ["/inbox/capture-1", "/assignments/captures/capture-1"],
    ["/course-mode/courses/course-1", "/classes"],
    ["/settings/tutor", "/settings?section=tutor"],
    ["/export", "/settings?section=ai#ai-history-export"],
    ["/landing-3d/remaining-concept-review/study", "/study"],
    ["/landing-3d/today-now-assets", "/dashboard"],
    ["/flashcards/deck-1/review", "/study/recall"],
  ])("keeps %s connected to %s", (old,current) => expect(currentStudentDestination(old)).toBe(current));
  it("does not intercept current routes or unrelated preview assets", () => {
    for (const route of ["/assignments/captures/1","/study/recall","/settings","/upgrade","/api/notes","/landing-3d/logo-mask"]) expect(currentStudentDestination(route)).toBeNull();
  });
});
