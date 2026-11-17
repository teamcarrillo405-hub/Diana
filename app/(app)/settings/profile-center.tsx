import { StudentShell } from "@/components/student-shell/student-shell";
import { CourseReviewLink } from "@/components/learning/course-review-link";
import styles from "@/components/student-shell/settings.module.css";
import { Clock3, SlidersHorizontal } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { AccentPicker } from "@/components/accent-picker";
import { PwaSettings } from "@/components/pwa-settings";
import { PushSettings } from "@/components/push-settings";
import { ThemePicker } from "@/components/theme-picker";
import { SchoolBrandingForm } from "@/components/school-branding-form";
import type { ProfilePrefs } from "@/lib/profile";
import { AccessibilityPrefs } from "./accessibility-prefs";
import { AdaptationPanel } from "./adaptation-panel";
import { GoalsPanel, type GoalView } from "./goals-panel";
import { AiHistoryExport } from "./ai-history-export";
import { CanvaSection } from "./canva-section";
import { IepImport } from "./iep-import";
import type { LmsConnectionView } from "./source-models";
import { profileSchoolYearLabel } from "./source-models";
import { LobbyBackgroundPicker } from "./lobby-background-picker";
import { PlayerPhoto } from "./player-photo";
import { ProfileCenterForm } from "./profile-center-form";
import { TutorPreferences } from "./tutor/tutor-preferences";
import { SignOutButton } from "./sign-out";

export function ProfileCenter({
  profile,
  connections,
  editable,
  email = null,
  section = "profile",
  goals = [],
}: {
  profile: ProfilePrefs;
  connections: readonly LmsConnectionView[];
  editable: boolean;
  email?: string | null;
  section?: string;
  goals?: readonly GoalView[];
}) {
  const displayName = profile.display_name?.trim() || "Student";
  const schoolLabel = profileSchoolYearLabel(profile.school_year);
  const safePhoto = profile.photo_url?.startsWith("data:image/") || profile.photo_url?.startsWith("/")
    ? profile.photo_url
    : null;


  return (
    <StudentShell active="More" className={styles.root} version="12" profile={{displayName,photoUrl:safePhoto,photoOffsetX:profile.photo_offset_x,photoOffsetY:profile.photo_offset_y}}>
      <SettingsShell
        profile={profile}
        connections={connections}
        editable={editable}
        email={email}
        section={section}
        safePhoto={safePhoto}
        displayName={displayName}
        schoolLabel={schoolLabel}
        goals={goals}
      />
    </StudentShell>
  );
}

type SettingsShellProps = {
  profile: ProfilePrefs;
  connections: readonly LmsConnectionView[];
  editable: boolean;
  email: string | null;
  section: string;
  safePhoto: string | null;
  displayName: string;
  schoolLabel: string;
  goals: readonly GoalView[];
};

const SETTINGS_RAIL = [
  {
    title: "Personal",
    items: [
      { section: "profile", label: "Profile", href: "/settings" },
      { section: "appearance", label: "Appearance", href: "/settings?section=appearance" },
      { section: "notifications", label: "Notifications", href: "/settings?section=notifications" },
      { section: "accessibility", label: "Accessibility", href: "/settings?section=accessibility" },
    ],
  },
  {
    title: "Diana",
    items: [
      { section: "goals", label: "Goals", href: "/settings?section=goals" },
      { section: "learning", label: "Learning supports", href: "/settings?section=learning" },
      { section: "tutor", label: "Diana coaching", href: "/settings?section=tutor" },
      
      { section: "ai", label: "AI & integrity", href: "/settings?section=ai" },
    ],
  },
  {
    title: "School",
    items: [
      { section: "connections", label: "Connections & IEP", href: "/settings?section=connections" },
      
    ],
  },
  {
    title: "Account",
    items: [
      
      { section: "sign-out", label: "Sign out", href: "/settings?section=sign-out" },
    ],
  },
] as const;

const SETTINGS_PROVIDER_LABEL: Readonly<Record<LmsConnectionView["provider"], string>> = {
  canvas: "Canvas",
  ics: "Calendar URL",
  google_classroom: "Google Classroom",
  clever: "Clever",
  gitlab: "GitLab",
};

function SettingsShell({
  profile,
  connections,
  editable,
  email,
  section,
  safePhoto,
  displayName,
  schoolLabel,
  goals,
}: SettingsShellProps) {
  const requested = section === "reading" ? "accessibility" : section === "study" ? "ai" : section === "learning-loop" ? "learning" : section;
  const activeSection = SETTINGS_RAIL.some(group => group.items.some(item => item.section === requested)) ? requested : "profile";
  const activeLabel = settingLabel(activeSection);

  return (
    <div className="sd-settings-desktop">
      <details className="sd-settings-mobile-sections">
        <summary>Settings: {activeLabel}</summary>
        <SettingsRail activeSection={activeSection} className="sd-settings-rail--mobile" />
      </details>
      <SettingsRail activeSection={activeSection} />

      <main id="main-content" className="sd-settings-workspace">
        {activeSection === "profile" ? (
          <article className="sd-settings-panel sd-settings-profile-card">
            <header className="sd-settings-panel-head">
              <div>
                <h1>Profile</h1>
                
              </div>
              {editable ? (
                <button className="sd-settings-save" type="submit" form="desktop-profile-center-form">
                  Save settings
                </button>
              ) : null}
            </header>

            <div className="sd-settings-profile-summary">
              <div className="sd-settings-profile-avatar">
                {safePhoto ? (
                  <Image src={safePhoto} width={92} height={92} unoptimized alt={displayName + " profile"} />
                ) : (
                  <span aria-label={displayName}>{displayName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div>
                <strong>{displayName}</strong>
                <span>{email ?? schoolLabel}</span>
              </div>
            </div>

            <div className="sd-settings-profile-fields">
              <ProfileCenterForm profile={profile} formId="desktop-profile-center-form" />
            </div>
            {editable ? (
              <details className="sd-settings-photo"><summary>Lobby photo</summary>
                <PlayerPhoto
                  initialPhoto={safePhoto}
                  initialOffsetX={profile.photo_offset_x ?? 50}
                  initialOffsetY={profile.photo_offset_y ?? 50}
                />
              </details>
            ) : null}


          </article>
        ) : null}

        {activeSection === "appearance" ? (
          <SettingsPanel title="Appearance">
            <ThemePicker />
            <AccentPicker />
            <LobbyBackgroundPicker />
            {editable ? <SchoolBrandingForm initialSchoolBranding={{
              schoolName: profile.school_name ?? null,
              primaryColor: profile.school_primary_color ?? null,
              secondaryColor: profile.school_secondary_color ?? null,
              logoDataUrl: profile.school_logo_url ?? null,
            }} /> : null}
          </SettingsPanel>
        ) : null}

        {activeSection === "notifications" ? (
          <SettingsPanel title="Notifications">
            <PushSettings />
            <PwaSettings />
          </SettingsPanel>
        ) : null}

        {activeSection === "accessibility" ? (
          <SettingsPanel title="Accessibility">
            {editable ? <AccessibilityPrefs initial={profile} /> : <ReadOnlySupport profile={profile} />}
          </SettingsPanel>
        ) : null}

        {activeSection === "learning" || activeSection === "learning-loop" ? (
          <SettingsPanel title="Learning supports">
            <AdaptationPanel />
          </SettingsPanel>
        ) : null}

        {activeSection === "tutor" ? <SettingsPanel title="Diana coaching"><TutorPreferences initial={{persona:profile.tutor_persona,style:profile.tutor_style,complexity:profile.tutor_complexity}} initialView="personalization" /></SettingsPanel> : null}

        {activeSection === "goals" ? (
          <SettingsPanel title="Goals">
            <GoalsPanel goals={goals} />
          </SettingsPanel>
        ) : null}

        {activeSection === "ai" ? (
          <SettingsPanel title="AI & integrity">
            <AiHistoryExport />
          </SettingsPanel>
        ) : null}

        {activeSection === "connections" ? (
          <SettingsPanel title="Connections & IEP">
            <section className="sd-settings-connection-block" id="school-materials" aria-labelledby="school-platforms-heading">
              <h2 id="school-platforms-heading">School platforms</h2>
              <p>Bring in classes, assignments, and due dates from your school account.</p>
              <div className="sd-settings-connection-list">
              {connections.length > 0 ? (
                connections.map((connection) => (
                  <div className="sd-settings-connection-row" key={connection.id}>
                    <div>
                      <strong>{SETTINGS_PROVIDER_LABEL[connection.provider]}</strong>
                      <p>{connection.message ?? (connection.schoolManaged ? "Managed by your school." : "Connected to Diana.")}</p>
                      <span className="sd-settings-connection-status" data-state={connection.state}>
                        {connection.state === "synced" ? "Connected and synced" : connection.state === "attention" ? "Needs attention" : "Connection set up"}
                      </span>
                    </div>
                    {connection.provider === "google_classroom" ? <span className="sd-settings-connection-actions">
                      {connection.calendarEnabled ? <Link href="/calendar">Google Calendar</Link> : null}
                      {connection.state === "attention" ? <Link href={connection.calendarEnabled
                        ? "/api/lms/google-oauth/start?calendar=1&return_to=/calendar"
                        : "/api/lms/google-oauth/start"}>{connection.calendarEnabled ? "Reconnect Google Calendar" : "Reconnect Google Classroom"}</Link> : null}
                    </span> : null}
                  </div>
                ))
              ) : (
                <div className="sd-settings-connection-row">
                  <div>
                    <strong>Learning platforms</strong>
                    <p>Connect Canvas LMS or Google Classroom to bring in your classes and due dates.</p>
                  </div>
                  <span className="sd-settings-connection-actions">
                    <Link href="/api/lms/canvas-oauth/start">Canvas LMS</Link>
                    <Link href="/api/lms/google-oauth/start">Classroom</Link>
                  </span>
                </div>
              )}
              </div>
            </section>
            {editable ? (
              <section className="sd-settings-connection-block" aria-labelledby="learning-supports-heading">
                <h2 id="learning-supports-heading">Learning supports</h2>
                <IepImport />
              </section>
            ) : null}
            {editable ? (
              <section className="sd-settings-connection-block" aria-labelledby="design-tools-heading">
                <h2 id="design-tools-heading">Design tools</h2>
                <CanvaSection />
              </section>
            ) : null}
          </SettingsPanel>
        ) : null}

        {activeSection === "sign-out" ? (
          <SettingsPanel title="Sign out">
            <div className="sd-settings-account-row">
              <div>
                <strong>Signed-in account</strong>
                <p>{email ?? displayName}</p>
              </div>
              <SignOutButton />
            </div>
          </SettingsPanel>
        ) : null}
      </main>
    </div>
  );
}

function SettingsRail({ activeSection, className = "" }: { activeSection: string; className?: string }) {
  return (
    <aside className={`sd-settings-rail ${className}`.trim()} aria-label="Settings sections">
      <CourseReviewLink />
      {SETTINGS_RAIL.map((group) => (
        <section className="sd-settings-rail-group" key={group.title}>
          <h2>{group.title}</h2>
          {group.items.map((item) => (
            <Link
              href={item.href}
              key={item.section}
              aria-current={activeSection === item.section ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </section>
      ))}
    </aside>
  );
}

function settingLabel(section: string): string {
  for (const group of SETTINGS_RAIL) {
    for (const item of group.items) {
      if (item.section === section) return item.label;
    }
  }
  return "Profile";
}

function SettingsPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="sd-settings-panel">
      <header className="sd-settings-panel-head">
        <div>
          <h1>{title}</h1>
        </div>
      </header>
      <div className="sd-settings-stack">{children}</div>
    </article>
  );
}

function ReadOnlySupport({ profile }: { profile: ProfilePrefs }) {
  return (
    <div>
      <p><SlidersHorizontal size={15} aria-hidden="true" /> Font size: {formatValue(profile.font_size)}</p>
      <p><Clock3 size={15} aria-hidden="true" /> Best study time: {formatValue(profile.study_schedule_preference)}</p>
    </div>
  );
}

function formatValue(value: string | null): string {
  return value ? value.replaceAll("_", " ") : "not set";
}
