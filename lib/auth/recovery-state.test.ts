import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { issueRecoveryState, verifyRecoveryState, recoveryStateSecret, RECOVERY_TTL_SECONDS } from "./recovery-state";
const input = {
  userId: "synthetic-student",
  userRevision: "2026-11-17T00:00:00.000Z",
  accessToken: "synthetic-session",
  secret: "s".repeat(48),
  now: 100000,
  next: "/calendar?view=week"
};
const proof = () => issueRecoveryState(input);
describe("recovery authorization proof", () => {
  it("accepts the verified user and session for fifteen minutes", () => expect(verifyRecoveryState({
    ...input,
    value: proof(),
    now: 100001
  })).toEqual({
    next: "/calendar?view=week"
  }));
  it("rejects a replay after the authoritative password revision changes", () => {
    expect(verifyRecoveryState({...input,value:proof(),userRevision:"2026-11-17T00:01:00.000Z"})).toBeNull();
  });
  it("expires at the time limit", () => expect(verifyRecoveryState({
    ...input,
    value: proof(),
    now: input.now + RECOVERY_TTL_SECONDS * 1000
  })).toBeNull());
  it.each([{
    userId: "other-student"
  }, {
    accessToken: "other-session"
  }, {
    secret: "different-secret"
  }, {
    value: "malformed"
  }, {
    value: "x.y.z"
  }])("rejects altered authority %s", change => expect(verifyRecoveryState({
    ...input,
    value: proof(),
    ...change
  })).toBeNull());
  it("rejects signed proofs from another purpose", () => {
    const encoded = proof().split(".")[0];
    const signature = createHmac("sha256", input.secret).update("lms:oauth:" + encoded).digest("base64url");
    expect(verifyRecoveryState({
      ...input,
      value: encoded + "." + signature
    })).toBeNull();
  });
  it("does not serialize the bearer token", () => expect(Buffer.from(proof().split(".")[0], "base64url").toString()).not.toContain(input.accessToken));
  it("sanitizes the continue location", () => expect(verifyRecoveryState({
    ...input,
    value: issueRecoveryState({
      ...input,
      next: "//other.example"
    })
  })).toEqual({
    next: "/dashboard"
  }));
  it("requires an existing strong deployment secret", () => {
    expect(recoveryStateSecret({})).toBeNull();
    expect(recoveryStateSecret({
      LMS_OAUTH_STATE_SECRET: "short"
    })).toBeNull();
    expect(recoveryStateSecret({
      LMS_OAUTH_STATE_SECRET: input.secret
    })).toBe(input.secret);
  });
});
