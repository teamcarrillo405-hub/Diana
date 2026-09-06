/**
 * Identifies the isolated loopback browser environment used by the beta gate.
 * Product behavior must never enable this outside the command-owned QA runtime.
 */
export function isIsolatedBetaBrowserRuntime(
  value = process.env.NEXT_PUBLIC_DIANA_BETA_BROWSER_QA,
): boolean {
  return value === "true";
}

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

type QaEnvironment = Record<string, string | undefined>;

function loopbackHttpUrl(value: string | undefined): URL | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname) ? url : null;
  } catch {
    return null;
  }
}

/**
 * Allows the synthetic auth bootstrap during a production-mode browser gate,
 * but only for the command-owned loopback server and its dedicated Supabase
 * instance. A freshly generated process-only token keeps this route closed in
 * an accidentally misconfigured deployment.
 */
export function isQaSessionBootstrapEnabled(
  request: Request,
  environment: QaEnvironment = process.env,
): boolean {
  if (environment.QA_CREATE_USER !== "true") return false;
  if (environment.NODE_ENV !== "production") return true;
  if (
    environment.QA_SERVER_MODE !== "production" ||
    environment.QA_LOCAL_BROWSER_GATE !== "true" ||
    !isIsolatedBetaBrowserRuntime(environment.NEXT_PUBLIC_DIANA_BETA_BROWSER_QA)
  ) {
    return false;
  }

  const token = environment.QA_BROWSER_SESSION_TOKEN;
  if (!token || token.length < 32 || request.headers.get("x-diana-beta-qa-session") !== token) {
    return false;
  }

  const requestUrl = loopbackHttpUrl(request.url);
  const baseUrl = loopbackHttpUrl(environment.QA_BASE_URL);
  const appUrl = loopbackHttpUrl(environment.NEXT_PUBLIC_APP_URL);
  const supabaseUrl = loopbackHttpUrl(environment.NEXT_PUBLIC_SUPABASE_URL);
  if (!requestUrl || !baseUrl || !appUrl || !supabaseUrl) return false;

  return (
    requestUrl.origin === baseUrl.origin &&
    appUrl.origin === baseUrl.origin &&
    supabaseUrl.origin !== baseUrl.origin
  );
}
