import { redirect } from "next/navigation";

import { loadProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

import { ProfileCenter } from "./profile-center";
import type { GoalView } from "./goals-panel";
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

  const [{ data: lmsRows }, { data: goalRows }] = await Promise.all([
    supabase
      .from("lms_connections")
      .select("id, provider, config, last_synced_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("wellness_goals")
      .select("id, title, category, target_text, next_step")
      .eq("owner_id", user.id)
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

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
      goals={(goalRows ?? []).map((goal) => ({
        id: goal.id,
        title: goal.title,
        category: goal.category,
        targetText: goal.target_text,
        nextStep: goal.next_step,
      })) as GoalView[]}
    />
  );
}
