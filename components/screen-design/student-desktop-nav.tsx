import {
  FileUp,
  NotebookPen,
  Plus,
  Settings,
} from "lucide-react";
import Link from "next/link";

import {
  STUDENT_NAV_DESTINATIONS,
  type StudentNavLabel,
} from "@/lib/navigation";
import { DianaWordmark } from "@/components/screen-design/primitives";

// Render the Today header contract with the shared navigation so page-level
// styles cannot shrink or recolor the student header.
const TODAY_HEADER_STYLES = `
  @media (min-width: 901px) {
    .sd-student-desktop-nav.sd-student-header-canonical { position:sticky!important; z-index:90!important; top:0!important; display:block!important; height:72px!important; min-height:72px!important; border:0!important; background:#d6dad6!important; color:#182126!important; font-family:var(--font-lexend),"Lexend",sans-serif!important; }
    .sd-student-desktop-nav.sd-student-header-canonical .sd-student-desktop-nav-inner { display:flex!important; width:100%!important; height:72px!important; min-height:72px!important; align-items:center!important; gap:46px!important; margin-inline:0!important; padding-inline:clamp(12px,1.6vw,28px)!important; }
    .sd-student-desktop-nav.sd-student-header-canonical :is(.sd-student-desktop-tools,.sd-student-desktop-actions,.sd-student-desktop-destinations) { display:flex!important; align-items:center!important; }
    .sd-student-desktop-nav.sd-student-header-canonical .sd-student-desktop-tools { flex:0 0 auto!important; }
    .sd-student-desktop-nav.sd-student-header-canonical .sd-student-desktop-brand { display:flex!important; min-width:120px!important; height:44px!important; align-items:center!important; margin:0!important; padding:0!important; color:#182126!important; text-decoration:none!important; }
    .sd-student-desktop-nav.sd-student-header-canonical .sd-student-desktop-brand .sd-source-wordmark { width:auto!important; height:36px!important; margin:0!important; padding:0!important; }
    .sd-student-desktop-nav.sd-student-header-canonical .sd-student-desktop-destinations { align-self:stretch!important; gap:28px!important; }
    .sd-student-desktop-nav.sd-student-header-canonical .sd-student-desktop-destinations > a { position:relative!important; display:flex!important; align-self:stretch!important; align-items:center!important; color:#53615c!important; font-family:var(--font-lexend),"Lexend",sans-serif!important; font-size:16px!important; font-weight:400!important; letter-spacing:0!important; line-height:1!important; text-decoration:none!important; text-transform:none!important; }
    .sd-student-desktop-nav.sd-student-header-canonical .sd-student-desktop-destinations > a[aria-current="page"] { color:#182126!important; }
    .sd-student-desktop-nav.sd-student-header-canonical .sd-student-desktop-destinations > a[aria-current="page"]::after { position:absolute!important; right:0!important; bottom:5px!important; left:0!important; height:3px!important; background:#182126!important; content:""!important; }
    .sd-student-desktop-nav.sd-student-header-canonical .sd-student-desktop-actions { gap:8px!important; margin-left:auto!important; }
    .sd-student-desktop-nav.sd-student-header-canonical .sd-student-desktop-add-menu { position:relative!important; }
    .sd-student-desktop-nav.sd-student-header-canonical .sd-student-desktop-add-menu > summary { display:flex!important; width:auto!important; min-width:74px!important; min-height:44px!important; align-items:center!important; gap:7px!important; border:1px solid #c6d23f!important; border-radius:8px!important; background:#e8f56b!important; padding-inline:13px!important; color:#141d20!important; cursor:pointer!important; font-family:var(--font-lexend),"Lexend",sans-serif!important; font-size:16px!important; font-weight:400!important; letter-spacing:0!important; line-height:1!important; list-style:none!important; text-transform:none!important; }
    .sd-student-desktop-nav.sd-student-header-canonical .sd-student-desktop-add-menu > summary :is(span,svg) { color:#141d20!important; }
    .sd-student-desktop-nav.sd-student-header-canonical .sd-student-desktop-add-menu > summary > span { display:inline!important; }
    .sd-student-desktop-nav.sd-student-header-canonical .sd-student-desktop-add-menu > summary::-webkit-details-marker { display:none!important; }
    .sd-student-desktop-nav.sd-student-header-canonical .sd-student-desktop-add-options { position:absolute!important; z-index:110!important; top:calc(100% + 8px)!important; right:0!important; display:grid!important; width:252px!important; gap:4px!important; border:1px solid rgb(84 98 92 / .3)!important; border-radius:10px!important; background:rgb(244 246 243 / .96)!important; padding:6px!important; box-shadow:0 14px 32px rgb(24 33 38 / .17)!important; backdrop-filter:blur(18px)!important; }
    .sd-student-desktop-nav.sd-student-header-canonical .sd-student-desktop-add-options > a { display:grid!important; min-height:52px!important; grid-template-columns:32px minmax(0,1fr)!important; align-items:center!important; gap:9px!important; border-radius:7px!important; padding:9px!important; color:#182126!important; text-decoration:none!important; }
    .sd-student-desktop-nav.sd-student-header-canonical .sd-student-desktop-add-options span { display:grid!important; gap:2px!important; }
    .sd-student-desktop-nav.sd-student-header-canonical .sd-student-desktop-add-options strong { font-size:12px!important; }
    .sd-student-desktop-nav.sd-student-header-canonical .sd-student-desktop-add-options small { color:#53615c!important; font-size:11px!important; }
    .sd-student-desktop-nav.sd-student-header-canonical :is(.sd-student-desktop-settings,.sd-student-desktop-avatar) { display:grid!important; width:44px!important; height:44px!important; flex:none!important; place-items:center!important; border:1px solid rgb(84 98 92 / .36)!important; background:rgb(255 255 255 / .44)!important; color:#182126!important; text-decoration:none!important; }
    .sd-student-desktop-nav.sd-student-header-canonical .sd-student-desktop-settings { border-radius:8px!important; }
    .sd-student-desktop-nav.sd-student-header-canonical .sd-student-desktop-avatar { overflow:hidden!important; border-radius:999px!important; background:linear-gradient(135deg,#e8eee8,#aebcb5)!important; font-weight:400!important; }
    .sd-student-desktop-nav.sd-student-header-canonical .sd-student-desktop-avatar img { width:100%!important; height:100%!important; object-fit:cover!important; }
  }
`;

type StudentDesktopNavProps = {
  active?: StudentNavLabel;
  displayName?: string | null;
  photoUrl?: string | null;
  photoOffsetX?: number | null;
  photoOffsetY?: number | null;
};

export function StudentDesktopNav({
  active,
  displayName,
  photoUrl,
  photoOffsetX,
  photoOffsetY,
}: StudentDesktopNavProps) {
  const initials = (displayName ?? "Student")
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <nav className="sd-student-desktop-nav sd-student-header-canonical" aria-label="Primary">
      <style>{TODAY_HEADER_STYLES}</style>
      <div className="sd-student-desktop-nav-inner">
        <div className="sd-student-desktop-tools">
          <Link
            className="sd-student-desktop-brand"
            href="/dashboard"
            aria-label="Diana home"
          >
            <DianaWordmark tight tone="dark" />
          </Link>
        </div>

        <div className="sd-student-desktop-destinations">
          {STUDENT_NAV_DESTINATIONS.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              prefetch={label === "Work" ? false : undefined}
              aria-current={label === active ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="sd-student-desktop-actions">
          <details className="sd-student-desktop-add-menu">
            <summary aria-label="Add study material">
              <Plus aria-hidden="true" />
              <span>Add</span>
            </summary>
            <div className="sd-student-desktop-add-options">
              <Link href="/quick-add">
                <FileUp aria-hidden="true" />
                <span>
                  <strong>Add assignment</strong>
                  <small>Photo, PDF, worksheet, or file</small>
                </span>
              </Link>
              <Link href="/notes/new">
                <NotebookPen aria-hidden="true" />
                <span>
                  <strong>Capture a note</strong>
                  <small>Type, record, or add a photo</small>
                </span>
              </Link>
            </div>
          </details>
          <Link
            className="sd-student-desktop-avatar"
            href="/me"
            aria-label={`${displayName ?? "Student"} profile`}
          >
            {photoUrl ? (
              // Profile photos may be data URLs or Supabase object URLs.
              <img
                src={photoUrl}
                alt=""
                style={{
                  objectPosition: `${photoOffsetX ?? 50}% ${photoOffsetY ?? 50}%`,
                }}
              />
            ) : (
              <span>{initials || "S"}</span>
            )}
          </Link>
          <Link
            className="sd-student-desktop-settings"
            href="/settings"
            aria-label="Settings"
          >
            <Settings aria-hidden="true" />
          </Link>
        </div>
      </div>
    </nav>
  );
}
