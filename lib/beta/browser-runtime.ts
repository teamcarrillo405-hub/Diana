/**
 * Identifies the isolated loopback browser environment used by the beta gate.
 * Product behavior must never enable this outside the command-owned QA runtime.
 */
export function isIsolatedBetaBrowserRuntime(
  value = process.env.NEXT_PUBLIC_DIANA_BETA_BROWSER_QA,
): boolean {
  return value === "true";
}
