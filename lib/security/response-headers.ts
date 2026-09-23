const BASE_HEADERS: Readonly<Record<string, string>> = Object.freeze({
  "Cross-Origin-Opener-Policy": "same-origin",
  "Permissions-Policy": "camera=(self), microphone=(self), geolocation=()",
  // `no-referrer` serializes the Origin header as `null` for HTML form POSTs,
  // which prevents Next.js from validating same-origin Server Actions.
  // `same-origin` keeps cross-site referrers private without breaking forms.
  "Referrer-Policy": "same-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
});

export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

export function contentSecurityPolicy(nonce: string, production: boolean): string {
  const supabaseOrigin = safeOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const connectSources = ["'self'", supabaseOrigin, production ? null : "ws://127.0.0.1:*"].filter(
    (source): source is string => Boolean(source),
  );
  const directives = [
    "default-src 'self'",
    // Next.js emits same-origin runtime chunks that are not consistently
    // nonce-tagged. Keep inline scripts nonce-bound while allowing those
    // external application chunks explicitly.
    `script-src 'self' 'nonce-${nonce}'${production ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSources.join(" ")}`,
    "media-src 'self' blob: https:",
    "worker-src 'self' blob:",
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  if (production) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

export function securityHeaders(nonce: string, production: boolean): Record<string, string> {
  return {
    ...BASE_HEADERS,
    "Content-Security-Policy": contentSecurityPolicy(nonce, production),
    ...(production
      ? { "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload" }
      : {}),
  };
}

function safeOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}
