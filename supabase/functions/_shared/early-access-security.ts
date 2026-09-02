export type EarlyAccessEnvReader = (name: string) => string | undefined;
export type EarlyAccessAction = "signup" | "confirm" | "unsubscribe";

export const EARLY_ACCESS_MAX_BODY_BYTES = 2_048;
export const EARLY_ACCESS_DEFAULT_CONFIRMATION_TTL_HOURS = 48;

const PRODUCTION_ORIGINS = [
  "https://diana.app",
  "https://diana-umber.vercel.app",
];
const DEVELOPMENT_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3002",
  "http://127.0.0.1:3002",
  "http://localhost:3100",
  "http://127.0.0.1:3100",
];
const ALLOWED_REQUEST_HEADERS = new Set([
  "authorization",
  "apikey",
  "content-type",
  "x-client-info",
  "x-retry-count",
]);
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SOURCE_PATTERN = /^[a-z0-9][a-z0-9_-]{0,79}$/iu;

function defaultEnv(name: string): string | undefined {
  const runtime = globalThis as typeof globalThis & {
    Deno?: { env?: { get?: (key: string) => string | undefined } };
  };
  return runtime.Deno?.env?.get?.(name);
}

function isProduction(env: EarlyAccessEnvReader): boolean {
  return [env("DIANA_ENV"), env("ENVIRONMENT"), env("NODE_ENV")]
    .some((value) => value?.trim().toLowerCase() === "production") ||
    Boolean(env("DENO_DEPLOYMENT_ID")?.trim());
}

function normalizedOrigin(value: string, allowLocalHttp: boolean): string | null {
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return null;
  }

  const isLocalHttp = parsed.protocol === "http:" &&
    (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1");
  if (parsed.username || parsed.password || (parsed.protocol !== "https:" && !(allowLocalHttp && isLocalHttp))) {
    return null;
  }
  return parsed.origin;
}

export function configuredEarlyAccessOrigins(
  env: EarlyAccessEnvReader = defaultEnv,
): Set<string> {
  const production = isProduction(env);
  const origins = new Set(PRODUCTION_ORIGINS);
  if (!production) {
    for (const origin of DEVELOPMENT_ORIGINS) origins.add(origin);
  }

  for (const name of ["EARLY_ACCESS_ALLOWED_ORIGINS", "DIANA_ALLOWED_ORIGINS"]) {
    for (const value of env(name)?.split(",") ?? []) {
      const origin = normalizedOrigin(value, !production);
      if (origin) origins.add(origin);
    }
  }

  const siteOrigin = normalizedOrigin(env("SITE_URL") ?? "", !production);
  if (siteOrigin) origins.add(siteOrigin);
  return origins;
}

export function isAllowedEarlyAccessOrigin(
  origin: string,
  env: EarlyAccessEnvReader = defaultEnv,
): boolean {
  const normalized = normalizedOrigin(origin, !isProduction(env));
  return normalized === origin && configuredEarlyAccessOrigins(env).has(origin);
}

function appendVary(headers: Headers, value: string): void {
  const values = (headers.get("Vary") ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (!values.some((entry) => entry.toLowerCase() === value.toLowerCase())) values.push(value);
  headers.set("Vary", values.join(", "));
}

function applyResponseSecurityHeaders(headers: Headers): void {
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  appendVary(headers, "Origin");
}

export function earlyAccessJson(
  body: Record<string, unknown>,
  status = 200,
  extraHeaders?: HeadersInit,
): Response {
  const headers = new Headers(extraHeaders);
  headers.set("Content-Type", "application/json; charset=utf-8");
  applyResponseSecurityHeaders(headers);
  return new Response(JSON.stringify(body), { status, headers });
}

function rejectedPreflight(message: string, status: number): Response {
  const response = earlyAccessJson({ error: message }, status);
  appendVary(response.headers, "Access-Control-Request-Method");
  appendVary(response.headers, "Access-Control-Request-Headers");
  return response;
}

export function withEarlyAccessCors(
  handler: (request: Request) => Response | Promise<Response>,
  env: EarlyAccessEnvReader = defaultEnv,
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const origin = request.headers.get("Origin");
    if (origin && !isAllowedEarlyAccessOrigin(origin, env)) {
      return rejectedPreflight("Origin not allowed.", 403);
    }

    if (request.method === "OPTIONS") {
      if (!origin) return rejectedPreflight("Origin required.", 400);

      const requestedMethod = request.headers.get("Access-Control-Request-Method")?.toUpperCase();
      if (requestedMethod !== "POST") {
        return rejectedPreflight("CORS method not allowed.", 403);
      }

      const requestedHeaders = (request.headers.get("Access-Control-Request-Headers") ?? "")
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
      if (requestedHeaders.some((value) => !ALLOWED_REQUEST_HEADERS.has(value))) {
        return rejectedPreflight("CORS headers not allowed.", 403);
      }

      const headers = new Headers({
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": [...ALLOWED_REQUEST_HEADERS].join(", "),
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Max-Age": "600",
      });
      applyResponseSecurityHeaders(headers);
      appendVary(headers, "Access-Control-Request-Method");
      appendVary(headers, "Access-Control-Request-Headers");
      return new Response(null, { status: 204, headers });
    }

    const response = await handler(request);
    const headers = new Headers(response.headers);
    headers.delete("Access-Control-Allow-Origin");
    headers.delete("Access-Control-Allow-Credentials");
    if (origin) headers.set("Access-Control-Allow-Origin", origin);
    applyResponseSecurityHeaders(headers);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

export function withEarlyAccessFailureBoundary(
  handler: (request: Request) => Response | Promise<Response>,
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    try {
      return await handler(request);
    } catch {
      console.error("early-access request failed");
      return earlyAccessJson({ error: "Early access is temporarily unavailable." }, 500);
    }
  };
}

export type EarlyAccessJsonReadResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; status: 400 | 413 | 415; message: string };

export async function readEarlyAccessJson(
  request: Request,
  maxBytes = EARLY_ACCESS_MAX_BODY_BYTES,
): Promise<EarlyAccessJsonReadResult> {
  const mediaType = request.headers.get("Content-Type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (mediaType !== "application/json") {
    return { ok: false, status: 415, message: "Content-Type must be application/json." };
  }

  const declaredLength = request.headers.get("Content-Length");
  if (declaredLength && /^\d+$/u.test(declaredLength) && Number(declaredLength) > maxBytes) {
    return { ok: false, status: 413, message: "Request body is too large." };
  }
  if (!request.body) return { ok: false, status: 400, message: "A JSON object is required." };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return { ok: false, status: 413, message: "Request body is too large." };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400, message: "A valid JSON object is required." };
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let value: unknown;
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    value = JSON.parse(text);
  } catch {
    return { ok: false, status: 400, message: "A valid JSON object is required." };
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, status: 400, message: "A JSON object is required." };
  }
  return { ok: true, value: value as Record<string, unknown> };
}

export type EarlyAccessSignupInput = {
  email: string;
  normalizedEmail: string;
  source: string;
  honeypotFilled: boolean;
};

function isValidEmail(email: string): boolean {
  if (!email || email.length > 200 || /[\u0000-\u001f\u007f\s]/u.test(email)) return false;
  const parts = email.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || local.length > 64 || !domain || !domain.includes(".")) return false;
  const labels = domain.split(".");
  return labels.every((label) => Boolean(label) && !label.startsWith("-") && !label.endsWith("-"));
}

export function parseEarlyAccessSignup(
  body: Record<string, unknown>,
): { ok: true; value: EarlyAccessSignupInput } | { ok: false } {
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!isValidEmail(email)) return { ok: false };

  const sourceCandidate = typeof body.source === "string" ? body.source.trim() : "";
  return {
    ok: true,
    value: {
      email,
      normalizedEmail: email.toLowerCase(),
      source: SOURCE_PATTERN.test(sourceCandidate) ? sourceCandidate : "public_landing",
      honeypotFilled: typeof body.website === "string" && body.website.trim().length > 0,
    },
  };
}

export function parseEarlyAccessToken(body: Record<string, unknown>): string | null {
  if (typeof body.token !== "string" || !UUID_V4_PATTERN.test(body.token)) return null;
  return body.token.toLowerCase();
}

export function confirmationTtlHours(value: string | undefined): number {
  if (!value) return EARLY_ACCESS_DEFAULT_CONFIRMATION_TTL_HOURS;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 168
    ? parsed
    : EARLY_ACCESS_DEFAULT_CONFIRMATION_TTL_HOURS;
}

export function confirmationCutoffIso(now: Date, ttlHours: number): string {
  return new Date(now.getTime() - ttlHours * 60 * 60 * 1_000).toISOString();
}

export function confirmationNeedsRotation(sentAt: string | null, cutoffIso: string): boolean {
  if (!sentAt) return false;
  const sentAtMs = Date.parse(sentAt);
  return !Number.isFinite(sentAtMs) || sentAtMs < Date.parse(cutoffIso);
}

export function earlyAccessRateLimitSecret(
  env: EarlyAccessEnvReader = defaultEnv,
): string | null {
  const secret = env("EARLY_ACCESS_RATE_LIMIT_SALT")?.trim();
  if (!secret || new TextEncoder().encode(secret).byteLength < 32) return null;
  return secret;
}

function clientAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  const address = request.headers.get("cf-connecting-ip")?.trim()
    || forwarded
    || request.headers.get("x-real-ip")?.trim()
    || "unavailable";
  return address.slice(0, 256);
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export async function earlyAccessOpaqueDigest(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(digest);
}

export async function createEarlyAccessRateLimitKeys(
  secret: string,
  action: EarlyAccessAction,
  request: Request,
  subject: string,
): Promise<string[]> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const preimages = [
    `v1:${action}:ip:${clientAddress(request)}`,
    `v1:${action}:subject:${subject.slice(0, 256)}`,
  ];
  return Promise.all(preimages.map(async (preimage) => {
    const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(preimage));
    return `ea:v1:${bytesToHex(signature)}`;
  }));
}

export type EarlyAccessRateLimitDecision = "allowed" | "limited" | "unavailable";

export interface EarlyAccessRateLimitClient {
  rpc(
    name: "reserve_early_access_rate_limit",
    args: { p_rate_key: string },
  ): PromiseLike<{ data: unknown; error: unknown }>;
}

export async function reserveEarlyAccessRateLimits(
  client: EarlyAccessRateLimitClient,
  keys: string[],
): Promise<EarlyAccessRateLimitDecision> {
  for (const key of keys) {
    let result: { data: unknown; error: unknown };
    try {
      result = await client.rpc(
        "reserve_early_access_rate_limit",
        { p_rate_key: key },
      );
    } catch {
      return "unavailable";
    }
    if (result.error) return "unavailable";
    if (result.data !== true) return "limited";
  }
  return "allowed";
}

export function earlyAccessSiteOrigin(env: EarlyAccessEnvReader = defaultEnv): string {
  return normalizedOrigin(env("SITE_URL") ?? "", !isProduction(env)) ?? "https://diana.app";
}

export function earlyAccessActionUrl(
  siteOrigin: string,
  action: "confirm" | "unsubscribe",
  token: string,
): string {
  const url = new URL(`/early-access/${action}`, siteOrigin);
  url.searchParams.set("token", token);
  return url.toString();
}
