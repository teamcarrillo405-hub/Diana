import { Clock3, SlidersHorizontal, X } from "lucide-react";
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
import { GoalsPanel, type GoalView } from "./goals-panel";
import { AiHistoryExport } from "./ai-history-export";
import { CanvaSection } from "./canva-section";
import { IepImport } from "./iep-import";
import type { LmsConnectionView } from "./source-models";
import { profileSchoolYearLabel } from "./source-models";
import { LobbyBackgroundPicker } from "./lobby-background-picker";
import { PlayerPhoto } from "./player-photo";
import { ProfileCenterForm } from "./profile-center-form";
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
  /* One responsive Settings shell. The legacy mobile profile surface no longer renders. */
  .sd-profile-center { min-height:100dvh; height:auto; max-height:none; overflow:visible; background:#d6dad6; color:#182126; font-family:var(--font-lexend),Lexend,system-ui,sans-serif; }
  .sd-settings-desktop { display:grid; min-height:100dvh; padding:0 16px 94px; gap:16px; background:#d6dad6; }
  .sd-settings-mobile-header { display:flex; min-height:72px; align-items:center; justify-content:space-between; gap:16px; }
  .sd-settings-mobile-header > a:first-child { display:flex; height:38px; align-items:center; }
  .sd-settings-mobile-header .sd-source-wordmark { width:auto; height:28px; }
  .sd-settings-mobile-header > a:last-child { display:grid; width:44px; height:44px; place-items:center; border:1px solid rgb(24 33 38 / .27); border-radius:8px; background:rgb(255 255 255 / .44); color:#182126; }
  .sd-settings-mobile-sections { border:1px solid rgb(24 33 38 / .25); border-radius:10px; background:rgb(255 255 255 / .58); }
  .sd-settings-mobile-sections > summary { min-height:48px; padding:14px 16px; color:#182126; cursor:pointer; font-size:15px; font-weight:600; }
  .sd-settings-rail { display:none; }
  .sd-settings-rail--mobile { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:0 8px; padding:0 8px 10px; }
  .sd-settings-rail--mobile .sd-settings-rail-group { min-width:0; margin:0; padding:10px 0; }
  .sd-settings-rail--mobile .sd-settings-rail-group h2 { margin:0 0 6px; color:#53615c; font-size:12px; font-weight:600; }
  .sd-settings-rail--mobile .sd-settings-rail-group a { display:block; min-height:40px; border:1px solid transparent; border-radius:7px; padding:10px 8px; color:#182126; font-size:14px; line-height:1.35; text-decoration:none; }
  .sd-settings-rail--mobile .sd-settings-rail-group a[aria-current=page] { border-color:rgb(24 33 38 / .35); background:rgb(255 255 255 / .86); }
  .sd-settings-notch { display:none; }
  .sd-settings-workspace { min-width:0; }
  .sd-settings-panel { border:1px solid rgb(255 255 255 / .7); border-radius:12px; background:rgb(255 255 255 / .76); padding:20px; color:#182126; box-shadow:inset 0 1px 0 rgb(255 255 255 / .68),0 12px 28px rgb(2 6 23 / .1); }
  .sd-settings-profile-card { background:#f4efe6; }
  .sd-settings-panel-head { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; margin-bottom:20px; }
  .sd-settings-panel-head h1 { margin:0 0 5px; color:#182126; font-size:24px; font-weight:600; line-height:1.1; }
  .sd-settings-panel-head p { margin:0; color:#394742; font-size:14px; line-height:1.45; }
  .sd-settings-save { min-height:44px; border:1px solid #c6d23f; border-radius:8px; background:#e8f56b; padding:0 14px; color:#141d20; font:500 14px/1 var(--font-lexend),Lexend,sans-serif; }
  .sd-settings-profile-summary { display:grid; grid-template-columns:72px minmax(0,1fr); gap:14px; align-items:center; }
  .sd-settings-profile-avatar { width:72px; height:72px; overflow:hidden; border:2px solid rgb(24 33 38 / .25); border-radius:999px; background:#e8eee8; }
  .sd-settings-profile-avatar img,.sd-settings-profile-avatar .sd-source-media { width:100%; height:100%; object-fit:cover; }
  .sd-settings-profile-summary strong { display:block; color:#182126; font-size:18px; font-weight:600; }
  .sd-settings-profile-summary > div:last-child > span { display:block; margin-top:3px; color:#53615c; font-size:14px; }
  .sd-settings-profile-fields { margin-top:18px; padding-top:18px; border-top:1px solid rgb(24 33 38 / .18); }
  .sd-settings-profile-fields .sd-profile-form fieldset { display:grid; gap:12px; margin:0; padding:0; border:0; }
  .sd-settings-profile-fields .sd-profile-form label { display:grid; gap:7px; color:#394742; font-size:13px; font-weight:600; }
  .sd-settings-profile-fields .sd-profile-form input,.sd-settings-profile-fields .sd-profile-form select { width:100%; border:1px solid rgb(24 33 38 / .23); border-radius:8px; background:rgb(255 255 255 / .88); padding:11px 12px; color:#182126; font:400 15px/1.4 var(--font-lexend),Lexend,sans-serif; }
  .sd-settings-stack { display:grid; gap:16px; }
  .sd-settings-stack > .diana-panel,.sd-settings-stack > section { border:0!important; background:transparent!important; box-shadow:none!important; }
  .sd-settings-panel a { color:#182126; }
  .sd-settings-account-row { display:flex; align-items:center; justify-content:space-between; gap:16px; border-top:1px solid rgb(24 33 38 / .18); padding-top:16px; }
  .sd-settings-account-row:first-of-type { border-top:0; padding-top:0; }
  .sd-settings-account-row strong { display:block; color:#182126; font-size:16px; font-weight:600; }
  .sd-settings-account-row p { margin:5px 0 0; color:#394742; font-size:14px; line-height:1.45; }
  .sd-settings-account-row a { display:inline-flex; min-height:42px; align-items:center; border:1px solid rgb(24 33 38 / .3); border-radius:8px; background:rgb(255 255 255 / .88); padding:0 13px; color:#182126; font-size:14px; font-weight:500; text-decoration:none; white-space:nowrap; }
  .sd-settings-connection-block { display:grid; gap:12px; }
  .sd-settings-connection-block + .sd-settings-connection-block { border-top:1px solid rgb(24 33 38 / .18); padding-top:18px; }
  .sd-settings-connection-block > h2 { margin:0; color:#182126; font-size:16px; font-weight:600; }
  .sd-settings-connection-block > p { margin:-6px 0 0; color:#394742; font-size:14px; line-height:1.45; }
  .sd-profile-center > .sd-student-bottom-nav { position:fixed; z-index:90; right:0; bottom:0; left:0; }
  .sd-profile-center a:focus-visible,.sd-profile-center button:focus-visible,.sd-profile-center input:focus-visible,.sd-profile-center select:focus-visible,.sd-profile-center summary:focus-visible { outline:2px solid #182126; outline-offset:3px; }
  /* Shared student desktop frame. Settings retains its persistent left rail. */
  @media (min-width:901px) {
    .sd-profile-center { --settings-ink:#182126; --settings-muted:#53615c; --settings-line:rgb(24 33 38 / .27); --settings-yellow:#e8f56b; height:auto; max-height:none; min-height:100dvh; overflow:visible; background:#d6dad6; color:var(--settings-ink); font-family:var(--font-lexend),Lexend,system-ui,sans-serif; }
    .sd-settings-mobile-header,.sd-settings-mobile-sections { display:none; }
    .sd-settings-rail { display:block; }
    .sd-settings-notch { display:block; }
    .sd-profile-center > .sd-student-desktop-nav { position:sticky; z-index:90; top:0; display:block!important; height:72px; background:#d6dad6; }
    .sd-profile-center > .sd-student-desktop-nav .sd-student-desktop-nav-inner { display:flex; width:100%; height:72px; align-items:center; gap:46px; margin-inline:0; padding-inline:clamp(12px,1.6vw,28px); }
    .sd-profile-center > .sd-student-desktop-nav .sd-student-desktop-tools, .sd-profile-center > .sd-student-desktop-nav .sd-student-desktop-actions, .sd-profile-center > .sd-student-desktop-nav .sd-student-desktop-destinations { display:flex; align-items:center; }
    .sd-profile-center > .sd-student-desktop-nav .sd-student-desktop-brand { display:flex; min-width:120px; height:44px; align-items:center; color:var(--settings-ink); text-decoration:none; }
    .sd-profile-center > .sd-student-desktop-nav .sd-student-desktop-brand .sd-source-wordmark { width:auto; height:36px; }
    .sd-profile-center > .sd-student-desktop-nav .sd-student-desktop-destinations { align-self:stretch; gap:28px; }
    .sd-profile-center > .sd-student-desktop-nav .sd-student-desktop-destinations > a { position:relative; display:flex; align-items:center; color:var(--settings-muted); font:400 16px/1 var(--font-lexend),Lexend,sans-serif; text-decoration:none; }
    .sd-profile-center > .sd-student-desktop-nav .sd-student-desktop-destinations > a[aria-current="page"] { color:var(--settings-ink); }
    .sd-profile-center > .sd-student-desktop-nav .sd-student-desktop-destinations > a[aria-current="page"]::after { position:absolute; right:0; bottom:0; left:0; height:3px; background:var(--settings-ink); content:""; }
    .sd-profile-center > .sd-student-desktop-nav .sd-student-desktop-actions { gap:8px; margin-left:auto; }
    .sd-profile-center > .sd-student-desktop-nav .sd-student-desktop-settings, .sd-profile-center > .sd-student-desktop-nav .sd-student-desktop-avatar { display:grid; width:44px; height:44px; flex:none; place-items:center; border:1px solid var(--settings-line); background:rgb(255 255 255 / .44); color:var(--settings-ink); text-decoration:none; }
    .sd-profile-center > .sd-student-desktop-nav .sd-student-desktop-settings { border-radius:8px; }
    .sd-profile-center > .sd-student-desktop-nav .sd-student-desktop-avatar { overflow:hidden; border-radius:999px; background:linear-gradient(135deg,#e8eee8,#aebcb5); }
    .sd-profile-center > .sd-student-desktop-nav .sd-student-desktop-avatar img { width:100%; height:100%; object-fit:cover; }
    .sd-profile-center > .sd-student-desktop-nav .sd-student-desktop-add-menu { position:relative; }
    .sd-profile-center > .sd-student-desktop-nav .sd-student-desktop-add-menu > summary { display:flex; min-width:74px; min-height:44px; align-items:center; gap:7px; border:1px solid #c6d23f!important; border-radius:8px; background:var(--settings-yellow)!important; padding-inline:13px; color:#141d20!important; font:400 16px/1 var(--font-lexend),Lexend,sans-serif; list-style:none; cursor:pointer; box-shadow:none!important; }
    .sd-profile-center > .sd-student-desktop-nav .sd-student-desktop-add-menu > summary > span, .sd-profile-center > .sd-student-desktop-nav .sd-student-desktop-add-menu > summary > svg { color:#141d20!important; }
    .sd-profile-center > .sd-student-desktop-nav .sd-student-desktop-add-menu > summary::-webkit-details-marker { display:none; }
    .sd-profile-center > .sd-profile-header, .sd-profile-center > .sd-profile-scroll, .sd-profile-center > .sd-profile-quick, .sd-profile-center > .sd-student-bottom-nav { display:none!important; }
    .sd-settings-desktop { position:relative; z-index:1; display:grid; width:calc(100% - (2 * clamp(12px,1.6vw,28px))); max-width:1800px; min-height:calc(100dvh - 118px); margin:22px auto 24px; overflow:visible; border:7px solid #fff; border-radius:30px; background:linear-gradient(rgb(9 17 19 / .18),rgb(9 17 19 / .24)),url("/images/classes-high-tech-classroom.png") center/cover no-repeat; padding:clamp(30px,3.2vw,48px) clamp(20px,3.2vw,54px) clamp(44px,5vw,78px); grid-template-columns:minmax(220px,250px) minmax(0,1fr); gap:clamp(20px,2.4vw,36px); align-items:start; box-shadow:inset 0 1px 0 rgb(255 255 255 / .25); }
    .sd-settings-notch { position:absolute; z-index:3; left:50%; width:262px; height:56px; transform:translateX(-50%); background:#d6dad6; pointer-events:none; }
    .sd-settings-notch::after { position:absolute; inset:0; background:center/100% 100% no-repeat; content:""; }
    .sd-settings-notch--top { top:-7px; clip-path:polygon(0 0,100% 0,73.3% 87.5%,26.7% 87.5%); }
    .sd-settings-notch--top::after { background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 262 56'%3E%3Cpath d='M0 4 L70 49 H192 L262 4' fill='none' stroke='%23ffffff' stroke-width='7' stroke-linejoin='round'/%3E%3C/svg%3E"); }
    .sd-settings-notch--bottom { bottom:-7px; clip-path:polygon(26.7% 12.5%,73.3% 12.5%,100% 100%,0 100%); }
    .sd-settings-notch--bottom::after { background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 262 56'%3E%3Cpath d='M0 52 L70 7 H192 L262 52' fill='none' stroke='%23ffffff' stroke-width='7' stroke-linejoin='round'/%3E%3C/svg%3E"); }
    .sd-settings-rail, .sd-settings-workspace { position:relative; z-index:4; }
    .sd-settings-rail { position:sticky; top:96px; border:1px solid rgb(255 255 255 / .68); border-radius:14px 22px 14px 22px; background:linear-gradient(135deg,rgb(248 250 247 / .72),rgb(238 244 238 / .52)); padding:17px 14px; box-shadow:inset 0 1px 0 rgb(255 255 255 / .66),0 14px 34px rgb(24 33 38 / .14); backdrop-filter:blur(24px) saturate(1.05); -webkit-backdrop-filter:blur(24px) saturate(1.05); }
    .sd-settings-rail-group { margin:0; padding:0 0 17px; }
    .sd-settings-rail-group + .sd-settings-rail-group { border-top:1px solid rgb(24 33 38 / .14); padding-top:16px; }
    .sd-settings-rail-group:last-child { padding-bottom:0; }
    .sd-settings-rail-group h2 { margin:0 0 7px; padding:0 8px; color:var(--settings-muted); font:600 12px/1.2 var(--font-lexend),Lexend,sans-serif; letter-spacing:0; text-transform:none; }
    .sd-settings-rail-group a { position:relative; display:block; min-height:42px; margin:2px 0; border:1px solid transparent; border-radius:8px; padding:12px 11px; color:#394742; font:450 14px/1.2 var(--font-lexend),Lexend,sans-serif; text-decoration:none; }
    .sd-settings-rail-group a:hover { border-color:rgb(24 33 38 / .22); background:rgb(255 255 255 / .44); color:var(--settings-ink); }
    .sd-settings-rail-group a[aria-current=page] { border-color:rgb(24 33 38 / .32); background:rgb(255 255 255 / .72); color:var(--settings-ink); box-shadow:inset 3px 0 0 #182126; }
    .sd-settings-workspace { display:grid; min-width:0; gap:18px; }
    .sd-settings-panel { border:1px solid rgb(255 255 255 / .72); border-radius:14px 22px 14px 22px; background:linear-gradient(135deg,rgb(248 250 247 / .76),rgb(238 244 238 / .58)); padding:clamp(22px,2.5vw,34px); color:var(--settings-ink); box-shadow:inset 0 1px 0 rgb(255 255 255 / .7),0 16px 36px rgb(24 33 38 / .15); backdrop-filter:blur(26px) saturate(1.04); -webkit-backdrop-filter:blur(26px) saturate(1.04); }
    .sd-settings-profile-card { border-style:dashed; border-color:rgb(255 255 255 / .82); background:linear-gradient(135deg,rgb(248 250 247 / .79),rgb(238 244 238 / .61)); }
    .sd-settings-panel-head { display:flex; align-items:flex-start; justify-content:space-between; gap:20px; margin-bottom:26px; }
    .sd-settings-panel-head h1 { margin:0 0 6px; color:var(--settings-ink); font:620 clamp(24px,2vw,30px)/1.12 var(--font-lexend),Lexend,sans-serif; letter-spacing:0; text-transform:none; }
    .sd-settings-panel-head p { max-width:48ch; margin:0; color:#394742; font-size:15px; line-height:1.55; }
    .sd-settings-save, .sd-settings-account-row a { display:inline-flex; min-height:44px; align-items:center; justify-content:center; border:1px solid #c6d23f!important; border-radius:8px; background:var(--settings-yellow)!important; padding:0 15px; color:#141d20!important; font:500 14px/1 var(--font-lexend),Lexend,sans-serif!important; font-style:normal!important; font-weight:500!important; letter-spacing:0!important; text-decoration:none; text-transform:none!important; white-space:nowrap; }
    .sd-settings-profile-summary { display:grid; grid-template-columns:86px minmax(0,1fr); gap:20px; align-items:center; }
    .sd-settings-profile-avatar { width:86px; height:86px; overflow:hidden; border:2px solid rgb(24 33 38 / .3); border-radius:999px; background:linear-gradient(135deg,#e8eee8,#aebcb5); box-shadow:none; }
    .sd-settings-profile-avatar img, .sd-settings-profile-avatar .sd-source-media { width:100%; height:100%; object-fit:cover; }
    .sd-settings-profile-summary strong { display:block; color:var(--settings-ink); font-size:21px; font-weight:620; }
    .sd-settings-profile-summary > span:last-child > span { display:block; margin-top:4px; color:var(--settings-muted); font-size:13px; }
    .sd-settings-profile-fields { margin-top:24px; padding-top:20px; border-top:1px solid rgb(24 33 38 / .2); }
    .sd-settings-profile-fields .sd-profile-form label:first-child, .sd-settings-profile-fields .sd-profile-form label:first-child > span { color:#394742; font:550 13px/1.3 var(--font-lexend),Lexend,sans-serif!important; letter-spacing:0!important; text-transform:none!important; }
    .sd-settings-profile-fields .sd-profile-form input, .sd-settings-panel :is(input:not([type=checkbox]), select, textarea) { border:1px solid rgb(24 33 38 / .26); border-radius:8px; background:rgb(255 255 255 / .7); color:var(--settings-ink); font:400 14px/1.4 var(--font-lexend),Lexend,sans-serif; }
    .sd-settings-profile-fields .sd-profile-form-message { background:rgb(233 245 154 / .42); color:#243019; }
    .sd-settings-photo { margin-top:20px; }
    .sd-settings-photo .diana-button { border-radius:8px!important; color:var(--settings-ink)!important; font:500 14px/1 var(--font-lexend),Lexend,sans-serif!important; font-style:normal!important; font-weight:500!important; letter-spacing:0!important; text-transform:none!important; }
    .sd-settings-photo .diana-button-primary { border-color:#c6d23f!important; background:var(--settings-yellow)!important; color:#141d20!important; }
    .sd-settings-photo .diana-button-ghost { border-color:rgb(24 33 38 / .25)!important; background:rgb(255 255 255 / .54)!important; color:var(--settings-ink)!important; }
    .sd-settings-stack { display:grid; gap:18px; }
    .sd-settings-stack > .diana-panel, .sd-settings-stack > section { border:0!important; background:transparent!important; box-shadow:none!important; }
    .sd-settings-panel a { color:#223f4d; }
    .sd-settings-panel :is(h2,h3,strong,legend) { color:var(--settings-ink)!important; font-family:var(--font-lexend),Lexend,sans-serif!important; }
    .sd-settings-panel :is(p,label,small,summary,output) { color:#394742!important; font-family:var(--font-lexend),Lexend,sans-serif!important; }
    .sd-settings-panel .text-muted { color:var(--settings-muted)!important; }
    .sd-settings-panel .text-ok { color:#28543b!important; }
    .sd-settings-panel .text-brand { color:#223f4d!important; }
    .sd-settings-panel .text-white { color:#141d20!important; }
    .sd-settings-panel :is(.tracking-wide,.tracking-wider) { letter-spacing:0!important; text-transform:none!important; }
    .sd-settings-panel :is(.rounded-xl,.rounded-2xl,.rounded-lg) { border-color:rgb(24 33 38 / .2)!important; }
    .sd-settings-panel :is(section, .diana-control-group) { background:rgb(255 255 255 / .24)!important; }
    .sd-settings-panel .diana-control-group { border-radius:8px!important; padding:4px!important; }
    .sd-settings-panel button { min-height:40px; border-color:rgb(24 33 38 / .28)!important; background:rgb(255 255 255 / .56)!important; color:var(--settings-ink)!important; font-family:var(--font-lexend),Lexend,sans-serif!important; font-style:normal!important; font-weight:500!important; letter-spacing:0!important; text-transform:none!important; }
    .sd-settings-panel button:disabled { color:#38423d!important; opacity:.72!important; }
    .sd-settings-panel button[aria-pressed=true], .sd-settings-panel :is(button.bg-accent,button.bg-brand) { border-color:#c6d23f!important; background:var(--settings-yellow)!important; color:#141d20!important; }
    .sd-settings-panel button[role=switch] { min-height:64px; background:rgb(255 255 255 / .36)!important; }
    .sd-settings-panel button[role=switch] > span:last-child { background:#8c9792!important; }
    .sd-settings-panel button[role=switch][aria-checked=true] > span:last-child { background:var(--settings-yellow)!important; }
    .sd-settings-panel button[role=switch] > span:last-child > span { transform:translateX(0)!important; }
    .sd-settings-panel button[role=switch][aria-checked=true] > span:last-child > span { transform:translateX(20px)!important; }
    .sd-settings-panel button:focus-visible, .sd-settings-panel a:focus-visible, .sd-settings-panel :is(input,select,textarea):focus-visible { outline:3px solid #223f4d!important; outline-offset:3px; }
    .sd-settings-panel :is(input:not([type=checkbox]),select,textarea)::placeholder { color:#65736d!important; opacity:1; }
    .sd-settings-panel .sd-accessibility-preferences { display:grid; gap:18px; overflow:visible!important; border:0!important; border-radius:0!important; background:transparent!important; padding:0!important; box-shadow:none!important; clip-path:none!important; backdrop-filter:none!important; }
    .sd-settings-panel .sd-accessibility-preferences::before, .sd-settings-panel .sd-accessibility-preferences::after { display:none!important; }
    .sd-settings-panel .sd-accessibility-preferences > :first-child { display:flex; align-items:center; justify-content:space-between; min-height:44px; border-bottom:1px solid rgb(24 33 38 / .2); padding-bottom:14px; }
    .sd-settings-panel .sd-accessibility-preferences > :first-child h2 { font-size:16px!important; font-weight:600!important; }
    .sd-settings-panel .sd-accessibility-layout { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
    .sd-settings-panel .sd-accessibility-group { display:grid; gap:10px; border:1px solid rgb(255 255 255 / .64)!important; border-radius:12px 20px 12px 20px!important; background:linear-gradient(135deg,rgb(255 255 255 / .48),rgb(237 244 237 / .32))!important; padding:15px!important; box-shadow:inset 0 1px 0 rgb(255 255 255 / .68); }
    .sd-settings-panel .sd-accessibility-group--display, .sd-settings-panel .sd-accessibility-group--speech { grid-column:1 / -1; }
    .sd-settings-panel .sd-accessibility-group--comfort { align-self:start; grid-column:2; grid-row:2; }
    .sd-settings-panel .sd-accessibility-group > p { color:#394742!important; font-size:14px!important; font-weight:600!important; letter-spacing:0!important; text-transform:none!important; }
    .sd-settings-panel .sd-accessibility-choice-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; }
    .sd-settings-panel .sd-accessibility-choice-grid--display { grid-template-columns:repeat(3,minmax(0,1fr)); }
    .sd-settings-panel .sd-accessibility-choice-grid--voice { grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); }
    .sd-settings-panel .sd-accessibility-choice-field { display:grid; min-width:0; gap:8px; }
    .sd-settings-panel .sd-accessibility-choice-field > p { margin:0; color:var(--settings-muted)!important; font-size:13px!important; font-weight:600!important; line-height:1.35!important; }
    .sd-settings-panel .sd-accessibility-choice-field > div { align-items:stretch; }
    .sd-settings-panel .sd-accessibility-choice-field .sd-accessibility-pill { flex:1 1 auto; min-width:0; }
    .sd-settings-panel .sd-accessibility-select-control { display:grid; gap:8px; min-width:0; }
    .sd-settings-panel .sd-accessibility-select-control > span { color:var(--settings-muted)!important; font-size:13px!important; font-weight:600!important; }
    .sd-settings-panel .sd-accessibility-select-control select { min-height:42px; width:100%; border:1px solid rgb(24 33 38 / .22); border-radius:8px; background:rgb(255 255 255 / .54); color:var(--settings-ink); padding:8px 12px; }
    .sd-settings-panel .sd-accessibility-voice-id { grid-column:1 / -1; }
    .sd-settings-panel .sd-accessibility-voice-id input { min-height:42px; width:100%; border:1px solid rgb(24 33 38 / .22); border-radius:8px; background:rgb(255 255 255 / .54); color:var(--settings-ink); padding:8px 12px; }
    .sd-settings-panel .sd-accessibility-disclosure { border-top:1px solid rgb(24 33 38 / .16); padding-top:12px; }
    .sd-settings-panel .sd-accessibility-disclosure > summary { cursor:pointer; color:var(--settings-ink); font-size:14px; font-weight:600; line-height:1.45; list-style:none; }
    .sd-settings-panel .sd-accessibility-disclosure > summary::-webkit-details-marker { display:none; }
    .sd-settings-panel .sd-accessibility-disclosure > summary::after { content:"+"; float:right; color:var(--settings-muted); font-size:18px; line-height:1; }
    .sd-settings-panel .sd-accessibility-disclosure[open] > summary::after { content:"-"; }
    .sd-settings-panel .sd-accessibility-disclosure > :not(summary) { margin-top:14px; }
    .sd-settings-panel .sd-accessibility-preferences > .sd-accessibility-toggle { border-color:rgb(255 255 255 / .68)!important; border-radius:12px 20px 12px 20px!important; background:linear-gradient(135deg,rgb(255 255 255 / .48),rgb(237 244 237 / .32))!important; padding:15px!important; box-shadow:inset 0 1px 0 rgb(255 255 255 / .68); }
    .sd-settings-panel .sd-accessibility-toggle > span:first-child > span:first-child { color:var(--settings-ink)!important; font-size:15px!important; font-weight:600!important; }
    .sd-settings-panel .sd-accessibility-toggle > span:first-child > span:last-child { margin-top:4px; color:var(--settings-muted)!important; font-size:14px!important; line-height:1.45!important; }
    .sd-settings-panel .sd-accessibility-pill { min-width:58px; min-height:42px; border-radius:8px!important; background:rgb(255 255 255 / .54)!important; padding:9px 13px!important; color:var(--settings-ink)!important; }
    .sd-settings-panel .sd-accessibility-pill[aria-pressed=true] { border-color:#c6d23f!important; background:var(--settings-yellow)!important; color:#141d20!important; }
    .sd-settings-panel .sd-accessibility-preferences button { clip-path:none!important; }
    .sd-settings-panel .sd-accessibility-preferences button::before, .sd-settings-panel .sd-accessibility-preferences button::after { display:none!important; }
    .sd-settings-panel .sd-accessibility-preferences .grid { gap:12px!important; }
    .sd-settings-panel .sd-goals-board { display:grid; gap:14px; }
    .sd-settings-panel .sd-goals-summary { display:flex; align-items:center; justify-content:space-between; gap:20px; border:1px solid rgb(255 255 255 / .68); border-radius:12px 20px 12px 20px; background:linear-gradient(135deg,rgb(255 255 255 / .5),rgb(237 244 238 / .34)); padding:16px 18px; box-shadow:inset 0 1px 0 rgb(255 255 255 / .68); }
    .sd-settings-panel .sd-goals-summary p, .sd-settings-panel .sd-goal-item p { margin:0; color:var(--settings-muted); font-size:13px; font-weight:600; line-height:1.35; }
    .sd-settings-panel .sd-goals-summary strong { display:block; margin-top:3px; color:var(--settings-ink); font-size:20px; font-weight:600; }
    .sd-settings-panel .sd-goals-summary > span { max-width:38ch; color:#394742; font-size:14px; line-height:1.45; text-align:right; }
    .sd-settings-panel .sd-goals-list { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
    .sd-settings-panel .sd-goal-item { display:grid; gap:7px; min-width:0; border:1px solid rgb(24 33 38 / .2); border-radius:10px; background:rgb(255 255 255 / .44); padding:14px; }
    .sd-settings-panel .sd-goal-item h2 { overflow:hidden; margin:0; color:var(--settings-ink); font-size:16px; font-weight:600; line-height:1.35; text-overflow:ellipsis; white-space:nowrap; }
    .sd-settings-panel .sd-goal-item > span { color:#394742; font-size:14px; line-height:1.45; }
    .sd-settings-panel .sd-goal-item strong { color:var(--settings-ink); font-size:13px; font-weight:600; line-height:1.4; }
    .sd-settings-panel .sd-goals-form { display:grid; gap:18px; border-top:1px solid rgb(24 33 38 / .18); padding-top:18px; }
    .sd-settings-panel .sd-goals-form-head { display:block; }
    .sd-settings-panel .sd-goals-form-head h2 { margin:0; color:var(--settings-ink); font-size:18px; font-weight:600; }
    .sd-settings-panel .sd-goals-form-head p { margin:5px 0 0; color:#394742; font-size:14px; line-height:1.45; }
    .sd-settings-panel .sd-goals-form-actions { display:flex; justify-content:flex-end; }
    .sd-settings-panel .sd-goals-form-actions button { min-height:44px; border:1px solid #c6d23f; border-radius:8px; background:var(--settings-yellow); padding:0 15px; color:#141d20; font:500 14px/1 var(--font-lexend),Lexend,sans-serif; }
    .sd-settings-panel .sd-goals-form-actions button:disabled { cursor:not-allowed; opacity:.5; }
    .sd-settings-panel .sd-goals-fields { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
    .sd-settings-panel .sd-goals-fields label { display:grid; gap:8px; min-width:0; color:var(--settings-muted); font-size:13px; font-weight:600; }
    .sd-settings-panel .sd-goals-fields .sd-goals-title-field { grid-column:span 1; }
    .sd-settings-panel .sd-goals-fields :is(input,select,textarea) { width:100%; min-width:0; border:1px solid rgb(24 33 38 / .22); border-radius:8px; background:rgb(255 255 255 / .58); padding:11px 12px; color:var(--settings-ink); font:400 15px/1.45 var(--font-lexend),Lexend,sans-serif; }
    .sd-settings-panel .sd-goals-fields textarea { resize:vertical; min-height:96px; }
    .sd-settings-panel .sd-goals-message { min-height:20px; margin:0; color:#394742; font-size:14px; line-height:1.45; }
    .sd-settings-panel .sd-settings-connection-list { display:grid; gap:12px; }
    .sd-settings-panel .sd-settings-connection-row { display:flex; align-items:center; justify-content:space-between; gap:20px; border:1px solid rgb(24 33 38 / .2); border-radius:10px; background:rgb(255 255 255 / .4); padding:16px; }
    .sd-settings-panel .sd-settings-connection-row + .sd-settings-connection-row { margin-top:0; }
    .sd-settings-panel .sd-settings-connection-row strong { display:block; font-size:16px; font-weight:600; }
    .sd-settings-panel .sd-settings-connection-row p { margin:5px 0 0; font-size:14px; line-height:1.45; }
    .sd-settings-panel .sd-settings-connection-status { display:inline-flex; margin-top:8px; color:#28543b!important; font-size:13px; font-weight:600; }
    .sd-settings-panel .sd-settings-connection-status[data-state=attention] { color:#765712!important; }
    .sd-settings-panel .sd-settings-connection-actions { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:8px; }
    .sd-settings-panel .sd-settings-connection-actions a { min-height:40px; }
    .sd-settings-account-row { display:flex; align-items:center; justify-content:space-between; gap:24px; border-top:1px solid rgb(24 33 38 / .2); padding-top:18px; }
    .sd-settings-account-row:first-of-type { border-top:0; padding-top:0; }
    .sd-settings-account-row strong { display:block; color:var(--settings-ink); font-size:16px; font-weight:600; }
    .sd-settings-account-row p { margin:5px 0 0; color:#394742; font-size:14px; line-height:1.45; }
  }
  @media (max-width:900px) {
    .sd-profile-center { background:#d6dad6; color:#182126; }
    .sd-settings-panel .sd-accessibility-layout, .sd-settings-panel .sd-accessibility-choice-grid { grid-template-columns:1fr; }
    .sd-settings-panel .sd-accessibility-group--display, .sd-settings-panel .sd-accessibility-group--speech { grid-column:auto; }
    .sd-settings-panel .sd-accessibility-group--comfort { grid-column:auto; grid-row:auto; }
    .sd-settings-panel .sd-goals-summary { align-items:stretch; flex-direction:column; }
    .sd-settings-panel .sd-goals-summary > span { text-align:left; }
    .sd-settings-panel .sd-goals-list { grid-template-columns:1fr; }
    .sd-settings-panel .sd-goals-fields { display:block; }
    .sd-settings-panel .sd-goals-fields > * { display:grid; width:100%; margin:0 0 14px; grid-column:1!important; }
    .sd-settings-panel .sd-goals-fields > *:last-child { margin-bottom:0; }
    .sd-settings-panel .sd-goals-form-actions { justify-content:stretch; }
    .sd-settings-panel .sd-goals-form-actions button { width:100%; }
  }
`;

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
    <ScreenDesignViewport className="sd-profile-center" aria-label="Profile and settings">
      <style>{PROFILE_STYLES}</style>
      <StudentDesktopNav
        active="More"
        displayName={displayName}
        photoUrl={safePhoto}
        photoOffsetX={profile.photo_offset_x}
        photoOffsetY={profile.photo_offset_y}
      />
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
      <StudentBottomNav />
    </ScreenDesignViewport>
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
      { section: "ai", label: "Export & privacy", href: "/settings?section=ai#ai-history-export" },
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
  const activeSection = section === "reading" ? "accessibility" : section || "profile";
  const activeLabel = settingLabel(activeSection);

  return (
    <div className="sd-settings-desktop">
      <header className="sd-settings-mobile-header">
        <Link href="/dashboard" aria-label="Diana home"><DianaWordmark tight tone="dark" /></Link>
        <Link href="/more" aria-label="Close settings"><X size={19} aria-hidden="true" /></Link>
      </header>
      <div className="sd-settings-notch sd-settings-notch--top" aria-hidden="true" />
      <div className="sd-settings-notch sd-settings-notch--bottom" aria-hidden="true" />
      <details className="sd-settings-mobile-sections">
        <summary>Settings: {activeLabel}</summary>
        <SettingsRail activeSection={activeSection} className="sd-settings-rail--mobile" />
      </details>
      <SettingsRail activeSection={activeSection} />

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

        {activeSection === "learning" || activeSection === "learning-loop" ? (
          <SettingsPanel title={activeSection === "learning" ? "Do the work" : "Learning loop"} description="Tune how Diana supports planning, focus, and adaptation.">
            <AdaptationPanel />
          </SettingsPanel>
        ) : null}

        {activeSection === "study" ? (
          <SettingsPanel title="Study" description="Open your saved review decks and practice tools.">
            <div className="sd-settings-account-row">
              <div>
                <strong>Flashcards</strong>
                <p>Open saved review decks and spaced practice.</p>
              </div>
              <Link href="/study">Open</Link>
            </div>
          </SettingsPanel>
        ) : null}

        {activeSection === "goals" ? (
          <SettingsPanel title="Goals" description="Set a direction, define progress, and keep one next action ready.">
            <GoalsPanel goals={goals} />
          </SettingsPanel>
        ) : null}

        {activeSection === "ai" ? (
          <SettingsPanel title="AI & integrity" description="Control coaching support and keep a record of AI activity.">
            <AiHistoryExport />
          </SettingsPanel>
        ) : null}

        {activeSection === "connections" ? (
          <SettingsPanel title="Connections & IEP" description="Connect school platforms, learning supports, and design tools Diana can use with you.">
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

function SettingsRail({ activeSection, className = "" }: { activeSection: string; className?: string }) {
  return (
    <aside className={`sd-settings-rail ${className}`.trim()} aria-label="Settings sections">
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
