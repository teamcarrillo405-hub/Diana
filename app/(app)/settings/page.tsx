import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, age_bracket, consent_ai, timezone")
    .eq("user_id", user!.id)
    .single();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Settings</h1>
      </header>

      <section className="space-y-2 rounded-xl border border-border bg-card p-4">
        <Row label="Signed in as" value={user!.email ?? ""} />
        <Row label="Name" value={profile?.display_name || "—"} />
        <Row
          label="Age group"
          value={
            profile?.age_bracket === "13_to_17"
              ? "13–17"
              : profile?.age_bracket === "adult"
              ? "18+"
              : profile?.age_bracket === "under_13"
              ? "under 13"
              : "—"
          }
        />
        <Row label="Timezone" value={profile?.timezone ?? "—"} />
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">AI features</h2>
        <p className="text-sm text-muted">
          {profile?.age_bracket === "under_13"
            ? "AI features aren't available for under-13 accounts."
            : profile?.consent_ai
            ? "You've consented to AI features."
            : "You haven't consented to AI features yet. They stay off until you do."}
        </p>
        <p className="text-xs text-muted">
          The features list at{" "}
          <Link href="/" className="text-accent underline-offset-2 hover:underline">
            /
          </Link>{" "}
          shows what's available in this slice and what's coming.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Account</h2>
        <SignOutButton />
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
