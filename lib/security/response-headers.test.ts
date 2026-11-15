import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { contentSecurityPolicy, securityHeaders } from "./response-headers";

function connectSources(policy: string): string[] {
  const directive = policy.split("; ").find((value) => value.startsWith("connect-src "));
  if (!directive) throw new Error("Content Security Policy is missing connect-src.");
  return directive.split(" ").slice(1);
}

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

  it("permits only the controlled Realtime, Supabase, and pinned recognition connections", () => {
    const previousSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://diana-project.supabase.co/rest/v1";

    try {
      expect(connectSources(contentSecurityPolicy("n", true)).sort()).toEqual([
        "'self'",
        "https://api.openai.com",
        "https://diana-project.supabase.co",
        "https://huggingface.co",
        "https://cas-bridge.xethub.hf.co",
        "https://cdn-lfs.hf.co",
        "https://us.aws.cdn.hf.co",
      ].sort());
    } finally {
      if (previousSupabaseUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      else process.env.NEXT_PUBLIC_SUPABASE_URL = previousSupabaseUrl;
    }
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
