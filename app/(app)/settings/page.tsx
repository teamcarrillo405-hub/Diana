import Link from "next/link";
import { loadProfile } from "@/lib/profile";
import { SignOutButton } from "./sign-out";
import { AccessibilityPrefs } from "./accessibility-prefs";
import { AccentPicker } from "@/components/accent-picker";
import { ThemePicker } from "@/components/theme-picker";
import { IepImport } from "./iep-import";
import { AdaptationPanel } from "./adaptation-panel";
import { CanvaSection } from "./canva-section";
import { LmsConnections } from "./lms-connections";
import { SharingSection } from "./sharing-section";
import { PwaSettings } from "@/components/pwa-settings";
import { PushSettings } from "@/components/push-settings";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { labelsForInterests } from "@/lib/student-identity/interests";

export default async function SettingsPage() {
  const profile = await loadProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Settings</h1>
      </header>

      <section className="space-y-2 rounded-xl border border-border bg-card p-4">
        <Row label="Signed in as" value={user?.email ?? ""} />
        <Row label="Name" value={profile.display_name || "—"} />
        <Row
          label="Age group"
          value={
            profile.age_bracket === "13_to_17"
              ? "13–17"
              : profile.age_bracket === "adult"
              ? "18+"
              : profile.age_bracket === "under_13"
              ? "under 13"
              : "—"
          }
        />
        <Row label="School year" value={profile.school_year ? String(profile.school_year) : "—"} />
        <Row label="Timezone" value={profile.timezone} />
      </section>

      <section className="space-y-2 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Your profile</h2>
        <Row
          label="Diagnoses on file"
          value={
            profile.diagnoses?.length
              ? profile.diagnoses.map(formatDiagnosis).join(", ")
              : "none specified"
          }
        />
        <Row
          label="Accommodations"
          value={
            profile.accommodations?.length
              ? profile.accommodations.map(formatAccommodation).join(", ")
              : "none specified"
          }
        />
        {profile.extra_time_pct > 0 && (
          <Row label="Extra time" value={`+${profile.extra_time_pct}%`} />
        )}
        <Row
          label="Interests"
          value={
            labelsForInterests(profile.interests).length
              ? labelsForInterests(profile.interests).join(", ")
              : "none specified"
          }
        />
        <p className="pt-2 text-xs text-muted">
          <Link href="/onboarding" className="text-accent underline underline-offset-2 decoration-accent/50 hover:decoration-accent">
            Re-run onboarding
          </Link>{" "}
          to update.
        </p>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted">Appearance</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm">Theme</span>
          <ThemePicker />
        </div>
        <AccentPicker />
      </section>

      <AdaptationPanel />

      <AccessibilityPrefs initial={profile} />

      <IepImport />

      <CanvaSection />

      <PushSettings />

      <PwaSettings />

      <section className="space-y-2 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Data and privacy</h2>
        <p className="text-sm text-muted">
          Export your data, tune AI style by class, manage notifications, and review privacy controls.
        </p>
        <Link href="/export" className="text-sm text-accent underline underline-offset-2 decoration-accent/50 hover:decoration-accent">
          Open data and privacy
        </Link>
      </section>

      {await (async () => {
        const { data } = await supabase
          .from("lms_connections")
          .select("id, provider, config, last_synced_at")
          .order("created_at", { ascending: false });
        return <LmsConnections initial={(data ?? []) as never} />;
      })()}

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">AI features</h2>
        <p className="text-sm text-muted">
          {profile.age_bracket === "under_13"
            ? "AI features aren't available for under-13 accounts."
            : profile.consent_ai
            ? "You've consented to AI features."
            : "You haven't consented to AI features yet. They stay off until you do."}
        </p>
        <p className="text-xs text-muted">
          The features list at{" "}
          <Link href="/" className="text-accent underline underline-offset-2 decoration-accent/50 hover:decoration-accent">
            /
          </Link>{" "}
          shows what's available in this slice and what's coming.
        </p>
      </section>

      <section className="space-y-2 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">AI history</h2>
        <p className="text-sm text-muted">
          See every time Diana used AI for you. Download it any time.
        </p>
        <Link href="/settings/ai-history" className="text-sm text-accent underline underline-offset-2 decoration-accent/50 hover:decoration-accent">
          Open AI history →
        </Link>
      </section>

      <SharingSection />

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

function formatDiagnosis(d: string): string {
  return ({
    adhd: "ADHD",
    dyslexia: "Dyslexia",
    dyscalculia: "Dyscalculia",
    dysgraphia: "Dysgraphia",
    asd: "ASD",
    anxiety: "Anxiety",
    other: "Other",
    none: "None",
  } as Record<string, string>)[d] ?? d;
}

function formatAccommodation(a: string): string {
  return ({
    extended_time: "Extended time",
    reduced_quantity: "Reduced quantity",
    alternate_format: "Alternate format",
    reader: "Reader",
    scribe: "Scribe",
    breaks: "Breaks",
    quiet_setting: "Quiet setting",
    other: "Other",
  } as Record<string, string>)[a] ?? a;
}
