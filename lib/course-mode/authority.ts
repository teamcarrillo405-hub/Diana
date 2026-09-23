export const ORGANIZATION_ROLES = [
  "district_admin",
  "school_admin",
  "teacher",
  "aide",
  "student",
] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];
export type MembershipStatus = "pending" | "verified" | "suspended";

export type CourseAuthority = {
  role: OrganizationRole;
  status: MembershipStatus;
};

const AUTHORING_ROLES = new Set<OrganizationRole>([
  "district_admin",
  "school_admin",
  "teacher",
]);

const ADMIN_ROLES = new Set<OrganizationRole>([
  "district_admin",
  "school_admin",
]);

export function isOrganizationRole(value: string): value is OrganizationRole {
  return ORGANIZATION_ROLES.includes(value as OrganizationRole);
}

export function canAuthorCourse(authority: CourseAuthority | null): boolean {
  return authority?.status === "verified" && AUTHORING_ROLES.has(authority.role);
}

export function canManageOrganization(authority: CourseAuthority | null): boolean {
  return authority?.status === "verified" && ADMIN_ROLES.has(authority.role);
}

export function canSupervisePractical(authority: CourseAuthority | null): boolean {
  return authority?.status === "verified" && AUTHORING_ROLES.has(authority.role);
}

export function maySelfVerifyMembership(): false {
  return false;
}

export function canReadPublishedCourse(input: {
  authority: CourseAuthority | null;
  enrolled: boolean;
  courseStatus: "draft" | "published" | "retired";
}): boolean {
  if (input.authority?.status !== "verified") return false;
  if (canAuthorCourse(input.authority)) return true;
  return input.authority.role === "student" && input.enrolled && input.courseStatus === "published";
}
