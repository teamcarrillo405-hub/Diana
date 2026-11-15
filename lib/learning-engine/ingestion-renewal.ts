import { z } from "zod";
import { ingestionEndpoint, validateIngestionSession, type IngestionIdentity, type IngestionSession } from "./ingestion-session";

export const renewalRecordSchema = z.object({
  version: z.literal("ingestion-renewal-v1"), state: z.enum(["ready", "refreshing"]),
  url: z.string().max(2048), publicKey: z.string().min(1).max(4096),
  accessToken: z.string().min(1).max(8192), refreshToken: z.string().regex(/^[A-Za-z0-9_.-]{8,4096}$/),
  delegatedAt: z.number().int().nonnegative(), delegationExpiresAt: z.number().int().positive(),
}).strict();
export type RenewalRecord = z.infer<typeof renewalRecordSchema>;
export type RenewalPin = IngestionIdentity & { sessionId: string };

function tokenClaims(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts.every(part => /^[A-Za-z0-9_-]+$/.test(part))) throw new Error("renewal_token_invalid");
  return z.object({ exp: z.number().int().positive(), session_id: z.string().uuid() }).passthrough()
    .parse(JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")));
}
export function validateRenewalRecord(value: unknown, pin: RenewalPin, now: number): RenewalRecord {
  z.string().uuid().parse(pin.sessionId);
  const record = renewalRecordSchema.parse(value), claims = tokenClaims(record.accessToken);
  if (claims.session_id !== pin.sessionId) throw new Error("renewal_session_changed");
  if (!Number.isSafeInteger(now) || record.delegatedAt > now || record.delegationExpiresAt <= now + 60_000 ||
      record.delegationExpiresAt - record.delegatedAt > 86_400_000 || record.delegationExpiresAt <= record.delegatedAt) {
    throw new Error("renewal_delegation_expired");
  }
  // Expired access may be refreshed, but role, owner, endpoint and public key still must match.
  validateIngestionSession({ url: record.url, publicKey: record.publicKey, accessToken: record.accessToken }, pin,
    Math.min(now, claims.exp * 1000 - 1));
  if (record.state !== "ready") throw new Error("renewal_ambiguous_previous_attempt");
  return record;
}
async function boundedJson(response: Response): Promise<unknown> {
  if (!response.ok || response.redirected || !response.body) throw new Error("renewal_auth_unavailable");
  const reader = response.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      size += chunk.value.byteLength; if (size > 32_000) throw new Error("renewal_response_bound");
      chunks.push(chunk.value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
}

/** Caller holds an exclusive private-store lock. Journal before sending the one-use refresh.
 * An ambiguous attempt stays journaled and is never automatically retried, even after restart.
 */
export async function renewIngestionSession(options: {
  record: unknown; pin: RenewalPin; persist: (record: RenewalRecord) => Promise<void>;
  signal?: AbortSignal; fetch?: typeof fetch; now?: () => number;
}): Promise<IngestionSession> {
  const clock = options.now ?? Date.now, record = validateRenewalRecord(options.record, options.pin, clock());
  const session = { url: ingestionEndpoint(record.url), publicKey: record.publicKey, accessToken: record.accessToken };
  if (options.signal?.aborted) throw new Error("renewal_cancelled");
  if (tokenClaims(record.accessToken).exp * 1000 > clock() + 120_000) return validateIngestionSession(session, options.pin, clock());
  await options.persist({ ...record, state: "refreshing" });
  const signal = AbortSignal.any([AbortSignal.timeout(20_000), ...(options.signal ? [options.signal] : [])]);
  try {
    signal.throwIfAborted();
    const transport = options.fetch ?? fetch;
    const refreshed = z.object({ access_token: z.string().max(8192), refresh_token: z.string().max(4096),
      token_type: z.literal("bearer"), user: z.object({ id: z.string().uuid() }) }).passthrough().parse(await boundedJson(await transport(
      session.url + "/auth/v1/token?grant_type=refresh_token", {
        method: "POST", redirect: "error", credentials: "omit", cache: "no-store", signal,
        headers: { apikey: session.publicKey, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: record.refreshToken }),
      })));
    if (refreshed.user.id !== options.pin.ownerId) throw new Error("renewal_owner_changed");
    const next = validateRenewalRecord({ ...record, state: "ready", accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token }, options.pin, clock());
    const renewed = validateIngestionSession({ ...session, accessToken: next.accessToken }, options.pin, clock() + 60_000);
    const identity = z.object({ id: z.string().uuid() }).passthrough().parse(await boundedJson(await transport(session.url + "/auth/v1/user", {
      method: "GET", redirect: "error", credentials: "omit", cache: "no-store", signal,
      headers: { apikey: session.publicKey, Authorization: "Bearer " + renewed.accessToken },
    })));
    if (identity.id !== options.pin.ownerId) throw new Error("renewal_identity_rejected");
    signal.throwIfAborted(); validateRenewalRecord(next, options.pin, clock());
    await options.persist(next);
    // Filesystem/ACL verification can consume the remaining delegation window.
    signal.throwIfAborted(); validateRenewalRecord(next, options.pin, clock());
    return validateIngestionSession(renewed, options.pin, clock() + 60_000);
  } catch { throw new Error("renewal_stopped_reauthorization_required"); }
}
