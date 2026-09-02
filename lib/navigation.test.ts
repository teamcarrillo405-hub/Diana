import { describe, expect, it } from "vitest";

import {
  getStudentNavOwner,
  ownsScreenDesignNavigation,
} from "./navigation";

describe("student navigation ownership", () => {
  it("keeps existing primary route ownership", () => {
    expect(getStudentNavOwner("/dashboard")).toBe("Today");
    expect(getStudentNavOwner("/assignments/assignment-1")).toBe("Work");
    expect(getStudentNavOwner("/calendar")).toBe("Calendar");
    expect(getStudentNavOwner("/settings")).toBe("More");
  });

  it("does not retain obsolete screens as navigation owners", () => {
    expect(ownsScreenDesignNavigation("/course-mode")).toBe(false);
    expect(ownsScreenDesignNavigation("/inbox/capture-1")).toBe(false);
  });
});
