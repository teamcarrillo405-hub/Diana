import { createHash, timingSafeEqual } from "node:crypto";

export function hasValidWorkerBearer(request: Request, env: NodeJS.ProcessEnv = process.env): boolean {
  const token = env.WORKER_API_TOKEN;
  if (!token) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${token}`;
  const actualDigest = createHash("sha256").update(header).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return timingSafeEqual(actualDigest, expectedDigest) && header.length === expected.length;
}
