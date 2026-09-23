import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { loadProfile } from "@/lib/profile";
import { TutorPreferences } from "./tutor-preferences";

const TUTOR_STYLES = `
  .diana-authenticated-field:has(.sd-tutor-settings) { padding-bottom:0!important; }
  .app-command-frame:has(.sd-tutor-settings) { padding:0!important; }
  .app-command-frame:has(.sd-tutor-settings) .diana-mobile-command,
  .diana-app-shell:has(.sd-tutor-settings) .agent-fab-anchor { display:none!important; }
  .diana-app:has(.sd-tutor-settings) nextjs-portal { display:none!important; }
  .diana-app:has(.sd-tutor-settings) .skip-link { transition:none; }
  .diana-app:has(.sd-tutor-settings) .skip-link:focus { transform:translateY(0)!important; }
  .sd-tutor-settings { display:flex; height:max(100dvh,852px); max-height:max(100dvh,852px); flex-direction:column; overflow:hidden; background:#0f172a; color:#fff; font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; }
  .sd-tutor-settings * { box-sizing:border-box; }
  .sd-tutor-settings button,.sd-tutor-settings input { font:inherit; }
  .sd-tutor-settings button:focus-visible,.sd-tutor-settings input:focus-visible,.sd-tutor-settings a:focus-visible { outline:2px solid #74c0ff; outline-offset:3px; }
  .sd-tutor-header { position:relative; z-index:30; flex:none; border-bottom:1px solid rgb(255 255 255 / .05); background:rgb(15 23 42 / .86); padding:52px 24px 15px; backdrop-filter:blur(12px); }
  .sd-tutor-header-row { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; }
  .sd-tutor-header-title { display:flex; align-items:flex-start; gap:12px; }
  .sd-tutor-header .sd-source-wordmark { width:auto; height:16px; margin-bottom:8px; opacity:.92; }
  .sd-tutor-header h1 { margin:0; color:#f8fafc; font-size:25px; font-style:italic; font-weight:950; letter-spacing:-.055em; line-height:.82; text-transform:uppercase; }
  .sd-tutor-header h1 span { color:#ff79da; }
  .sd-tutor-header p { margin:11px 0 0; color:#94a3b8; font-size:8px; font-weight:950; letter-spacing:.2em; text-transform:uppercase; }
  .sd-tutor-icon-button { display:grid; width:40px; height:40px; place-items:center; border:1px solid rgb(255 255 255 / .1); border-radius:999px; background:rgb(255 255 255 / .05); color:#f8fafc; }
  .sd-tutor-scroll { min-height:0; flex:1; overflow-y:auto; padding:16px 24px 126px; scrollbar-width:none; }
  .sd-tutor-scroll::-webkit-scrollbar { display:none; }
  .sd-tutor-gallery { display:grid; gap:17px; }
  .sd-tutor-portrait-card { position:relative; overflow:hidden; min-height:224px; border:1px solid rgb(255 255 255 / .1); border-radius:24px; background:rgb(255 255 255 / .05); padding:0; color:#fff; text-align:left; box-shadow:0 18px 38px rgb(0 0 0 / .25); }
  .sd-tutor-portrait-card[aria-pressed="true"] { border-color:#74c0ff; box-shadow:0 0 0 1px #74c0ff,0 18px 38px rgb(0 0 0 / .25),0 0 24px rgb(116 192 255 / .16); }
  .sd-tutor-portrait-card .sd-source-media { width:100%; height:147px; object-fit:cover; object-position:center 28%; }
  .sd-tutor-portrait-card[data-persona="diana"] .sd-source-media { object-fit:contain; object-position:center; padding:24px; background:radial-gradient(circle,#243655 0%,#111c32 70%); }
  .sd-tutor-portrait-card::after { position:absolute; inset:72px 0 74px; background:linear-gradient(180deg,transparent,#0f172a); content:""; }
  .sd-tutor-portrait-copy { position:relative; z-index:2; display:grid; gap:4px; margin-top:-24px; padding:0 17px 16px; }
  .sd-tutor-portrait-copy strong { color:#f8fafc; font-size:20px; font-style:italic; font-weight:950; letter-spacing:-.04em; line-height:1; text-transform:uppercase; }
  .sd-tutor-portrait-copy em { color:#74c0ff; font-size:8px; font-style:normal; font-weight:950; letter-spacing:.14em; text-transform:uppercase; }
  .sd-tutor-portrait-card[data-persona="maya"] .sd-tutor-portrait-copy em { color:#ff79da; }
  .sd-tutor-portrait-copy small { margin-top:4px; color:#cbd5e1; font-size:9px; font-weight:650; line-height:1.4; }
  .sd-tutor-selected { position:absolute; z-index:4; top:12px; right:12px; display:flex; align-items:center; gap:5px; border-radius:999px; background:#74c0ff; padding:5px 8px; color:#0f172a; font-size:7px; font-weight:950; text-transform:uppercase; }
  .sd-tutor-primary-footer { position:absolute; z-index:70; right:24px; bottom:106px; left:24px; }
  .sd-tutor-primary { display:flex; width:100%; min-height:47px; align-items:center; justify-content:center; gap:8px; border:0; border-radius:13px; background:linear-gradient(100deg,#74c0ff,#ff79da); color:#0f172a; font-size:9px; font-style:italic; font-weight:950; letter-spacing:.12em; text-transform:uppercase; box-shadow:0 12px 30px rgb(45 212 191 / .25); }
  .sd-tutor-status { margin:0 0 12px; border:1px solid rgb(116 192 255 / .22); border-radius:10px; background:rgb(116 192 255 / .06); padding:8px 10px; color:#cbd5e1; font-size:8px; line-height:1.4; text-align:center; }
  .sd-tutor-playbook { display:grid; gap:12px; }
  .sd-tutor-section-title { margin:0; color:#ff79da; font-size:9px; font-style:italic; font-weight:950; letter-spacing:.2em; text-transform:uppercase; }
  .sd-tutor-style-list { display:grid; gap:10px; }
  .sd-tutor-style-card { display:grid; grid-template-columns:45px minmax(0,1fr) 18px; align-items:center; gap:12px; min-height:88px; border:1px solid rgb(255 255 255 / .1); border-radius:17px; background:rgb(255 255 255 / .05); padding:13px; color:#f8fafc; text-align:left; }
  .sd-tutor-style-card[aria-pressed="true"] { border:2px solid #74c0ff; background:rgb(116 192 255 / .09); box-shadow:0 0 16px rgb(116 192 255 / .15); }
  .sd-tutor-style-icon { display:grid; width:45px; height:45px; place-items:center; border-radius:12px; background:rgb(255 255 255 / .09); color:#f8fafc; }
  .sd-tutor-style-card[aria-pressed="true"] .sd-tutor-style-icon { background:#74c0ff; color:#0f172a; }
  .sd-tutor-style-copy strong { display:block; font-size:10px; font-style:italic; font-weight:950; text-transform:uppercase; }
  .sd-tutor-style-copy small { display:block; margin-top:5px; color:#94a3b8; font-size:8px; font-weight:650; line-height:1.4; }
  .sd-tutor-style-card[aria-pressed="true"] .sd-tutor-style-copy small { color:#cbd5e1; }
  .sd-tutor-style-check { color:#74c0ff; }
  .sd-tutor-complexity { display:grid; gap:12px; margin-top:24px; }
  .sd-tutor-complexity-head { display:flex; align-items:center; justify-content:space-between; gap:12px; }
  .sd-tutor-complexity-head h2 { margin:0; color:#74c0ff; font-size:9px; font-style:italic; font-weight:950; letter-spacing:.18em; text-transform:uppercase; }
  .sd-tutor-complexity-head output { color:#74c0ff; font-size:10px; font-style:italic; font-weight:950; text-transform:uppercase; }
  .sd-tutor-range { display:grid; gap:15px; border:1px solid rgb(255 255 255 / .1); border-radius:17px; background:rgb(255 255 255 / .05); padding:21px 17px 16px; }
  .sd-tutor-range-track { position:relative; height:22px; }
  .sd-tutor-range-track::before { position:absolute; top:9px; right:0; left:0; height:4px; border-radius:999px; background:rgb(255 255 255 / .1); content:""; }
  .sd-tutor-range-track::after { position:absolute; top:9px; left:0; width:var(--complexity-fill,50%); height:4px; border-radius:999px; background:linear-gradient(90deg,#ff79da,#74c0ff); content:""; }
  .sd-tutor-range input { position:absolute; z-index:2; inset:0; width:100%; height:22px; margin:0; cursor:pointer; opacity:.001; }
  .sd-tutor-range-thumb { position:absolute; z-index:1; top:1px; left:var(--complexity-fill,50%); width:20px; height:20px; border:4px solid #0f172a; border-radius:999px; background:#fff; box-shadow:0 2px 10px rgb(0 0 0 / .5); transform:translateX(-10px); }
  .sd-tutor-range-labels { display:flex; justify-content:space-between; color:#64748b; font-size:7px; font-weight:950; text-transform:uppercase; }
  .sd-tutor-safety { margin:18px 0 0; color:#94a3b8; font-size:8px; line-height:1.5; text-align:center; }
  .sd-tutor-settings > .sd-student-bottom-nav { position:relative; z-index:60; flex:none; }
  .diana-app .sd-tutor-settings button { clip-path:none; transform:none; }
  .diana-app .sd-tutor-icon-button { display:grid; width:40px; min-height:40px; border:1px solid rgb(255 255 255 / .1); border-radius:999px; background:rgb(255 255 255 / .05); padding:0; color:#f8fafc; box-shadow:none; }
  .diana-app .sd-tutor-portrait-card { display:block; width:100%; min-height:224px; border:1px solid rgb(255 255 255 / .1); border-radius:24px; background:rgb(255 255 255 / .05); padding:0; color:#fff; box-shadow:0 18px 38px rgb(0 0 0 / .25); }
  .diana-app .sd-tutor-style-card { display:grid; width:100%; min-height:88px; border:1px solid rgb(255 255 255 / .1); border-radius:17px; background:rgb(255 255 255 / .05); padding:13px; color:#f8fafc; box-shadow:none; }
  .diana-app .sd-tutor-style-card[aria-pressed="true"] { border:2px solid #74c0ff; background:rgb(116 192 255 / .09); box-shadow:0 0 16px rgb(116 192 255 / .15); }
  .diana-app .sd-tutor-primary { display:flex; width:100%; min-height:47px; border:0; border-radius:13px; background:linear-gradient(100deg,#74c0ff,#ff79da); padding:0 14px; color:#0f172a; box-shadow:0 12px 30px rgb(45 212 191 / .25); }
  @media (min-width:700px) { .sd-tutor-gallery { grid-template-columns:repeat(3,minmax(0,1fr)); } }
  @media (prefers-reduced-motion:reduce) { .sd-tutor-settings * { scroll-behavior:auto!important; transition:none!important; } }
`;

export default async function TutorSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string; sdState?: string }>;
}) {
  const profile = await loadProfile();
  if (!profile) return null;
  const params = await searchParams;
  const initialView =
    params?.view === "personalization" || params?.sdState === "personalization"
      ? "personalization"
      : "gallery";

  return (
    <ScreenDesignViewport className="sd-tutor-settings" aria-label={initialView === "gallery" ? "Tutor gallery" : "Tutor personalization"}>
      <style>{TUTOR_STYLES}</style>
      <TutorPreferences
        initial={{
          persona: profile.tutor_persona,
          style: profile.tutor_style,
          complexity: profile.tutor_complexity,
        }}
        initialView={initialView}
      />
    </ScreenDesignViewport>
  );
}
