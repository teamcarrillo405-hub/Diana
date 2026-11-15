import { createClient } from "@/lib/supabase/server";
import { canvaEnv, refreshCanvaToken } from "./canva";
import {
  readCanvaCredential,
  saveCanvaConnectionWithCredential,
} from "./credential-vault";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * The signed-in student's valid Canva access token, refreshing when it's
 * within a minute of expiry. Null means not connected (or setup missing) —
 * callers degrade to their unconnected state, never an error surface.
 */
export async function getValidCanvaToken(supabase: ServerClient): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: connection } = await supabase
    .from("canva_connections")
    .select("expires_at, scope")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!connection) return null;

  const vault = await readCanvaCredential(user.id);
  let credential = vault.credential;
  if (!vault.vaultReady) {
    const { data: legacy } = await (supabase as any)
      .from("canva_connections")
      .select("access_token, refresh_token")
      .eq("owner_id", user.id)
      .maybeSingle();
    credential = legacy ?? null;
  }
  if (!credential?.access_token) return null;

  const msLeft = new Date(connection.expires_at).getTime() - Date.now();
  if (msLeft > 60_000) return credential.access_token;

  const env = canvaEnv();
  if (!env || !credential.refresh_token) return null;
  try {
    const tokens = await refreshCanvaToken(env, credential.refresh_token);
    await saveCanvaConnectionWithCredential(supabase, {
      ownerId: user.id,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      scope: tokens.scope ?? connection.scope,
    });
    return tokens.access_token;
  } catch {
    return null;
  }
}

export async function isCanvaConnected(supabase: ServerClient): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("canva_connections")
    .select("owner_id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!data) return false;
  try {
    const vault = await readCanvaCredential(user.id);
    return vault.vaultReady
      ? Boolean(vault.credential?.access_token || vault.credential?.refresh_token)
      : true;
  } catch {
    return false;
  }
}
