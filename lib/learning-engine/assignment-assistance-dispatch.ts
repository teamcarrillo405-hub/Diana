import { createHash } from 'node:crypto'

/** Match the JSON actually dispatched; optional undefined properties are not wire inputs. */
export function assignmentDispatchSnapshot(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value))
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`
  return JSON.stringify(value)
}

/** Explicit request IDs remain bound to changed payloads by the durable receipt RPC. */
export function assignmentHelpDispatchKey(surface: string, ownerId: string, input: unknown, requestId?: string): string {
  const identity = requestId ? { requestId } : { input: assignmentDispatchSnapshot(input) }
  return `${surface}:${createHash('sha256').update(canonical({ protocol: 'assignment-dispatch-v1', surface, ownerId, ...identity })).digest('hex')}`
}

export function assignmentHelpRequestId(key: string): string {
  const hex = createHash('sha256').update(`assignment-help-receipt-v1:${key}`).digest('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}
