import { reviewHref, type Screen } from "./catalog";

export const moreTools = [
  { label: "Quiz", href: reviewHref("study"), section: "study" },
  { label: "Notes", href: reviewHref("notes"), section: "notes" },
  { label: "Record", href: reviewHref("proof"), section: "proof" },
  { label: "Wellness", href: reviewHref("wellness"), section: "wellness" },
  { label: "Settings", href: "/landing-3d/settings-concept-review", section: "sharing" },
] as const;

export function screenPlacement(screen: Screen) {
  if (screen.startsWith("share-")) return "recipient";
  if (["login", "signup", "onboarding"].includes(screen)) return "entry";
  if (["public-home", "trust", "student-control", "early-confirm", "early-unsubscribe", "policy"].includes(screen)) return "public";
  if (["loading", "error", "not-found", "offline"].includes(screen)) return "recovery";
  if (screen.startsWith("class-")) return "classes";
  return "more";
}

export function toolSection(screen: Screen) {
  if (screen.startsWith("study")) return "study";
  if (screen.startsWith("notes") || screen === "search") return "notes";
  return screen;
}
