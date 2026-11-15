import {
  BETA_LMS_CLEANUP_ACK,
  BETA_LMS_CLEANUP_SCHEMA_VERSION,
  type BetaLmsCleanupInspection,
  type BetaLmsCleanupPlanAction,
  type BetaLmsCleanupProviderWorker,
  type BetaLmsCleanupProviderWorkers,
  type BetaLmsCleanupRemovalResult,
} from "./lms-cleanup";

const CLEANUP_WORKER_PATH = "/v1/beta-lms-cleanup";
const REQUEST_TIMEOUT_MS = 20_000;

type FetchLike = typeof fetch;

export interface BetaLmsCleanupHttpWorkerOptions {
  endpoint: string;
  token: string;
  fetchImpl?: FetchLike;
}

function assertWorkerEndpoint(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("The protected LMS cleanup worker URL is invalid.");
  }
  if (
    url.protocol !== "https:"
    || url.username !== ""
    || url.password !== ""
    || url.search !== ""
    || url.hash !== ""
    || url.pathname.replace(/\/$/u, "") !== CLEANUP_WORKER_PATH
  ) {
    throw new Error("The protected LMS cleanup worker must use the fixed HTTPS endpoint path.");
  }
  url.pathname = CLEANUP_WORKER_PATH;
  return url;
}

function assertWorkerToken(value: string): string {
  const token = value.trim();
  if (token.length < 32 || token.length > 4096 || /\s/u.test(token)) {
    throw new Error("The protected LMS cleanup worker credential is unavailable.");
  }
  return token;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseInspection(value: unknown): BetaLmsCleanupInspection {
  if (
    !isRecord(value)
    || !["present", "absent", "unknown"].includes(String(value.state))
    || !["canvas", "google_classroom"].includes(String(value.provider))
    || typeof value.providerResourceId !== "string"
    || typeof value.resourceTag !== "string"
    || !(value.parentResourceId === null || typeof value.parentResourceId === "string")
    || !(value.bindingDigest === null || typeof value.bindingDigest === "string")
  ) {
    throw new Error("The protected LMS cleanup worker returned an invalid inspection.");
  }
  return value as unknown as BetaLmsCleanupInspection;
}

function parseRemoval(value: unknown): BetaLmsCleanupRemovalResult {
  if (
    !isRecord(value)
    || !["removed", "already_absent", "unknown"].includes(String(value.outcome))
    || !(
      value.providerReceiptReference === undefined
      || value.providerReceiptReference === null
      || typeof value.providerReceiptReference === "string"
    )
  ) {
    throw new Error("The protected LMS cleanup worker returned an invalid removal result.");
  }
  return value as unknown as BetaLmsCleanupRemovalResult;
}

function createProviderWorker(
  provider: BetaLmsCleanupPlanAction["provider"],
  options: Required<Pick<BetaLmsCleanupHttpWorkerOptions, "endpoint" | "token">>
    & { fetchImpl: FetchLike },
): BetaLmsCleanupProviderWorker {
  const endpoint = assertWorkerEndpoint(options.endpoint);
  const token = assertWorkerToken(options.token);

  async function callWorker(
    operation: "inspect" | "remove",
    resource: BetaLmsCleanupPlanAction,
    context?: { idempotencyKey: string; acknowledgement: typeof BETA_LMS_CLEANUP_ACK },
  ): Promise<unknown> {
    if (resource.provider !== provider) {
      throw new Error("The cleanup action does not match its protected provider worker.");
    }
    const response = await options.fetchImpl(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Diana-Cleanup-Operation": operation,
        "X-Diana-Idempotency-Key": resource.idempotencyKey,
      },
      body: JSON.stringify({
        schemaVersion: BETA_LMS_CLEANUP_SCHEMA_VERSION,
        operation,
        provider,
        resource,
        context: context ?? null,
      }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error("The protected LMS cleanup worker did not accept the request.");
    }
    try {
      return await response.json();
    } catch {
      throw new Error("The protected LMS cleanup worker returned invalid JSON.");
    }
  }

  return {
    async inspect(resource) {
      return parseInspection(await callWorker("inspect", resource));
    },
    async remove(resource, context) {
      if (context.acknowledgement !== BETA_LMS_CLEANUP_ACK) {
        throw new Error("The exact disposable cleanup acknowledgement is required.");
      }
      return parseRemoval(await callWorker("remove", resource, context));
    },
  };
}

export function createBetaLmsCleanupHttpWorkers(
  options: BetaLmsCleanupHttpWorkerOptions,
): BetaLmsCleanupProviderWorkers {
  const normalized = {
    endpoint: options.endpoint,
    token: options.token,
    fetchImpl: options.fetchImpl ?? fetch,
  };
  return {
    canvas: createProviderWorker("canvas", normalized),
    google_classroom: createProviderWorker("google_classroom", normalized),
  };
}

export function createBetaLmsCleanupHttpWorkersFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): BetaLmsCleanupProviderWorkers {
  const endpoint = environment.DIANA_BETA_LMS_CLEANUP_WORKER_URL?.trim();
  const token = environment.DIANA_BETA_LMS_CLEANUP_WORKER_TOKEN?.trim();
  if (!endpoint || !token) {
    throw new Error("Protected LMS cleanup worker configuration is required for apply mode.");
  }
  return createBetaLmsCleanupHttpWorkers({ endpoint, token });
}
