/** Stored jobs may predate assignment scoping. Missing assignment on a valid
 * input is general help; malformed scope must never silently become general. */
export function voiceJobScope(payload: unknown): { ok: true; assignmentId: string | null } | { ok: false } {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return { ok: false }
  const input = (payload as { input?: unknown }).input
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false }
  const assignmentId = (input as { assignmentId?: unknown }).assignmentId
  if (assignmentId == null) return { ok: true, assignmentId: null }
  if (typeof assignmentId !== 'string' || !assignmentId.trim()) return { ok: false }
  return { ok: true, assignmentId: assignmentId.trim() }
}
