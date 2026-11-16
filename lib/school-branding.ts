export type SchoolBrandingInput = {
  primaryColor: string | null;
  secondaryColor: string | null;
  logoDataUrl: string | null;
};

/** Only six-digit hex colors may be interpolated into the dashboard theme. */
export function normalizeSchoolColor(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string" || !/^#[0-9a-f]{6}$/iu.test(value)) return undefined;
  return value.toUpperCase();
}
