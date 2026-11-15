export const BETA_RELEASE_SHA_PATTERN = /^[a-f0-9]{40}$/u;
const DIANA_PREVIEW_HOST_PATTERN =
  /^diana-[a-z0-9][a-z0-9-]*-teamcarrillo405-hubs-projects\.vercel\.app$/u;
const PRODUCTION_HOSTS = new Set([
  "diana-umber.vercel.app",
  "diana-teamcarrillo405-hubs-projects.vercel.app",
]);

export function validateBetaReleaseSha(value: string): string {
  if (!BETA_RELEASE_SHA_PATTERN.test(value)) {
    throw new Error("Release SHA must be one full lowercase 40-character commit SHA.");
  }
  return value;
}

export function validateBetaStagingUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Staging URL must be a valid URL.");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.port !== "" ||
    parsed.pathname !== "/" ||
    parsed.search !== "" ||
    parsed.hash !== "" ||
    parsed.origin !== value
  ) {
    throw new Error("Staging URL must be one exact HTTPS origin without credentials, port, or path.");
  }
  const hostname = parsed.hostname.toLowerCase();
  if (
    PRODUCTION_HOSTS.has(hostname) ||
    hostname.split(".")[0].split("-").some((part) => part === "prod" || part === "production") ||
    !DIANA_PREVIEW_HOST_PATTERN.test(hostname)
  ) {
    throw new Error("Staging URL must be a Diana Vercel preview deployment and cannot be production.");
  }
  return parsed.origin;
}

export function validateDisposableProviderOrigin(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Provider staging origin must be a valid URL.");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.port !== "" ||
    parsed.pathname !== "/" ||
    parsed.search !== "" ||
    parsed.hash !== "" ||
    parsed.origin !== value
  ) {
    throw new Error("Provider staging origin must be one exact HTTPS origin.");
  }
  const labels = parsed.hostname.toLowerCase().split(/[.-]/u);
  if (!labels.some((label) => ["beta", "sandbox", "staging", "test"].includes(label))) {
    throw new Error("Provider staging origin must identify a disposable beta, sandbox, staging, or test host.");
  }
  return parsed.origin;
}
