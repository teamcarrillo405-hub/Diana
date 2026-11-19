import type { CSSProperties } from "react";

export const CAMPUS_SCENES = ["entry", "lobby", "work", "classes", "calendar", "commons", "library", "seminar", "services", "courtyard", "none"] as const;
export type CampusScene = typeof CAMPUS_SCENES[number];
export type CampusMode = "scenic" | "header" | "focus" | "document" | "system";

/** Scene identity is independent of navigation. A reader can keep its source room. */
export function campusSceneStyle(scene: CampusScene): CSSProperties {
  return { "--campus-scene-image": scene === "none" ? "none" : `var(--campus-${scene}-image)` } as CSSProperties;
}
