import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  confirmationCutoffIso,
  confirmationTtlHours,
  createEarlyAccessRateLimitKeys,
  earlyAccessJson,
  earlyAccessRateLimitSecret,
  parseEarlyAccessToken,
  readEarlyAccessJson,
  reserveEarlyAccessRateLimits,
  withEarlyAccessCors,
  withEarlyAccessFailureBoundary,
} from "../_shared/early-access-security.ts";

const env = (name: string) => Deno.env.get(name);

Deno.serve(withEarlyAccessCors(withEarlyAccessFailureBoundary(async (request) => {
  if (request.method !== "POST") {
    return earlyAccessJson({ error: "Method not allowed" }, 405, { Allow: "POST, OPTIONS" });
  }

  const parsedBody = await readEarlyAccessJson(request);
  if (!parsedBody.ok) return earlyAccessJson({ error: parsedBody.message }, parsedBody.status);
  const token = parseEarlyAccessToken(parsedBody.value);
  if (!token) return earlyAccessJson({ error: "This link is not valid." }, 400);

  const rateLimitSalt = earlyAccessRateLimitSecret(env);
  if (!rateLimitSalt) {
    console.error("early-access confirm rate-limit configuration unavailable");
    return earlyAccessJson({ error: "Early access is temporarily unavailable." }, 503);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const rateLimitKeys = await createEarlyAccessRateLimitKeys(rateLimitSalt, "confirm", request, token);
  const rateLimit = await reserveEarlyAccessRateLimits(supabase, rateLimitKeys);
  if (rateLimit === "unavailable") {
    console.error("early-access confirm rate limit unavailable");
    return earlyAccessJson({ error: "Early access is temporarily unavailable." }, 503);
  }
  if (rateLimit === "limited") {
    return earlyAccessJson(
      { error: "Please try this link again in a few minutes." },
      429,
      { "Retry-After": "600" },
    );
  }

  const now = new Date();
  const confirmationCutoff = confirmationCutoffIso(
    now,
    confirmationTtlHours(Deno.env.get("EARLY_ACCESS_CONFIRMATION_TTL_HOURS")),
  );
  const { error } = await supabase
    .from("early_access_signups")
    .update({ status: "confirmed", confirmed_at: now.toISOString(), updated_at: now.toISOString() })
    .eq("confirmation_token", token)
    .eq("status", "pending_confirmation")
    .not("confirmation_sent_at", "is", null)
    .gte("confirmation_sent_at", confirmationCutoff);

  if (error) {
    console.error("early-access confirmation storage unavailable");
    return earlyAccessJson({ error: "We could not confirm this email." }, 500);
  }

  // Every well-formed token gets the same idempotent response, including unknown or expired tokens.
  return earlyAccessJson({ confirmed: true });
}), env));
