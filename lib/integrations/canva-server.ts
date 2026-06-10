import { createClient } from "@/lib/supabase/server";
import { canvaEnv, refreshCanvaToken } from "./canva";

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
    .select("access_token, refresh_token, expires_at")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!connection) return null;

  const msLeft = new Date(connection.expires_at).getTime() - Date.now();
  if (msLeft > 60_000) return connection.access_token;

  const env = canvaEnv();
  if (!env) return null;
  try {
    const tokens = await refreshCanvaToken(env, connection.refresh_token);
    await supabase
      .from("canva_connections")
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("owner_id", user.id);
    return tokens.access_token;
  } catch {
    return null;
  }
}

export async function isCanvaConnected(supabase: ServerClient): Promise<boolean> {
  const { data } = await supabase.from("canva_connections").select("owner_id").maybeSingle();
  return data != null;
}
