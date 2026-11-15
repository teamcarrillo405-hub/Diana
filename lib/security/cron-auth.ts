import { createHash, timingSafeEqual } from "node:crypto";

export function hasValidCronBearer(
  authorization: string | null,
  secret: string | undefined = process.env.CRON_SECRET,
): boolean {
  if (!secret) return false;

  const actual = authorization ?? "";
  const expected = `Bearer ${secret}`;
  const actualDigest = createHash("sha256").update(actual).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();

  return timingSafeEqual(actualDigest, expectedDigest) && actual.length === expected.length;
}
