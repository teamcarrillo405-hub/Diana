import { describe, expect, it } from "vitest";

import {
  canAuthorCourse,
  canManageOrganization,
  canReadPublishedCourse,
  canSupervisePractical,
  isOrganizationRole,
  maySelfVerifyMembership,
} from "@/lib/course-mode/authority";

describe("course authority", () => {
  it("requires verified staff authority to author or supervise", () => {
    expect(canAuthorCourse({ role: "teacher", status: "verified" })).toBe(true);
    expect(canSupervisePractical({ role: "teacher", status: "verified" })).toBe(true);
    expect(canAuthorCourse({ role: "teacher", status: "pending" })).toBe(false);
    expect(canSupervisePractical({ role: "aide", status: "verified" })).toBe(false);
    expect(canManageOrganization({ role: "teacher", status: "verified" })).toBe(false);
    expect(canManageOrganization({ role: "school_admin", status: "verified" })).toBe(true);
  });

  it("limits students to enrolled published courses", () => {
    const student = { role: "student", status: "verified" } as const;
    expect(canReadPublishedCourse({ authority: student, enrolled: true, courseStatus: "published" })).toBe(true);
    expect(canReadPublishedCourse({ authority: student, enrolled: false, courseStatus: "published" })).toBe(false);
    expect(canReadPublishedCourse({ authority: student, enrolled: true, courseStatus: "draft" })).toBe(false);
  });

  it("does not permit self-verification", () => {
    expect(maySelfVerifyMembership()).toBe(false);
    expect(isOrganizationRole("teacher")).toBe(true);
    expect(isOrganizationRole("owner")).toBe(false);
  });
});
