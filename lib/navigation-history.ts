/** Retain caller state while allowing Next's patched History API to observe a URL change. */
export function navigationHistoryState(state: unknown): Record<string, unknown> | null {
  if (!state || typeof state !== "object" || Array.isArray(state)) return null;
  const next = { ...state } as Record<string, unknown>;
  // These markers identify framework-internal writes and bypass Next's URL dispatch.
  delete next.__NA;
  delete next._N;
  return next;
}
