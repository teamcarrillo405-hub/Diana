import Link from "next/link";
import type { ReactNode } from "react";
import { loadProfile } from "@/lib/profile";
import { SignOutButton } from "./sign-out";
import { AccessibilityPrefs } from "./accessibility-prefs";
import { AccentPicker } from "@/components/accent-picker";
import { ThemePicker } from "@/components/theme-picker";
import { IepImport } from "./iep-import";
import { PlayerPhoto } from "./player-photo";
import { AdaptationPanel } from "./adaptation-panel";
import { CanvaSection } from "./canva-section";
import { LmsConnections } from "./lms-connections";
import { SharingSection } from "./sharing-section";
import { PwaSettings } from "@/components/pwa-settings";
import { PushSettings } from "@/components/push-settings";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { labelsForInterests } from "@/lib/student-identity/interests";
import { Settings as Cog } from "lucide-react";
import { PageShell } from "../page-shell";

export default async function SettingsPage() {
  const profile = await loadProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: lmsConnections } = await supabase
    .from("lms_connections")
    .select("id, provider, config, last_synced_at")
    .order("created_at", { ascending: false });

  // Cross-device lobby photo, read from the owner's profile (RLS-scoped).
  const playerPhotoUrl: string | null = profile.photo_url ?? null;

  return (
    <PageShell
      active="More"
      eyebrow="System preferences"
      title="Settings"
      subtitle="Keep profile, reading support, school connections, and privacy controls in one calm place."
      accent="var(--gl-cyan)"
      icon={Cog}
    >
      <div className="nexus-settings-page space-y-8">
      <section className="nexus-settings-grid">
        <section className="nexus-panel nexus-panel-dense space-y-3">
          <span className="nexus-kicker">Student identity</span>
          <h2 className="text-xl font-semibold">Profile basics</h2>
          <div className="space-y-1">
            <Row label="Signed in as" value={user?.email ?? ""} />
            <Row label="Name" value={profile.display_name || "-"} />
            <Row label="Age group" value={formatAgeBracket(profile.age_bracket)} />
            <Row label="School year" value={profile.school_year ? String(profile.school_year) : "-"} />
            <Row label="Timezone" value={profile.timezone} />
          </div>
          <Link href="/onboarding" className="nexus-button nexus-button-ghost w-fit px-3 py-2 text-xs">
            Re-run onboarding
          </Link>
        </section>

        <section className="nexus-panel nexus-panel-dense space-y-3">
          <span className="nexus-kicker">Learning support</span>
          <h2 className="text-xl font-semibold">What Diana remembers</h2>
          <div className="space-y-1">
            <Row
              label="Diagnoses"
              value={profile.diagnoses?.length ? profile.diagnoses.map(formatDiagnosis).join(", ") : "none specified"}
            />
            <Row
              label="Accommodations"
              value={
                profile.accommodations?.length
                  ? profile.accommodations.map(formatAccommodation).join(", ")
                  : "none specified"
              }
            />
            <Row label="Extra time" value={profile.extra_time_pct > 0 ? `+${profile.extra_time_pct}%` : "none specified"} />
            <Row
              label="Interests"
              value={
                labelsForInterests(profile.interests).length
                  ? labelsForInterests(profile.interests).join(", ")
                  : "none specified"
              }
            />
          </div>
        </section>

        <section className="nexus-panel nexus-panel-dense space-y-4">
          <span className="nexus-kicker">Appearance</span>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Look and feel</h2>
            <ThemePicker />
          </div>
          <AccentPicker />
        </section>

        <PlayerPhoto initialPhoto={playerPhotoUrl} />
      </section>

      <section className="nexus-settings-stack">
        <SettingsDisclosure title="Reading controls" eyebrow="Accessibility">
          <AccessibilityPrefs initial={profile} />
        </SettingsDisclosure>

        <SettingsDisclosure title="How Diana adapts" eyebrow="Learning model">
          <AdaptationPanel />
        </SettingsDisclosure>

        <SettingsDisclosure title="School connections" eyebrow="Imports and LMS">
          <div className="space-y-4">
            <IepImport />
            <CanvaSection />
            <LmsConnections initial={(lmsConnections ?? []) as never} />
          </div>
        </SettingsDisclosure>

        <SettingsDisclosure title="Notifications and offline" eyebrow="Device tools">
          <div className="space-y-4">
            <PushSettings />
            <PwaSettings />
          </div>
        </SettingsDisclosure>

        <SettingsDisclosure title="Data, AI, and sharing" eyebrow="Privacy">
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="nexus-panel nexus-panel-dense space-y-2">
              <h2 className="text-sm font-semibold">Data and privacy</h2>
              <p className="text-sm text-muted">
                Export your data, tune AI style by class, manage notifications, and review privacy controls.
              </p>
              <Link href="/export" className="text-sm text-accent underline underline-offset-2 decoration-accent/50 hover:decoration-accent">
                Open data and privacy
              </Link>
            </section>

            <section className="nexus-panel nexus-panel-dense space-y-3">
              <h2 className="text-sm font-semibold">AI features</h2>
              <p className="text-sm text-muted">
                {profile.age_bracket === "under_13"
                  ? "AI features aren't available for under-13 accounts."
                  : profile.consent_ai
                    ? "AI features are on for this account."
                    : "AI features stay off until consent is enabled."}
              </p>
              <Link
                href="/settings/ai-history"
                className="text-sm text-accent underline underline-offset-2 decoration-accent/50 hover:decoration-accent"
              >
                Open AI history
              </Link>
            </section>
          </div>
          <SharingSection />
        </SettingsDisclosure>

        <section className="nexus-panel nexus-panel-dense flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="nexus-kicker">Account</span>
            <h2 className="mt-3 text-xl font-semibold">Session controls</h2>
          </div>
          <SignOutButton />
        </section>
      </section>
      </div>
    </PageShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="nexus-settings-row">
      <span className="text-muted">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function SettingsDisclosure({
  title,
  eyebrow,
  children,
  defaultOpen = false,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="nexus-settings-disclosure" open={defaultOpen}>
      <summary>
        <span>
          <small>{eyebrow}</small>
          <strong>{title}</strong>
        </span>
      </summary>
      <div className="nexus-settings-disclosure-body">{children}</div>
    </details>
  );
}

function formatAgeBracket(value: string | null): string {
  if (value === "13_to_17") return "13-17";
  if (value === "adult") return "18+";
  if (value === "under_13") return "under 13";
  return "-";
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
