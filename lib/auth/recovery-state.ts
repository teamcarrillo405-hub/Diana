import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { safeAuthDestination } from "./entry";
export const RECOVERY_COOKIE = "diana-password-recovery";
export const RECOVERY_TTL_SECONDS = 15 * 60;
const PURPOSE = "diana:password-recovery:v2:";
type RecoveryState = {
  version: 2;
  user: string;
  session: string;
  revision: string;
  expires: number;
  next: string;
};
export function recoveryStateSecret(env: Record<string, string | undefined> = process.env): string | null {
  const key = env.LMS_OAUTH_STATE_SECRET?.trim();
  return key && key.length >= 32 ? key : null;
}
function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
function signature(encoded: string, secret: string) {
  return createHmac("sha256", secret).update(PURPOSE + encoded).digest();
}
export function issueRecoveryState(input: {
  userId: string;
  accessToken: string;
  userRevision: string;
  next?: string;
  secret: string;
  now?: number;
}): string {
  const payload: RecoveryState = {
    version: 2,
    user: input.userId,
    session: digest(input.accessToken),
    revision: input.userRevision,
    expires: (input.now ?? Date.now()) + RECOVERY_TTL_SECONDS * 1000,
    next: safeAuthDestination(input.next)
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return encoded + "." + signature(encoded, input.secret).toString("base64url");
}
export function verifyRecoveryState(input: {
  value?: string;
  userId: string;
  accessToken: string;
  userRevision: string;
  secret: string;
  now?: number;
}): {
  next: string;
} | null {
  if (!input.value || input.value.length > 4096 || !input.userRevision) return null;
  try {
    const [encoded, signed, extra] = input.value.split(".");
    if (extra || !encoded || !signed || !/^[A-Za-z0-9_-]+$/u.test(encoded) || !/^[A-Za-z0-9_-]+$/u.test(signed)) return null;
    const expected = signature(encoded, input.secret),
      actual = Buffer.from(signed, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const value = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<RecoveryState>;
    const now = input.now ?? Date.now();
    if (value.version !== 2 || value.user !== input.userId || value.session !== digest(input.accessToken) || value.revision !== input.userRevision || typeof value.expires !== "number" || value.expires <= now || value.expires > now + RECOVERY_TTL_SECONDS * 1000 + 30_000) return null;
    return {
      next: safeAuthDestination(value.next)
    };
  } catch {
    return null;
  }
}
export function recoveryCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: RECOVERY_TTL_SECONDS
  };
}
