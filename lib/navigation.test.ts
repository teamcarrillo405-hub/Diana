import { describe, expect, it } from "vitest";

import {
  getStudentNavOwner,
  ownsScreenDesignNavigation,
} from "./navigation";

describe("Course Mode navigation ownership", () => {
  it.each([
    "/course-mode",
    "/course-mode/courses/course-1",
    "/course-mode/lessons/lesson-1",
    "/course-mode/assessments/assessment-1",
  ])("maps %s to Classes", (path) => {
    expect(getStudentNavOwner(path)).toBe("Classes");
    expect(ownsScreenDesignNavigation(path)).toBe(true);
  });

  it("keeps existing primary route ownership", () => {
    expect(getStudentNavOwner("/dashboard")).toBe("Today");
    expect(getStudentNavOwner("/assignments/assignment-1")).toBe("Work");
    expect(getStudentNavOwner("/calendar")).toBe("Calendar");
    expect(getStudentNavOwner("/settings")).toBe("More");
  });
});
