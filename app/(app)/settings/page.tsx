import { redirect } from "next/navigation";

import { loadProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

import { ProfileCenter } from "./profile-center";
import {
  sanitizeLmsConnections,
  type PersistedLmsConnectionRow,
} from "./source-models";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [profile, query, supabase] = await Promise.all([
    loadProfile(),
    searchParams ?? Promise.resolve<Record<string, string | string[] | undefined>>({}),
    createClient(),
  ]);
  if (!profile) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: lmsRows } = await supabase
    .from("lms_connections")
    .select("id, provider, config, last_synced_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const requestedSection = Array.isArray(query.section)
    ? query.section[0]
    : query.section;

  return (
    <ProfileCenter
      profile={profile}
      connections={sanitizeLmsConnections(
        (lmsRows ?? []) as PersistedLmsConnectionRow[],
      )}
      editable
      email={user.email ?? null}
      section={requestedSection ?? "profile"}
    />
  );
}
