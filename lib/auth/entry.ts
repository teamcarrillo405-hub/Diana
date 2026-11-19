const INTERNAL_ORIGIN = "https://diana.invalid";
const ENTRY_ROOTS = new Set(["login", "signup", "forgot-password", "reset-password", "auth", "api", "logout"]);
function unsafePath(value: string): boolean {
  return !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f\u007f]/u.test(value);
}
/** Keep post-auth navigation inside student pages, including encoded input. */
export function safeAuthDestination(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string" || value.length > 2048) return fallback;
  try {
    let decoded = value;
    for (let pass = 0; pass < 4; pass++) {
      if (unsafePath(decoded)) return fallback;
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
    if (unsafePath(decoded)) return fallback;
    const inspected = new URL(decoded, INTERNAL_ORIGIN);
    if (inspected.origin !== INTERNAL_ORIGIN || unsafePath(inspected.pathname) || ENTRY_ROOTS.has(inspected.pathname.split("/")[1].toLowerCase())) return fallback;
    const url = new URL(value, INTERNAL_ORIGIN);
    const destination = url.pathname + url.search + url.hash;
    return url.origin === INTERNAL_ORIGIN && !unsafePath(destination) ? destination : fallback;
  } catch {
    return fallback;
  }
}
export function passwordValidation(password: unknown, confirmation: unknown): string | null {
  if (typeof password !== "string" || Array.from(password).length < 12 || password.length > 128 || !password.trim()) return "Use 12 or more characters. You can use a phrase.";
  if (password !== confirmation) return "Enter the same new password in both fields.";
  return null;
}
export function validRecoveryEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value.trim());
}
