import Link from "next/link";
import { redirect } from "next/navigation";

import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import { StudentDesktopNav } from "@/components/screen-design/student-desktop-nav";
import { loadProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { AssignmentUploadForm } from "./assignment-upload-form";

export default async function QuickAddPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await loadProfile();
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, color")
    .is("archived_at", null)
    .order("name", { ascending: true });

  return (
    <ScreenDesignViewport className="sd-assignment-upload-screen" aria-label="Upload assignment">
      <style>{UPLOAD_ASSIGNMENT_STYLES}</style>
      <StudentDesktopNav
        active="Work"
        displayName={profile?.display_name}
        photoUrl={profile?.photo_url}
        photoOffsetX={profile?.photo_offset_x}
        photoOffsetY={profile?.photo_offset_y}
      />
      <main id="main-content" className="sd-assignment-upload-main" tabIndex={-1}>
        <header className="sd-assignment-upload-heading">
          <p>Work</p>
          <div className="sd-assignment-upload-title-row">
            <h1>Upload an assignment.</h1>
            <span className="sd-assignment-upload-help">
              <button type="button" aria-label="How assignment upload works" aria-describedby="assignment-upload-help-text">
                <span aria-hidden="true">i</span>
              </button>
              <span id="assignment-upload-help-text" role="tooltip">
                Diana reads the source, creates the right workspace, and keeps your original directions close by.
              </span>
            </span>
          </div>
        </header>
        {classes?.length ? (
          <AssignmentUploadForm classes={classes} />
        ) : (
          <section className="sd-assignment-upload-empty">
            <h2>Add a class first.</h2>
            <p>Assignments need a class so Diana can keep your work organized.</p>
            <Link href="/classes?create=1">Add a class</Link>
          </section>
        )}
      </main>
      <StudentBottomNav />
    </ScreenDesignViewport>
  );
}

const UPLOAD_ASSIGNMENT_STYLES = `
  .diana-authenticated-field:has(.sd-assignment-upload-screen) { padding-bottom:0!important; }
  .app-command-frame:has(.sd-assignment-upload-screen) { width:100%!important; max-width:none!important; padding:0!important; }
  .diana-app-shell:has(.sd-assignment-upload-screen) .agent-fab-anchor,.diana-authenticated-field:has(.sd-assignment-upload-screen) .diana-mobile-command { display:none!important; }
  .sd-assignment-upload-screen { min-height:100dvh; background:#d6dad6; color:#182126; font-family:var(--font-lexend),Lexend,sans-serif; }
  .sd-assignment-upload-main { width:min(960px,calc(100% - 48px)); margin:0 auto; padding:clamp(46px,7vw,92px) 0 96px; }
  .sd-assignment-upload-heading { max-width:650px; margin-bottom:30px; }
  .sd-assignment-upload-heading p { margin:0 0 8px; color:#53615c; font-size:14px; font-weight:550; }
  .sd-assignment-upload-title-row { display:flex; align-items:center; gap:12px; }
  .sd-assignment-upload-heading h1 { margin:0; color:#182126; font-size:clamp(30px,4vw,48px); font-weight:620; letter-spacing:0; line-height:1.04; }
  .sd-assignment-upload-help { position:relative; display:inline-flex; flex:none; }
  .sd-assignment-upload-heading .sd-assignment-upload-help > button { display:grid!important; box-sizing:border-box!important; flex:0 0 22px!important; inline-size:22px!important; block-size:22px!important; width:22px!important; min-width:22px!important; max-width:22px!important; height:22px!important; min-height:22px!important; max-height:22px!important; padding:0!important; place-items:center; appearance:none; border:1px solid rgb(24 33 38 / .48)!important; border-radius:50%!important; background:rgb(255 255 255 / .48)!important; color:#182126!important; }
  .sd-assignment-upload-help > button > span { display:block; font-family:Georgia,serif; font-size:15px; font-style:italic; font-weight:700; line-height:1; }
  .sd-assignment-upload-help > [role=tooltip] { position:absolute; z-index:10; top:calc(100% + 10px); left:50%; width:min(300px,calc(100vw - 40px)); transform:translateX(-50%); border:1px solid rgb(255 255 255 / .78); border-radius:10px; background:#182126; padding:12px 14px; color:#fff; font-size:14px; font-weight:400; line-height:1.45; opacity:0; pointer-events:none; transition:opacity 160ms ease; }
  .sd-assignment-upload-help:hover > [role=tooltip],.sd-assignment-upload-help:focus-within > [role=tooltip] { opacity:1; }
  .sd-assignment-upload-form,.sd-assignment-upload-empty { border:1px solid rgb(255 255 255 / .72); border-radius:14px 24px 14px 24px; background:linear-gradient(135deg,rgb(248 250 247 / .86),rgb(237 244 238 / .68)); padding:clamp(22px,4vw,38px); box-shadow:inset 0 1px 0 rgb(255 255 255 / .72),0 18px 42px rgb(24 33 38 / .13); backdrop-filter:blur(24px) saturate(1.04); -webkit-backdrop-filter:blur(24px) saturate(1.04); }
  .sd-assignment-upload-tabs { display:flex; gap:8px; border-bottom:1px solid rgb(24 33 38 / .18); padding-bottom:18px; }
  .sd-assignment-upload-tabs button { display:inline-flex; min-height:44px; align-items:center; gap:8px; border:1px solid transparent; border-radius:8px; background:transparent; padding:0 13px; color:#53615c; font:500 14px/1 var(--font-lexend),Lexend,sans-serif; }
  .sd-assignment-upload-tabs button[aria-selected=true] { border-color:rgb(24 33 38 / .26); background:rgb(255 255 255 / .74); color:#182126; }
  .sd-assignment-upload-tabs svg { width:18px; height:18px; }
  .sd-assignment-upload-fields { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; margin-top:24px; }
  .sd-assignment-upload-fields label,.sd-assignment-instructions { display:grid; gap:8px; min-width:0; color:#394742; font-size:14px; font-weight:550; }
  .sd-assignment-upload-fields label > span small { color:#68756f; font-size:12px; font-weight:400; }
  .sd-assignment-upload-screen :is(input,select,textarea) { width:100%; min-height:46px; border:1px solid rgb(24 33 38 / .25); border-radius:8px; background:rgb(255 255 255 / .72); padding:11px 12px; color:#182126; font:400 15px/1.45 var(--font-lexend),Lexend,sans-serif; }
  .sd-assignment-upload-screen textarea { min-height:190px; resize:vertical; }
  .sd-assignment-dropzone { display:grid; min-height:270px; place-items:center; align-content:center; gap:9px; margin-top:20px; border:1px dashed rgb(24 33 38 / .42); border-radius:12px 20px 12px 20px; background:rgb(255 255 255 / .28); padding:28px; text-align:center; }
  .sd-assignment-dropzone input { position:absolute; width:1px; height:1px; opacity:0; pointer-events:none; }
  .sd-assignment-dropzone > svg { width:32px; height:32px; color:#182126; }
  .sd-assignment-dropzone h2,.sd-assignment-dropzone p { margin:0; }
  .sd-assignment-dropzone h2 { color:#182126; font-size:20px; font-weight:620; }
  .sd-assignment-dropzone p { color:#53615c; font-size:14px; line-height:1.45; }
  .sd-assignment-dropzone button,.sd-assignment-upload-actions > button,.sd-assignment-upload-empty a { min-height:44px; border:1px solid #c6d23f; border-radius:8px; background:#e8f56b; padding:0 15px; color:#141d20; font:500 14px/1 var(--font-lexend),Lexend,sans-serif; text-decoration:none; }
  .sd-assignment-dropzone > button { margin-top:8px; }
  .sd-assignment-dropzone .sd-assignment-upload-remove { display:inline-flex; min-height:36px; align-items:center; gap:6px; border-color:transparent; background:transparent; color:#394742; }
  .sd-assignment-dropzone .sd-assignment-upload-remove svg { width:16px; height:16px; }
  .sd-assignment-instructions { margin-top:20px; }
  .sd-assignment-instructions small { color:#53615c; font-size:13px; font-weight:400; line-height:1.45; }
  .sd-assignment-upload-message { margin:16px 0 0; color:#28543b; font-size:14px; line-height:1.45; }
  .sd-assignment-upload-message[data-state=error] { color:#765712; }
  .sd-assignment-upload-actions { display:flex; align-items:center; justify-content:space-between; gap:20px; margin-top:24px; border-top:1px solid rgb(24 33 38 / .18); padding-top:20px; }
  .sd-assignment-upload-actions p { display:flex; max-width:48ch; align-items:flex-start; gap:8px; margin:0; color:#53615c; font-size:13px; line-height:1.45; }
  .sd-assignment-upload-actions p svg { width:17px; height:17px; flex:none; color:#182126; }
  .sd-assignment-upload-actions > button:disabled { cursor:not-allowed; opacity:.62; }
  .sd-assignment-upload-empty h2,.sd-assignment-upload-empty p { margin:0; }
  .sd-assignment-upload-empty h2 { color:#182126; font-size:22px; font-weight:620; }
  .sd-assignment-upload-empty p { margin-top:8px; color:#394742; font-size:15px; line-height:1.5; }
  .sd-assignment-upload-empty a { display:inline-flex; align-items:center; margin-top:20px; }
  @media (min-width:901px) {
    .sd-assignment-upload-screen > .sd-student-desktop-nav { position:sticky; z-index:20; top:0; display:block; background:#d6dad6; }
    .sd-assignment-upload-screen > .sd-student-bottom-nav { display:none; }
  }
  @media (max-width:900px) {
    .sd-assignment-upload-screen > .sd-student-desktop-nav { display:none; }
    .sd-assignment-upload-main { width:min(100% - 32px,620px); padding:32px 0 104px; }
    .sd-assignment-upload-heading { margin-bottom:22px; }
    .sd-assignment-upload-heading h1 { font-size:32px; }
    .sd-assignment-upload-title-row { align-items:flex-start; gap:10px; }
    .sd-assignment-upload-heading .sd-assignment-upload-help > button { flex-basis:22px!important; inline-size:22px!important; block-size:22px!important; width:22px!important; min-width:22px!important; max-width:22px!important; height:22px!important; min-height:22px!important; max-height:22px!important; }
    .sd-assignment-upload-form,.sd-assignment-upload-empty { padding:20px; }
    .sd-assignment-upload-fields { grid-template-columns:1fr; }
    .sd-assignment-upload-tabs { gap:4px; }
    .sd-assignment-upload-tabs button { flex:1; justify-content:center; padding:0 8px; font-size:13px; }
    .sd-assignment-upload-tabs button svg { width:16px; height:16px; }
    .sd-assignment-dropzone { min-height:220px; padding:22px; }
    .sd-assignment-upload-actions { align-items:stretch; flex-direction:column; }
    .sd-assignment-upload-actions > button { width:100%; }
  }
`;
