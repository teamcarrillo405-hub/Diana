import { redirect } from "next/navigation";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import { StudentDesktopNav } from "@/components/screen-design/student-desktop-nav";
import { createClient } from "@/lib/supabase/server";
import { DianaWordmark } from "@/components/screen-design/primitives";
import { ParentSharingView } from "./parent-view";

const SHARING_STYLES = `
  .diana-app-shell:has(.sd-sharing-screen) .agent-fab-anchor { display:none!important; }
  .sd-sharing-screen { min-height:calc(100dvh - 72px)!important; width:100%!important; max-width:none!important; margin:0!important; padding:clamp(26px,3vw,48px) clamp(16px,2vw,32px) 48px!important; background:linear-gradient(rgb(214 218 214 / .66),rgb(214 218 214 / .72)),url("/images/classes-high-tech-classroom.png") center/cover fixed!important; color:#182126!important; font-family:var(--font-lexend),Lexend,system-ui,sans-serif!important; }
  .sd-sharing-page-header,.sd-sharing-screen > div { width:calc(100% - (2 * clamp(12px,1.6vw,28px)))!important; max-width:1800px!important; margin-inline:auto!important; }
  .sd-sharing-page-header { margin-top:0!important; border:0!important; border-radius:0!important; padding:0 0 22px!important; }
  .diana-app .sd-sharing-page-header > h1 { color:#182126!important; font-family:var(--font-lexend),Lexend,sans-serif!important; font-size:clamp(30px,3.4vw,46px)!important; font-style:normal!important; font-weight:620!important; letter-spacing:0!important; line-height:1.1!important; text-transform:none!important; }
  .sd-sharing-mobile-brand { display:none!important; }
  .sd-sharing-screen > div { min-height:0; margin-bottom:0!important; border:1px solid rgb(255 255 255 / .76)!important; border-radius:12px!important; background:linear-gradient(135deg,rgb(248 250 247 / .62),rgb(238 244 238 / .4))!important; padding:clamp(24px,3.2vw,48px)!important; box-shadow:inset 0 1px 0 rgb(255 255 255 / .72),0 14px 34px rgb(24 33 38 / .12)!important; backdrop-filter:blur(24px) saturate(1.04)!important; }
  .sd-sharing-digest { width:min(100%,780px)!important; gap:20px!important; border:1px solid rgb(255 255 255 / .76)!important; border-radius:12px 20px 12px 20px!important; background:linear-gradient(135deg,rgb(248 250 247 / .7),rgb(238 244 238 / .46))!important; padding:clamp(22px,3vw,34px)!important; color:#182126!important; box-shadow:inset 0 1px 0 rgb(255 255 255 / .72),0 14px 34px rgb(24 33 38 / .12)!important; backdrop-filter:blur(24px) saturate(1.04)!important; }
  .sd-sharing-digest :is(h2,p,span,strong,small) { color:#182126!important; font-family:var(--font-lexend),Lexend,sans-serif!important; font-style:normal!important; letter-spacing:0!important; text-transform:none!important; }
  .sd-sharing-digest h2 { font-size:22px!important; font-weight:620!important; }
  .sd-sharing-digest > p,.sd-sharing-digest-toggle-row small { color:#53615c!important; font-size:14px!important; line-height:1.55!important; }
  .sd-sharing-digest-email input { border:1px solid rgb(24 33 38 / .22)!important; border-radius:8px!important; background:rgb(255 255 255 / .7)!important; color:#182126!important; font:500 16px/1.4 var(--font-lexend),Lexend,sans-serif!important; }
  .sd-sharing-digest-toggle-row { border-top-color:rgb(24 33 38 / .16)!important; }
  .diana-app .sd-sharing-digest-toggle { border:1px solid rgb(24 33 38 / .22)!important; border-radius:8px!important; background:rgb(255 255 255 / .48)!important; color:#182126!important; }
  .diana-app .sd-sharing-digest-toggle[aria-checked="true"],.diana-app .sd-sharing-digest-save { border-color:#c6d23f!important; background:#e8f56b!important; color:#141d20!important; }
  .diana-app .sd-sharing-digest-save { border-radius:8px!important; font-family:var(--font-lexend),Lexend,sans-serif!important; font-style:normal!important; font-weight:600!important; letter-spacing:0!important; text-transform:none!important; }
  @media (min-width:901px) { .sd-sharing-screen + .sd-student-bottom-nav { display:none!important; } }
  @media (max-width:900px) { .sd-sharing-screen { min-height:100dvh!important; padding:24px 12px 108px!important; } .sd-sharing-page-header,.sd-sharing-screen > div { width:100%!important; } .sd-sharing-page-header { padding:0 8px 18px!important; } .sd-sharing-screen > div { padding:20px!important; } }
`;

export default async function SharingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, photo_url, photo_offset_x, photo_offset_y")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <>
      <style>{SHARING_STYLES}</style>
      <StudentDesktopNav
        active="More"
        displayName={profile?.display_name}
        photoUrl={profile?.photo_url}
        photoOffsetX={profile?.photo_offset_x}
        photoOffsetY={profile?.photo_offset_y}
      />
      <div className="sd-support-screen sd-sharing-screen diana-current-page">
        <header className="sd-support-header sd-sharing-page-header">
          <div className="sd-sharing-mobile-brand"><DianaWordmark /></div>
          <h1>Sharing</h1>
        </header>
        <ParentSharingView />
      </div>
      <StudentBottomNav />
    </>
  );
}
