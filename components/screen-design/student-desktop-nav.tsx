import Link from "next/link";
import { Plus } from "lucide-react";
import { STUDENT_NAV_DESTINATIONS, type StudentNavLabel } from "@/lib/navigation";
import styles from "./student-navigation.module.css";

export type StudentNavigationProfile = {
  displayName?: string | null;
  photoUrl?: string | null;
  photoOffsetX?: number | null;
  photoOffsetY?: number | null;
};

type StudentDesktopNavProps = StudentNavigationProfile & {
  active?: StudentNavLabel;
  showAdd?: boolean;
  wordmarkTone?: "light" | "dark";
  labelOverrides?: Partial<Record<StudentNavLabel, string>>;
};

/** The same primary navigation at every viewport size. */
export function StudentDesktopNav({ active, displayName, photoUrl, photoOffsetX, photoOffsetY, labelOverrides, showAdd = true }: StudentDesktopNavProps) {
  const initials = (displayName ?? "Student")
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join("");

  return <header className={styles.navigation} data-student-navigation>
    <Link className={styles.brand} href="/dashboard" aria-label="Diana Lobby">
      <img src="/screendesign/brand/diana-logo-tight-no-shadow.png" alt="Diana" width="140" height="46" />
      <span className={styles.campusWordmark} aria-hidden="true">Diana</span>
    </Link>
    <nav aria-label="Primary">
      {STUDENT_NAV_DESTINATIONS.map(({ label, href }) => <Link key={href} href={href} aria-current={active === label ? "page" : undefined}>{labelOverrides?.[label] ?? label}</Link>)}
    </nav>
    <div className={styles.actions}>
      {showAdd && <Link href="/quick-add" className={styles.add}><Plus size={18} aria-hidden="true" /><span>Add</span></Link>}
      <Link href="/settings" className={styles.account} aria-label={`${displayName?.trim() || "Student"} settings`} title="Settings">
        {photoUrl ? <img src={photoUrl} alt="" style={{ objectPosition: `${photoOffsetX ?? 50}% ${photoOffsetY ?? 50}%` }} /> : <span aria-hidden="true">{initials || "S"}</span>}
      </Link>
    </div>
  </header>;
}
