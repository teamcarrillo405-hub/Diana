import { redirect } from "next/navigation";

import { loadProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { LmsConnections } from "./lms-connections";
import { ProfileCenter } from "./profile-center";
import {
  sanitizeLmsConnections,
  type PersistedLmsConnectionRow,
} from "./source-models";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const profile = await loadProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: lmsRows }, { data: classes }] = await Promise.all([
    supabase
      .from("lms_connections")
      .select("id, provider, config, last_synced_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("classes")
      .select("id, name, color")
      .eq("owner_id", user.id)
      .order("name", { ascending: true }),
  ]);
  const connections = sanitizeLmsConnections(
    (lmsRows ?? []) as PersistedLmsConnectionRow[],
  );

  const section = stringParam(params.section);
  const state = stringParam(params.sdState);
  if (section === "connections" || section === "connect" || state === "connections") {
    return (
      <LmsConnections
        initial={connections}
        courses={classes ?? []}
        connectOpen={section === "connect"}
      />
    );
  }

  return <ProfileCenter profile={profile} connections={connections} editable />;
}

function stringParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
