import type { ReactNode } from "react";
import { StudentDesktopNav, type StudentNavigationProfile } from "@/components/screen-design/student-desktop-nav";
import type { StudentNavLabel } from "@/lib/navigation";
import { campusSceneStyle, type CampusScene, type CampusMode } from "@/lib/campus-scenes";
import styles from "./student-shell.module.css";

type Props = { active: StudentNavLabel; profile?: StudentNavigationProfile; children: ReactNode; className?: string; version?: string; campus?: boolean; campusScene?: boolean; scene?: CampusScene; mode?: CampusMode; showAdd?: boolean };
export function StudentShell({ active, profile, children, className = "", version = "12", campus = true, campusScene = false, scene, mode = "scenic", showAdd = true }: Props) {
  const room = scene ?? (campusScene ? (active === "Classes" ? "classes" : active === "Calendar" ? "calendar" : "work") : active === "More" ? "commons" : "none");
  return <div className={`${styles.root} ${className}`} style={campusSceneStyle(room)} data-student-shell data-version={version} data-campus-shell={campus || undefined} data-campus-scene={room === "none" ? undefined : room} data-campus-family={room} data-campus-mode={mode}>
    <div className={styles.environment} aria-hidden="true" />
    <StudentDesktopNav active={active} showAdd={showAdd} {...profile} />
    {children}
  </div>;
}
