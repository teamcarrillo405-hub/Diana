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

  it("does not claim unrelated routes as ScreenDesign navigation owners", () => {
    expect(ownsScreenDesignNavigation("/unrecognized-route")).toBe(false);
    expect(ownsScreenDesignNavigation("/unrecognized-route/item-1")).toBe(false);
  });
});
