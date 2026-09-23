const DEVELOPMENT_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3100",
  "http://127.0.0.1:3100",
];

const TEAM_VERCEL_PREVIEW_SUFFIX = /^-[a-z0-9](?:[a-z0-9-]{0,55}[a-z0-9])?\.vercel\.app$/u;
const DIANA_PREVIEW_DEPLOYMENT_PREFIX = /^diana-[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u;

type EnvReader = (name: string) => string | undefined;

function defaultEnv(name: string): string | undefined {
  const runtime = globalThis as typeof globalThis & {
    Deno?: { env?: { get?: (key: string) => string | undefined } };
  };
  return runtime.Deno?.env?.get?.(name) ?? undefined;
}

export function isProductionEnvironment(env: EnvReader = defaultEnv): boolean {
  return [env("DIANA_ENV"), env("ENVIRONMENT"), env("NODE_ENV")]
    .some((value) => value?.trim().toLowerCase() === "production") ||
    Boolean(env("DENO_DEPLOYMENT_ID")?.trim());
}

export function configuredDianaOrigins(env: EnvReader = defaultEnv): Set<string> {
  const configured = env("DIANA_ALLOWED_ORIGINS")
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];

  if (configured.length > 0) return new Set(configured);
  return isProductionEnvironment(env) ? new Set() : new Set(DEVELOPMENT_ORIGINS);
}

export function configuredDianaPreviewHostSuffix(env: EnvReader = defaultEnv): string | null {
  const configured = env("DIANA_ALLOWED_PREVIEW_HOST_SUFFIX")?.trim();
  return configured && TEAM_VERCEL_PREVIEW_SUFFIX.test(configured) ? configured : null;
}

export function isAllowedDianaOrigin(origin: string, env: EnvReader = defaultEnv): boolean {
  if (configuredDianaOrigins(env).has(origin)) return true;
  const previewHostSuffix = configuredDianaPreviewHostSuffix(env);
  if (!previewHostSuffix) return false;

  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  const deploymentPrefix = parsed.hostname.endsWith(previewHostSuffix)
    ? parsed.hostname.slice(0, -previewHostSuffix.length)
    : "";
  const firstLabel = parsed.hostname.split(".", 1)[0] ?? "";
  return parsed.protocol === "https:"
    && parsed.origin === origin
    && !parsed.port
    && !parsed.username
    && !parsed.password
    && firstLabel.length <= 63
    && DIANA_PREVIEW_DEPLOYMENT_PREFIX.test(deploymentPrefix);
}

function appendVaryOrigin(headers: Headers): void {
  const values = (headers.get("Vary") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!values.some((value) => value.toLowerCase() === "origin")) values.push("Origin");
  headers.set("Vary", values.join(", "));
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function withStudentCors(
  handler: (request: Request) => Response | Promise<Response>,
  env: EnvReader = defaultEnv,
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const allowedOrigins = configuredDianaOrigins(env);
    const previewHostSuffix = configuredDianaPreviewHostSuffix(env);
    if (allowedOrigins.size === 0 && !previewHostSuffix) {
      const response = jsonError("Allowed Diana origins are not configured.", 503);
      appendVaryOrigin(response.headers);
      return response;
    }

    const origin = request.headers.get("Origin");
    if (origin && !isAllowedDianaOrigin(origin, env)) {
      const response = jsonError("Origin not allowed.", 403);
      appendVaryOrigin(response.headers);
      return response;
    }

    if (request.method === "OPTIONS") {
      if (!origin) {
        const response = jsonError("Origin required.", 400);
        appendVaryOrigin(response.headers);
        return response;
      }
      const headers = new Headers({
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Max-Age": "86400",
      });
      appendVaryOrigin(headers);
      return new Response(null, { status: 204, headers });
    }

    const response = await handler(request);
    const headers = new Headers(response.headers);
    headers.delete("Access-Control-Allow-Origin");
    headers.delete("Access-Control-Allow-Credentials");
    if (origin) headers.set("Access-Control-Allow-Origin", origin);
    appendVaryOrigin(headers);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}
