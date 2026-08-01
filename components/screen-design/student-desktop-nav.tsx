import {
  Camera,
  Mic,
  Settings,
} from "lucide-react";
import Link from "next/link";

import {
  STUDENT_NAV_DESTINATIONS,
  type StudentNavLabel,
} from "@/lib/navigation";
import { DianaWordmark } from "@/components/screen-design/primitives";

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
    <nav className="sd-student-desktop-nav" aria-label="Primary">
      <div className="sd-student-desktop-nav-inner">
        <div className="sd-student-desktop-tools">
          <Link
            className="sd-student-desktop-brand"
            href="/dashboard"
            aria-label="Diana home"
          >
            <DianaWordmark tight />
          </Link>
        </div>

        <div className="sd-student-desktop-destinations">
          {STUDENT_NAV_DESTINATIONS.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              aria-current={label === active ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="sd-student-desktop-actions">
          <Link className="sd-student-desktop-capture" href="/quick-add">
            <Camera aria-hidden="true" />
            <span>Capture</span>
          </Link>
          <Link className="sd-student-desktop-record" href="/voice">
            <Mic aria-hidden="true" />
            <span>Voice Note</span>
          </Link>
          <Link
            className="sd-student-desktop-avatar"
            href="/me"
            aria-label={`${displayName ?? "Student"} profile`}
          >
            {photoUrl ? (
              // Profile photos may be data URLs or Supabase object URLs.
              // eslint-disable-next-line @next/next/no-img-element
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
