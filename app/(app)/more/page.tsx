import { FolderCheck, HeartPulse, Search, Settings, Share2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DianaWordmark } from "@/components/screen-design/primitives";
import { ScreenDesignViewport } from "@/components/screen-design/screen-design-viewport";
import { StudentBottomNav } from "@/components/screen-design/student-bottom-nav";
import { StudentDesktopNav } from "@/components/screen-design/student-desktop-nav";
import { createClient } from "@/lib/supabase/server";

const MORE_STYLES = `
  .diana-authenticated-field:has(.sd-more-hub) { padding-bottom:0!important; }
  .app-command-frame:has(.sd-more-hub) { padding:0!important; }
  .app-command-frame:has(.sd-more-hub) .diana-mobile-command,
  .diana-app-shell:has(.sd-more-hub) .agent-fab-anchor { display:none!important; }
  .sd-more-hub { display:flex; min-height:100dvh; flex-direction:column; overflow:hidden; background:#0b1428; color:#fff; }
  .sd-more-hub * { box-sizing:border-box; }
  .sd-more-hub > .sd-student-desktop-nav { display:none; }
  .sd-more-main { width:100%; flex:1; padding:34px 22px 28px; }
  .sd-more-mobile-brand { margin-bottom:22px; }
  .sd-more-mobile-brand .sd-source-wordmark { width:auto; height:27px; }
  .sd-more-title { margin:0 0 30px; color:#fff; font-family:var(--font-saira-condensed),"Saira Condensed",sans-serif; font-size:42px; font-style:italic; font-weight:800; letter-spacing:0; line-height:1; text-transform:uppercase; }
  .sd-more-section { margin-bottom:30px; }
  .sd-more-section h2 { margin:0 0 12px; color:#29d0ff; font-family:var(--font-saira-condensed),"Saira Condensed",sans-serif; font-size:13px; font-weight:800; letter-spacing:.16em; text-transform:uppercase; }
  .sd-more-section[data-tone="pink"] h2 { color:#ff79da; }
  .sd-more-grid { display:grid; gap:12px; }
  .sd-more-card { display:grid; min-height:88px; grid-template-columns:46px minmax(0,1fr); align-items:center; gap:14px; border:1px solid #d8d1c6; border-radius:8px; background:#f4efe6; padding:15px 17px; color:#0f172a; text-decoration:none; }
  .sd-more-card-icon { display:grid; width:46px; height:46px; place-items:center; border-radius:8px; background:rgb(41 208 255 / .12); color:#0891b2; }
  .sd-more-card[data-tone="pink"] .sd-more-card-icon { background:rgb(255 121 218 / .14); color:#db2777; }
  .sd-more-card strong { display:block; color:#0f172a; font-family:var(--font-saira-condensed),"Saira Condensed",sans-serif; font-size:17px; font-weight:800; letter-spacing:0; line-height:1.1; text-transform:uppercase; }
  .sd-more-card span:last-child span { display:block; margin-top:5px; color:#334155; font-size:13px; line-height:1.35; }
  .sd-more-card:focus-visible { outline:3px solid #29d0ff; outline-offset:3px; }
  .sd-more-hub > .sd-student-bottom-nav { position:sticky; z-index:40; bottom:0; flex:none; }

  @media (min-width:1100px) {
    .sd-more-hub { min-height:100dvh; overflow:visible; background:radial-gradient(circle at 88% 6%,rgb(242 95 176 / .11),transparent 30%),#0b1428; }
    .sd-more-hub > .sd-student-desktop-nav { display:block; flex:none; }
    .sd-more-hub > .sd-student-bottom-nav { display:none; }
    .sd-more-main { width:min(100%,1440px); margin-inline:auto; padding:40px 242px 72px 225px; }
    .sd-more-mobile-brand { display:none; }
    .sd-more-title { margin-bottom:38px; font-size:52px; }
    .sd-more-section { margin-bottom:34px; }
    .sd-more-grid { grid-template-columns:repeat(3,minmax(0,1fr)); }
    .sd-more-card { min-height:120px; grid-template-columns:48px minmax(0,1fr); transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease; }
    .sd-more-card:hover { border-color:rgb(41 208 255 / .5); box-shadow:0 10px 26px rgb(2 6 23 / .18); transform:translateY(-2px); }
    .sd-more-mobile-only { display:none; }
  }

  @media (prefers-reduced-motion:reduce) {
    .sd-more-card { transition:none; }
    .sd-more-card:hover { transform:none; }
  }
`;

const studentTools = [
  { href: "/search", title: "Search", description: "Find classes, work, notes, and tools", Icon: Search },
  { href: "/proof", title: "Record", description: "Completed work and weekly showcase", Icon: FolderCheck },
  { href: "/wellness", title: "Wellness", description: "Energy, sleep, meals, and movement", Icon: HeartPulse },
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

      <main className="sd-more-main">
        <div className="sd-more-mobile-brand"><DianaWordmark /></div>
        <h1 className="sd-more-title">More</h1>

        <section className="sd-more-section" aria-labelledby="more-student-tools">
          <h2 id="more-student-tools">Student tools</h2>
          <div className="sd-more-grid">
            {studentTools.map(({ href, title, description, Icon }) => (
              <Link className="sd-more-card" href={href} key={href}>
                <span className="sd-more-card-icon"><Icon size={23} aria-hidden="true" /></span>
                <span><strong>{title}</strong><span>{description}</span></span>
              </Link>
            ))}
          </div>
        </section>

        <section className="sd-more-section" data-tone="pink" aria-labelledby="more-account">
          <h2 id="more-account">Account</h2>
          <div className="sd-more-grid">
            <Link className="sd-more-card" data-tone="pink" href="/sharing">
              <span className="sd-more-card-icon"><Share2 size={23} aria-hidden="true" /></span>
              <span><strong>Sharing</strong><span>Weekly parent digest</span></span>
            </Link>
            <Link className="sd-more-card sd-more-mobile-only" data-tone="pink" href="/settings">
              <span className="sd-more-card-icon"><Settings size={23} aria-hidden="true" /></span>
              <span><strong>Settings</strong><span>Profile, accessibility, and account</span></span>
            </Link>
          </div>
        </section>
      </main>

      <StudentBottomNav />
    </ScreenDesignViewport>
  );
}
