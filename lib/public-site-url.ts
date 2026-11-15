const FALLBACK_PUBLIC_ORIGIN = "https://diana-umber.vercel.app";

type Environment = Record<string, string | undefined>;

function asHttpOrigin(value: string | undefined): string | null {
  const candidate = value?.trim();
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : null;
  } catch {
    return null;
  }
}

/**
 * Returns a safe public origin for build-time metadata and crawlable routes.
 * Vercel preview deployments can inherit an incomplete app URL, so fall back
 * to VERCEL_URL before the canonical public alias instead of failing a build.
 */
export function resolvePublicSiteUrl(environment: Environment = process.env): string {
  return (
    asHttpOrigin(environment.NEXT_PUBLIC_APP_URL) ??
    asHttpOrigin(environment.VERCEL_URL ? `https://${environment.VERCEL_URL}` : undefined) ??
    FALLBACK_PUBLIC_ORIGIN
  );
}
