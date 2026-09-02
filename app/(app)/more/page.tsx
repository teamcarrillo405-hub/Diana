import {
  ArrowUpRight,
  FolderCheck,
  HeartPulse,
  Search,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import { StudentDesktopNav } from "@/components/screen-design/student-desktop-nav";
import { createClient } from "@/lib/supabase/server";

const MORE_STYLES = `
  :root:has(.sd-more-hub), body:has(.sd-more-hub), .diana-app:has(.sd-more-hub), .diana-app-shell:has(.sd-more-hub), .diana-authenticated-field:has(.sd-more-hub), .app-command-frame:has(.sd-more-hub) { background:linear-gradient(rgb(232 237 234 / .2),rgb(221 227 223 / .28)),#d9dcda url("/images/more-gamer-classroom.png") center / cover fixed no-repeat!important; }
  .diana-app-shell:has(.sd-more-hub) .agent-fab-anchor, .app-command-frame:has(.sd-more-hub) .diana-mobile-command { display:none!important; }
  .app-command-frame:has(.sd-more-hub) { width:100%!important; max-width:none!important; padding:0!important; }
  .sd-more-hub { --more-ink:#182126; --more-muted:#53615c; --more-line:rgb(24 33 38 / .27); --more-yellow:#e8f56b; min-height:100dvh; background:linear-gradient(rgb(232 237 234 / .2),rgb(221 227 223 / .28)),#d9dcda url("/images/more-gamer-classroom.png") center / cover fixed no-repeat; color:var(--more-ink); font-family:var(--font-lexend),Lexend,system-ui,sans-serif; }
  .sd-more-hub *, .sd-more-hub *::before, .sd-more-hub *::after { box-sizing:border-box; }
  .sd-more-hub a:focus-visible { outline:3px solid #fff; outline-offset:3px; }
  .sd-more-mobile-header { display:none; }
  .sd-more-main { position:relative; width:calc(100% - (2 * clamp(12px,1.6vw,28px))); max-width:1800px; min-height:calc(100dvh - 118px); margin:22px auto 24px; overflow:visible; border:7px solid #fff; border-radius:30px; clip-path:polygon(0 0,calc(50% - 131px) 0,calc(50% - 61px) 49px,calc(50% + 61px) 49px,calc(50% + 131px) 0,100% 0,100% calc(100% - 0px),calc(50% + 131px) calc(100% - 0px),calc(50% + 61px) calc(100% - 49px),calc(50% - 61px) calc(100% - 49px),calc(50% - 131px) 100%,0 100%); background:rgb(229 233 230 / .34); box-shadow:0 22px 56px rgb(50 61 66 / .2),inset 0 1px 0 rgb(255 255 255 / .5); backdrop-filter:blur(24px) saturate(.82); -webkit-backdrop-filter:blur(24px) saturate(.82); padding:clamp(26px,3.2vw,48px) clamp(20px,3.2vw,54px) clamp(42px,5vw,78px); }
  .sd-more-notch { position:absolute; z-index:4; left:50%; width:262px; height:56px; transform:translateX(-50%); background:transparent; pointer-events:none; }
  .sd-more-notch::after { position:absolute; inset:0; background:center/100% 100% no-repeat; content:""; }
  .sd-more-notch--top { top:-7px; }
  .sd-more-notch--top::after { background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 262 56'%3E%3Cpath d='M0 4 L70 49 H192 L262 4' fill='none' stroke='%23ffffff' stroke-width='7' stroke-linejoin='round'/%3E%3C/svg%3E"); }
  .sd-more-notch--bottom { bottom:-7px; }
  .sd-more-notch--bottom::after { background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 262 56'%3E%3Cpath d='M0 52 L70 7 H192 L262 52' fill='none' stroke='%23ffffff' stroke-width='7' stroke-linejoin='round'/%3E%3C/svg%3E"); }
  .sd-more-content { position:relative; z-index:4; display:grid; gap:clamp(22px,2.5vw,38px); }
  .sd-more-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:24px; }
  .sd-more-heading h1, .sd-more-heading p, .sd-more-section h2, .sd-more-card p { margin:0; }
  .sd-more-heading h1 { color:#f8faf7; font:640 clamp(27px,2.5vw,36px)/1.1 var(--font-lexend),Lexend,sans-serif; letter-spacing:0; text-shadow:0 2px 18px rgb(9 17 19 / .62); }
  .sd-more-heading p { max-width:42ch; color:rgb(248 250 247 / .84); font-size:15px; line-height:1.55; text-align:right; text-shadow:0 1px 14px rgb(9 17 19 / .58); }
  .sd-more-section { display:grid; gap:13px; }
  .sd-more-section-heading { display:flex; align-items:center; gap:12px; }
  .sd-more-section-heading h2 { color:var(--more-ink); font-size:14px; font-weight:600; line-height:1.25; }
  .sd-more-section-heading span { height:1px; flex:1; background:rgb(255 255 255 / .48); }
  .sd-more-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:clamp(13px,1.5vw,20px); }
  .sd-more-card { position:relative; display:flex; min-height:172px; min-width:0; flex-direction:column; overflow:hidden; border:1.5px solid color-mix(in srgb,var(--more-card-accent,#53615c) 44%,rgb(255 255 255 / .8)); border-radius:12px 20px 12px 20px; background:linear-gradient(135deg,color-mix(in srgb,var(--more-card-accent,#53615c) 7%,rgb(248 250 247 / .64)),rgb(238 244 238 / .42)); padding:20px; color:var(--more-ink); box-shadow:inset 0 1px 0 rgb(255 255 255 / .66),inset 0 0 0 1px color-mix(in srgb,var(--more-card-accent,#53615c) 10%,transparent),0 12px 30px rgb(24 33 38 / .12); text-decoration:none; backdrop-filter:blur(24px) saturate(1.04); -webkit-backdrop-filter:blur(24px) saturate(1.04); transition:transform 180ms cubic-bezier(.32,.72,0,1),background 180ms cubic-bezier(.32,.72,0,1),border-color 180ms cubic-bezier(.32,.72,0,1),box-shadow 180ms cubic-bezier(.32,.72,0,1); }
  .sd-more-card:hover { border-color:color-mix(in srgb,var(--more-card-accent,#53615c) 72%,rgb(255 255 255 / .9)); background:linear-gradient(135deg,color-mix(in srgb,var(--more-card-accent,#53615c) 11%,rgb(253 254 252 / .72)),rgb(238 244 238 / .52)); box-shadow:inset 0 1px 0 rgb(255 255 255 / .8),inset 0 0 0 1px color-mix(in srgb,var(--more-card-accent,#53615c) 18%,transparent),0 16px 34px rgb(24 33 38 / .16); transform:translateY(-3px); }
  .sd-more-card-top { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; }
  .sd-more-card-icon { display:grid; width:45px; height:45px; flex:none; place-items:center; border:1px solid rgb(24 33 38 / .2); border-radius:11px; background:rgb(255 255 255 / .38); color:var(--more-ink); }
  .sd-more-card-icon svg { width:21px; height:21px; }
  .sd-more-card-top > svg { width:20px; height:20px; color:var(--more-muted); transition:transform 180ms cubic-bezier(.32,.72,0,1); }
  .sd-more-card:hover .sd-more-card-top > svg { transform:translate(2px,-2px); }
  .sd-more-card strong { display:block; margin-top:19px; color:var(--more-ink); font-size:20px; font-weight:620; letter-spacing:0; line-height:1.15; }
  .sd-more-card p { margin-top:8px; color:#394742; font-size:14px; line-height:1.48; }
  .sd-more-card[data-kind="search"] { --more-card-accent:#688197; }
  .sd-more-card[data-kind="record"] { --more-card-accent:#637d70; }
  .sd-more-card[data-kind="wellness"] { --more-card-accent:#758866; }
  .sd-more-card[data-kind="sharing"] { --more-card-accent:#8f787c; }
  @media (min-width:901px) {
    .sd-more-hub > .sd-student-desktop-nav { position:sticky; z-index:90; top:0; display:block!important; height:72px; background:#d6dad6; }
    .sd-more-hub > .sd-student-desktop-nav .sd-student-desktop-nav-inner { display:flex; width:100%; height:72px; align-items:center; gap:46px; margin-inline:0; padding-inline:clamp(12px,1.6vw,28px); }
    .sd-more-hub > .sd-student-desktop-nav .sd-student-desktop-tools, .sd-more-hub > .sd-student-desktop-nav .sd-student-desktop-actions, .sd-more-hub > .sd-student-desktop-nav .sd-student-desktop-destinations { display:flex; align-items:center; }
    .sd-more-hub > .sd-student-desktop-nav .sd-student-desktop-brand { display:flex; min-width:120px; height:44px; align-items:center; color:var(--more-ink); text-decoration:none; }
    .sd-more-hub > .sd-student-desktop-nav .sd-student-desktop-brand .sd-source-wordmark { width:auto; height:36px; }
    .sd-more-hub > .sd-student-desktop-nav .sd-student-desktop-destinations { align-self:stretch; gap:28px; }
    .sd-more-hub > .sd-student-desktop-nav .sd-student-desktop-destinations > a { position:relative; display:flex; align-items:center; color:var(--more-muted); font:400 16px/1 var(--font-lexend),Lexend,sans-serif; text-decoration:none; }
    .sd-more-hub > .sd-student-desktop-nav .sd-student-desktop-destinations > a[aria-current="page"] { color:var(--more-ink); }
    .sd-more-hub > .sd-student-desktop-nav .sd-student-desktop-destinations > a[aria-current="page"]::after { position:absolute; right:0; bottom:0; left:0; height:3px; background:var(--more-ink); content:""; }
    .sd-more-hub > .sd-student-desktop-nav .sd-student-desktop-actions { gap:8px; margin-left:auto; }
    .sd-more-hub > .sd-student-desktop-nav .sd-student-desktop-settings, .sd-more-hub > .sd-student-desktop-nav .sd-student-desktop-avatar { display:grid; width:44px; height:44px; flex:none; place-items:center; border:1px solid var(--more-line); background:rgb(255 255 255 / .44); color:var(--more-ink); text-decoration:none; }
    .sd-more-hub > .sd-student-desktop-nav .sd-student-desktop-settings { border-radius:8px; }
    .sd-more-hub > .sd-student-desktop-nav .sd-student-desktop-avatar { overflow:hidden; border-radius:999px; background:linear-gradient(135deg,#e8eee8,#aebcb5); }
    .sd-more-hub > .sd-student-desktop-nav .sd-student-desktop-avatar img { width:100%; height:100%; object-fit:cover; }
    .sd-more-hub > .sd-student-desktop-nav .sd-student-desktop-add-menu { position:relative; }
    .sd-more-hub > .sd-student-desktop-nav .sd-student-desktop-add-menu > summary { display:flex; min-width:74px; min-height:44px; align-items:center; gap:7px; border:1px solid #c6d23f!important; border-radius:8px; background:var(--more-yellow)!important; padding-inline:13px; color:#141d20!important; font:400 16px/1 var(--font-lexend),Lexend,sans-serif; list-style:none; cursor:pointer; box-shadow:none!important; }
    .sd-more-hub > .sd-student-desktop-nav .sd-student-desktop-add-menu > summary > span, .sd-more-hub > .sd-student-desktop-nav .sd-student-desktop-add-menu > summary > svg { color:#141d20!important; }
    .sd-more-hub > .sd-student-desktop-nav .sd-student-desktop-add-menu > summary::-webkit-details-marker { display:none; }
    .sd-more-hub > .sd-student-bottom-nav { display:none!important; }
  }
  @media (max-width:1100px) and (min-width:901px) { .sd-more-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
  @media (max-width:900px) {
    .sd-more-hub > .sd-student-desktop-nav { display:none!important; }
    .sd-more-mobile-header { display:flex; min-height:64px; align-items:center; justify-content:space-between; padding:10px 16px; }
    .sd-more-mobile-header .sd-source-wordmark { width:auto; height:32px; }
    .sd-more-main { width:min(100% - 24px,680px); min-height:calc(100dvh - 152px); margin:6px auto calc(98px + env(safe-area-inset-bottom)); border-width:5px; border-radius:20px; padding:28px 18px 36px; }
    .sd-more-notch { display:none; }
    .sd-more-heading { align-items:flex-start; }
    .sd-more-heading h1 { font-size:27px; }
    .sd-more-heading p { display:none; }
    .sd-more-grid { grid-template-columns:1fr; }
    .sd-more-card { min-height:144px; }
    .sd-more-hub > .sd-student-bottom-nav { position:fixed!important; z-index:75; right:12px!important; bottom:calc(8px + env(safe-area-inset-bottom))!important; left:12px!important; display:grid!important; width:auto!important; min-height:68px; grid-template-columns:repeat(5,minmax(0,1fr)); border:1px solid rgb(84 98 92 / .3); border-radius:18px; background:rgb(231 236 231 / .9); padding:5px 6px; box-shadow:0 18px 44px rgb(24 33 38 / .16); backdrop-filter:blur(24px); }
    .sd-more-hub > .sd-student-bottom-nav a { display:flex; min-width:0; min-height:54px; flex-direction:column; align-items:center; justify-content:center; gap:3px; border-radius:11px; color:var(--more-muted); font-size:11px; text-decoration:none; }
    .sd-more-hub > .sd-student-bottom-nav a[aria-current="page"] { background:rgb(255 255 255 / .62); color:var(--more-ink); }
  }
  @media (prefers-reduced-motion:reduce) { .sd-more-hub *, .sd-more-hub *::before, .sd-more-hub *::after { transition:none!important; } }
`;

const moreTools = [
  { href: "/search", title: "Search", description: "Find classes, work, notes, and tools.", kind: "search", Icon: Search },
  { href: "/proof", title: "Record", description: "Completed work and your showcase.", kind: "record", Icon: FolderCheck },
  { href: "/wellness", title: "Wellness", description: "Daily check-in and movement.", kind: "wellness", Icon: HeartPulse },
  { href: "/sharing", title: "Sharing", description: "Your weekly parent digest.", kind: "sharing", Icon: Share2 },
] as const;

export default async function MorePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, photo_url, photo_offset_x, photo_offset_y")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <ScreenDesignViewport className="sd-more-hub">
      <style>{MORE_STYLES}</style>
      <StudentDesktopNav
        active="More"
        displayName={profile?.display_name}
        photoUrl={profile?.photo_url}
        photoOffsetX={profile?.photo_offset_x}
        photoOffsetY={profile?.photo_offset_y}
      />
      <header className="sd-more-mobile-header">
        <Link href="/dashboard" aria-label="Diana home"><DianaWordmark tight tone="dark" /></Link>
      </header>
      <main className="sd-more-main">
        <div className="sd-more-notch sd-more-notch--top" aria-hidden="true" />
        <div className="sd-more-notch sd-more-notch--bottom" aria-hidden="true" />
        <div className="sd-more-content">
          <header className="sd-more-heading">
            <h1>MORE</h1>
          </header>
          <section className="sd-more-section" aria-labelledby="more-tools">
            <div className="sd-more-section-heading"><h2 id="more-tools">Tools and settings</h2><span aria-hidden="true" /></div>
            <div className="sd-more-grid">
              {moreTools.map(({ href, title, description, kind, Icon }) => (
                <Link className="sd-more-card" data-kind={kind} href={href} key={href}>
                  <span className="sd-more-card-top"><span className="sd-more-card-icon"><Icon aria-hidden="true" /></span><ArrowUpRight aria-hidden="true" /></span>
                  <strong>{title}</strong>
                  <p>{description}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
      <StudentBottomNav />
    </ScreenDesignViewport>
  );
}
