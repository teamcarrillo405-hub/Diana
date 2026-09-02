import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export const LMS_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

const STATE_VERSION = 1;
const MAX_STATE_LENGTH = 4096;
const FUTURE_CLOCK_SKEW_MS = 30 * 1000;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/u;
const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/u;

export type LmsOAuthProvider = "canvas" | "google_classroom";

export type CanvasOAuthStateContext = {
  institutionId: string;
  courseMode: boolean;
};

export type GoogleOAuthStateContext = {
  courseMode: boolean;
  calendar: boolean;
  returnTo: "/calendar" | "/settings";
};

export type LmsOAuthStatePayload =
  | {
      version: typeof STATE_VERSION;
      provider: "canvas";
      subject: string;
      issuedAt: number;
      expiresAt: number;
      nonce: string;
      cookieHash: string;
      context: CanvasOAuthStateContext;
    }
  | {
      version: typeof STATE_VERSION;
      provider: "google_classroom";
      subject: string;
      issuedAt: number;
      expiresAt: number;
      nonce: string;
      cookieHash: string;
      context: GoogleOAuthStateContext;
    };

type IssueLmsOAuthStateInput = {
  ownerId: string;
  secret: string;
  now?: number;
} & (
  | { provider: "canvas"; context: CanvasOAuthStateContext }
  | { provider: "google_classroom"; context: GoogleOAuthStateContext }
);

export type LmsOAuthStateFailure =
  | "missing"
  | "malformed"
  | "invalid-signature"
  | "provider-mismatch"
  | "expired"
  | "owner-mismatch"
  | "cookie-mismatch";

export type LmsOAuthStateVerification =
  | { ok: true; payload: LmsOAuthStatePayload }
  | { ok: false; reason: LmsOAuthStateFailure };

function stateSignature(secret: string, encodedPayload: string): Buffer {
  return createHmac("sha256", secret)
    .update(`diana:lms-oauth-state:v${STATE_VERSION}:${encodedPayload}`)
    .digest();
}

function ownerBinding(secret: string, ownerId: string): string {
  return createHmac("sha256", secret)
    .update(`diana:lms-oauth-owner:v${STATE_VERSION}:${ownerId}`)
    .digest("hex");
}

function cookieBinding(cookieVerifier: string): string {
  return createHash("sha256").update(cookieVerifier).digest("hex");
}

function equalFixedHex(actual: string, expected: string): boolean {
  if (!SHA256_HEX_PATTERN.test(actual) || !SHA256_HEX_PATTERN.test(expected)) return false;
  return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isCommonPayload(value: Record<string, unknown>): boolean {
  return (
    value.version === STATE_VERSION
    && (value.provider === "canvas" || value.provider === "google_classroom")
    && typeof value.subject === "string"
    && SHA256_HEX_PATTERN.test(value.subject)
    && typeof value.issuedAt === "number"
    && Number.isSafeInteger(value.issuedAt)
    && value.issuedAt > 0
    && typeof value.expiresAt === "number"
    && Number.isSafeInteger(value.expiresAt)
    && value.expiresAt > value.issuedAt
    && value.expiresAt - value.issuedAt <= LMS_OAUTH_STATE_TTL_MS
    && typeof value.nonce === "string"
    && value.nonce.length >= 32
    && value.nonce.length <= 128
    && BASE64URL_PATTERN.test(value.nonce)
    && typeof value.cookieHash === "string"
    && SHA256_HEX_PATTERN.test(value.cookieHash)
    && isRecord(value.context)
  );
}

function isCanvasContext(value: Record<string, unknown>): value is CanvasOAuthStateContext {
  return (
    typeof value.institutionId === "string"
    && value.institutionId.length > 0
    && value.institutionId.length <= 200
    && typeof value.courseMode === "boolean"
  );
}

function isGoogleContext(value: Record<string, unknown>): value is GoogleOAuthStateContext {
  return (
    typeof value.courseMode === "boolean"
    && typeof value.calendar === "boolean"
    && (value.returnTo === "/calendar" || value.returnTo === "/settings")
  );
}

function parsePayload(encodedPayload: string): LmsOAuthStatePayload | null {
  if (!encodedPayload || !BASE64URL_PATTERN.test(encodedPayload)) return null;
  try {
    const decoded = Buffer.from(encodedPayload, "base64url");
    if (decoded.toString("base64url") !== encodedPayload) return null;
    const value = JSON.parse(decoded.toString("utf8")) as unknown;
    if (!isRecord(value) || !isCommonPayload(value) || !isRecord(value.context)) return null;
    if (value.provider === "canvas" && isCanvasContext(value.context)) {
      return value as LmsOAuthStatePayload;
    }
    if (value.provider === "google_classroom" && isGoogleContext(value.context)) {
      return value as LmsOAuthStatePayload;
    }
    return null;
  } catch {
    return null;
  }
}

export function lmsOAuthStateSecret(provider: LmsOAuthProvider): string {
  const dedicatedSecret = process.env.LMS_OAUTH_STATE_SECRET?.trim();
  if (dedicatedSecret) return dedicatedSecret;
  return (
    provider === "canvas"
      ? process.env.CANVAS_CLIENT_SECRET
      : process.env.GOOGLE_CLIENT_SECRET
  )?.trim() ?? "";
}

export function issueLmsOAuthState(input: IssueLmsOAuthStateInput): {
  state: string;
  cookieVerifier: string;
} {
  if (!input.ownerId || !input.secret) throw new Error("oauth_state_not_configured");
  const issuedAt = input.now ?? Date.now();
  const cookieVerifier = randomBytes(32).toString("base64url");
  const common = {
    version: STATE_VERSION,
    subject: ownerBinding(input.secret, input.ownerId),
    issuedAt,
    expiresAt: issuedAt + LMS_OAUTH_STATE_TTL_MS,
    nonce: randomBytes(32).toString("base64url"),
    cookieHash: cookieBinding(cookieVerifier),
  } as const;
  const payload: LmsOAuthStatePayload = input.provider === "canvas"
    ? { ...common, provider: "canvas", context: input.context }
    : { ...common, provider: "google_classroom", context: input.context };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = stateSignature(input.secret, encodedPayload).toString("base64url");
  return {
    state: `v${STATE_VERSION}.${encodedPayload}.${signature}`,
    cookieVerifier,
  };
}

export function verifyLmsOAuthState(input: {
  state: string | null | undefined;
  cookieVerifier: string | null | undefined;
  provider: LmsOAuthProvider;
  authenticatedOwnerId: string;
  secret: string;
  now?: number;
}): LmsOAuthStateVerification {
  if (!input.state || !input.cookieVerifier || !input.secret || !input.authenticatedOwnerId) {
    return { ok: false, reason: "missing" };
  }
  if (input.state.length > MAX_STATE_LENGTH) return { ok: false, reason: "malformed" };

  const parts = input.state.split(".");
  if (parts.length !== 3 || parts[0] !== `v${STATE_VERSION}`) {
    return { ok: false, reason: "malformed" };
  }
  const [, encodedPayload, encodedSignature] = parts;
  if (
    !encodedPayload
    || !encodedSignature
    || !BASE64URL_PATTERN.test(encodedSignature)
  ) {
    return { ok: false, reason: "malformed" };
  }

  let actualSignature: Buffer;
  try {
    actualSignature = Buffer.from(encodedSignature, "base64url");
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (actualSignature.toString("base64url") !== encodedSignature) {
    return { ok: false, reason: "invalid-signature" };
  }
  const expectedSignature = stateSignature(input.secret, encodedPayload);
  if (
    actualSignature.length !== expectedSignature.length
    || !timingSafeEqual(actualSignature, expectedSignature)
  ) {
    return { ok: false, reason: "invalid-signature" };
  }

  const payload = parsePayload(encodedPayload);
  if (!payload) return { ok: false, reason: "malformed" };
  if (payload.provider !== input.provider) {
    return { ok: false, reason: "provider-mismatch" };
  }

  const now = input.now ?? Date.now();
  if (payload.expiresAt <= now || payload.issuedAt > now + FUTURE_CLOCK_SKEW_MS) {
    return { ok: false, reason: "expired" };
  }
  if (!equalFixedHex(payload.subject, ownerBinding(input.secret, input.authenticatedOwnerId))) {
    return { ok: false, reason: "owner-mismatch" };
  }
  if (!equalFixedHex(payload.cookieHash, cookieBinding(input.cookieVerifier))) {
    return { ok: false, reason: "cookie-mismatch" };
  }

  return { ok: true, payload };
}
