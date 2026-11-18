import { describe, expect, it } from "vitest";

import {
  issueLmsOAuthState,
  LMS_OAUTH_STATE_TTL_MS,
  verifyLmsOAuthState,
} from "./oauth-state";

const SECRET = "test-only-oauth-state-secret";
const OWNER_ID = "student-1";

function issueCanvas(now = Date.now()) {
  return issueLmsOAuthState({
    provider: "canvas",
    ownerId: OWNER_ID,
    secret: SECRET,
    now,
    context: {
      institutionId: "district-canvas",
      courseMode: false,
      returnTo: "/settings",
    },
  });
}

describe("LMS OAuth state", () => {
  it("binds the selected Calendar date, view and item in signed Google state", () => {
    const returnTo = "/calendar?day=2026-11-17&view=week&item=google-one";
    const issued = issueLmsOAuthState({ provider: "google_classroom", ownerId: OWNER_ID, secret: SECRET,
      context: { courseMode: false, calendar: true, returnTo } });
    const result = verifyLmsOAuthState({ state: issued.state, cookieVerifier: issued.cookieVerifier,
      provider: "google_classroom", authenticatedOwnerId: OWNER_ID, secret: SECRET });
    expect(result).toMatchObject({ ok: true, payload: { context: { returnTo } } });
  });
  it("verifies a signed state only with its initiating user and cookie verifier", () => {
    const issued = issueCanvas();

    const result = verifyLmsOAuthState({
      state: issued.state,
      cookieVerifier: issued.cookieVerifier,
      provider: "canvas",
      authenticatedOwnerId: OWNER_ID,
      secret: SECRET,
    });

    expect(result).toMatchObject({
      ok: true,
      payload: {
        provider: "canvas",
        context: {
          institutionId: "district-canvas",
          courseMode: false,
          returnTo: "/settings",
        },
      },
    });
    expect(issued.state).not.toContain(OWNER_ID);
    expect(issued.state).not.toBe(issued.cookieVerifier);
  });

  it("rejects a different authenticated Diana user", () => {
    const issued = issueCanvas();

    expect(verifyLmsOAuthState({
      state: issued.state,
      cookieVerifier: issued.cookieVerifier,
      provider: "canvas",
      authenticatedOwnerId: "student-2",
      secret: SECRET,
    })).toEqual({ ok: false, reason: "owner-mismatch" });
  });

  it("rejects expiry at the short-lived boundary", () => {
    const now = Date.now();
    const issued = issueCanvas(now);

    expect(verifyLmsOAuthState({
      state: issued.state,
      cookieVerifier: issued.cookieVerifier,
      provider: "canvas",
      authenticatedOwnerId: OWNER_ID,
      secret: SECRET,
      now: now + LMS_OAUTH_STATE_TTL_MS,
    })).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects malformed, tampered, cross-provider, and cookie-mismatched state", () => {
    const issued = issueCanvas();
    const replacement = issued.state.endsWith("A") ? "B" : "A";
    const tampered = `${issued.state.slice(0, -1)}${replacement}`;

    expect(verifyLmsOAuthState({
      state: "not-a-signed-state",
      cookieVerifier: issued.cookieVerifier,
      provider: "canvas",
      authenticatedOwnerId: OWNER_ID,
      secret: SECRET,
    })).toEqual({ ok: false, reason: "malformed" });
    expect(verifyLmsOAuthState({
      state: tampered,
      cookieVerifier: issued.cookieVerifier,
      provider: "canvas",
      authenticatedOwnerId: OWNER_ID,
      secret: SECRET,
    })).toEqual({ ok: false, reason: "invalid-signature" });
    expect(verifyLmsOAuthState({
      state: issued.state,
      cookieVerifier: issued.cookieVerifier,
      provider: "google_classroom",
      authenticatedOwnerId: OWNER_ID,
      secret: SECRET,
    })).toEqual({ ok: false, reason: "provider-mismatch" });
    expect(verifyLmsOAuthState({
      state: issued.state,
      cookieVerifier: "different-cookie-verifier",
      provider: "canvas",
      authenticatedOwnerId: OWNER_ID,
      secret: SECRET,
    })).toEqual({ ok: false, reason: "cookie-mismatch" });
  });
});
