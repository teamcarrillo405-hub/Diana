import { createServiceClient } from "@/lib/supabase/service";

export type CredentialProvider = "canvas" | "google_classroom" | "canva";
export type CredentialLmsProvider = Exclude<CredentialProvider, "canva">;

type VaultCredential = {
  access_token: string | null;
  refresh_token: string | null;
};

type LmsConnection = {
  id: string;
  provider: string;
  config: unknown;
};

export type CredentialStoreClient = {
  from(table: string): any;
};

type StoreClient = CredentialStoreClient & {
  rpc?: (name: string, args: Record<string, unknown>) => Promise<{
    data: unknown;
    error: { code?: string; message?: string } | null;
  }>;
};

export class TrustedCredentialContextError extends Error {
  constructor() {
    super("Trusted server credential context is not configured.");
    this.name = "TrustedCredentialContextError";
  }
}

function optionalTrustedStore(): StoreClient | null {
  return createServiceClient() as unknown as StoreClient | null;
}

function trustedStore(): StoreClient {
  const client = optionalTrustedStore();
  if (!client) throw new TrustedCredentialContextError();
  return client;
}

function isMissingVaultRelation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42P01"
    || error.code === "PGRST205"
    || /integration_credentials.*(?:does not exist|schema cache)/iu.test(error.message ?? "");
}

function isMissingAtomicRpc(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42883"
    || error.code === "PGRST202"
    || /upsert_integration_connection.*(?:does not exist|schema cache|could not find)/iu.test(error.message ?? "");
}

function configRecord(config: unknown): Record<string, unknown> {
  return config && typeof config === "object" && !Array.isArray(config)
    ? { ...(config as Record<string, unknown>) }
    : {};
}

function legacyLmsConfig(
  provider: CredentialLmsProvider,
  config: unknown,
  accessToken: string,
  refreshToken?: string | null,
): Record<string, unknown> {
  const legacy = configRecord(config);
  if (provider === "canvas") legacy.token = accessToken;
  else legacy.access_token = accessToken;
  if (refreshToken !== undefined) legacy.refresh_token = refreshToken;
  return legacy;
}

export function publicLmsConfig(config: unknown): Record<string, unknown> {
  const publicConfig = configRecord(config);
  delete publicConfig.token;
  delete publicConfig.access_token;
  delete publicConfig.refresh_token;
  return publicConfig;
}

async function readCredential(
  ownerId: string,
  provider: CredentialProvider,
  credentialKey: string,
): Promise<{ vaultReady: boolean; credential: VaultCredential | null }> {
  const store = trustedStore();
  const { data, error } = await store
    .from("integration_credentials")
    .select("access_token, refresh_token")
    .eq("owner_id", ownerId)
    .eq("provider", provider)
    .eq("credential_key", credentialKey)
    .maybeSingle();
  if (isMissingVaultRelation(error)) return { vaultReady: false, credential: null };
  if (error) throw new Error("Credential vault read was not available.");
  return { vaultReady: true, credential: data as VaultCredential | null };
}

export async function isCredentialVaultReady(): Promise<boolean> {
  const store = trustedStore();
  const { error } = await store.from("integration_credentials").select("id").limit(1);
  if (isMissingVaultRelation(error)) return false;
  if (error) throw new Error("Credential vault status could not be verified.");
  return true;
}

export async function hydrateLmsConnectionCredentials<T extends LmsConnection>(
  ownerId: string,
  connection: T,
): Promise<T & { config: Record<string, unknown> }> {
  const legacyConfig = configRecord(connection.config);
  if (connection.provider !== "canvas" && connection.provider !== "google_classroom") {
    return { ...connection, config: legacyConfig };
  }

  const result = await readCredential(ownerId, connection.provider, connection.id);
  if (!result.vaultReady || !result.credential) {
    return { ...connection, config: legacyConfig };
  }

  const config = publicLmsConfig(legacyConfig);
  if (connection.provider === "canvas") config.token = result.credential.access_token;
  else config.access_token = result.credential.access_token;
  config.refresh_token = result.credential.refresh_token;
  return { ...connection, config };
}

async function atomicConnectionWrite(input: {
  ownerId: string;
  provider: CredentialProvider;
  metadata: Record<string, unknown> | null;
  accessToken: string;
  refreshToken?: string | null;
  connectionId?: string | null;
}): Promise<string | null> {
  const store = optionalTrustedStore();
  if (!store?.rpc) return null;
  const { data, error } = await store.rpc("upsert_integration_connection", {
    p_owner_id: input.ownerId,
    p_provider: input.provider,
    p_metadata: input.metadata,
    p_access_token: input.accessToken,
    p_refresh_token: input.refreshToken ?? null,
    p_connection_id: input.connectionId ?? null,
  });
  if (isMissingAtomicRpc(error)) return null;
  if (error || typeof data !== "string") {
    throw new Error("Connection and credential could not be saved atomically.");
  }
  return data;
}

async function legacyLmsWrite(
  userStore: CredentialStoreClient,
  input: {
    ownerId: string;
    provider: CredentialLmsProvider;
    config: Record<string, unknown>;
    connectionId?: string | null;
  },
): Promise<string> {
  const existingResult = await userStore
    .from("lms_connections")
    .select("id")
    .eq("owner_id", input.ownerId)
    .eq("provider", input.provider)
    .limit(1)
    .maybeSingle();
  if (existingResult.error) throw new Error("Connection metadata could not be read.");

  const existingId = (existingResult.data as { id?: string } | null)?.id;
  if (existingId) {
    const { data, error } = await userStore
      .from("lms_connections")
      .update({ config: input.config })
      .eq("id", existingId)
      .eq("owner_id", input.ownerId)
      .select("id")
      .single();
    if (error || !data?.id) throw new Error("Connection metadata could not be updated.");
    return data.id as string;
  }

  const { data, error } = await userStore
    .from("lms_connections")
    .insert({
      ...(input.connectionId ? { id: input.connectionId } : {}),
      owner_id: input.ownerId,
      provider: input.provider,
      config: input.config,
    })
    .select("id")
    .single();
  if (error || !data?.id) throw new Error("Connection metadata could not be created.");
  return data.id as string;
}

export async function saveLmsConnectionWithCredential(
  userStore: CredentialStoreClient,
  input: {
    ownerId: string;
    provider: CredentialLmsProvider;
    config: Record<string, unknown>;
    accessToken: string;
    refreshToken?: string | null;
    connectionId?: string | null;
  },
): Promise<{ id: string; atomic: boolean }> {
  const publicConfig = publicLmsConfig(input.config);
  const atomicId = await atomicConnectionWrite({
    ownerId: input.ownerId,
    provider: input.provider,
    metadata: publicConfig,
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    connectionId: input.connectionId,
  });
  if (atomicId) return { id: atomicId, atomic: true };

  const id = await legacyLmsWrite(userStore, {
    ownerId: input.ownerId,
    provider: input.provider,
    config: legacyLmsConfig(
      input.provider,
      publicConfig,
      input.accessToken,
      input.refreshToken,
    ),
    connectionId: input.connectionId,
  });
  return { id, atomic: false };
}

export async function storeLmsCredential(input: {
  ownerId: string;
  connectionId: string;
  provider: CredentialLmsProvider;
  accessToken: string;
  refreshToken?: string | null;
}): Promise<boolean> {
  const id = await atomicConnectionWrite({
    ownerId: input.ownerId,
    provider: input.provider,
    metadata: null,
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    connectionId: input.connectionId,
  });
  return id !== null;
}

export async function persistLmsTokenRefresh(
  userStore: CredentialStoreClient,
  input: {
    ownerId: string;
    connection: LmsConnection;
    accessToken: string;
    expiresAt: string | null;
  },
): Promise<void> {
  if (input.connection.provider !== "canvas" && input.connection.provider !== "google_classroom") return;
  const config = {
    ...publicLmsConfig(input.connection.config),
    expires_at: input.expiresAt,
  };
  await saveLmsConnectionWithCredential(userStore, {
    ownerId: input.ownerId,
    connectionId: input.connection.id,
    provider: input.connection.provider,
    config,
    accessToken: input.accessToken,
    refreshToken: configRecord(input.connection.config).refresh_token as string | null | undefined,
  });
}

export async function readCanvaCredential(
  ownerId: string,
): Promise<{ vaultReady: boolean; credential: VaultCredential | null }> {
  const vault = await readCredential(ownerId, "canva", "primary");
  if (vault.credential) return vault;

  const store = trustedStore();
  const { data, error } = await store
    .from("canva_connections")
    .select("access_token, refresh_token")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) return vault;
  return { vaultReady: vault.vaultReady, credential: data as VaultCredential | null };
}

export async function saveCanvaConnectionWithCredential(
  userStore: CredentialStoreClient,
  input: {
    ownerId: string;
    accessToken: string;
    refreshToken?: string | null;
    expiresAt: string;
    scope?: string | null;
  },
): Promise<{ atomic: boolean }> {
  const metadata = { expires_at: input.expiresAt, scope: input.scope ?? null };
  const atomicId = await atomicConnectionWrite({
    ownerId: input.ownerId,
    provider: "canva",
    metadata,
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
  });
  if (atomicId) return { atomic: true };

  const { error } = await userStore.from("canva_connections").upsert({
    owner_id: input.ownerId,
    access_token: input.accessToken,
    refresh_token: input.refreshToken,
    expires_at: input.expiresAt,
    scope: input.scope ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error("Canva connection could not be saved.");
  return { atomic: false };
}

export async function storeCanvaCredential(input: {
  ownerId: string;
  accessToken: string;
  refreshToken?: string | null;
}): Promise<boolean> {
  const id = await atomicConnectionWrite({
    ownerId: input.ownerId,
    provider: "canva",
    metadata: null,
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
  });
  return id !== null;
}
