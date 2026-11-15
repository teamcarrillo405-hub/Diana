import { createHash, timingSafeEqual } from "node:crypto";

export const WINDOWS_WORKER_SMOKE_QUEUE = 'student-ai-candidate-smoke-windows-host';
export type WorkerBearerScope = 'legacy' | 'windows_host';
type WorkerAuthEnvironment = Readonly<Record<string, string | undefined>>;

export function workerBearerScope(request: Request, env: WorkerAuthEnvironment = process.env): WorkerBearerScope | null {
  const header = request.headers.get("authorization") ?? "";
  const actualDigest = createHash("sha256").update(header).digest();
  const matches = (token: string | undefined) => {
    const expected = `Bearer ${token ?? ''}`;
    const equal = timingSafeEqual(actualDigest, createHash('sha256').update(expected).digest());
    return equal && Boolean(token) && header.length === expected.length;
  };
  // Compare both fixed-length digests even when the first credential matches.
  const legacy = matches(env.WORKER_API_TOKEN);
  const host = matches(env.DIANA_WINDOWS_WORKER_API_TOKEN);
  if (legacy) return 'legacy';
  if (host && /^[a-f0-9]{64}$/.test(env.DIANA_WINDOWS_WORKER_API_TOKEN ?? '')) return 'windows_host';
  return null;
}

export function hasValidWorkerBearer(request: Request, env: WorkerAuthEnvironment = process.env): boolean {
  return workerBearerScope(request, env) !== null;
}

export function workerMayAccessQueue(request: Request, queueName: string, env: WorkerAuthEnvironment = process.env): boolean {
  const scope = workerBearerScope(request, env);
  return scope === 'legacy' || (scope === 'windows_host' && queueName === WINDOWS_WORKER_SMOKE_QUEUE);
}
