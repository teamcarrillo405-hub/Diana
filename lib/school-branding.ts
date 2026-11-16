export type SchoolBrandingInput = {
  schoolName?: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  logoDataUrl: string | null;
};

export function normalizeSchoolName(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string" || /[\u0000-\u001f\u007f]/u.test(value)) return undefined;
  const name = value.trim().replace(/\s+/gu, " ");
  if (!name) return null;
  return name.length <= 80 ? name : undefined;
}

/** Derive a readable campus label while retaining the student's chosen name. */
export function formatCampusName(schoolName: unknown): string {
  const name = normalizeSchoolName(schoolName);
  if (!name) return "Diana Campus";
  if (/\bcampus$/iu.test(name)) return name;
  const shortName = name.replace(/\s+(?:senior\s+high\s+school|high\s+school|middle\s+school|elementary\s+school|secondary\s+school|school|university|college)$/iu, "").trim();
  if (/\bcampus$/iu.test(shortName)) return shortName;
  return `${shortName || name} Campus`;
}

/** Only six-digit hex colors may be interpolated into the dashboard theme. */
export function normalizeSchoolColor(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string" || !/^#[0-9a-f]{6}$/iu.test(value)) return undefined;
  return value.toUpperCase();
}
