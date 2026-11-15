import {
  fetchValidatedUrl,
  parseHttpsUrl,
  validateOutboundUrl,
  type ValidatedFetchPolicy,
} from "./outbound-url";
import { createHash } from "node:crypto";

export type CanvasInstitution = Readonly<{
  id: string;
  origin: string;
}>;

export type CanvasConnectionDestination = Readonly<{
  institution_id?: string | null;
  base_url?: string | null;
}>;

export class CanvasInstitutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CanvasInstitutionError";
  }
}

export async function resolveCanvasInstitutionFromRequest(
  requestedUrl: string,
): Promise<CanvasInstitution> {
  const requestedOrigin = parseHttpsUrl(requestedUrl).origin;
  const institution = canvasInstitutions().find((entry) => entry.origin === requestedOrigin);
  if (!institution) {
    throw new CanvasInstitutionError("This Canvas institution is not configured");
  }
  await validateOutboundUrl(institution.origin, { allowedOrigins: [institution.origin] });
  return institution;
}

export async function resolveCanvasInstitutionById(id: string): Promise<CanvasInstitution> {
  const institution = canvasInstitutions().find((entry) => entry.id === id);
  if (!institution) {
    throw new CanvasInstitutionError("This Canvas institution is not configured");
  }
  await validateOutboundUrl(institution.origin, { allowedOrigins: [institution.origin] });
  return institution;
}

export async function resolveCanvasConnectionDestination(
  config: CanvasConnectionDestination,
): Promise<CanvasInstitution> {
  if (config.institution_id) {
    const institution = await resolveCanvasInstitutionById(config.institution_id);
    if (config.base_url && parseHttpsUrl(config.base_url).origin !== institution.origin) {
      throw new CanvasInstitutionError("The saved Canvas destination does not match its institution");
    }
    return institution;
  }
  if (!config.base_url) {
    throw new CanvasInstitutionError("The Canvas connection has no configured institution");
  }
  return resolveCanvasInstitutionFromRequest(config.base_url);
}

export async function fetchCanvasDestination(
  institution: CanvasInstitution,
  input: string | URL,
  init: RequestInit = {},
  policy: Omit<ValidatedFetchPolicy, "allowedOrigins"> = {},
): Promise<Response> {
  return fetchValidatedUrl(input, init, {
    ...policy,
    allowedOrigins: [institution.origin],
  });
}

function canvasInstitutions(): CanvasInstitution[] {
  const configured: CanvasInstitution[] = [];
  const registryJson = process.env.CANVAS_INSTITUTIONS_JSON?.trim();
  if (registryJson) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(registryJson);
    } catch {
      throw new CanvasInstitutionError("CANVAS_INSTITUTIONS_JSON is not valid JSON");
    }
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      throw new CanvasInstitutionError("CANVAS_INSTITUTIONS_JSON must be an object keyed by institution ID");
    }
    for (const [id, value] of Object.entries(parsed)) {
      if (!/^[A-Za-z0-9_-]{1,64}$/u.test(id)) {
        throw new CanvasInstitutionError("Canvas institution IDs may contain letters, numbers, underscores, and hyphens");
      }
      const origin = typeof value === "string"
        ? value
        : value && typeof value === "object" && "origin" in value && typeof value.origin === "string"
          ? value.origin
          : null;
      if (!origin) {
        throw new CanvasInstitutionError(`Canvas institution ${id} needs an origin`);
      }
      configured.push({ id, origin: registryOrigin(origin) });
    }
  }

  const allowlist = process.env.CANVAS_ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];
  for (const origin of allowlist) {
    const normalizedOrigin = registryOrigin(origin);
    const originId = createHash("sha256").update(normalizedOrigin).digest("hex").slice(0, 24);
    configured.push({ id: `origin-${originId}`, origin: normalizedOrigin });
  }

  if (configured.length === 0) {
    throw new CanvasInstitutionError(
      "Configure CANVAS_INSTITUTIONS_JSON or CANVAS_ALLOWED_ORIGINS before connecting Canvas",
    );
  }

  const ids = new Set<string>();
  const origins = new Set<string>();
  for (const institution of configured) {
    if (ids.has(institution.id) || origins.has(institution.origin)) {
      throw new CanvasInstitutionError("Canvas institution IDs and origins must be unique");
    }
    ids.add(institution.id);
    origins.add(institution.origin);
  }
  return configured;
}

function registryOrigin(input: string): string {
  const url = parseHttpsUrl(input);
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new CanvasInstitutionError("Canvas registry entries must be exact origins without a path, query, or fragment");
  }
  return url.origin;
}
