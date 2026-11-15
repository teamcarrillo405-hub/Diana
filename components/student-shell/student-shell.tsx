import type { ReactNode } from "react";
import { StudentDesktopNav, type StudentNavigationProfile } from "@/components/screen-design/student-desktop-nav";
import type { StudentNavLabel } from "@/lib/navigation";
import styles from "./student-shell.module.css";

export function StudentShell({ active, profile, children, className = "", version = "12" }: { active: StudentNavLabel; profile?: StudentNavigationProfile; children: ReactNode; className?: string; version?: string }) {
  return <div className={`${styles.root} ${className}`} data-student-shell data-version={version}>
    <div className={styles.environment} aria-hidden="true" />
    <StudentDesktopNav active={active} {...profile} />
    {children}
  </div>;
}
