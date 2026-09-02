import {
  hydrateLmsConnectionCredentials,
  isCredentialVaultReady,
  persistLmsTokenRefresh,
  publicLmsConfig,
  saveLmsConnectionWithCredential,
  type CredentialStoreClient,
} from "@/lib/integrations/credential-vault";
import { createServiceClient } from "@/lib/supabase/service";
import {
  LmsCredentialVaultUnavailableError,
  LmsReconnectRequiredError,
} from "./errors";

type Env = Record<string, string | undefined>;
type CredentialProvider = "canvas" | "google_classroom";

export type LmsCredentialConnection = {
  id: string;
  provider: string;
  config: unknown;
};

type HydrateConnection = typeof hydrateLmsConnectionCredentials;
type VaultReady = typeof isCredentialVaultReady;

type HydrationOptions = {
  env?: Env;
  hydrate?: HydrateConnection;
  vaultReady?: VaultReady;
};

type AtomicConnectionStore = {
  rpc(name: string, args: Record<string, unknown>): Promise<{
    data: unknown;
    error: { message?: string } | null;
  }>;
};

type AtomicSave = (input: {
  ownerId: string;
  provider: CredentialProvider;
  config: Record<string, unknown>;
  accessToken: string;
  refreshToken?: string | null;
  connectionId?: string | null;
}) => Promise<{ id: string; atomic: true }>;

type SaveOptions = {
  atomicSave?: AtomicSave;
  env?: Env;
};

export function credentialVaultRequired(env: Env = process.env): boolean {
  return env.NODE_ENV !== "development";
}

function credentialProvider(provider: string): CredentialProvider | null {
  return provider === "canvas" || provider === "google_classroom" ? provider : null;
}

function configRecord(config: unknown): Record<string, unknown> {
  return config && typeof config === "object" && !Array.isArray(config)
    ? { ...(config as Record<string, unknown>) }
    : {};
}

function hasRefreshableCredential(provider: CredentialProvider, config: Record<string, unknown>): boolean {
  const accessToken = provider === "canvas" ? config.token : config.access_token;
  const refreshToken = config.refresh_token;
  return (typeof accessToken === "string" && accessToken.trim().length > 0)
    || (typeof refreshToken === "string" && refreshToken.trim().length > 0);
}

export async function assertLmsCredentialVaultAvailable(
  options: { env?: Env; vaultReady?: VaultReady } = {},
): Promise<void> {
  const env = options.env ?? process.env;
  if (!credentialVaultRequired(env)) return;
  try {
    const ready = await (options.vaultReady ?? isCredentialVaultReady)();
    if (!ready) throw new LmsCredentialVaultUnavailableError();
  } catch (error) {
    if (error instanceof LmsCredentialVaultUnavailableError) throw error;
    throw new LmsCredentialVaultUnavailableError({ cause: error });
  }
}

export async function hydrateLmsConnectionForRuntime<T extends LmsCredentialConnection>(
  ownerId: string,
  connection: T,
  options: HydrationOptions = {},
): Promise<T & { config: Record<string, unknown> }> {
  const env = options.env ?? process.env;
  const provider = credentialProvider(connection.provider);
  if (!provider) {
    return {
      ...connection,
      config: configRecord(connection.config),
    };
  }

  const strict = credentialVaultRequired(env);
  if (strict) {
    await assertLmsCredentialVaultAvailable({ env, vaultReady: options.vaultReady });
  }

  const input = strict
    ? { ...connection, config: publicLmsConfig(connection.config) }
    : connection;
  let hydrated: T & { config: Record<string, unknown> };
  try {
    hydrated = await (options.hydrate ?? hydrateLmsConnectionCredentials)(ownerId, input);
  } catch (error) {
    if (strict) throw new LmsCredentialVaultUnavailableError({ cause: error });
    throw error;
  }

  if (strict && !hasRefreshableCredential(provider, hydrated.config)) {
    throw new LmsReconnectRequiredError(provider);
  }
  return hydrated;
}

async function atomicSaveConnection(input: Parameters<AtomicSave>[0]): Promise<{ id: string; atomic: true }> {
  const store = createServiceClient() as unknown as AtomicConnectionStore | null;
  if (!store) throw new LmsCredentialVaultUnavailableError();
  const { data, error } = await store.rpc("upsert_integration_connection", {
    p_owner_id: input.ownerId,
    p_provider: input.provider,
    p_metadata: publicLmsConfig(input.config),
    p_access_token: input.accessToken,
    p_refresh_token: input.refreshToken ?? null,
    p_connection_id: input.connectionId ?? null,
  });
  if (error || typeof data !== "string") {
    throw new LmsCredentialVaultUnavailableError({ cause: error ?? undefined });
  }
  return { id: data, atomic: true };
}

export async function saveLmsConnectionForRuntime(
  userStore: CredentialStoreClient,
  input: Parameters<AtomicSave>[0],
  options: SaveOptions = {},
): Promise<{ id: string; atomic: boolean }> {
  const env = options.env ?? process.env;
  if (!credentialVaultRequired(env)) {
    return saveLmsConnectionWithCredential(userStore, input);
  }
  try {
    return await (options.atomicSave ?? atomicSaveConnection)(input);
  } catch (error) {
    if (error instanceof LmsCredentialVaultUnavailableError) throw error;
    throw new LmsCredentialVaultUnavailableError({ cause: error });
  }
}

export async function persistLmsTokenRefreshForRuntime(
  userStore: CredentialStoreClient,
  input: {
    ownerId: string;
    connection: LmsCredentialConnection;
    accessToken: string;
    expiresAt: string | null;
  },
  options: SaveOptions = {},
): Promise<void> {
  const provider = credentialProvider(input.connection.provider);
  if (!provider) return;
  const env = options.env ?? process.env;
  if (!credentialVaultRequired(env)) {
    await persistLmsTokenRefresh(userStore, input);
    return;
  }

  const currentConfig = configRecord(input.connection.config);
  await saveLmsConnectionForRuntime(userStore, {
    ownerId: input.ownerId,
    connectionId: input.connection.id,
    provider,
    config: {
      ...publicLmsConfig(currentConfig),
      expires_at: input.expiresAt,
    },
    accessToken: input.accessToken,
    refreshToken: typeof currentConfig.refresh_token === "string"
      ? currentConfig.refresh_token
      : null,
  }, options);
}
