import { readFileSync } from "node:fs";
import { join } from "node:path";
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

  it("keeps the nonce theme script hydration-safe", () => {
    const layout = readFileSync(join(process.cwd(), "app/layout.tsx"), "utf8");
    const nonceIndex = layout.indexOf("nonce={nonce}");
    const suppressionIndex = layout.indexOf("suppressHydrationWarning", layout.indexOf("<script"));

    expect(nonceIndex).toBeGreaterThan(-1);
    expect(suppressionIndex).toBeGreaterThan(-1);
    expect(suppressionIndex).toBeLessThan(nonceIndex);
  });
  it("permits development evaluation only outside production", () => {
    expect(contentSecurityPolicy("n", false)).toContain("'unsafe-eval'");
    expect(contentSecurityPolicy("n", true)).not.toContain("'unsafe-eval'");
  });

  it("permits the controlled OpenAI Realtime WebRTC connection", () => {
    expect(contentSecurityPolicy("n", true)).toContain("connect-src 'self' https://api.openai.com");
  });
  it("permits same-origin WASM and pinned public model downloads without remote script execution",()=>{
    const policy=contentSecurityPolicy("n",true);
    expect(policy).toContain("'wasm-unsafe-eval'");expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).toContain("https://huggingface.co");expect(policy).toContain("https://cas-bridge.xethub.hf.co");
    expect(policy).toContain("https://us.aws.cdn.hf.co");
    const script=policy.split(";").find(part=>part.trim().startsWith("script-src"));
    expect(script).not.toContain("https:");expect(policy).toContain("worker-src 'self' blob:");
  });
});
