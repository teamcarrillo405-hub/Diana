import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  confirmationCutoffIso,
  confirmationNeedsRotation,
  confirmationTtlHours,
  createEarlyAccessRateLimitKeys,
  earlyAccessActionUrl,
  earlyAccessJson,
  earlyAccessOpaqueDigest,
  earlyAccessRateLimitSecret,
  earlyAccessSiteOrigin,
  parseEarlyAccessSignup,
  readEarlyAccessJson,
  reserveEarlyAccessRateLimits,
  withEarlyAccessCors,
  withEarlyAccessFailureBoundary,
} from "../_shared/early-access-security.ts";

type SignupRecord = {
  id: string;
  email: string;
  confirmation_token: string;
  confirmation_sent_at: string | null;
  status: "pending_confirmation" | "confirmed" | "unsubscribed";
};

const SIGNUP_FIELDS = "id, email, confirmation_token, confirmation_sent_at, status";
const env = (name: string) => Deno.env.get(name);

function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function sendConfirmationEmail(email: string, token: string): Promise<boolean> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM");
  if (!apiKey || !from) return false;

  const siteOrigin = earlyAccessSiteOrigin(env);
  const confirmationUrl = earlyAccessActionUrl(siteOrigin, "confirm", token);
  const unsubscribeUrl = earlyAccessActionUrl(siteOrigin, "unsubscribe", token);
  const idempotencyDigest = await earlyAccessOpaqueDigest(token);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `diana-early-access-${idempotencyDigest}`,
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Confirm your Diana early access",
      text: `Confirm your Diana early access: ${confirmationUrl}\n\nUnsubscribe: ${unsubscribeUrl}`,
      html: `<p>Confirm your <strong>Diana</strong> early access.</p><p><a href="${confirmationUrl}">Confirm early access</a></p><p><a href="${unsubscribeUrl}">Unsubscribe</a></p>`,
    }),
  });
  return response.ok;
}

Deno.serve(withEarlyAccessCors(withEarlyAccessFailureBoundary(async (request) => {
  if (request.method !== "POST") {
    return earlyAccessJson({ error: "Method not allowed" }, 405, { Allow: "POST, OPTIONS" });
  }

  const parsedBody = await readEarlyAccessJson(request);
  if (!parsedBody.ok) {
    return earlyAccessJson({ error: parsedBody.message }, parsedBody.status);
  }
  const parsedSignup = parseEarlyAccessSignup(parsedBody.value);
  if (!parsedSignup.ok) {
    return earlyAccessJson({ error: "Enter a valid email address." }, 400);
  }
  const signupInput = parsedSignup.value;

  // Honeypot submissions receive the same response without touching storage or email.
  if (signupInput.honeypotFilled) return earlyAccessJson({ accepted: true }, 202);

  const rateLimitSalt = earlyAccessRateLimitSecret(env);
  if (!rateLimitSalt) {
    console.error("early-access signup rate-limit configuration unavailable");
    return earlyAccessJson({ error: "Early access is temporarily unavailable." }, 503);
  }

  const supabase = serviceClient();
  const rateLimitKeys = await createEarlyAccessRateLimitKeys(
    rateLimitSalt,
    "signup",
    request,
    signupInput.normalizedEmail,
  );
  const rateLimit = await reserveEarlyAccessRateLimits(supabase, rateLimitKeys);
  if (rateLimit === "unavailable") {
    console.error("early-access signup rate limit unavailable");
    return earlyAccessJson({ error: "Early access is temporarily unavailable." }, 503);
  }
  if (rateLimit === "limited") {
    return earlyAccessJson(
      { error: "Please try again in a few minutes." },
      429,
      { "Retry-After": "600" },
    );
  }

  try {
    const { data: existing, error: lookupError } = await supabase
      .from("early_access_signups")
      .select(SIGNUP_FIELDS)
      .eq("email_normalized", signupInput.normalizedEmail)
      .maybeSingle();
    if (lookupError) throw new Error("signup_lookup_unavailable");

    let signup = existing as SignupRecord | null;
    if (!signup) {
      const { data, error: insertError } = await supabase
        .from("early_access_signups")
        .insert({
          email: signupInput.email,
          email_normalized: signupInput.normalizedEmail,
          source: signupInput.source,
        })
        .select(SIGNUP_FIELDS)
        .single();

      if (insertError?.code === "23505") {
        const { data: racedSignup, error: racedLookupError } = await supabase
          .from("early_access_signups")
          .select(SIGNUP_FIELDS)
          .eq("email_normalized", signupInput.normalizedEmail)
          .single();
        if (racedLookupError) throw new Error("signup_race_lookup_unavailable");
        signup = racedSignup as SignupRecord;
      } else if (insertError || !data) {
        throw new Error("signup_insert_unavailable");
      } else {
        signup = data as SignupRecord;
      }
    }

    const now = new Date();
    const confirmationCutoff = confirmationCutoffIso(
      now,
      confirmationTtlHours(Deno.env.get("EARLY_ACCESS_CONFIRMATION_TTL_HOURS")),
    );
    let deliverable = signup.status === "pending_confirmation" ? signup : null;

    if (deliverable && confirmationNeedsRotation(deliverable.confirmation_sent_at, confirmationCutoff)) {
      const replacementToken = crypto.randomUUID();
      const { data: rotated, error: rotateError } = await supabase
        .from("early_access_signups")
        .update({
          confirmation_token: replacementToken,
          confirmation_sent_at: null,
          updated_at: now.toISOString(),
        })
        .eq("id", deliverable.id)
        .eq("status", "pending_confirmation")
        .eq("confirmation_token", deliverable.confirmation_token)
        .lt("confirmation_sent_at", confirmationCutoff)
        .select(SIGNUP_FIELDS)
        .maybeSingle();
      if (rotateError) throw new Error("signup_token_rotation_unavailable");
      deliverable = rotated as SignupRecord | null;
    } else if (deliverable?.confirmation_sent_at) {
      deliverable = null;
    }

    if (deliverable) {
      let delivered = false;
      try {
        delivered = await sendConfirmationEmail(deliverable.email, deliverable.confirmation_token);
      } catch {
        console.error("early-access confirmation delivery unavailable");
      }

      if (delivered) {
        const sentAt = new Date().toISOString();
        const { error: sentAtError } = await supabase
          .from("early_access_signups")
          .update({ confirmation_sent_at: sentAt, updated_at: sentAt })
          .eq("id", deliverable.id)
          .eq("status", "pending_confirmation")
          .eq("confirmation_token", deliverable.confirmation_token)
          .is("confirmation_sent_at", null);
        if (sentAtError) console.error("early-access confirmation receipt unavailable");
      }
    }

    // This response deliberately does not reveal whether the email was already on the list.
    return earlyAccessJson({ accepted: true }, 202);
  } catch {
    console.error("early-access signup storage unavailable");
    return earlyAccessJson(
      { error: "We could not save your place yet. Please try again shortly." },
      500,
    );
  }
}), env));
