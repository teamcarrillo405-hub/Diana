import type { ReactNode } from "react";
import { StudentDesktopNav, type StudentNavigationProfile } from "@/components/screen-design/student-desktop-nav";
import type { StudentNavLabel } from "@/lib/navigation";
import styles from "./student-shell.module.css";

export function StudentShell({ active, profile, children, className = "", version = "12", campus = active === "Work", campusScene = false, showAdd = true }: { active: StudentNavLabel; profile?: StudentNavigationProfile; children: ReactNode; className?: string; version?: string; campus?: boolean; campusScene?: boolean; showAdd?: boolean }) {
  const scene = campus && campusScene ? (active === "Classes" ? "classes" : "work") : undefined;
  return <div className={`${styles.root} ${className}`} data-student-shell data-version={version} data-campus-shell={campus || undefined} data-campus-scene={scene}>
    <div className={styles.environment} aria-hidden="true" />
    <StudentDesktopNav active={active} showAdd={showAdd} {...profile} />
    {children}
  </div>;
}
