import { redirect } from "next/navigation";

import { loadProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { ProfileCenter } from "../settings/profile-center";
import {
  sanitizeLmsConnections,
  type PersistedLmsConnectionRow,
} from "../settings/source-models";

export default async function MePage() {
  const profile = await loadProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: lmsRows } = await supabase
    .from("lms_connections")
    .select("id, provider, config, last_synced_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <ProfileCenter
      profile={profile}
      connections={sanitizeLmsConnections(
        (lmsRows ?? []) as PersistedLmsConnectionRow[],
      )}
      editable={false}
    />
  );
}
