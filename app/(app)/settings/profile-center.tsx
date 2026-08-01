import {
  Bot,
  Camera,
  ChevronRight,
  Clock3,
  Image as ImageIcon,
  Link2,
  Palette,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { AccentPicker } from "@/components/accent-picker";
import { PwaSettings } from "@/components/pwa-settings";
import { PushSettings } from "@/components/push-settings";
import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { SourceMedia } from "@/components/screen-design/source-media";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import { StudentDesktopNav } from "@/components/screen-design/student-desktop-nav";
import { ThemePicker } from "@/components/theme-picker";
import type { ProfilePrefs } from "@/lib/profile";
import { AccessibilityPrefs } from "./accessibility-prefs";
import { AdaptationPanel } from "./adaptation-panel";
import { CanvaSection } from "./canva-section";
import { IepImport } from "./iep-import";
import type { LmsConnectionView } from "./source-models";
import { profileSchoolYearLabel } from "./source-models";
import { LobbyBackgroundPicker } from "./lobby-background-picker";
import { PlayerPhoto } from "./player-photo";
import { ProfileCenterForm } from "./profile-center-form";
import { SharingSection } from "./sharing-section";
import { SignOutButton } from "./sign-out";

const PROFILE_STYLES = `
  .diana-authenticated-field:has(.sd-profile-center) { padding-bottom:0!important; }
  .app-command-frame:has(.sd-profile-center) { padding:0!important; }
  .app-command-frame:has(.sd-profile-center) .diana-mobile-command,
  .diana-app-shell:has(.sd-profile-center) .agent-fab-anchor { display:none!important; }
  .diana-app:has(.sd-profile-center) nextjs-portal { display:none!important; }
  .diana-app:has(.sd-profile-center) .skip-link { transition:none; }
  .diana-app:has(.sd-profile-center) .skip-link:focus { transform:translateY(0)!important; }
  .sd-profile-center { position:relative; display:flex; height:max(100dvh,852px); max-height:max(100dvh,852px); flex-direction:column; overflow:hidden; background:#0f172a; color:#f8fafc; font-family:ui-sans-serif,system-ui,sans-serif; }
  .sd-profile-header { display:flex; flex:none; align-items:center; justify-content:space-between; border-bottom:1px solid rgb(255 255 255/.05); padding:54px 24px 16px; }
  .sd-profile-header .sd-source-wordmark { height:20px; width:auto; }
  .sd-profile-close { display:grid; width:40px; height:40px; place-items:center; border:1px solid rgb(255 255 255/.1); border-radius:999px; background:rgb(255 255 255/.04); color:#cbd5e1; }
  .sd-profile-scroll { min-height:0; flex:1; overflow-y:auto; padding:26px 24px 112px; scrollbar-width:none; }
  .sd-profile-identity { display:grid; justify-items:center; text-align:center; }
  .sd-profile-avatar-wrap { position:relative; width:128px; height:128px; border:4px solid #74c0ff; border-radius:999px; background:#1e293b; padding:5px; box-shadow:0 0 28px rgb(116 192 255/.14); }
  .sd-profile-avatar-wrap .sd-source-media,.sd-profile-avatar-wrap>img { width:100%; height:100%; border-radius:999px; object-fit:cover; }
  .sd-profile-camera { position:absolute; right:-4px; bottom:-3px; display:grid; width:42px; height:42px; place-items:center; border:2px solid #0f172a; border-radius:999px; background:#111c33; color:#74c0ff; }
  .sd-profile-name { margin:18px 0 0; color:#f8fafc; font-size:27px; font-style:italic; font-weight:950; letter-spacing:-.05em; line-height:1; text-transform:uppercase; }
  .sd-profile-meta { margin:7px 0 0; color:#7185a8; font-size:9px; font-weight:950; letter-spacing:.25em; text-transform:uppercase; }
  .sd-profile-save { min-height:32px; margin-top:12px; border:1px solid rgb(116 192 255/.35); border-radius:999px; background:rgb(116 192 255/.1); padding:7px 14px; color:#74c0ff; font:inherit; font-size:9px; font-style:italic; font-weight:950; text-transform:uppercase; }
  .sd-profile-section { margin-top:28px; }
  .sd-profile-section h2 { margin:0 0 14px 8px; color:#7185a8; font-size:10px; font-weight:950; letter-spacing:.18em; text-transform:uppercase; }
  .sd-profile-personalize { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
  .sd-profile-personalize a { display:flex; min-height:82px; flex-direction:column; align-items:center; justify-content:center; gap:9px; border:1px solid rgb(255 255 255/.1); border-radius:16px; background:rgb(255 255 255/.04); color:#f8fafc; font-size:9px; font-weight:950; text-align:center; text-decoration:none; text-transform:uppercase; }
  .sd-profile-personalize svg { color:#74c0ff; }
  .sd-profile-system { display:grid; gap:8px; }
  .sd-profile-system-row { display:grid; grid-template-columns:42px minmax(0,1fr) 18px; align-items:center; gap:13px; min-height:70px; border-radius:16px; background:#1b263d; padding:12px 16px; color:#f8fafc; text-decoration:none; }
  .sd-profile-system-icon { display:grid; width:42px; height:42px; place-items:center; border-radius:12px; background:rgb(255 255 255/.05); color:#74c0ff; }
  .sd-profile-system-row h3 { margin:0; font-size:12px; font-style:italic; font-weight:950; text-transform:uppercase; }
  .sd-profile-system-row p { overflow:hidden; margin:4px 0 0; color:#7890b5; font-size:9px; text-overflow:ellipsis; text-transform:uppercase; white-space:nowrap; }
  .sd-profile-system-row>svg { color:#64748b; }
  .sd-profile-details { border:1px solid rgb(255 255 255/.1); border-radius:14px; background:rgb(255 255 255/.04); }
  .sd-profile-details + .sd-profile-details { margin-top:9px; }
  .sd-profile-details>summary { cursor:pointer; padding:14px; color:#f8fafc; font-size:10px; font-weight:950; text-transform:uppercase; }
  .sd-profile-details-body { display:grid; gap:14px; border-top:1px solid rgb(255 255 255/.08); padding:14px; }
  .sd-profile-form fieldset { display:grid; gap:11px; margin:0; padding:0; border:0; }
  .sd-profile-form label:not(.sd-profile-check) { display:grid; gap:5px; color:#94a3b8; font-size:9px; font-weight:900; text-transform:uppercase; }
  .sd-profile-form input,.sd-profile-form select { width:100%; min-width:0; border:1px solid rgb(255 255 255/.1); border-radius:9px; background:#0b1325; padding:9px 10px; color:#f8fafc; font:inherit; font-size:10px; }
  .sd-profile-check { display:flex; align-items:center; gap:8px; color:#cbd5e1; font-size:10px; }
  .sd-profile-check input { width:auto; }
  .sd-profile-form-message { border-radius:9px; background:rgb(116 192 255/.08); padding:9px; color:#bfdbfe; font-size:10px; }
  .sd-profile-form-message[data-tone=warn] { background:rgb(251 191 36/.08); color:#fde68a; }
  .sd-profile-signout { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:18px; border-top:1px solid rgb(255 255 255/.08); padding-top:16px; }
  .sd-profile-signout p { margin:0; color:#94a3b8; font-size:10px; }
  .sd-profile-signout button { border-color:rgb(255 255 255/.12)!important; background:rgb(255 255 255/.04)!important; color:#cbd5e1!important; }
  .sd-profile-quick { position:absolute; right:24px; bottom:88px; z-index:5; display:grid; width:58px; height:58px; place-items:center; border-radius:16px; background:linear-gradient(135deg,#74c0ff,#ff79da); color:#0f172a; box-shadow:0 12px 28px rgb(45 212 191/.2); }
  .sd-profile-center>.sd-student-bottom-nav { position:relative; flex:none; }
  .sd-profile-center a:focus-visible,.sd-profile-center button:focus-visible,.sd-profile-center input:focus-visible,.sd-profile-center select:focus-visible,.sd-profile-center summary:focus-visible { outline:2px solid #74c0ff; outline-offset:3px; }
  .sd-settings-desktop,.sd-profile-center>.sd-student-desktop-nav { display:none; }
  @media (min-width:1100px) {
    .sd-profile-center { height:auto; max-height:none; min-height:100dvh; overflow:visible; background:radial-gradient(circle at 88% 6%,rgb(242 95 176 / .08),transparent 28%),#0b1428; font-family:"Barlow Semi Condensed",ui-sans-serif,system-ui,sans-serif; }
    .sd-profile-center>.sd-student-desktop-nav { display:block; flex:none; }
    .sd-profile-center>.sd-profile-header,.sd-profile-center>.sd-profile-scroll,.sd-profile-center>.sd-profile-quick,.sd-profile-center>.sd-student-bottom-nav { display:none; }
    .sd-settings-desktop { display:grid; width:1000px; margin:0 auto; padding:34px 0 70px; grid-template-columns:190px minmax(0,1fr); gap:32px; align-items:start; }
    .sd-settings-rail { padding-top:28px; }
    .sd-settings-rail-group { margin-bottom:18px; }
    .sd-settings-rail-group h2 { margin:0 0 7px; padding:0 10px; color:#7d88ad; font-size:11px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; }
    .sd-settings-rail-group a { display:block; min-height:36px; margin-bottom:4px; border:1px solid transparent; border-radius:8px; padding:9px 10px; color:#aab8e0; font-size:14px; font-weight:650; line-height:1.1; text-decoration:none; }
    .sd-settings-rail-group a:hover { border-color:#74c0ff; background:#e0f2fe; color:#0f172a; }
    .sd-settings-rail-group a[aria-current=page] { border-color:#74c0ff; background:#e0f2fe; color:#0f172a; }
    .sd-settings-workspace { min-width:0; }
    .sd-settings-panel { border:1px solid #cbd5e1; border-radius:8px; background:#fff; padding:26px 28px; color:#0f172a; box-shadow:0 8px 22px rgb(2 6 23 / .12); }
    .sd-settings-profile-card { border-style:dashed; border-color:#94a3b8; background:#f4efe6; }
    .sd-settings-panel-head { display:flex; align-items:flex-start; justify-content:space-between; gap:20px; margin-bottom:24px; }
    .sd-settings-panel-head h1 { margin:0 0 5px; color:#0f172a; font-size:24px; font-style:italic; font-weight:950; letter-spacing:-.03em; line-height:1; text-transform:uppercase; }
    .sd-settings-panel-head p { max-width:46ch; margin:0; color:#475569; font-size:14px; line-height:1.45; }
    .sd-settings-save { display:inline-flex; min-height:42px; clip-path:none!important; align-items:center; justify-content:center; border:1px solid #74c0ff; border-radius:8px; background:#e0f2fe; padding:0 16px; color:#0f172a; cursor:pointer; font:inherit; font-size:13px; font-weight:800; letter-spacing:.04em; text-transform:uppercase; white-space:nowrap; }
    .sd-settings-profile-summary { display:grid; grid-template-columns:92px minmax(0,1fr); gap:22px; align-items:center; }
    .sd-settings-profile-avatar { width:92px; height:92px; overflow:hidden; border:3px solid rgb(41 208 255 / .55); border-radius:999px; background:linear-gradient(135deg,#29d0ff,#1a6cff); box-shadow:0 0 24px rgb(41 208 255 / .18); }
    .sd-settings-profile-avatar img,.sd-settings-profile-avatar .sd-source-media { width:100%; height:100%; object-fit:cover; }
    .sd-settings-profile-summary strong { display:block; color:#0f172a; font-size:21px; font-weight:800; }
    .sd-settings-profile-summary>span:last-child>span { display:block; margin-top:3px; color:#64748b; font-size:12.5px; }
    .sd-settings-profile-fields { margin-top:24px; padding-top:20px; border-top:1px solid #cbd5e1; }
    .sd-settings-profile-fields .sd-profile-form fieldset { display:block; }
    .sd-settings-profile-fields .sd-profile-form label:not(:first-child),.sd-settings-profile-fields .sd-profile-check { display:none; }
    .sd-settings-profile-fields .sd-profile-form label:first-child { display:grid; max-width:320px; gap:7px; color:#0f172a; font-size:11px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; }
    .sd-settings-profile-fields .sd-profile-form input { border:1px solid #cbd5e1; border-radius:8px; background:#fff; padding:11px 14px; color:#0f172a; font-size:14px; }
    .sd-settings-profile-fields .sd-profile-form-message { max-width:480px; background:#ecfeff; color:#0f766e; }
    .sd-settings-photo { margin-top:20px; }
    .sd-settings-photo .diana-panel { overflow:visible!important; border:0!important; background:transparent!important; padding:0!important; box-shadow:none!important; clip-path:none!important; }
    .sd-settings-photo .diana-panel::before,.sd-settings-photo .diana-panel::after { display:none!important; }
    .sd-settings-photo input[type=file],.sd-settings-photo .diana-panel>div>div:first-child { display:none!important; }
    .sd-settings-photo .diana-kicker,.sd-settings-photo .diana-panel>h2,.sd-settings-photo .diana-panel>p:not([role=status]) { display:none; }
    .sd-settings-photo .diana-button { min-height:36px; border-radius:8px!important; clip-path:none!important; }
    .sd-settings-photo .diana-button-primary { border:1px solid #74c0ff!important; background:#e0f2fe!important; color:#0f172a!important; }
    .sd-settings-photo .diana-button-ghost { border:1px solid #cbd5e1!important; background:#fff!important; color:#0f172a!important; }
    .sd-settings-stack { display:grid; gap:18px; }
    .sd-settings-stack>.diana-panel,.sd-settings-stack>section { border:0!important; background:transparent!important; box-shadow:none!important; }
    .sd-settings-panel a { color:#0f5b78; }
    .sd-settings-account-row { display:flex; align-items:center; justify-content:space-between; gap:24px; border-top:1px solid #cbd5e1; padding-top:18px; }
    .sd-settings-account-row:first-of-type { border-top:0; padding-top:0; }
    .sd-settings-account-row strong { display:block; font-size:15px; }
    .sd-settings-account-row p { margin:4px 0 0; color:#64748b; font-size:13px; }
    .sd-settings-account-row a { display:inline-flex; min-height:38px; align-items:center; border:1px solid #74c0ff; border-radius:8px; background:#e0f2fe; padding:0 13px; color:#0f172a; font-weight:800; text-decoration:none; text-transform:uppercase; }
  }
`;

export function ProfileCenter({
  profile,
  connections,
  editable,
  email = null,
  section = "profile",
}: {
  profile: ProfilePrefs;
  connections: readonly LmsConnectionView[];
  editable: boolean;
  email?: string | null;
  section?: string;
}) {
  const displayName = profile.display_name?.trim() || "Student";
  const schoolLabel = profileSchoolYearLabel(profile.school_year);
  const syncedConnections = connections.filter((connection) => connection.state === "synced").length;
  const safePhoto = profile.photo_url?.startsWith("data:image/") || profile.photo_url?.startsWith("/")
    ? profile.photo_url
    : null;


  return (
    <ScreenDesignViewport className="sd-profile-center" aria-label="Profile and settings">
      <style>{PROFILE_STYLES}</style>
      <StudentDesktopNav
        active="More"
        displayName={displayName}
        photoUrl={safePhoto}
        photoOffsetX={profile.photo_offset_x}
        photoOffsetY={profile.photo_offset_y}
      />
      <DesktopSettings
        profile={profile}
        connections={connections}
        editable={editable}
        email={email}
        section={section}
        safePhoto={safePhoto}
        displayName={displayName}
        schoolLabel={schoolLabel}
      />
      <header className="sd-profile-header">
        <DianaWordmark />
        <Link href="/dashboard" className="sd-profile-close" aria-label="Close settings">
          <X size={18} aria-hidden="true" />
        </Link>
      </header>

      <main className="sd-profile-scroll">
        <section className="sd-profile-identity" aria-labelledby="profile-name">
          <div className="sd-profile-avatar-wrap">
            {safePhoto ? (
              <Image src={safePhoto} width={112} height={112} unoptimized alt={`${displayName} profile`} />
            ) : (
              <SourceMedia assetId="student-profile-avatar" width={112} height={112} alt={`${displayName} profile`} priority />
            )}
            <Link href="#profile-photo" className="sd-profile-camera" aria-label="Change profile photo">
              <Camera size={17} aria-hidden="true" />
            </Link>
          </div>
          <h1 id="profile-name" className="sd-profile-name">{displayName}</h1>
          <p className="sd-profile-meta">Student account · {schoolLabel}</p>
          {editable ? (
            <button className="sd-profile-save" type="submit" form="profile-center-form">
              Save settings
            </button>
          ) : null}
        </section>

        <section className="sd-profile-section" aria-labelledby="personalization-heading">
          <h2 id="personalization-heading">Personalization</h2>
          <div className="sd-profile-personalize">
            <Link href="#appearance-controls"><Palette size={21} aria-hidden="true" />Change theme</Link>
            <Link href="#background-controls"><ImageIcon size={21} aria-hidden="true" />Backgrounds</Link>
          </div>
        </section>

        <section className="sd-profile-section" aria-labelledby="system-settings-heading">
          <h2 id="system-settings-heading">System settings</h2>
          <div className="sd-profile-system">
            <SystemRow href="/settings/tutor" icon={Bot} title="AI Tutor Profile" detail={`Persona: ${formatValue(profile.tutor_persona)}`} />
            <SystemRow href="/settings?section=connections#connections" icon={Link2} title="LMS Sync" detail={connections.length ? `${syncedConnections} synced · ${connections.length} saved` : "No platform connected"} />
            <SystemRow href="/export" icon={ShieldCheck} title="Privacy Hub" detail={privacyDetail(profile.privacy_preferences)} />
          </div>
        </section>

        <section className="sd-profile-section" aria-labelledby="all-settings-heading">
          <h2 id="all-settings-heading">All settings</h2>
          {editable ? (
            <details className="sd-profile-details">
              <summary>Profile and onboarding values</summary>
              <div className="sd-profile-details-body"><ProfileCenterForm profile={profile} /></div>
            </details>
          ) : null}
          <details className="sd-profile-details" id="appearance-controls">
            <summary>Theme and accent</summary>
            <div className="sd-profile-details-body"><ThemePicker /><AccentPicker /></div>
          </details>
          <details className="sd-profile-details" id="background-controls">
            <summary>Lobby background</summary>
            <div className="sd-profile-details-body"><LobbyBackgroundPicker /></div>
          </details>
          <details className="sd-profile-details" id="profile-photo">
            <summary>Profile photo</summary>
            <div className="sd-profile-details-body">
              {editable ? <PlayerPhoto initialPhoto={safePhoto} initialOffsetX={profile.photo_offset_x ?? 50} initialOffsetY={profile.photo_offset_y ?? 50} /> : <p>Profile photo changes are available in Settings.</p>}
            </div>
          </details>
          <details className="sd-profile-details">
            <summary>Reading and accessibility</summary>
            <div className="sd-profile-details-body">{editable ? <AccessibilityPrefs initial={profile} /> : <ReadOnlySupport profile={profile} />}</div>
          </details>
          <details className="sd-profile-details">
            <summary>Learning model</summary>
            <div className="sd-profile-details-body">{editable ? <AdaptationPanel /> : <p>Diana uses the support choices saved on this profile.</p>}</div>
          </details>
          {editable ? (
            <details className="sd-profile-details">
              <summary>School imports</summary>
              <div className="sd-profile-details-body"><IepImport /><CanvaSection /></div>
            </details>
          ) : null}
          <details className="sd-profile-details">
            <summary>Privacy and sharing</summary>
            <div className="sd-profile-details-body">
              <Link href="/export">Open data and privacy controls</Link>
              {editable ? <SharingSection /> : <p>Sharing links remain private until created from Settings.</p>}
            </div>
          </details>
          {editable ? (
            <details className="sd-profile-details">
              <summary>Notifications and offline</summary>
              <div className="sd-profile-details-body"><PushSettings /><PwaSettings /></div>
            </details>
          ) : null}
          <div className="sd-profile-signout">
            <p>{editable ? "Signed-in account controls" : "End this session when you are finished."}</p>
            <SignOutButton />
          </div>
        </section>
      </main>

      <Link href="/quick-add" className="sd-profile-quick" aria-label="Quick add"><Plus size={28} aria-hidden="true" /></Link>
      <StudentBottomNav />
    </ScreenDesignViewport>
  );
}

type DesktopSettingsProps = {
  profile: ProfilePrefs;
  connections: readonly LmsConnectionView[];
  editable: boolean;
  email: string | null;
  section: string;
  safePhoto: string | null;
  displayName: string;
  schoolLabel: string;
};

const SETTINGS_RAIL = [
  {
    title: "Personal",
    items: [
      { section: "profile", label: "Profile", href: "/settings" },
      { section: "appearance", label: "Appearance", href: "/settings?section=appearance" },
      { section: "notifications", label: "Notifications", href: "/settings?section=notifications" },
      { section: "accessibility", label: "Accessibility", href: "/settings?section=accessibility" },
      { section: "reading", label: "Reading & speech", href: "/settings?section=reading" },
    ],
  },
  {
    title: "Diana",
    items: [
      { section: "learning", label: "Do the work", href: "/settings?section=learning" },
      { section: "study", label: "Study", href: "/settings?section=study" },
      { section: "ai", label: "AI & integrity", href: "/settings?section=ai" },
    ],
  },
  {
    title: "School",
    items: [
      { section: "connections", label: "Connections & IEP", href: "/settings?section=connections" },
      { section: "learning-loop", label: "Learning loop", href: "/settings?section=learning-loop" },
    ],
  },
  {
    title: "Account",
    items: [
      { section: "export", label: "Export & privacy", href: "/export" },
      { section: "sign-out", label: "Sign out", href: "/settings?section=sign-out" },
    ],
  },
] as const;

function DesktopSettings({
  profile,
  connections,
  editable,
  email,
  section,
  safePhoto,
  displayName,
  schoolLabel,
}: DesktopSettingsProps) {
  const activeSection = section || "profile";

  return (
    <div className="sd-settings-desktop">
      <aside className="sd-settings-rail" aria-label="Settings sections">
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

      <main className="sd-settings-workspace">
        {activeSection === "profile" ? (
          <article className="sd-settings-panel sd-settings-profile-card">
            <header className="sd-settings-panel-head">
              <div>
                <h1>Profile</h1>
                <p>Update the details Diana uses to recognize you.</p>
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
                  <SourceMedia assetId="student-profile-avatar" width={92} height={92} alt={displayName + " profile"} />
                )}
              </div>
              <div>
                <strong>{displayName}</strong>
                <span>{email ?? schoolLabel}</span>
              </div>
            </div>

            {editable ? (
              <div className="sd-settings-photo">
                <PlayerPhoto
                  initialPhoto={safePhoto}
                  initialOffsetX={profile.photo_offset_x ?? 50}
                  initialOffsetY={profile.photo_offset_y ?? 50}
                />
              </div>
            ) : null}

            <div className="sd-settings-profile-fields">
              <ProfileCenterForm profile={profile} formId="desktop-profile-center-form" />
            </div>
          </article>
        ) : null}

        {activeSection === "appearance" ? (
          <SettingsPanel title="Appearance" description="Personalize the lobby and reading surface on this account.">
            <ThemePicker />
            <AccentPicker />
            <LobbyBackgroundPicker />
          </SettingsPanel>
        ) : null}

        {activeSection === "notifications" ? (
          <SettingsPanel title="Notifications" description="Choose which useful updates Diana can send to this device.">
            <PushSettings />
            <PwaSettings />
          </SettingsPanel>
        ) : null}

        {activeSection === "accessibility" ? (
          <SettingsPanel title="Accessibility" description="Adjust the reading experience without changing your schoolwork.">
            {editable ? <AccessibilityPrefs initial={profile} /> : <ReadOnlySupport profile={profile} />}
          </SettingsPanel>
        ) : null}

        {activeSection === "reading" ? (
          <SettingsPanel title="Reading & speech" description="Keep reading support and speech preferences in one place.">
            <ReadOnlySupport profile={profile} />
            <div className="sd-settings-account-row">
              <div>
                <strong>Reading controls</strong>
                <p>Use Accessibility to change font size, spacing, and reading support.</p>
              </div>
              <Link href="/settings?section=accessibility">Open</Link>
            </div>
          </SettingsPanel>
        ) : null}

        {activeSection === "learning" || activeSection === "learning-loop" ? (
          <SettingsPanel title={activeSection === "learning" ? "Do the work" : "Learning loop"} description="Tune how Diana supports planning, focus, and adaptation.">
            <AdaptationPanel />
          </SettingsPanel>
        ) : null}

        {activeSection === "study" ? (
          <SettingsPanel title="Study" description="Review pacing and weekly study goals live with the study tools.">
            <div className="sd-settings-account-row">
              <div>
                <strong>Study goals</strong>
                <p>Set review targets and adjust them as the week changes.</p>
              </div>
              <Link href="/settings/goals">Open</Link>
            </div>
            <div className="sd-settings-account-row">
              <div>
                <strong>Flashcards</strong>
                <p>Open saved review decks and spaced practice.</p>
              </div>
              <Link href="/flashcards">Open</Link>
            </div>
          </SettingsPanel>
        ) : null}

        {activeSection === "ai" ? (
          <SettingsPanel title="AI & integrity" description="Control coaching support and keep a record of AI activity.">
            <div className="sd-settings-account-row">
              <div>
                <strong>AI activity export</strong>
                <p>Email yourself the last 45 days of AI activity.</p>
              </div>
              <Link href="/export#ai-history-export">Email me</Link>
            </div>
          </SettingsPanel>
        ) : null}

        {activeSection === "sign-out" ? (
          <SettingsPanel title="Sign out" description="End this Diana session on the current device.">
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

function SettingsPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <article className="sd-settings-panel">
      <header className="sd-settings-panel-head">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </header>
      <div className="sd-settings-stack">{children}</div>
    </article>
  );
}

function SystemRow({ href, icon: Icon, title, detail }: { href: string; icon: typeof Sparkles; title: string; detail: string }) {
  return (
    <Link href={href} className="sd-profile-system-row">
      <span className="sd-profile-system-icon"><Icon size={20} aria-hidden="true" /></span>
      <span><h3>{title}</h3><p>{detail}</p></span>
      <ChevronRight size={17} aria-hidden="true" />
    </Link>
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

function privacyDetail(value: ProfilePrefs["privacy_preferences"]): string {
  if (!value || Array.isArray(value) || typeof value !== "object") return "Secure exports and controls";
  const count = Object.keys(value).length;
  return count > 0 ? `${count} saved privacy choice${count === 1 ? "" : "s"}` : "Secure exports and controls";
}
