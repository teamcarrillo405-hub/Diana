import {
  Bot,
  Camera,
  ChevronRight,
  Clock3,
  History,
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
`;

export function ProfileCenter({
  profile,
  connections,
  editable,
}: {
  profile: ProfilePrefs;
  connections: readonly LmsConnectionView[];
  editable: boolean;
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
            <SystemRow href="/settings/ai-history" icon={History} title="AI History" detail="Review coaching activity" />
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
