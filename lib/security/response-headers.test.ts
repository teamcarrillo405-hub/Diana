import { describe, expect, it } from "vitest";

import { contentSecurityPolicy, securityHeaders } from "./response-headers";

describe("browser response hardening", () => {
  it("binds scripts to the request nonce and denies framing", () => {
    const headers = securityHeaders("nonce-value", true);

    expect(headers["Content-Security-Policy"]).toContain("'nonce-nonce-value'");
    expect(headers["Content-Security-Policy"]).toContain("script-src 'self'");
    expect(headers["Content-Security-Policy"]).not.toContain("'strict-dynamic'");
    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(headers["Referrer-Policy"]).toBe("same-origin");
    expect(headers["X-Frame-Options"]).toBe("DENY");
  });

  it("permits development evaluation only outside production", () => {
    expect(contentSecurityPolicy("n", false)).toContain("'unsafe-eval'");
    expect(contentSecurityPolicy("n", true)).not.toContain("'unsafe-eval'");
  });
});
