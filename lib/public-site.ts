/** Normalize pasted deployment settings, including a leading Unicode BOM. */
export function publicAppUrl(value = process.env.NEXT_PUBLIC_APP_URL): string {
  return value?.trim().replace(/\/+$/u, "") || "https://diana.app";
}
