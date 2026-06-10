import Link from "next/link";
import { redirect } from "next/navigation";
import { displayNotificationPrefs, displayVerbosity } from "@/lib/privacy/export";
import { createClient } from "@/lib/supabase/server";
import { inventoryForUser } from "./actions";
import { PrivacyDashboard } from "./privacy-dashboard";

export default async function ExportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: classes }, { data: handoff }] = await Promise.all([
    supabase
      .from("profiles")
      .select("ai_verbosity_by_subject, notification_preferences")
      .eq("user_id", user.id)
      .single(),
    supabase.from("classes").select("id, name").eq("owner_id", user.id).order("name"),
    supabase.from("session_handoffs").select("route, updated_at").eq("owner_id", user.id).maybeSingle(),
  ]);

  const inventory = await inventoryForUser(user.id);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link href="/settings" className="text-xs text-muted hover:underline">
          Back to Settings
        </Link>
        <h1 className="text-display">Data and privacy</h1>
        <p className="text-sm text-muted">
          Export your data, tune privacy preferences, and manage account-level choices.
        </p>
      </header>
      <PrivacyDashboard
        inventory={inventory}
        notificationPrefs={displayNotificationPrefs(profile?.notification_preferences)}
        handoff={handoff ?? null}
        classes={(classes ?? []).map((klass) => ({
          id: klass.id,
          name: klass.name,
          verbosity: displayVerbosity(profile?.ai_verbosity_by_subject, klass.id),
        }))}
      />
    </div>
  );
}
